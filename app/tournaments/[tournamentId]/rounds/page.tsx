import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageRounds } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { isPairingReachable, ROUND_STATUS_LABEL } from "@/lib/rounds/status";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { endingAt, tournamentTrail } from "@/lib/navigation/trail";
import { NewRoundForm } from "./NewRoundForm";

export default async function RoundsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    notFound();
  }

  const [{ data: rounds }, { data: opponentTeams }] = await Promise.all([
    supabase
      .from("rounds")
      .select("id, number, scenario, status, opponent_team_id")
      .eq("tournament_id", tournamentId)
      .order("number", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", tournamentId)
      .eq("kind", "OPPONENT")
      .order("created_at", { ascending: true }),
  ]);

  const teamName = new Map((opponentTeams ?? []).map((team) => [team.id, team.name]));
  const isCoach = canManageRounds(user.role);
  const nextNumber = (rounds ?? []).reduce((max, round) => Math.max(max, round.number), 0) + 1;

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(tournamentTrail(tournamentId, tournament.name), "Rondes")}
      />

      <h1 className="h4 mb-4">Rondes</h1>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          {rounds && rounds.length > 0 ? (
            <ul className="list-group">
              {rounds.map((round) => (
                <li
                  key={round.id}
                  className="list-group-item d-flex justify-content-between align-items-center gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/tournaments/${tournamentId}/rounds/${round.id}`}
                      className="fw-semibold"
                    >
                      Ronde {round.number} — {teamName.get(round.opponent_team_id) ?? "?"}
                    </Link>
                    {round.scenario ? (
                      <div className="text-body-secondary small">{round.scenario}</div>
                    ) : null}
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <span className="badge text-bg-secondary">
                      {ROUND_STATUS_LABEL[round.status]}
                    </span>
                    <Link
                      href={`/tournaments/${tournamentId}/rounds/${round.id}/estimates`}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      Mes estimés
                    </Link>
                    {isCoach && isPairingReachable(round.status) ? (
                      <Link
                        href={`/tournaments/${tournamentId}/rounds/${round.id}/pairing`}
                        className="btn btn-primary btn-sm"
                      >
                        Pairing
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-secondary">
              Aucune ronde. {isCoach ? "Crée la première." : ""}
            </p>
          )}
        </div>

        {isCoach ? (
          <div className="col-12 col-lg-5">
            <div className="card">
              <div className="card-body">
                <h2 className="h6 mb-3">Nouvelle ronde</h2>
                {opponentTeams && opponentTeams.length > 0 ? (
                  <NewRoundForm
                    tournamentId={tournamentId}
                    opponentTeams={opponentTeams}
                    nextNumber={nextNumber}
                  />
                ) : (
                  <p className="text-body-secondary mb-0">
                    Crée d&apos;abord une{" "}
                    <Link href={`/tournaments/${tournamentId}/opponents`}>
                      équipe adverse
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
