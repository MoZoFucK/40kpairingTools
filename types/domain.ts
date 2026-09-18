/**
 * Types du domaine — cahier des charges §10.
 * Aucune logique ici : uniquement la forme des données.
 */

export type TeamKind = "OUR_TEAM" | "OPPONENT";

export type UserRole = "PLAYER" | "COACH" | "ADMIN";

export type RoundStatus =
  | "PREPARATION"
  | "ESTIMATES_OPEN"
  | "ESTIMATES_LOCKED"
  | "PAIRING"
  | "COMPLETED"
  | "LOCKED";

/** Valeur d'un estimé. Donnée utilisateur, jamais calculée (§57). */
export type EstimateValue = 1 | 2 | 3 | 4 | 5;

export interface Tournament {
  id: string;
  name: string;
  teamSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  kind: TeamKind;
  name: string;
  shortName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  /** Absent pour les joueurs adverses, qui n'ont pas de compte. */
  userId?: string;
  name: string;
  army: string;
  detachment?: string;
  listName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmyList {
  id: string;
  playerId: string;
  army: string;
  detachment?: string;
  listName?: string;
  /** Source importée conservée telle quelle, pour retraitement futur (§42). */
  rawContent?: string;
  rawRow?: Record<string, unknown>;
}

export interface Estimate {
  id: string;
  playerId: string;
  opponentPlayerId: string;
  value: EstimateValue;
  comment?: string;
  updatedAt: string;
}

export interface Round {
  id: string;
  tournamentId: string;
  number: number;
  opponentTeamId: string;
  scenario?: string;
  status: RoundStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Origine d'un match, reprise des sections du classeur de l'équipe.
 * SELECTED       : issu d'un choix de défenseur.
 * REJECTED_PAIR  : les deux attaquants refusés de la dernière étape.
 * REMAINING_PAIR : les deux derniers joueurs.
 */
export type MatchOrigin = "SELECTED" | "REJECTED_PAIR" | "REMAINING_PAIR";

export interface Match {
  id: string;
  roundId: string;
  ourPlayerId: string;
  opponentPlayerId: string;
  origin: MatchOrigin;
  table?: number;
  createdAt: string;
}
