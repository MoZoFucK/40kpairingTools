import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { teamSizeNotice } from "@/lib/validation/team";
import { describeMissing, missingListFields } from "@/lib/lists/completeness";
import { dispositionShortLabel } from "@/lib/lists/dispositions";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHelp } from "@/components/help/PageHelp";
import { endingAt, tournamentsTrail } from "@/lib/navigation/trail";
import { TournamentForm } from "../TournamentForm";
import { TeamForm } from "./TeamForm";
import { PlayerForm } from "./PlayerForm";
import { PlayerList } from "./PlayerList";
import { ArmyCard } from "@/components/opponents/ArmyCard";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // La RLS fait le tri : un tournoi hors de portée revient simplement vide.
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, team_size, estimate_scale")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    notFound();
  }

  const { data: ourTeam } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .eq("tournament_id", tournamentId)
    .eq("kind", "OUR_TEAM")
    .maybeSingle();

  const { data: players } = ourTeam
    ? await supabase
        .from("players")
        .select("id, name, army, detachment, list_name, list_content, user_id, disposition")
        .eq("team_id", ourTeam.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const roster = (players ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    army: player.army,
    detachment: player.detachment,
    listName: player.list_name,
    listContent: player.list_content,
    userId: player.user_id,
    rawDisposition: player.disposition,
    disposition: dispositionShortLabel(player.disposition),
    missing: missingListFields(player),
  }));

  const isPlayerHere = roster.some((player) => player.userId === user.id);
  const incomplete = roster.filter((player) => player.missing.length > 0);

  const isCoach = canManageTeam(user.role);

  // Comptes rattachables. La RLS n'expose cette liste qu'au coach et à l'admin.
  const { data: profiles } = isCoach
    ? await supabase.from("profiles").select("user_id, display_name, email")
    : { data: [] };

  const accounts = (profiles ?? []).map((profile) => ({
    userId: profile.user_id,
    label: profile.display_name ?? profile.email ?? profile.user_id,
  }));
  const notice = teamSizeNotice(roster.length, tournament.team_size);

  return (
    <div className="container py-4">
      <Breadcrumb items={endingAt(tournamentsTrail(), tournament.name)} />
      <PageHelp page="tournament" />

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <h1 className="h4 mb-0">{tournament.name}</h1>
        <span className="badge text-bg-secondary">
          Équipes de {tournament.team_size}
        </span>
      </div>

      {/*
        * Navigation en boutons plutôt qu'en liens inline : noyés dans l'en-tête à côté du
        * badge, ils passaient inaperçus.
        */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {isPlayerHere ? (
          <>
            <Link
              href={`/tournaments/${tournamentId}/estimates`}
              className="btn btn-primary btn-sm"
            >
              Mes estimés
            </Link>
            <Link
              href={`/tournaments/${tournamentId}/my-list`}
              className="btn btn-outline-primary btn-sm"
            >
              Ma liste
            </Link>
          </>
        ) : null}
        {isCoach && ourTeam ? (
          <Link
            href={`/tournaments/${tournamentId}/team-lists`}
            className="btn btn-outline-primary btn-sm"
          >
            Listes de l&apos;équipe
          </Link>
        ) : null}
        <Link
          href={`/tournaments/${tournamentId}/rounds`}
          className="btn btn-outline-primary btn-sm"
        >
          {isCoach ? "Rondes et matrices" : "Rondes"}
        </Link>
        <Link
          href={`/tournaments/${tournamentId}/opponents`}
          className="btn btn-outline-secondary btn-sm"
        >
          Équipes adverses
        </Link>
        <Link
          href={`/tournaments/${tournamentId}/history`}
          className="btn btn-outline-secondary btn-sm"
        >
          Historique
        </Link>
      </div>

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">Mon équipe</h2>

          {ourTeam || isCoach ? (
            <>
              {isCoach ? (
                <TeamForm
                  tournamentId={tournamentId}
                  team={
                    ourTeam
                      ? {
                          id: ourTeam.id,
                          name: ourTeam.name,
                          shortName: ourTeam.short_name,
                        }
                      : undefined
                  }
                />
              ) : (
                <p className="mb-0 fw-semibold">{ourTeam?.name}</p>
              )}
            </>
          ) : (
            <p className="text-body-secondary mb-0">
              Aucune équipe n&apos;a encore été créée pour ce tournoi.
            </p>
          )}
        </div>
      </section>

      {ourTeam ? (
        <section className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 mb-0">Joueurs</h2>
              <span
                className={`badge ${
                  notice ? "text-bg-warning" : "text-bg-success"
                }`}
              >
                {roster.length} / {tournament.team_size}
              </span>
            </div>

            {notice ? (
              <div className="alert alert-warning py-2" role="status">
                {notice}
              </div>
            ) : null}

            {isCoach && incomplete.length > 0 ? (
              <div className="alert alert-warning py-2" role="status">
                <div className="fw-semibold mb-1">
                  {incomplete.length === 1
                    ? "1 liste n'est pas saisie"
                    : `${incomplete.length} listes ne sont pas saisies`}
                </div>
                <ul className="mb-0 ps-3 small">
                  {incomplete.map((player) => (
                    <li key={player.id}>
                      {player.name} — manque {describeMissing(player.missing)}
                      {player.userId ? "" : " (aucun compte rattaché : à saisir par toi)"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {isCoach ? (
              <PlayerList
                tournamentId={tournamentId}
                teamId={ourTeam.id}
                players={roster.map((player) => ({
                  ...player,
                  missingLabel:
                    player.missing.length > 0 ? describeMissing(player.missing) : null,
                }))}
                accounts={accounts}
              />
            ) : (
              /*
               * Le joueur voit les listes de ses coéquipiers, avec la même fiche que pour
               * les adversaires : connaître les forces de l'équipe aide à préparer ses
               * estimés. Lecture seule — chacun ne modifie que la sienne (« Ma liste »).
               */
              <div className="row row-cols-1 row-cols-md-2 g-3">
                {roster.map((player) => {
                  const isMe = player.userId === user.id;
                  return (
                    <div key={player.id} className="col">
                      <ArmyCard
                        player={{
                          name: isMe ? `${player.name} (toi)` : player.name,
                          army: player.army,
                          detachment: player.detachment,
                          listName: player.listName,
                          listContent: player.listContent,
                          disposition: player.rawDisposition,
                        }}
                        footer={
                          isMe || player.missing.length > 0 ? (
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                              {player.missing.length > 0 ? (
                                <span className="badge text-bg-warning">
                                  Liste à compléter : {describeMissing(player.missing)}
                                </span>
                              ) : null}
                              {isMe ? (
                                <Link
                                  href={`/tournaments/${tournamentId}/my-list`}
                                  className="btn btn-outline-primary btn-sm ms-auto"
                                >
                                  Modifier ma liste
                                </Link>
                              ) : null}
                            </div>
                          ) : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {isCoach ? (
              <div className="mt-4 pt-3 border-top">
                <h3 className="h6 mb-3">Ajouter un joueur</h3>
                <PlayerForm tournamentId={tournamentId} teamId={ourTeam.id} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {isCoach ? (
        <section className="card mt-4">
          <div className="card-body">
            <h2 className="h6 mb-3">Réglages du tournoi</h2>
            <TournamentForm
              tournament={{
                id: tournament.id,
                name: tournament.name,
                teamSize: tournament.team_size,
                estimateScale: tournament.estimate_scale,
              }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
