import type { createClient } from "@/lib/supabase/server";
import { isTournamentClosed } from "@/lib/rounds/status";
import {
  opponentTeamsProgress,
  playerTodos,
  type OpponentTeamProgress,
  type PlayerTodo,
} from "./progress";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface MyFiche {
  id: string;
  name: string;
  army: string;
  detachment: string | null;
  disposition: string | null;
}

export interface PlayerWork {
  tournamentId: string;
  me: MyFiche;
  closed: boolean;
  teams: OpponentTeamProgress[];
  todos: PlayerTodo[];
}

/**
 * Charge, pour chaque tournoi où ce compte possède une fiche joueur, l'avancement de sa
 * liste et de ses estimés.
 *
 * Un nombre fixe de requêtes, quel que soit le nombre de tournois : le tableau de bord
 * l'appelle à chaque ouverture. `tournamentId` restreint à un seul tournoi.
 */
export async function loadPlayerWork(
  supabase: Supabase,
  userId: string,
  tournamentId?: string,
): Promise<PlayerWork[]> {
  const { data: fiches } = await supabase
    .from("players")
    .select("id, name, army, detachment, disposition, team_id")
    .eq("user_id", userId);

  if (!fiches || fiches.length === 0) {
    return [];
  }

  let ourTeamsQuery = supabase
    .from("teams")
    .select("id, tournament_id")
    .eq("kind", "OUR_TEAM")
    .in("id", fiches.map((fiche) => fiche.team_id));
  if (tournamentId) {
    ourTeamsQuery = ourTeamsQuery.eq("tournament_id", tournamentId);
  }
  const { data: ourTeams } = await ourTeamsQuery;

  const tournamentIds = [...new Set((ourTeams ?? []).map((team) => team.tournament_id))];
  if (tournamentIds.length === 0) {
    return [];
  }

  const [{ data: opponentTeams }, { data: rounds }, { data: estimates }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, tournament_id")
      .eq("kind", "OPPONENT")
      .in("tournament_id", tournamentIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("rounds")
      .select("tournament_id, opponent_team_id, status")
      .in("tournament_id", tournamentIds),
    supabase
      .from("estimates")
      .select("opponent_player_id")
      .in("player_id", fiches.map((fiche) => fiche.id)),
  ]);

  const { data: opponentPlayers } =
    (opponentTeams ?? []).length > 0
      ? await supabase
          .from("players")
          .select("id, team_id")
          .in("team_id", (opponentTeams ?? []).map((team) => team.id))
      : { data: [] };

  const estimated = new Set((estimates ?? []).map((row) => row.opponent_player_id));

  return tournamentIds.flatMap((id) => {
    const ourTeam = (ourTeams ?? []).find((team) => team.tournament_id === id);
    const fiche = fiches.find((candidate) => candidate.team_id === ourTeam?.id);
    if (!fiche) {
      return [];
    }

    const tournamentRounds = (rounds ?? []).filter((round) => round.tournament_id === id);
    const statuses = tournamentRounds.map((round) => round.status);
    const teams = opponentTeamsProgress(
      (opponentTeams ?? []).filter((team) => team.tournament_id === id),
      opponentPlayers ?? [],
      tournamentRounds,
      estimated,
    );

    const me: MyFiche = {
      id: fiche.id,
      name: fiche.name,
      army: fiche.army,
      detachment: fiche.detachment,
      disposition: fiche.disposition,
    };

    return [
      {
        tournamentId: id,
        me,
        closed: isTournamentClosed(statuses),
        teams,
        todos: playerTodos(me, teams, statuses),
      },
    ];
  });
}
