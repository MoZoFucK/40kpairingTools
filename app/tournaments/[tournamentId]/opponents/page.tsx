import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
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

  const isCoach = canManageTeam(user.role);

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(tournamentTrail(tournamentId, tournament.name), "Équipes adverses")}
      />

      <h1 className="h4 mb-4">Équipes adverses</h1>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          {teams && teams.length > 0 ? (
            <ul className="list-group">
              {teams.map((team) => (
                <li key={team.id} className="list-group-item">
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
                </li>
              ))}
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
