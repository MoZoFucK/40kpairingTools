import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { areEstimatesEditable, estimatesClosedReason } from "@/lib/rounds/status";
import { ruleKey } from "@/lib/validation/army";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { endingAt, roundTrail } from "@/lib/navigation/trail";
import { MyEstimates, type EstimateTarget } from "./MyEstimates";
import type { EstimateValue } from "@/types/domain";

export default async function MyEstimatesPage({
  params,
}: {
  params: Promise<{ tournamentId: string; roundId: string }>;
}) {
  const { tournamentId, roundId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("id, number, scenario, status, opponent_team_id, tournament_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round || round.tournament_id !== tournamentId) {
    notFound();
  }

  const [{ data: tournament }, { data: account }] = await Promise.all([
    supabase.from("tournaments").select("name").eq("id", tournamentId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const user = account.user;

  // La fiche joueur rattachée à ce compte dans ce tournoi.
  const { data: ourTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("kind", "OUR_TEAM")
    .maybeSingle();

  const { data: me } = ourTeam
    ? await supabase
        .from("players")
        .select("id, name, army, disposition")
        .eq("team_id", ourTeam.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle()
    : { data: null };

  if (!me) {
    return (
      <div className="container py-4" style={{ maxWidth: "36rem" }}>
        <h1 className="h5 mb-3">Mes estimés</h1>
        <div className="alert alert-info">
          Ton compte n&apos;est rattaché à aucune fiche joueur de cette équipe. Ton coach
          doit faire le rattachement depuis l&apos;écran de gestion de l&apos;équipe.
        </div>
      </div>
    );
  }

  const { data: opponents } = await supabase
    .from("players")
    .select("id, name, army, detachment, list_name, list_content, notes, disposition")
    .eq("team_id", round.opponent_team_id)
    .order("created_at", { ascending: true });

  const { data: estimates } = await supabase
    .from("estimates")
    .select("opponent_player_id, value")
    .eq("player_id", me.id);

  const [{ data: armyRules }, { data: detachmentRules }] = await Promise.all([
    supabase.from("army_rules").select("army, rule"),
    supabase.from("detachment_rules").select("army, detachment, rule"),
  ]);

  const byOpponent = new Map<string, EstimateValue>(
    (estimates ?? []).map((row) => [row.opponent_player_id, row.value]),
  );

  const targets: EstimateTarget[] = (opponents ?? []).map((opponent) => {
    const key = ruleKey(opponent.army);
    const detachKey = ruleKey(opponent.detachment ?? "");

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
      value: byOpponent.get(opponent.id) ?? null,
    };
  });

  const editable = areEstimatesEditable(round.status);

  return (
    <div className="container py-4" style={{ maxWidth: "36rem" }}>
      <Breadcrumb
        items={endingAt(
          roundTrail(tournamentId, tournament?.name ?? "Tournoi", roundId, round.number),
          "Mes estimés",
        )}
      />

      <h1 className="h5 mb-1">Mes estimés — ronde {round.number}</h1>
      <p className="text-body-secondary small">
        {me.name} · {me.army}
        {round.scenario ? ` · ${round.scenario}` : ""}
      </p>

      <MyEstimates
        playerId={me.id}
        myDisposition={me.disposition}
        tournamentId={tournamentId}
        targets={targets}
        disabled={!editable}
        closedReason={estimatesClosedReason(round.status)}
      />
    </div>
  );
}
