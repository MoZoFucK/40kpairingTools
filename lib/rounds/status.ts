import type { RoundStatus } from "@/types/domain";

/**
 * Cycle de vie d'une ronde — §10.6 et §18.
 *
 * Fonctions pures : elles disent ce qu'un statut autorise, jamais ce qu'il faudrait faire.
 * La base applique les mêmes règles via `estimates_open_for`, pour que les deux côtés ne
 * puissent pas diverger.
 */

export const ROUND_STATUS_LABEL: Readonly<Record<RoundStatus, string>> = {
  PREPARATION: "Préparation",
  ESTIMATES_OPEN: "Estimés ouverts",
  ESTIMATES_LOCKED: "Estimés verrouillés",
  PAIRING: "Pairing en cours",
  COMPLETED: "Terminée",
  LOCKED: "Verrouillée",
};

/** Statuts pendant lesquels un joueur peut encore saisir ou corriger ses estimés. */
const EDITABLE: readonly RoundStatus[] = ["PREPARATION", "ESTIMATES_OPEN"];

export function areEstimatesEditable(status: RoundStatus): boolean {
  return EDITABLE.includes(status);
}

/** Une ronde verrouillée ne se modifie plus du tout (§39). */
export function isRoundLocked(status: RoundStatus): boolean {
  return status === "LOCKED";
}

/**
 * Transitions offertes au coach depuis un statut donné.
 *
 * L'ordre est celui du déroulé normal, mais les retours en arrière restent possibles tant
 * que la ronde n'est pas verrouillée : une erreur de manipulation ne doit pas condamner
 * une ronde. Seul `LOCKED` est définitif.
 */
export function allowedTransitions(status: RoundStatus): readonly RoundStatus[] {
  switch (status) {
    case "PREPARATION":
      return ["ESTIMATES_OPEN"];
    case "ESTIMATES_OPEN":
      return ["PREPARATION", "ESTIMATES_LOCKED"];
    case "ESTIMATES_LOCKED":
      return ["ESTIMATES_OPEN", "PAIRING"];
    case "PAIRING":
      return ["ESTIMATES_LOCKED", "COMPLETED"];
    case "COMPLETED":
      return ["PAIRING", "LOCKED"];
    case "LOCKED":
      return [];
  }
}

export function canTransition(from: RoundStatus, to: RoundStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/** Message affiché au joueur quand la saisie lui est fermée (§37). */
export function estimatesClosedReason(status: RoundStatus): string | null {
  if (areEstimatesEditable(status)) {
    return null;
  }
  if (status === "PAIRING") {
    return "Le pairing est en cours : les estimés sont en lecture seule.";
  }
  if (status === "LOCKED" || status === "COMPLETED") {
    return "Cette ronde est terminée : les estimés ne sont plus modifiables.";
  }
  return "La phase d'estimation est verrouillée : les estimés ne sont plus modifiables.";
}
