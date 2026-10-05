/**
 * Lecture du classeur de l'équipe (« Retour L3 - 40k.xlsx » et ses semblables).
 *
 * Ce module transcrit, il ne déduit pas : aucune règle de pairing n'est rejouée ici. Le
 * moteur de l'application (`lib/pairing/`) reste la seule implémentation du protocole.
 *
 * Partagé par scripts/import-xlsx.mjs et scripts/beta-dataset.mjs, pour que les deux
 * lisent le classeur de la même façon.
 */
import { cell, readWorkbook } from "./xlsx.mjs";

/** Lignes du classeur, repérées une fois pour toutes. */
const ROSTER_OUR_ROWS = [3, 4, 5, 6, 7, 8];
const ROSTER_OPPONENT_FIRST_ROW = 13;
const ROSTER_OPPONENT_LAST_ROW = 42;
const ESTIMATES_FIRST_ROW = 3;
const ESTIMATES_LAST_ROW = 32;
const ESTIMATE_COLUMNS = ["E", "F", "G", "H", "I", "J"];

/**
 * Cellules d'une étape de pairing, dans « Ronde N ».
 *
 * `defender` = le défenseur du camp qui reçoit les attaques ; `attackers` = les deux
 * propositions et leur colonne « Retenu ».
 */
const PAIRING_STEPS = [
  {
    them: { defender: "B24", attackers: [["B25", "C25"], ["B26", "C26"]] },
    us: { defender: "B34", attackers: [["B35", "C35"], ["B36", "C36"]] },
  },
  {
    them: { defender: "B45", attackers: [["B46", "C46"], ["B47", "C47"]] },
    us: { defender: "B55", attackers: [["B56", "C56"], ["B57", "C57"]] },
  },
];

/**
 * Bloc « Résumé Ronde » : chaque match occupe deux lignes, une par joueur. Les sections
 * « Rejetés » et « Oubliés » désignent les deux derniers matchs.
 *
 * La ligne de table qui suit chaque match n'est pas lue : le scénario et l'attribution des
 * tables relevaient de la V10 et n'existent plus dans l'application.
 */
const MATCH_BLOCKS = [
  { rows: ["B73", "B74"], origin: "SELECTED", stepIndex: 0 },
  { rows: ["B76", "B77"], origin: "SELECTED", stepIndex: 0 },
  { rows: ["B79", "B80"], origin: "SELECTED", stepIndex: 1 },
  { rows: ["B82", "B83"], origin: "SELECTED", stepIndex: 1 },
  { rows: ["B86", "B87"], origin: "REJECTED_PAIR", stepIndex: 1 },
  { rows: ["B90", "B91"], origin: "REMAINING_PAIR", stepIndex: 1 },
];

/**
 * Sépare « Necrons - wakened Dynasty » en armée et détachement.
 *
 * Le classeur les concatène avec un tiret ; certaines lignes n'ont pas de détachement.
 * Aucune normalisation des libellés n'est tentée : ce qui est saisi est conservé (§42).
 */
function splitArmy(label) {
  const separator = label.indexOf(" - ");
  if (separator === -1) {
    return { army: label.trim(), detachment: null };
  }
  return {
    army: label.slice(0, separator).trim(),
    detachment: label.slice(separator + 3).trim() || null,
  };
}

export function readTeamWorkbook(filePath) {
  const workbook = readWorkbook(filePath);

  function readOurPlayers() {
    const sheet = workbook.sheet("Rosters");
    const players = [];

    for (const row of ROSTER_OUR_ROWS) {
      const armyLabel = cell(sheet, `B${row}`);
      const name = cell(sheet, `C${row}`);
      if (armyLabel === "" || name === "") {
        continue;
      }
      const { army, detachment } = splitArmy(armyLabel);
      // La colonne D du classeur compose « Armée (Joueur) » : c'est cette étiquette qui
      // sert de clé dans les autres feuilles.
      players.push({ name, army, detachment, label: `${armyLabel} (${name})` });
    }

    return players;
  }

  function readRounds() {
    const sheet = workbook.sheet("Rosters");
    const rounds = new Map();

    for (let row = ROSTER_OPPONENT_FIRST_ROW; row <= ROSTER_OPPONENT_LAST_ROW; row += 1) {
      const number = Number(cell(sheet, `A${row}`));
      const armyLabel = cell(sheet, `B${row}`);
      const name = cell(sheet, `C${row}`);

      if (!Number.isFinite(number) || number <= 0) {
        continue;
      }

      if (!rounds.has(number)) {
        rounds.set(number, { number, teamName: "", players: [] });
      }
      const round = rounds.get(number);

      // Le nom d'équipe ne figure que sur la première ligne de la ronde. La colonne G, le
      // scénario, est ignorée : il relevait de la V10.
      const teamName = cell(sheet, `F${row}`);
      if (teamName !== "") {
        round.teamName = teamName;
      }

      if (armyLabel === "" || name === "") {
        continue;
      }
      const { army, detachment } = splitArmy(armyLabel);
      round.players.push({ name, army, detachment, label: `${armyLabel} (${name})` });
    }

    // Une ronde sans adversaire saisi n'a rien à importer (rondes non jouées).
    return [...rounds.values()].filter((round) => round.players.length > 0);
  }

  /** Estimés, indexés `étiquette adverse → étiquette de notre joueur → valeur`. */
  function readEstimates(ourPlayers) {
    const sheet = workbook.sheet("Estimes");
    const byColumn = new Map();

    for (const column of ESTIMATE_COLUMNS) {
      const header = cell(sheet, `${column}2`);
      const player = ourPlayers.find((candidate) => candidate.label === header);
      if (player) {
        byColumn.set(column, player.label);
      }
    }

    const estimates = new Map();

    for (let row = ESTIMATES_FIRST_ROW; row <= ESTIMATES_LAST_ROW; row += 1) {
      const opponentLabel = cell(sheet, `B${row}`);
      if (opponentLabel === "" || opponentLabel === "()") {
        continue;
      }

      const perPlayer = new Map();
      for (const [column, playerLabel] of byColumn) {
        const raw = cell(sheet, `${column}${row}`);
        const value = Math.round(Number(raw));
        if (Number.isFinite(value) && value >= 1 && value <= 5) {
          perPlayer.set(playerLabel, value);
        }
      }

      if (perPlayer.size > 0) {
        estimates.set(opponentLabel, perPlayer);
      }
    }

    return estimates;
  }

  /**
   * Séquence d'actions d'une ronde, reconstituée depuis sa feuille.
   *
   * Retourne `null` si la feuille est absente ou incomplète — c'est le cas des rondes
   * préparées mais non jouées.
   */
  function readPairingActions(roundNumber) {
    const sheet = workbook.sheet(`Ronde ${roundNumber}`);
    if (!sheet) {
      return null;
    }

    const actions = [];

    for (const step of PAIRING_STEPS) {
      const ourDefender = cell(sheet, step.us.defender);
      const theirDefender = cell(sheet, step.them.defender);

      const read = (pairs) =>
        pairs.map(([nameRef, keptRef]) => ({
          label: cell(sheet, nameRef),
          kept: cell(sheet, keptRef).toLowerCase() === "oui",
        }));

      const ourAttackers = read(step.them.attackers);
      const theirAttackers = read(step.us.attackers);

      const filled =
        ourDefender !== "" &&
        theirDefender !== "" &&
        ourAttackers.every((entry) => entry.label !== "") &&
        theirAttackers.every((entry) => entry.label !== "") &&
        ourAttackers.filter((entry) => entry.kept).length === 1 &&
        theirAttackers.filter((entry) => entry.kept).length === 1;

      if (!filled) {
        return null;
      }

      actions.push(
        { type: "SELECT_DEFENDER", side: "US", labels: [ourDefender] },
        { type: "SELECT_DEFENDER", side: "THEM", labels: [theirDefender] },
        {
          type: "PROPOSE_ATTACKERS",
          side: "THEM",
          labels: ourAttackers.map((entry) => entry.label),
        },
        {
          type: "PROPOSE_ATTACKERS",
          side: "US",
          labels: theirAttackers.map((entry) => entry.label),
        },
        {
          type: "RETAIN_ATTACKER",
          side: "THEM",
          labels: [ourAttackers.find((entry) => entry.kept).label],
        },
        {
          type: "RETAIN_ATTACKER",
          side: "US",
          labels: [theirAttackers.find((entry) => entry.kept).label],
        },
      );
    }

    return actions;
  }

  /**
   * Matchs d'une ronde, lus tels qu'ils sont inscrits dans le classeur.
   *
   * Retourne `null` si le résumé est incomplet.
   */
  function readFinalMatches(roundNumber, ourLabels, opponentLabels) {
    const sheet = workbook.sheet(`Ronde ${roundNumber}`);
    if (!sheet) {
      return null;
    }

    const matches = [];

    for (const block of MATCH_BLOCKS) {
      const labels = block.rows.map((reference) => cell(sheet, reference));
      if (labels.some((label) => label === "" || label.startsWith("#"))) {
        return null;
      }

      const ourLabel = labels.find((label) => ourLabels.has(label));
      const opponentLabel = labels.find((label) => opponentLabels.has(label));

      // Chaque match doit opposer exactement un joueur de chaque camp.
      if (!ourLabel || !opponentLabel) {
        return null;
      }

      matches.push({
        ourLabel,
        opponentLabel,
        origin: block.origin,
        stepIndex: block.stepIndex,
      });
    }

    // Un joueur n'apparaît qu'une fois, de chaque côté (§31).
    const ourUsed = new Set(matches.map((match) => match.ourLabel));
    const opponentUsed = new Set(matches.map((match) => match.opponentLabel));
    if (ourUsed.size !== matches.length || opponentUsed.size !== matches.length) {
      return null;
    }

    return matches;
  }

  const ourPlayers = readOurPlayers();

  return {
    ourPlayers,
    rounds: readRounds(),
    estimates: readEstimates(ourPlayers),
    readPairingActions,
    readFinalMatches,
  };
}
