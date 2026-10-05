import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHelp } from "@/components/help/PageHelp";
import { endingAt, tournamentTrail } from "@/lib/navigation/trail";
import { ROUND_STATUS_LABEL } from "@/lib/rounds/status";

/**
 * Historique des rondes — §32.
 *
 * Les données ne sont jamais supprimées après une ronde (§14) : chaque ronde reste
 * consultable avec son équipe adverse, ses listes, ses estimés et son pairing.
 */
export default async function HistoryPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    notFound();
  }

  const [{ data: rounds }, { data: teams }] = await Promise.all([
    supabase
      .from("rounds")
      .select("id, number, status, opponent_team_id")
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", tournamentId),
  ]);

  const teamName = new Map((teams ?? []).map((team) => [team.id, team.name]));

  const { data: matches } = await supabase
    .from("matches")
    .select("round_id");

  const matchCount = new Map<string, number>();
  for (const match of matches ?? []) {
    matchCount.set(match.round_id, (matchCount.get(match.round_id) ?? 0) + 1);
  }

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(tournamentTrail(tournamentId, tournament.name), "Historique")}
      />
      <PageHelp page="history" />

      <h1 className="h4 mb-4">Historique</h1>

      {rounds && rounds.length > 0 ? (
        <ul className="list-group">
          {rounds.map((round) => (
            <li key={round.id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <Link
                    href={`/tournaments/${tournamentId}/history/${round.id}`}
                    className="fw-semibold"
                  >
                    Ronde {round.number} — {teamName.get(round.opponent_team_id) ?? "?"}
                  </Link>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge text-bg-secondary">
                    {ROUND_STATUS_LABEL[round.status]}
                  </span>
                  <span className="text-body-secondary small">
                    {matchCount.get(round.id) ?? 0} matchs
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-secondary">Aucune ronde pour l&apos;instant.</p>
      )}
    </div>
  );
}
