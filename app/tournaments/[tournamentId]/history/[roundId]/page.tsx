import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { buildMatrix, getCell, type MatrixPlayer } from "@/lib/estimates/matrix";
import { estimateLevel } from "@/lib/estimates/scale";
import { ROUND_STATUS_LABEL } from "@/lib/rounds/status";
import { describeStoredAction } from "@/lib/pairing/journal";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { endingAt, historyTrail } from "@/lib/navigation/trail";
import type { StoredPairingAction } from "@/lib/pairing/persistence";

/**
 * Consultation d'une ronde passée — §32.
 *
 * Strictement en lecture : aucune action, aucun formulaire. Le pairing, les estimés et le
 * journal sont restitués tels qu'ils ont été enregistrés.
 */
export default async function HistoryRoundPage({
  params,
}: {
  params: Promise<{ tournamentId: string; roundId: string }>;
}) {
  const { tournamentId, roundId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("id, number, scenario, status, opponent_team_id, tournament_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round || round.tournament_id !== tournamentId) {
    notFound();
  }

  const [{ data: opponentTeam }, { data: ourTeam }, { data: tournament }] =
    await Promise.all([
      supabase.from("teams").select("name").eq("id", round.opponent_team_id).maybeSingle(),
      supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .eq("kind", "OUR_TEAM")
        .maybeSingle(),
      supabase.from("tournaments").select("name").eq("id", tournamentId).maybeSingle(),
    ]);

  const [{ data: ours }, { data: theirs }] = await Promise.all([
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

  const [{ data: estimates }, { data: matches }, { data: actions }] = await Promise.all([
    supabase
      .from("estimates")
      .select("player_id, opponent_player_id, value, comment")
      .eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("id, our_player_id, opponent_player_id, origin, table_number")
      .eq("round_id", roundId),
    supabase
      .from("pairing_actions")
      .select("id, sequence, type, side, player_ids, created_at")
      .eq("round_id", roundId)
      .order("sequence", { ascending: true }),
  ]);

  const ourPlayers = (ours ?? []) as MatrixPlayer[];
  const opponentPlayers = (theirs ?? []) as MatrixPlayer[];
  const byId = new Map<string, MatrixPlayer>(
    [...ourPlayers, ...opponentPlayers].map((player) => [player.id, player]),
  );
  const matrix = buildMatrix(ourPlayers, opponentPlayers, estimates ?? []);

  const ordered = [...(matches ?? [])].sort(
    (a, b) => (a.table_number ?? 99) - (b.table_number ?? 99),
  );

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(
          historyTrail(tournamentId, tournament?.name ?? "Tournoi"),
          `Ronde ${round.number}`,
        )}
      />

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Ronde {round.number} — {ourTeam?.name ?? "Notre équipe"} contre{" "}
            {opponentTeam?.name ?? "?"}
          </h1>
          {round.scenario ? (
            <p className="text-body-secondary mb-0">{round.scenario}</p>
          ) : null}
        </div>
        <span className="badge text-bg-secondary">{ROUND_STATUS_LABEL[round.status]}</span>
      </div>

      <section className="mb-4">
        <h2 className="h6 mb-2">Pairing</h2>
        {ordered.length === 0 ? (
          <p className="text-body-secondary mb-0">
            Le pairing de cette ronde n&apos;a pas été terminé.
          </p>
        ) : (
          <ul className="list-group">
            {ordered.map((match) => (
              <li key={match.id} className="list-group-item d-flex gap-3">
                <span
                  className="text-body-secondary flex-shrink-0"
                  style={{ minWidth: "5rem" }}
                >
                  {match.table_number ? `Table ${match.table_number}` : "Table —"}
                </span>
                <span>
                  <span className="fw-semibold">{byId.get(match.our_player_id)?.name}</span>{" "}
                  <span className="text-body-secondary">
                    ({byId.get(match.our_player_id)?.army})
                  </span>
                  {" contre "}
                  <span className="fw-semibold">
                    {byId.get(match.opponent_player_id)?.name}
                  </span>{" "}
                  <span className="text-body-secondary">
                    ({byId.get(match.opponent_player_id)?.army})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <h2 className="h6 mb-2">Estimés</h2>
        <div className="table-responsive">
          <table className="table table-bordered table-sm align-middle mb-0">
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: "10rem" }}></th>
                {opponentPlayers.map((opponent) => (
                  <th key={opponent.id} scope="col" className="text-center small">
                    <div className="fw-semibold">{opponent.name}</div>
                    <div className="fw-normal text-body-secondary">{opponent.army}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ourPlayers.map((ourPlayer) => (
                <tr key={ourPlayer.id}>
                  <th scope="row" className="small">
                    <div className="fw-semibold">{ourPlayer.name}</div>
                    <div className="fw-normal text-body-secondary">{ourPlayer.army}</div>
                  </th>
                  {opponentPlayers.map((opponent) => {
                    const value = getCell(matrix, ourPlayer.id, opponent.id)?.value ?? null;
                    return (
                      <td
                        key={opponent.id}
                        className={`text-center fw-semibold ${
                          value === null ? "" : estimateLevel(value).className
                        }`}
                      >
                        {value ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="h6 mb-2">Journal des actions</h2>
        {actions && actions.length > 0 ? (
          <ol className="list-group list-group-numbered">
            {actions.map((action) => (
              <li key={action.id} className="list-group-item small">
                <span className="text-body-secondary me-2">
                  {new Date(action.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {describeStoredAction(action as StoredPairingAction, byId)}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body-secondary mb-0">Aucune action enregistrée.</p>
        )}
      </section>
    </div>
  );
}
