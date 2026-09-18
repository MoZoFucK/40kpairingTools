/**
 * Normalisation et lecture des listes d'armée.
 *
 * Fonctions pures, testables sans base. Elles ne portent aucune règle de jeu : elles
 * mettent en forme ce que le coach a saisi pour que le joueur puisse le lire (§16).
 */

/**
 * Clé de rapprochement d'une armée ou d'un détachement.
 *
 * « Necrons », « necrons » et «  Necrons  » désignent la même armée. La même règle est
 * appliquée côté base par les index uniques sur `lower(trim(...))`, pour que les deux
 * côtés ne puissent pas diverger.
 */
export function ruleKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function sameRuleKey(a: string, b: string): boolean {
  return ruleKey(a) === ruleKey(b);
}

export interface ListSection {
  title: string;
  entries: readonly string[];
}

/**
 * Découpe une liste collée en sections lisibles.
 *
 * Les exports d'armée varient d'un outil à l'autre, on ne suppose donc aucun format : une
 * ligne qui n'a pas l'air d'une unité (pas de quantité, pas de points, courte) est traitée
 * comme un titre de section. Le reste tombe dans la section courante.
 *
 * En l'absence de tout titre reconnaissable, tout atterrit dans une section unique — le
 * contenu reste lisible, simplement non regroupé. Mieux vaut ça qu'un découpage inventé.
 */
export function parseListSections(content: string): readonly ListSection[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections: ListSection[] = [];
  let current: { title: string; entries: string[] } | null = null;

  for (const line of lines) {
    if (isSectionTitle(line)) {
      current = { title: stripDecoration(line), entries: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { title: "Liste", entries: [] };
      sections.push(current);
    }
    current.entries.push(line);
  }

  return sections;
}

/**
 * Un titre de section ne porte ni quantité ni points, et reste court. Les entêtes tout en
 * majuscules des exports courants sont également reconnues.
 */
function isSectionTitle(line: string): boolean {
  const bare = stripDecoration(line);

  if (bare.length === 0 || bare.length > 40) {
    return false;
  }
  if (/\d/.test(bare)) {
    return false;
  }
  if (/^[A-ZÀ-Ÿ' -]+$/.test(bare) && bare.length > 2) {
    return true;
  }
  return /^(personnages?|characters?|unit[eé]s?|units?|autres?|other|transports?|v[ée]hicules?|vehicles?|fortifications?)\b/i.test(
    bare,
  );
}

function stripDecoration(line: string): string {
  return line.replace(/^[#*\-–—\s]+/, "").replace(/[:：]\s*$/, "").trim();
}

/** Résumé d'une ligne pour l'affichage compact de la matrice. */
export function shortArmyLabel(army: string, detachment?: string | null): string {
  const detail = (detachment ?? "").trim();
  return detail.length > 0 ? `${army.trim()} — ${detail}` : army.trim();
}
