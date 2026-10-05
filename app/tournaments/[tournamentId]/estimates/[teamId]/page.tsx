import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { areTeamEstimatesEditable, teamEstimatesClosedReason } from "@/lib/rounds/status";
import { dispositionShortLabel } from "@/lib/lists/dispositions";
import { ruleKey } from "@/lib/validation/army";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHelp } from "@/components/help/PageHelp";
import { endingAt, estimatesTrail } from "@/lib/navigation/trail";
import { MyEstimates, type EstimateTarget } from "./MyEstimates";
import type { EstimateValue } from "@/types/domain";

export const metadata = { title: "Mes estimés — 40K Team Pairing Assistant" };

/**
 * Saisie des estimés du joueur contre une équipe adverse.
 *
 * L'équipe, pas la ronde : le joueur estime avant le tirage. La saisie se ferme dès
 * qu'une ronde contre cette équipe a dépassé la phase d'estimation — la même règle que
 * `estimates_open_for` en base.
 */
export default async function MyEstimatesPage({
  params,
}: {
  params: Promise<{ tournamentId: string; teamId: string }>;
}) {
  const { tournamentId, teamId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, kind, tournament_id")
    .eq("id", teamId)
    .maybeSingle();

  if (!team || team.tournament_id !== tournamentId || team.kind !== "OPPONENT") {
    notFound();
  }

  const [{ data: tournament }, { data: account }, { data: ourTeam }, { data: rounds }] =
    await Promise.all([
      supabase.from("tournaments").select("name").eq("id", tournamentId).maybeSingle(),
      supabase.auth.getUser(),
      supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("kind", "OUR_TEAM")
        .maybeSingle(),
      supabase.from("rounds").select("status").eq("opponent_team_id", teamId),
    ]);

  const trail = endingAt(
    estimatesTrail(tournamentId, tournament?.name ?? "Tournoi"),
    `Contre ${team.name}`,
  );

  const { data: me } = ourTeam
    ? await supabase
        .from("players")
        .select("id, name, army, disposition")
        .eq("team_id", ourTeam.id)
        .eq("user_id", account.user?.id ?? "")
        .maybeSingle()
    : { data: null };

  if (!me) {
    return (
      <div className="container py-4" style={{ maxWidth: "36rem" }}>
        <Breadcrumb items={trail} />
        <h1 className="h5 mb-3">Mes estimés</h1>
        <div className="alert alert-info">
          Ton compte n&apos;est rattaché à aucune fiche joueur de cette équipe. Ton coach
          doit faire le rattachement depuis l&apos;écran de gestion de l&apos;équipe.
        </div>
      </div>
    );
  }

  const [{ data: opponents }, { data: estimates }, { data: armyRules }, { data: detachmentRules }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, name, army, detachment, list_name, list_content, notes, disposition")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true }),
      supabase
        .from("estimates")
        .select("opponent_player_id, value, comment")
        .eq("player_id", me.id),
      supabase.from("army_rules").select("army, rule"),
      supabase.from("detachment_rules").select("army, detachment, rule"),
    ]);

  const byOpponent = new Map<string, { value: EstimateValue; comment: string | null }>(
    (estimates ?? []).map((row) => [
      row.opponent_player_id,
      { value: row.value, comment: row.comment },
    ]),
  );

  const targets: EstimateTarget[] = (opponents ?? []).map((opponent) => {
    const key = ruleKey(opponent.army);
    const detachKey = ruleKey(opponent.detachment ?? "");
    const estimate = byOpponent.get(opponent.id);

    return {
      opponent: {
        id: opponent.id,
        name: opponent.name,
        army: opponent.army,
        detachment: opponent.detachment,
        listName: opponent.list_name,
        listContent: opponent.list_content,
        notes: opponent.notes,
        disposition: opponent.disposition,
        armyRule: armyRules?.find((row) => ruleKey(row.army) === key)?.rule ?? null,
        detachmentRule:
          detachKey.length > 0
            ? (detachmentRules?.find(
                (row) => ruleKey(row.army) === key && ruleKey(row.detachment) === detachKey,
              )?.rule ?? null)
            : null,
      },
      value: estimate?.value ?? null,
      comment: estimate?.comment ?? null,
    };
  });

  const statuses = (rounds ?? []).map((round) => round.status);
  const disposition = dispositionShortLabel(me.disposition);

  return (
    <div className="container py-4" style={{ maxWidth: "36rem" }}>
      <Breadcrumb items={trail} />
      <PageHelp page="estimates" />

      <h1 className="h5 mb-1">Mes estimés — contre {team.name}</h1>
      <p className="text-body-secondary small">
        {me.name} · {me.army}
        {disposition ? ` · ${disposition}` : ""}
      </p>

      <MyEstimates
        playerId={me.id}
        myDisposition={me.disposition}
        tournamentId={tournamentId}
        targets={targets}
        disabled={!areTeamEstimatesEditable(statuses)}
        closedReason={teamEstimatesClosedReason(statuses)}
      />
    </div>
  );
}
