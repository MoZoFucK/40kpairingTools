import type { UserRole } from "@/types/domain";

/**
 * Permissions par rôle — cahier des charges §8.
 *
 * Fonctions pures, sans dépendance à Supabase ni à React, pour rester testables
 * unitairement. Elles décrivent qui a le droit de faire quoi ; elles ne décident
 * jamais de ce qu'il faut faire.
 */

/** ADMIN couvre toutes les actions du COACH (§8). */
const RANK: Record<UserRole, number> = {
  PLAYER: 0,
  COACH: 1,
  ADMIN: 2,
};

export function hasAtLeast(role: UserRole, minimum: UserRole): boolean {
  return RANK[role] >= RANK[minimum];
}

export function canManageTeam(role: UserRole): boolean {
  return hasAtLeast(role, "COACH");
}

export function canImportOpponents(role: UserRole): boolean {
  return hasAtLeast(role, "COACH");
}

export function canManageRounds(role: UserRole): boolean {
  return hasAtLeast(role, "COACH");
}

export function canRunPairing(role: UserRole): boolean {
  return hasAtLeast(role, "COACH");
}

export function canLockRound(role: UserRole): boolean {
  return hasAtLeast(role, "COACH");
}

export function canManageUsers(role: UserRole): boolean {
  return hasAtLeast(role, "ADMIN");
}

/**
 * Un joueur saisit ses propres estimés, et uniquement les siens (§8, §12).
 * Le coach consulte tous les estimés mais ne les saisit pas à la place des joueurs.
 */
export function canEditEstimatesOf(
  role: UserRole,
  actorPlayerId: string | undefined,
  targetPlayerId: string,
): boolean {
  if (role === "ADMIN") {
    return true;
  }
  return actorPlayerId !== undefined && actorPlayerId === targetPlayerId;
}

export function canReadAllEstimates(role: UserRole): boolean {
  return hasAtLeast(role, "COACH");
}
