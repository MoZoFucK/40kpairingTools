import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { endingAt, dashboardTrail } from "@/lib/navigation/trail";
import { TournamentForm } from "./TournamentForm";

export const metadata = { title: "Tournois — 40K Team Pairing Assistant" };

export default async function TournamentsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // La RLS restreint déjà la liste aux tournois que cet utilisateur peut voir.
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, team_size, created_at")
    .order("created_at", { ascending: false });

  const isCoach = canManageTeam(user.role);

  return (
    <div className="container py-4">
      <Breadcrumb items={endingAt(dashboardTrail(), "Tournois")} />

      <h1 className="h4 mb-4">Tournois</h1>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          {tournaments && tournaments.length > 0 ? (
            <ul className="list-group">
              {tournaments.map((tournament) => (
                <li
                  key={tournament.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <Link href={`/tournaments/${tournament.id}`} className="fw-semibold">
                    {tournament.name}
                  </Link>
                  <span className="badge text-bg-secondary">
                    {tournament.team_size} joueurs
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-secondary">
              {isCoach
                ? "Aucun tournoi pour l'instant. Crée le premier."
                : "Aucun tournoi ne t'est encore rattaché. Ton coach doit t'ajouter à une équipe."}
            </p>
          )}
        </div>

        {isCoach ? (
          <div className="col-12 col-lg-5">
            <div className="card">
              <div className="card-body">
                <h2 className="h6 mb-3">Nouveau tournoi</h2>
                <TournamentForm />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
