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
 * Un tournoi est clos quand toutes ses rondes sont verrouillées.
 *
 * Les listes d'un tournoi clos font partie de son historique : les modifier réécrirait ce
 * que la consultation des rondes passées affiche. Un tournoi sans ronde n'est pas clos —
 * il n'a pas encore commencé.
 *
 * La base applique la même règle (migration 0012), pour qu'un appel direct à l'API ne
 * puisse pas la contourner.
 */
export function isTournamentClosed(statuses: readonly RoundStatus[]): boolean {
  return statuses.length > 0 && statuses.every(isRoundLocked);
}

/**
 * L'écran de pairing a-t-il quelque chose à montrer pour ce statut ?
 *
 * Tout sauf `PREPARATION`, où aucun effectif n'est encore figé : y conduire le coach
 * l'amènerait sur un écran qui ne sait que lui dire de revenir plus tard.
 *
 * Ne dit pas s'il *faut* ouvrir le pairing, seulement si l'écran est atteignable.
 */
export function isPairingReachable(status: RoundStatus): boolean {
  return status !== "PREPARATION";
}

/**
 * Le pairing de cette ronde est-il en cours, ou sur le point de commencer ?
 *
 * Sert à remonter la ronde du jour sur le tableau de bord. Critère purement mécanique,
 * lu dans le statut que le coach a lui-même posé : l'outil ne devine pas quelle ronde
 * compte, il répète celle que le coach a déjà désignée.
 */
export function isPairingUnderway(status: RoundStatus): boolean {
  return status === "ESTIMATES_LOCKED" || status === "PAIRING";
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

/**
 * Les estimés contre une équipe adverse sont-ils encore modifiables ?
 *
 * Un estimé vise un joueur adverse, pas une ronde : le joueur estime une équipe avant même
 * que le tirage dise quand il la rencontrera. Reçoit les statuts de toutes les rondes qui
 * opposent cette équipe à la nôtre — aucune ronde encore, la saisie est libre.
 *
 * Miroir exact de `estimates_open_for` (migration 0006), qui fait foi en base.
 */
export function areTeamEstimatesEditable(statuses: readonly RoundStatus[]): boolean {
  return statuses.every(areEstimatesEditable);
}

/**
 * Message affiché au joueur quand la saisie contre une équipe lui est fermée.
 *
 * Le statut le plus avancé l'emporte : c'est lui qui bloque.
 */
export function teamEstimatesClosedReason(statuses: readonly RoundStatus[]): string | null {
  const blocking = statuses.find((status) => !areEstimatesEditable(status));
  return blocking ? estimatesClosedReason(blocking) : null;
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
