/**
 * Validation des saisies d'équipe.
 *
 * Fonctions pures, sans dépendance à React ni à Supabase, pour être testables et pour
 * pouvoir être appelées côté serveur — seule validation qui fasse foi (§38). Les messages
 * sont rédigés pour l'utilisateur, jamais pour le développeur (§37).
 */

export const MIN_TEAM_SIZE = 4;
export const MAX_TEAM_SIZE = 12;

export type FieldErrors = Readonly<Record<string, string>>;

export interface TournamentInput {
  name: string;
  teamSize: number;
}

export interface PlayerInput {
  name: string;
  army: string;
  detachment?: string;
  listName?: string;
}

export interface TeamInput {
  name: string;
  shortName?: string;
}

function trimmed(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Chaîne nettoyée, ou `undefined` si elle ne contient rien d'utile. */
export function optionalText(value: string | undefined): string | undefined {
  const text = trimmed(value);
  return text.length > 0 ? text : undefined;
}

export function validateTeamSize(teamSize: number): string | null {
  if (!Number.isInteger(teamSize)) {
    return "La taille d'équipe doit être un nombre entier.";
  }
  if (teamSize < MIN_TEAM_SIZE || teamSize > MAX_TEAM_SIZE) {
    return `La taille d'équipe doit être comprise entre ${MIN_TEAM_SIZE} et ${MAX_TEAM_SIZE}.`;
  }
  if (teamSize % 2 !== 0) {
    return "La taille d'équipe doit être paire : le pairing apparie les joueurs deux à deux.";
  }
  return null;
}

export function validateTournament(input: TournamentInput): FieldErrors {
  const errors: Record<string, string> = {};

  if (trimmed(input.name).length === 0) {
    errors.name = "Donne un nom au tournoi.";
  }

  const sizeError = validateTeamSize(input.teamSize);
  if (sizeError) {
    errors.teamSize = sizeError;
  }

  return errors;
}

export function validateTeam(input: TeamInput): FieldErrors {
  const errors: Record<string, string> = {};

  if (trimmed(input.name).length === 0) {
    errors.name = "Donne un nom à l'équipe.";
  }

  const shortName = trimmed(input.shortName);
  if (shortName.length > 12) {
    errors.shortName = "Le nom court ne doit pas dépasser 12 caractères.";
  }

  return errors;
}

export function validatePlayer(input: PlayerInput): FieldErrors {
  const errors: Record<string, string> = {};

  if (trimmed(input.name).length === 0) {
    errors.name = "Indique le nom du joueur.";
  }
  if (trimmed(input.army).length === 0) {
    errors.army = "Indique l'armée du joueur.";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Le dépassement d'effectif est signalé, jamais bloqué en base : un coach peut avoir
 * besoin d'inscrire un remplaçant avant de retirer quelqu'un. C'est un avertissement,
 * pas une erreur.
 */
export function teamSizeNotice(playerCount: number, teamSize: number): string | null {
  if (playerCount > teamSize) {
    return `${playerCount} joueurs pour une équipe de ${teamSize} : il y a ${playerCount - teamSize} joueur(s) en trop.`;
  }
  if (playerCount < teamSize) {
    return `${playerCount} joueurs sur ${teamSize} : il en manque ${teamSize - playerCount}.`;
  }
  return null;
}
