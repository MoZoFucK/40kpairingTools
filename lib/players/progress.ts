import type { RoundStatus } from "@/types/domain";
import { missingListFields, type ListFields, type MissingListField } from "@/lib/lists/completeness";
import {
  areTeamEstimatesEditable,
  isTournamentClosed,
  teamEstimatesClosedReason,
} from "@/lib/rounds/status";

/**
 * Avancement d'un joueur dans un tournoi : sa liste, et ses estimés équipe adverse par
 * équipe adverse.
 *
 * Fonctions pures. C'est un décompte de remplissage — combien de cases sont posées —,
 * jamais une lecture des valeurs : la répartition des estimés n'est pas résumée (§57).
 */

export interface OpponentTeamInput {
  id: string;
  name: string;
}

export interface RoundInput {
  opponent_team_id: string;
  status: RoundStatus;
}

export interface OpponentTeamProgress {
  teamId: string;
  teamName: string;
  /** Estimés posés par le joueur contre cette équipe. */
  filled: number;
  /** Joueurs adverses saisis. Zéro : l'équipe n'a pas encore de listes. */
  total: number;
  editable: boolean;
  closedReason: string | null;
}

export function opponentTeamsProgress(
  teams: readonly OpponentTeamInput[],
  opponentPlayers: readonly { id: string; team_id: string }[],
  rounds: readonly RoundInput[],
  estimatedOpponentIds: ReadonlySet<string>,
): OpponentTeamProgress[] {
  return teams.map((team) => {
    const roster = opponentPlayers.filter((player) => player.team_id === team.id);
    const statuses = rounds
      .filter((round) => round.opponent_team_id === team.id)
      .map((round) => round.status);

    return {
      teamId: team.id,
      teamName: team.name,
      filled: roster.filter((player) => estimatedOpponentIds.has(player.id)).length,
      total: roster.length,
      editable: areTeamEstimatesEditable(statuses),
      closedReason: teamEstimatesClosedReason(statuses),
    };
  });
}

export type PlayerTodo =
  | { kind: "list"; missing: MissingListField[] }
  | { kind: "estimates"; teamId: string; teamName: string; filled: number; total: number };

/**
 * Ce qu'il reste à faire au joueur dans ce tournoi, dans l'ordre du déroulé : la liste
 * d'abord — sa disposition fixe les missions affichées pendant l'estimation —, puis les
 * équipes adverses encore ouvertes et pas entièrement estimées.
 *
 * Un tournoi clos ne demande plus rien : tout y est figé.
 */
export function playerTodos(
  list: ListFields,
  teams: readonly OpponentTeamProgress[],
  roundStatuses: readonly RoundStatus[],
): PlayerTodo[] {
  if (isTournamentClosed(roundStatuses)) {
    return [];
  }

  const todos: PlayerTodo[] = [];

  const missing = missingListFields(list);
  if (missing.length > 0) {
    todos.push({ kind: "list", missing });
  }

  for (const team of teams) {
    if (team.editable && team.total > 0 && team.filled < team.total) {
      todos.push({
        kind: "estimates",
        teamId: team.teamId,
        teamName: team.teamName,
        filled: team.filled,
        total: team.total,
      });
    }
  }

  return todos;
}
