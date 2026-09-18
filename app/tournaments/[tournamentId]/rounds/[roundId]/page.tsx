import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageRounds } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { MatrixPlayer } from "@/lib/estimates/matrix";
import { ROUND_STATUS_LABEL, allowedTransitions } from "@/lib/rounds/status";
import { LiveMatrix } from "@/components/estimates/LiveMatrix";
import { changeRoundStatus } from "../actions";

export default async function RoundPage({
  params,
}: {
  params: Promise<{ tournamentId: string; roundId: string }>;
}) {
  const { tournamentId, roundId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("id, number, scenario, status, opponent_team_id, tournament_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round || round.tournament_id !== tournamentId) {
    notFound();
  }

  const { data: opponentTeam } = await supabase
    .from("teams")
    .select("name")
    .eq("id", round.opponent_team_id)
    .maybeSingle();

  const { data: ourTeam } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", tournamentId)
    .eq("kind", "OUR_TEAM")
    .maybeSingle();

  const [{ data: ourPlayers }, { data: opponentPlayers }] = await Promise.all([
    ourTeam
      ? supabase
          .from("players")
          .select("id, name, army, detachment")
          .eq("team_id", ourTeam.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as MatrixPlayer[] }),
    supabase
      .from("players")
      .select("id, name, army, detachment")
      .eq("team_id", round.opponent_team_id)
      .order("created_at", { ascending: true }),
  ]);

  // Rendu initial servi par le serveur : la matrice est lisible avant même que la
  // connexion temps réel soit établie.
  const { data: estimates } = await supabase
    .from("estimates")
    .select("player_id, opponent_player_id, value, comment")
    .eq("tournament_id", tournamentId);

  const isCoach = canManageRounds(user.role);
  const transitions = allowedTransitions(round.status);

  return (
    <div className="container-fluid py-4">
      <nav aria-label="fil d'Ariane" className="mb-3">
        <Link href={`/tournaments/${tournamentId}/rounds`} className="small">
          ← Rondes
        </Link>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Ronde {round.number} — {ourTeam?.name ?? "Notre équipe"} contre{" "}
            {opponentTeam?.name ?? "?"}
          </h1>
          {round.scenario ? (
            <p className="text-body-secondary mb-0">{round.scenario}</p>
          ) : null}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="badge text-bg-secondary">
            {ROUND_STATUS_LABEL[round.status]}
          </span>

          {isCoach
            ? transitions.map((target) => (
                <form key={target} action={changeRoundStatus}>
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <input type="hidden" name="roundId" value={roundId} />
                  <input type="hidden" name="status" value={target} />
                  <button type="submit" className="btn btn-outline-primary btn-sm">
                    {ROUND_STATUS_LABEL[target]}
                  </button>
                </form>
              ))
            : null}

          <Link
            href={`/tournaments/${tournamentId}/rounds/${roundId}/estimates`}
            className="btn btn-outline-secondary btn-sm"
          >
            Mes estimés
          </Link>

          {isCoach ? (
            <Link
              href={`/tournaments/${tournamentId}/rounds/${roundId}/pairing`}
              className="btn btn-primary btn-sm"
            >
              Pairing live
            </Link>
          ) : null}
        </div>
      </div>

      <section>
        <h2 className="h6 mb-3">Matrice d&apos;estimés</h2>
        <LiveMatrix
          tournamentId={tournamentId}
          ourPlayers={(ourPlayers ?? []) as MatrixPlayer[]}
          opponentPlayers={(opponentPlayers ?? []) as MatrixPlayer[]}
          initialEstimates={estimates ?? []}
        />
      </section>
    </div>
  );
}
