import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam, ROLE_LABEL } from "@/lib/auth/roles";
import { PageHelp } from "@/components/help/PageHelp";
import { createClient } from "@/lib/supabase/server";
import { isPairingUnderway, isTournamentClosed, ROUND_STATUS_LABEL } from "@/lib/rounds/status";
import { describeMissing, missingListFields } from "@/lib/lists/completeness";
import { loadPlayerWork, type PlayerWork } from "@/lib/players/work";

export const metadata = { title: "Tableau de bord — 40K Team Pairing Assistant" };

/**
 * Tableau de bord.
 *
 * Un joueur ouvre l'application pour savoir ce qu'il lui reste à saisir. Cet écran le
 * lui dit, tournoi par tournoi, et l'y mène en un clic (§34) : sa liste si elle est
 * incomplète, puis chaque équipe adverse pas entièrement estimée.
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
  const [{ data: tournaments }, { data: rounds }, work] = await Promise.all([
    supabase.from("tournaments").select("id, name").order("created_at", { ascending: false }),
    supabase
      .from("rounds")
      .select("id, number, status, tournament_id")
      .order("number", { ascending: true }),
    account ? loadPlayerWork(supabase, account.id) : Promise.resolve([]),
  ]);

  const tournamentName = new Map((tournaments ?? []).map((t) => [t.id, t.name]));
  const isCoach = canManageTeam(user.role);

  /** Tournois dont toutes les rondes sont verrouillées : plus rien n'y est à faire. */
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

  // Les tournois en cours d'abord, puis dans l'ordre de la liste des tournois.
  const tournamentOrder = (id: string) => (tournaments ?? []).findIndex((t) => t.id === id);
  const myWork = [...work].sort(
    (a, b) =>
      Number(a.closed) - Number(b.closed) ||
      tournamentOrder(a.tournamentId) - tournamentOrder(b.tournamentId),
  );

  /*
   * Rondes dont le coach a lui-même ouvert le pairing. Le tableau de bord ne choisit pas
   * la ronde du jour : il répète le statut déjà posé, pour épargner trois clics le jour
   * du tournoi, où l'écran de pairing est le seul que le coach ouvre.
   */
  const pairingRounds = isCoach
    ? (rounds ?? []).filter((round) => isPairingUnderway(round.status))
    : [];

  /*
   * Listes de l'équipe pas encore saisies, par tournoi en cours. Le coach relance ses
   * joueurs — ou saisit lui-même celles des joueurs sans compte.
   */
  const openTournamentIds = (tournaments ?? [])
    .map((tournament) => tournament.id)
    .filter((id) => !closedTournaments.has(id));

  const { data: ourTeams } =
    isCoach && openTournamentIds.length > 0
      ? await supabase
          .from("teams")
          .select("id, tournament_id")
          .eq("kind", "OUR_TEAM")
          .in("tournament_id", openTournamentIds)
      : { data: [] };

  const { data: ourPlayers } =
    (ourTeams ?? []).length > 0
      ? await supabase
          .from("players")
          .select("id, name, army, detachment, disposition, team_id")
          .in("team_id", (ourTeams ?? []).map((team) => team.id))
          .order("created_at", { ascending: true })
      : { data: [] };

  const missingLists = (ourTeams ?? [])
    .map((team) => ({
      tournamentId: team.tournament_id,
      players: (ourPlayers ?? [])
        .filter((player) => player.team_id === team.id)
        .map((player) => ({ name: player.name, missing: missingListFields(player) }))
        .filter((player) => player.missing.length > 0),
    }))
    .filter((entry) => entry.players.length > 0);

  return (
    <div className="container py-5" style={{ maxWidth: "44rem" }}>
      <h1 className="h4 mb-2">Tableau de bord</h1>
      <PageHelp page="dashboard" />

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

      {isCoach && missingLists.length > 0 ? (
        <section className="mb-4">
          <h2 className="h6 mb-2">Listes non saisies</h2>
          <div className="d-grid gap-2">
            {missingLists.map((entry) => (
              <Link
                key={entry.tournamentId}
                href={`/tournaments/${entry.tournamentId}`}
                className="card card-body text-decoration-none py-2"
              >
                <span className="fw-semibold">
                  {tournamentName.get(entry.tournamentId) ?? "Tournoi"} ·{" "}
                  {entry.players.length === 1
                    ? "1 liste à compléter"
                    : `${entry.players.length} listes à compléter`}
                </span>
                <span className="small text-body-secondary">
                  {entry.players
                    .map((player) => `${player.name} (${describeMissing(player.missing)})`)
                    .join(" · ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-4">
        <h2 className="h6 mb-2">À faire</h2>

        {myWork.length === 0 ? (
          <p className="text-body-secondary mb-0">
            {isCoach
              ? "Tu n'as pas de fiche joueur : rien à saisir de ton côté."
              : "Ton compte n'est rattaché à aucune fiche joueur. Ton coach doit faire le rattachement depuis l'écran de son équipe."}
          </p>
        ) : (
          <div className="d-grid gap-3">
            {myWork.map((entry) => (
              <TournamentTodos
                key={entry.tournamentId}
                name={tournamentName.get(entry.tournamentId) ?? "Tournoi"}
                work={entry}
                canEditClosedList={isCoach}
              />
            ))}
          </div>
        )}
      </section>

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

/**
 * Ce qu'il reste à faire au joueur dans un tournoi, en liens directs.
 *
 * Quand tout est fait, il le dit : un tableau de bord muet laisse le joueur se demander
 * s'il a oublié quelque chose.
 */
function TournamentTodos({
  name,
  work,
  canEditClosedList,
}: {
  name: string;
  work: PlayerWork;
  canEditClosedList: boolean;
}) {
  const base = `/tournaments/${work.tournamentId}`;
  const estimatedTeams = work.teams.filter((team) => team.total > 0);

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <span className="fw-semibold">{name}</span>
          {work.closed ? (
            <span className="badge text-bg-secondary">Terminé</span>
          ) : work.todos.length === 0 ? (
            <span className="badge text-bg-success">À jour</span>
          ) : (
            <span className="badge text-bg-warning">{work.todos.length} à faire</span>
          )}
        </div>

        {work.closed ? (
          <p className="small text-body-secondary mb-2">
            Toutes les rondes sont verrouillées : plus rien à saisir.
          </p>
        ) : work.todos.length === 0 ? (
          <p className="small text-success mb-2">
            ✓ Ta liste est complète
            {estimatedTeams.length > 0
              ? ` et tes estimés sont posés contre ${
                  estimatedTeams.length === 1
                    ? "l'équipe adverse saisie"
                    : `les ${estimatedTeams.length} équipes adverses saisies`
                }.`
              : ". Aucune équipe adverse n'est encore saisie."}
          </p>
        ) : (
          <div className="d-grid gap-2 mb-2">
            {work.todos.map((todo) =>
              todo.kind === "list" ? (
                <Link key="list" href={`${base}/my-list`} className="btn btn-primary text-start">
                  <span className="fw-semibold d-block">Compléter ma liste</span>
                  <span className="small">Manque : {describeMissing(todo.missing)}</span>
                </Link>
              ) : (
                <Link
                  key={todo.teamId}
                  href={`${base}/estimates/${todo.teamId}`}
                  className="btn btn-primary text-start"
                >
                  <span className="fw-semibold d-block">
                    Saisir mes estimés contre {todo.teamName}
                  </span>
                  <span className="small">
                    {todo.filled}/{todo.total} posés · {todo.total - todo.filled} restant(s)
                  </span>
                </Link>
              ),
            )}
          </div>
        )}

        <div className="d-flex gap-3 small">
          <Link href={`${base}/estimates`}>Mes estimés</Link>
          <Link href={`${base}/my-list`}>
            {work.closed && !canEditClosedList ? "Consulter ma liste" : "Ma liste"}
          </Link>
        </div>
      </div>
    </div>
  );
}
