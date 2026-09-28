import { dispositionShortLabel } from "./dispositions";

export interface SummarisableList {
  army: string;
  /** Texte libre : une liste peut en aligner plusieurs, saisis tels quels. */
  detachment?: string | null;
  disposition?: string | null;
}

/**
 * Résumé d'une liste sur une ligne : faction, détachement(s), disposition.
 *
 * Employé là où le coach a besoin d'identifier une liste d'un coup d'œil sans quitter
 * l'écran — les tuiles de pairing en particulier.
 *
 * Les segments absents disparaissent au lieu de laisser un séparateur orphelin : une
 * liste sans détachement afficherait sinon « Aeldari —  — Take and Hold ». Tous les
 * joueurs n'ont pas renseigné leur fiche au moment du pairing, c'est même la règle en
 * début de tournoi.
 *
 * Le détachement est restitué tel qu'il a été saisi, sans découpage ni normalisation :
 * c'est du texte libre, et une liste peut en aligner plusieurs.
 */
export function listSummary(player: SummarisableList): string {
  return [player.army, player.detachment, dispositionShortLabel(player.disposition)]
    .map((segment) => segment?.trim())
    .filter((segment): segment is string => Boolean(segment))
    .join(" — ");
}
