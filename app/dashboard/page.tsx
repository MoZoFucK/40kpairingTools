import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam, ROLE_LABEL } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  areEstimatesEditable,
  isPairingUnderway,
  isTournamentClosed,
  ROUND_STATUS_LABEL,
} from "@/lib/rounds/status";

export const metadata = { title: "Tableau de bord — 40K Team Pairing Assistant" };

/**
 * Tableau de bord.
 *
 * Un joueur ouvre l'application pour une seule raison : saisir ses estimés. Cet écran
 * l'y mène en un clic (§34), au lieu de le faire traverser tournoi puis rondes. Les
 * rondes ouvertes à la saisie sont donc remontées ici.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ refus?: string }>;
}) {
  const user = await requireUser();
  const { refus } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user: account },
  } = await supabase.auth.getUser();

  // La RLS ne renvoie que les tournois accessibles à cet utilisateur.
  const [{ data: tournaments }, { data: rounds }, { data: myPlayers }] = await Promise.all([
    supabase.from("tournaments").select("id, name").order("created_at", { ascending: false }),
    supabase
      .from("rounds")
      .select("id, number, status, tournament_id")
      .order("number", { ascending: true }),
    supabase.from("players").select("id, team_id").eq("user_id", account?.id ?? ""),
  ]);

  const tournamentName = new Map((tournaments ?? []).map((t) => [t.id, t.name]));

  // Tournois où cet utilisateur possède une fiche joueur : sans elle, il n'a rien à saisir.
  const { data: myTeams } = (myPlayers ?? []).length > 0
    ? await supabase
        .from("teams")
        .select("id, tournament_id")
        .in("id", (myPlayers ?? []).map((player) => player.team_id))
    : { data: [] };

  const playableTournaments = new Set((myTeams ?? []).map((team) => team.tournament_id));

  const openRounds = (rounds ?? []).filter(
    (round) =>
      areEstimatesEditable(round.status) && playableTournaments.has(round.tournament_id),
  );

  const isCoach = canManageTeam(user.role);

  /** Tournois dont toutes les rondes sont verrouillées : la liste n'y est plus modifiable. */
  const closedTournaments = new Set(
    (tournaments ?? [])
      .filter((tournament) =>
        isTournamentClosed(
          (rounds ?? [])
            .filter((round) => round.tournament_id === tournament.id)
            .map((round) => round.status),
        ),
      )
      .map((tournament) => tournament.id),
  );

  /*
   * Rondes dont le coach a lui-même ouvert le pairing. Le tableau de bord ne choisit pas
   * la ronde du jour : il répète le statut déjà posé, pour épargner trois clics le jour
   * du tournoi, où l'écran de pairing est le seul que le coach ouvre.
   */
  const pairingRounds = isCoach
    ? (rounds ?? []).filter((round) => isPairingUnderway(round.status))
    : [];

  return (
    <div className="container py-5" style={{ maxWidth: "44rem" }}>
      <h1 className="h4 mb-4">Tableau de bord</h1>

      {refus === "role" ? (
        <div className="alert alert-warning" role="alert">
          Cette page est réservée au coach. Ton compte est enregistré comme{" "}
          {ROLE_LABEL[user.role].toLowerCase()}.
        </div>
      ) : null}

      {pairingRounds.length > 0 ? (
        <section className="mb-4">
          <h2 className="h6 mb-2">Pairing</h2>
          <div className="d-grid gap-2">
            {pairingRounds.map((round) => (
              <Link
                key={round.id}
                href={`/tournaments/${round.tournament_id}/rounds/${round.id}/pairing`}
                className="btn btn-primary text-start"
              >
                <span className="fw-semibold d-block">Ouvrir le pairing</span>
                <span className="small">
                  {tournamentName.get(round.tournament_id) ?? "Tournoi"} · ronde{" "}
                  {round.number} · {ROUND_STATUS_LABEL[round.status].toLowerCase()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-4">
        <h2 className="h6 mb-2">Mes estimés</h2>

        {openRounds.length > 0 ? (
          <div className="d-grid gap-2">
            {openRounds.map((round) => (
              <Link
                key={round.id}
                href={`/tournaments/${round.tournament_id}/rounds/${round.id}/estimates`}
                className="btn btn-primary text-start"
              >
                <span className="fw-semibold d-block">Saisir mes estimés</span>
                <span className="small">
                  {tournamentName.get(round.tournament_id) ?? "Tournoi"} · ronde{" "}
                  {round.number}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-body-secondary mb-0">
            {playableTournaments.size === 0
              ? "Ton compte n'est rattaché à aucune fiche joueur. Ton coach doit faire le rattachement depuis l'écran de son équipe."
              : "Aucune ronde n'est ouverte à la saisie pour l'instant."}
          </p>
        )}
      </section>

      {playableTournaments.size > 0 ? (
        <section className="mb-4">
          <h2 className="h6 mb-2">Ma liste</h2>
          <div className="d-grid gap-2">
            {[...playableTournaments].map((id) => {
              // Le coach peut encore corriger sa liste après coup ; le joueur la consulte.
              const locked = closedTournaments.has(id) && !isCoach;

              return (
                <Link
                  key={id}
                  href={`/tournaments/${id}/my-list`}
                  className={`btn text-start ${locked ? "btn-outline-secondary" : "btn-outline-primary"}`}
                >
                  <span className="fw-semibold d-block">
                    {locked ? "Consulter ma liste" : "Saisir ma liste"}
                  </span>
                  <span className="small">
                    {tournamentName.get(id) ?? "Tournoi"}
                    {locked ? " · tournoi terminé" : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="h6 mb-2">Tournois</h2>

        {tournaments && tournaments.length > 0 ? (
          <ul className="list-group">
            {tournaments.map((tournament) => {
              const tournamentRounds = (rounds ?? []).filter(
                (round) => round.tournament_id === tournament.id,
              );

              return (
                <li
                  key={tournament.id}
                  className="list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap"
                >
                  <Link href={`/tournaments/${tournament.id}`} className="fw-semibold">
                    {tournament.name}
                  </Link>

                  <span className="d-flex align-items-center gap-2 flex-wrap">
                    {tournamentRounds.slice(-1).map((round) => (
                      <span key={round.id} className="badge text-bg-secondary">
                        Ronde {round.number} · {ROUND_STATUS_LABEL[round.status]}
                      </span>
                    ))}
                    <Link
                      href={`/tournaments/${tournament.id}/rounds`}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      Rondes
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body-secondary mb-0">
            {isCoach
              ? "Aucun tournoi. Crée le premier depuis la page Tournois."
              : "Aucun tournoi ne t'est rattaché."}
          </p>
        )}

        {isCoach ? (
          <Link href="/tournaments" className="btn btn-outline-primary btn-sm mt-3">
            Gérer les tournois
          </Link>
        ) : null}
      </section>
    </div>
  );
}
