import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHelp } from "@/components/help/PageHelp";
import { endingAt, tournamentTrail } from "@/lib/navigation/trail";
import { NewOpponentTeamForm } from "./NewOpponentTeamForm";

export default async function OpponentsPage({
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

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .eq("tournament_id", tournamentId)
    .eq("kind", "OPPONENT")
    .order("created_at", { ascending: true });

  // Avancement de la vérification des listes, équipe par équipe.
  const { data: opponentPlayers } =
    teams && teams.length > 0
      ? await supabase
          .from("players")
          .select("team_id, list_verified_at")
          .in(
            "team_id",
            teams.map((team) => team.id),
          )
      : { data: [] };

  const verificationByTeam = new Map<
    string,
    { verified: number; total: number }
  >();
  for (const row of opponentPlayers ?? []) {
    const entry = verificationByTeam.get(row.team_id) ?? {
      verified: 0,
      total: 0,
    };
    entry.total += 1;
    if (row.list_verified_at) {
      entry.verified += 1;
    }
    verificationByTeam.set(row.team_id, entry);
  }

  const isCoach = canManageTeam(user.role);

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(
          tournamentTrail(tournamentId, tournament.name),
          "Équipes adverses",
        )}
      />
      <PageHelp page="opponents" />

      <h1 className="h4 mb-4">Équipes adverses</h1>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          {teams && teams.length > 0 ? (
            <ul className="list-group">
              {teams.map((team) => {
                const progress = verificationByTeam.get(team.id);
                return (
                  <li
                    key={team.id}
                    className="list-group-item d-flex justify-content-between align-items-center gap-2"
                  >
                    <span>
                      <Link
                        href={`/tournaments/${tournamentId}/opponents/${team.id}`}
                        className="fw-semibold"
                      >
                        {team.name}
                      </Link>
                      {team.short_name ? (
                        <span className="text-body-secondary small ms-2">
                          {team.short_name}
                        </span>
                      ) : null}
                    </span>
                    {progress ? (
                      <span
                        className={`badge ${
                          progress.verified === progress.total
                            ? "text-bg-success"
                            : "text-bg-secondary"
                        }`}
                        title="Listes vérifiées par l'équipe"
                      >
                        {progress.verified}/{progress.total} listes vérifiées
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-secondary">
              Aucune équipe adverse enregistrée. Les équipes rencontrées restent
              conservées d&apos;une ronde à l&apos;autre.
            </p>
          )}
        </div>

        {isCoach ? (
          <div className="col-12 col-lg-5">
            <div className="card">
              <div className="card-body">
                <h2 className="h6 mb-3">Nouvelle équipe adverse</h2>
                <NewOpponentTeamForm tournamentId={tournamentId} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
