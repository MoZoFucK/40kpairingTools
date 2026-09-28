import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { ruleKey } from "@/lib/validation/army";
import { ArmyCard } from "@/components/opponents/ArmyCard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { endingAt, opponentsTrail } from "@/lib/navigation/trail";
import { OpponentPlayerForm } from "./OpponentPlayerForm";
import { OpponentRoster } from "./OpponentRoster";
import { OpponentTeamForm } from "./OpponentTeamForm";

export default async function OpponentTeamPage({
  params,
}: {
  params: Promise<{ tournamentId: string; teamId: string }>;
}) {
  const { tournamentId, teamId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, short_name, tournament_id, kind")
    .eq("id", teamId)
    .maybeSingle();

  if (!team || team.tournament_id !== tournamentId || team.kind !== "OPPONENT") {
    notFound();
  }

  const { data: playerRows } = await supabase
    .from("players")
    .select("id, name, army, detachment, list_name, list_content, notes, disposition")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  const players = (playerRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    army: row.army,
    detachment: row.detachment,
    listName: row.list_name,
    listContent: row.list_content,
    notes: row.notes,
    disposition: row.disposition,
  }));

  // Référentiel de règles, rapproché en mémoire : quelques dizaines de lignes tout au plus.
  const [{ data: armyRules }, { data: detachmentRules }, { data: tournament }] =
    await Promise.all([
      supabase.from("army_rules").select("army, rule"),
      supabase.from("detachment_rules").select("army, detachment, rule"),
      supabase.from("tournaments").select("name").eq("id", tournamentId).maybeSingle(),
    ]);

  const rules: Record<string, { armyRule?: string; detachmentRule?: string }> = {};
  for (const player of players) {
    const key = ruleKey(player.army);
    const detachmentKey = ruleKey(player.detachment ?? "");

    rules[player.id] = {
      armyRule: armyRules?.find((row) => ruleKey(row.army) === key)?.rule,
      detachmentRule:
        detachmentKey.length > 0
          ? detachmentRules?.find(
              (row) =>
                ruleKey(row.army) === key && ruleKey(row.detachment) === detachmentKey,
            )?.rule
          : undefined,
    };
  }

  // Autocomplétion alimentée par ce qui a déjà été saisi, sans référentiel fermé.
  const knownArmies = [
    ...new Set([
      ...(armyRules ?? []).map((row) => row.army.trim()),
      ...players.map((player) => player.army.trim()),
    ]),
  ].sort();

  const knownDetachments = [
    ...new Set(
      [
        ...(detachmentRules ?? []).map((row) => row.detachment.trim()),
        ...players.map((player) => player.detachment?.trim() ?? ""),
      ].filter((value) => value.length > 0),
    ),
  ].sort();

  const isCoach = canManageTeam(user.role);

  return (
    <div className="container py-4">
      <Breadcrumb
        items={endingAt(
          opponentsTrail(tournamentId, tournament?.name ?? "Tournoi"),
          team.name,
        )}
      />

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <h1 className="h4 mb-0">{team.name}</h1>
        <span className="badge text-bg-secondary">{players.length} joueurs</span>
      </div>

      {isCoach ? (
        <section className="card mb-4">
          <div className="card-body">
            <h2 className="h6 mb-3">Équipe</h2>
            <OpponentTeamForm
              tournamentId={tournamentId}
              team={{ id: team.id, name: team.name, shortName: team.short_name }}
            />
          </div>
        </section>
      ) : null}

      <section className="mb-4">
        <h2 className="h6 mb-3">Listes</h2>
        {isCoach ? (
          <OpponentRoster
            tournamentId={tournamentId}
            teamId={teamId}
            players={players}
            knownArmies={knownArmies}
            knownDetachments={knownDetachments}
            rules={rules}
          />
        ) : (
          <div className="row g-3">
            {players.map((player) => (
              <div key={player.id} className="col-12 col-lg-6">
                <ArmyCard
                  player={{
                    name: player.name,
                    army: player.army,
                    detachment: player.detachment,
                    listName: player.listName,
                    listContent: player.listContent,
                    notes: player.notes,
                    disposition: player.disposition,
                    armyRule: rules[player.id]?.armyRule ?? null,
                    detachmentRule: rules[player.id]?.detachmentRule ?? null,
                  }}
                />
              </div>
            ))}
            {players.length === 0 ? (
              <p className="text-body-secondary">
                Les listes de cette équipe n&apos;ont pas encore été saisies.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {isCoach ? (
        <section className="card">
          <div className="card-body">
            <h2 className="h6 mb-3">Ajouter un joueur</h2>
            <OpponentPlayerForm
              tournamentId={tournamentId}
              teamId={teamId}
              knownArmies={knownArmies}
              knownDetachments={knownDetachments}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
