import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { describeMissing, missingListFields } from "@/lib/lists/completeness";
import { ruleKey } from "@/lib/validation/army";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHelp } from "@/components/help/PageHelp";
import { ArmyCard } from "@/components/opponents/ArmyCard";
import { endingAt, tournamentTrail } from "@/lib/navigation/trail";

export const metadata = { title: "Listes de l'équipe — 40K Team Pairing Assistant" };

/**
 * Les listes de toute l'équipe, d'un coup d'œil, pour le coach.
 *
 * La page du tournoi lui sert à composer l'équipe : fiches éditables, rattachement des
 * comptes. Pour préparer le pairing, il a besoin de l'inverse — lire les six listes
 * comme il lit celles des adversaires, règles d'armée et de détachement comprises.
 * Le joueur, lui, voit déjà ces fiches sur la page du tournoi.
 */
export default async function TeamListsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const user = await requireUser();

  if (!canManageTeam(user.role)) {
    redirect(`/tournaments/${tournamentId}`);
  }

  const supabase = await createClient();

  const [{ data: tournament }, { data: ourTeam }] = await Promise.all([
    supabase.from("tournaments").select("id, name, team_size").eq("id", tournamentId).maybeSingle(),
    supabase
      .from("teams")
      .select("id, name")
      .eq("tournament_id", tournamentId)
      .eq("kind", "OUR_TEAM")
      .maybeSingle(),
  ]);

  if (!tournament) {
    notFound();
  }

  const [{ data: players }, { data: armyRules }, { data: detachmentRules }] = await Promise.all([
    ourTeam
      ? supabase
          .from("players")
          .select("id, name, army, detachment, list_name, list_content, user_id, disposition")
          .eq("team_id", ourTeam.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from("army_rules").select("army, rule"),
    supabase.from("detachment_rules").select("army, detachment, rule"),
  ]);

  // Même rapprochement en mémoire que pour les équipes adverses : le référentiel est court.
  const roster = (players ?? []).map((player) => {
    const key = ruleKey(player.army);
    const detachmentKey = ruleKey(player.detachment ?? "");

    return {
      id: player.id,
      hasAccount: player.user_id !== null,
      missing: missingListFields(player),
      card: {
        name: player.name,
        army: player.army,
        detachment: player.detachment,
        listName: player.list_name,
        listContent: player.list_content,
        disposition: player.disposition,
        armyRule: armyRules?.find((row) => ruleKey(row.army) === key)?.rule ?? null,
        detachmentRule:
          detachmentKey.length > 0
            ? (detachmentRules?.find(
                (row) =>
                  ruleKey(row.army) === key && ruleKey(row.detachment) === detachmentKey,
              )?.rule ?? null)
            : null,
      },
    };
  });

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(tournamentTrail(tournamentId, tournament.name), "Listes de l'équipe")}
      />
      <PageHelp page="teamLists" />

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h5 mb-1">Listes de l&apos;équipe</h1>
          <p className="text-body-secondary small mb-0">
            {ourTeam ? `${ourTeam.name} — ` : ""}
            {tournament.name}
          </p>
        </div>
        <span className="badge text-bg-secondary">
          {roster.length} / {tournament.team_size}
        </span>
      </div>

      {roster.length === 0 ? (
        <div className="alert alert-info">
          Aucun joueur dans l&apos;équipe pour l&apos;instant. Compose-la depuis la page du
          tournoi.
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {roster.map((player) => (
            <div key={player.id} className="col">
              <ArmyCard
                player={player.card}
                footer={
                  player.missing.length > 0 || !player.hasAccount ? (
                    <div className="d-flex flex-wrap gap-2">
                      {player.missing.length > 0 ? (
                        <span className="badge text-bg-warning">
                          Liste à compléter : {describeMissing(player.missing)}
                        </span>
                      ) : null}
                      {!player.hasAccount ? (
                        <span className="badge text-bg-secondary">Aucun compte rattaché</span>
                      ) : null}
                    </div>
                  ) : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
