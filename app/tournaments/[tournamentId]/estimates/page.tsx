import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadPlayerWork, type PlayerWork } from "@/lib/players/work";
import { describeMissing, missingListFields } from "@/lib/lists/completeness";
import { dispositionShortLabel } from "@/lib/lists/dispositions";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHelp } from "@/components/help/PageHelp";
import { endingAt, tournamentTrail } from "@/lib/navigation/trail";

export const metadata = { title: "Mes estimés — 40K Team Pairing Assistant" };

/**
 * Les équipes adverses à estimer, avec l'avancement du joueur pour chacune.
 *
 * Rangé par équipe et non par ronde : quand le joueur pose ses estimés, le tirage n'a pas
 * encore dit quelle équipe il affrontera à quelle ronde. Il estime les équipes du tournoi,
 * la ronde ne vient qu'ensuite.
 */
export default async function MyEstimatesIndexPage({
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [work] = user ? await loadPlayerWork(supabase, user.id, tournamentId) : [];

  return (
    <div className="container py-4" style={{ maxWidth: "36rem" }}>
      <Breadcrumb items={endingAt(tournamentTrail(tournamentId, tournament.name), "Mes estimés")} />
      <PageHelp page="estimatesIndex" />

      <h1 className="h5 mb-1">Mes estimés</h1>
      <p className="text-body-secondary small">{tournament.name}</p>

      {!work ? (
        <div className="alert alert-info">
          Ton compte n&apos;est rattaché à aucune fiche joueur de cette équipe. Ton coach
          doit faire le rattachement depuis l&apos;écran de gestion de l&apos;équipe.
        </div>
      ) : (
        <>
          <ListReminder tournamentId={tournamentId} work={work} />

          {work.teams.length === 0 ? (
            <p className="text-body-secondary">
              Aucune équipe adverse n&apos;est encore saisie. Ton coach les ajoute au fil du
              tournoi.
            </p>
          ) : (
            <div className="list-group">
              {work.teams.map((team) => {
                const done = team.total > 0 && team.filled === team.total;

                return (
                  <Link
                    key={team.teamId}
                    href={`/tournaments/${tournamentId}/estimates/${team.teamId}`}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-3"
                  >
                    <span className="min-w-0">
                      <span className="fw-semibold d-block">Contre {team.teamName}</span>
                      <span className="small text-body-secondary">
                        {team.total === 0
                          ? "Listes adverses pas encore saisies"
                          : !team.editable
                            ? "Saisie fermée — consultation"
                            : done
                              ? "Tous tes estimés sont posés"
                              : `${team.total - team.filled} estimé(s) à poser`}
                      </span>
                    </span>
                    {team.total > 0 ? (
                      <span
                        className={`badge flex-shrink-0 ${done ? "text-bg-success" : team.editable ? "text-bg-warning" : "text-bg-secondary"}`}
                      >
                        {team.filled}/{team.total}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListReminder({
  tournamentId,
  work,
}: {
  tournamentId: string;
  work: PlayerWork;
}) {
  const missing = missingListFields(work.me);
  const disposition = dispositionShortLabel(work.me.disposition);

  if (missing.length > 0 && !work.closed) {
    return (
      <div className="alert alert-warning" role="status">
        Ta liste n&apos;est pas complète : il manque {describeMissing(missing)}.
        {!work.me.disposition
          ? " Sans disposition, les missions primaires ne s'affichent pas."
          : ""}{" "}
        <Link href={`/tournaments/${tournamentId}/my-list`} className="alert-link">
          Compléter ma liste
        </Link>
      </div>
    );
  }

  return (
    <p className="small text-body-secondary">
      {work.me.name} · {work.me.army}
      {disposition ? ` · ${disposition}` : ""}
    </p>
  );
}
