/**
 * Lecteur XLSX minimal, sans dépendance.
 *
 * Un fichier .xlsx est une archive ZIP contenant du XML. Node sait décompresser
 * (`zlib.inflateRawSync`) mais ne sait pas lire une archive ZIP : ce module s'en charge,
 * puis extrait les cellules des feuilles.
 *
 * Pourquoi pas SheetJS, que le cahier des charges nommait ? Trois raisons :
 *   - le paquet `xlsx` publié sur npm traîne des avis de sécurité non corrigés, les
 *     versions à jour n'étant distribuées que sur le CDN de l'éditeur ;
 *   - ce réseau bloque les CDN tiers (le téléchargement des navigateurs Playwright y a
 *     échoué), donc cette installation ne serait pas reproductible ;
 *   - le besoin est étroit : lire des chaînes et des nombres dans des cellules connues.
 *
 * Ce module ne gère donc que ce qui est nécessaire : dates et formules ne sont pas
 * interprétées, seules les valeurs calculées stockées dans le fichier sont lues.
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

// --- Lecture de l'archive ZIP ------------------------------------------------

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

function findEndOfCentralDirectory(buffer) {
  // Le commentaire final peut faire jusqu'à 64 Ko : on remonte depuis la fin.
  const limit = Math.min(buffer.length, 0xffff + 22);
  for (let offset = buffer.length - 22; offset >= buffer.length - limit; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }
  throw new Error("Archive illisible : fin de répertoire central introuvable.");
}

/** Contenu de l'archive, sous forme d'une table `nom de fichier → Buffer`. */
function readZip(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);

  const files = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw new Error("Archive illisible : entrée de répertoire central invalide.");
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    // L'entête local redéclare ses propres longueurs de nom et d'extra : ce sont
    // celles-là qui donnent la position réelle des données.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);

    files.set(name, method === 0 ? data : inflateRawSync(data));

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

// --- Lecture du XML ----------------------------------------------------------

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (entity) => ENTITIES[entity]);
}

/** Concatène le texte de toutes les balises `<t>` d'un fragment. */
function textOf(fragment) {
  const parts = [];
  const pattern = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let match;
  while ((match = pattern.exec(fragment)) !== null) {
    parts.push(decode(match[1]));
  }
  return parts.join("");
}

function readSharedStrings(files) {
  const raw = files.get("xl/sharedStrings.xml");
  if (!raw) {
    return [];
  }

  const xml = raw.toString("utf8");
  const strings = [];
  const pattern = /<si>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    strings.push(textOf(match[1]));
  }
  return strings;
}

function readSheetNames(files) {
  const workbook = files.get("xl/workbook.xml").toString("utf8");
  const rels = files.get("xl/_rels/workbook.xml.rels").toString("utf8");

  const targets = new Map();
  const relPattern = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let relMatch;
  while ((relMatch = relPattern.exec(rels)) !== null) {
    targets.set(relMatch[1], relMatch[2]);
  }

  const sheets = new Map();
  const sheetPattern = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g;
  let sheetMatch;
  while ((sheetMatch = sheetPattern.exec(workbook)) !== null) {
    let target = targets.get(sheetMatch[2]) ?? "";
    target = target.replace(/^\//, "");
    if (!target.startsWith("xl/")) {
      target = `xl/${target}`;
    }
    sheets.set(decode(sheetMatch[1]), target);
  }

  return sheets;
}

/**
 * Une feuille, sous forme d'une table `référence de cellule → valeur texte`.
 *
 * Les cellules vides sont absentes. Les valeurs numériques sont rendues telles qu'elles
 * sont stockées (« 4 » ou « 4.0 ») : c'est à l'appelant de les convertir.
 */
function readSheet(files, path, sharedStrings) {
  const xml = files.get(path).toString("utf8");
  const cells = new Map();

  // La capture des attributs est non gourmande : sinon `[^>]*` avale le `/` d'une cellule
  // auto-fermante (`<c r="E13" s="30"/>`), l'alternance retombe sur la branche `>…</c>`,
  // et la cellule suivante est consommée sans un mot. Une feuille comportant des cellules
  // vides stylées perdait ainsi des valeurs, silencieusement.
  const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let match;

  while ((match = cellPattern.exec(xml)) !== null) {
    const attributes = match[1];
    const body = match[2] ?? "";

    const reference = /r="([A-Z]+\d+)"/.exec(attributes)?.[1];
    if (!reference) {
      continue;
    }

    const type = /t="([^"]+)"/.exec(attributes)?.[1];
    let value;

    if (type === "inlineStr") {
      value = textOf(body);
    } else {
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (raw === undefined) {
        continue;
      }
      value = type === "s" ? (sharedStrings[Number(raw)] ?? "") : decode(raw);
    }

    if (value !== "") {
      cells.set(reference, value);
    }
  }

  return cells;
}

// --- API ---------------------------------------------------------------------

export function readWorkbook(filePath) {
  const files = readZip(readFileSync(filePath));
  const sharedStrings = readSharedStrings(files);
  const sheetPaths = readSheetNames(files);

  const sheets = new Map();
  for (const [name, path] of sheetPaths) {
    sheets.set(name, readSheet(files, path, sharedStrings));
  }

  return {
    sheetNames: [...sheets.keys()],
    /** Cellules d'une feuille, ou `undefined` si la feuille n'existe pas. */
    sheet: (name) => sheets.get(name),
  };
}

/** Valeur texte d'une cellule, nettoyée. Chaîne vide si la cellule est absente. */
export function cell(sheet, reference) {
  return (sheet?.get(reference) ?? "").trim();
}

/** Valeur numérique d'une cellule, ou `null` si elle est absente ou non numérique. */
export function numericCell(sheet, reference) {
  const raw = cell(sheet, reference);
  if (raw === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
