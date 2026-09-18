import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canRunPairing } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { SIX_VS_SIX } from "@/lib/pairing/protocol";
import { isRoundLocked, ROUND_STATUS_LABEL } from "@/lib/rounds/status";
import { PairingBoard, type StoredAction } from "@/components/pairing/PairingBoard";
import { FinalPairing } from "./FinalPairing";
import type { MatrixPlayer } from "@/lib/estimates/matrix";

export default async function PairingPage({
  params,
}: {
  params: Promise<{ tournamentId: string; roundId: string }>;
}) {
  const { tournamentId, roundId } = await params;
  const user = await requireUser();

  if (!canRunPairing(user.role)) {
    redirect("/dashboard?refus=role");
  }

  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("id, number, scenario, status, opponent_team_id, tournament_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round || round.tournament_id !== tournamentId) {
    notFound();
  }

  const [{ data: tournament }, { data: opponentTeam }, { data: ourTeam }] =
    await Promise.all([
      supabase
        .from("tournaments")
        .select("name, team_size")
        .eq("id", tournamentId)
        .maybeSingle(),
      supabase.from("teams").select("name").eq("id", round.opponent_team_id).maybeSingle(),
      supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .eq("kind", "OUR_TEAM")
        .maybeSingle(),
    ]);

  if (!tournament || !ourTeam) {
    notFound();
  }

  const [{ data: ours }, { data: theirs }, { data: estimates }, { data: actions }, { data: matches }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, name, army, detachment, disposition")
        .eq("team_id", ourTeam.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("players")
        .select("id, name, army, detachment, disposition")
        .eq("team_id", round.opponent_team_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("estimates")
        .select("player_id, opponent_player_id, value, comment")
        .eq("tournament_id", tournamentId),
      supabase
        .from("pairing_actions")
        .select("id, sequence, type, side, player_ids, created_at")
        .eq("round_id", roundId)
        .order("sequence", { ascending: true }),
      supabase
        .from("matches")
        .select("id, our_player_id, opponent_player_id, origin, table_number")
        .eq("round_id", roundId),
    ]);

  const ourPlayers = (ours ?? []) as MatrixPlayer[];
  const opponentPlayers = (theirs ?? []) as MatrixPlayer[];
  const locked = isRoundLocked(round.status);

  const rosterIssue =
    ourPlayers.length !== tournament.team_size ||
    opponentPlayers.length !== tournament.team_size
      ? `Le pairing attend ${tournament.team_size} joueurs de chaque côté : il y en a ${ourPlayers.length} chez nous et ${opponentPlayers.length} en face.`
      : null;

  return (
    <div className="container-fluid py-4">
      <nav aria-label="fil d'Ariane" className="mb-3">
        <Link href={`/tournaments/${tournamentId}/rounds/${roundId}`} className="small">
          ← Ronde {round.number}
        </Link>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Ronde {round.number} — {ourTeam.name} contre {opponentTeam?.name ?? "?"}
          </h1>
          {round.scenario ? (
            <p className="text-body-secondary mb-0">{round.scenario}</p>
          ) : null}
        </div>
        <span className="badge text-bg-secondary">
          {ROUND_STATUS_LABEL[round.status]}
        </span>
      </div>

      {rosterIssue ? (
        <div className="alert alert-warning" role="alert">
          {rosterIssue} Complète les effectifs avant de commencer.
        </div>
      ) : (
        <PairingBoard
          tournamentId={tournamentId}
          roundId={roundId}
          protocol={{ ...SIX_VS_SIX, teamSize: tournament.team_size }}
          ourPlayers={ourPlayers}
          opponentPlayers={opponentPlayers}
          estimates={estimates ?? []}
          actions={(actions ?? []) as StoredAction[]}
          readOnly={locked}
        />
      )}

      {matches && matches.length > 0 ? (
        <section className="mt-4">
          <FinalPairing
            tournamentId={tournamentId}
            roundId={roundId}
            matches={matches}
            ourPlayers={ourPlayers}
            opponentPlayers={opponentPlayers}
            teamSize={tournament.team_size}
            readOnly={locked}
          />
        </section>
      ) : null}
    </div>
  );
}
