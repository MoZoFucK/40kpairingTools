"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { applyAction, replayActions, withoutLastAction } from "@/lib/pairing/engine";
import { SIX_VS_SIX } from "@/lib/pairing/protocol";
import { toEngineAction, toStoredAction } from "@/lib/pairing/persistence";
import type { PairingAction, PairingProtocol } from "@/lib/pairing/types";
import type { PairingActionRow } from "@/types/database";

/**
 * Persistance du pairing.
 *
 * Le moteur (`lib/pairing/`) reste pur : il ne connaît ni Supabase ni React. Ce module est
 * la seule couture entre les deux — il charge les actions, rejoue l'état, soumet l'action
 * du coach au moteur, et n'écrit que si le moteur l'accepte.
 *
 * L'état n'est jamais stocké, uniquement dérivé (§29).
 */

export interface PairingResponse {
  ok: boolean;
  message?: string;
}

interface RoundContext {
  protocol: PairingProtocol;
  ourPlayerIds: string[];
  opponentPlayerIds: string[];
  actions: PairingActionRow[];
}

async function loadContext(roundId: string): Promise<RoundContext | null> {
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("tournament_id, opponent_team_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) {
    return null;
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("team_size")
    .eq("id", round.tournament_id)
    .maybeSingle();

  const { data: ourTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", round.tournament_id)
    .eq("kind", "OUR_TEAM")
    .maybeSingle();

  if (!ourTeam || !tournament) {
    return null;
  }

  const [{ data: ours }, { data: theirs }, { data: actions }] = await Promise.all([
    supabase
      .from("players")
      .select("id")
      .eq("team_id", ourTeam.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("players")
      .select("id")
      .eq("team_id", round.opponent_team_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("pairing_actions")
      .select("*")
      .eq("round_id", roundId)
      .order("sequence", { ascending: true }),
  ]);

  return {
    protocol: { ...SIX_VS_SIX, teamSize: tournament.team_size },
    ourPlayerIds: (ours ?? []).map((player) => player.id),
    opponentPlayerIds: (theirs ?? []).map((player) => player.id),
    actions: (actions ?? []) as PairingActionRow[],
  };
}

/**
 * Soumet une action du coach.
 *
 * Le moteur valide avant toute écriture : une action illégale n'atteint jamais la base.
 * Le `sequence` attendu est celui du nombre d'actions déjà enregistrées — la contrainte
 * d'unicité rejette alors d'elle-même une seconde action concurrente (§41).
 */
async function submit(
  tournamentId: string,
  roundId: string,
  action: PairingAction,
): Promise<PairingResponse> {
  await requireCoach();

  const context = await loadContext(roundId);
  if (!context) {
    return { ok: false, message: "Cette ronde est introuvable." };
  }

  const replayed = replayActions(
    context.protocol,
    context.ourPlayerIds,
    context.opponentPlayerIds,
    context.actions.map(toEngineAction),
  );

  if (!replayed.ok) {
    return { ok: false, message: replayed.error.message };
  }

  const next = applyAction(replayed.state, action);
  if (!next.ok) {
    return { ok: false, message: next.error.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pairing_actions").insert({
    round_id: roundId,
    sequence: context.actions.length,
    ...toStoredAction(action),
  });

  if (error) {
    if (error.message.includes("pairing_actions_sequence")) {
      return {
        ok: false,
        message:
          "Quelqu'un vient d'agir sur ce pairing. Recharge la page pour repartir de l'état à jour.",
      };
    }
    return { ok: false, message: "L'enregistrement de l'action a échoué." };
  }

  // Le pairing vient de se clore : les matchs deviennent des données à conserver (§10.8).
  if (next.state.phase === "COMPLETE") {
    await supabase.from("matches").insert(
      next.state.matches.map((match) => ({
        round_id: roundId,
        our_player_id: match.ourPlayerId,
        opponent_player_id: match.opponentPlayerId,
        origin: match.origin,
        step_index: match.stepIndex,
      })),
    );
  }

  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}/pairing`);
  return { ok: true };
}

export async function selectDefender(
  tournamentId: string,
  roundId: string,
  side: "US" | "THEM",
  playerId: string,
): Promise<PairingResponse> {
  return submit(tournamentId, roundId, { type: "SELECT_DEFENDER", side, playerId });
}

export async function proposeAttackers(
  tournamentId: string,
  roundId: string,
  against: "US" | "THEM",
  playerIds: string[],
): Promise<PairingResponse> {
  return submit(tournamentId, roundId, {
    type: "PROPOSE_ATTACKERS",
    against,
    playerIds,
  });
}

export async function retainAttacker(
  tournamentId: string,
  roundId: string,
  against: "US" | "THEM",
  playerId: string,
): Promise<PairingResponse> {
  return submit(tournamentId, roundId, { type: "RETAIN_ATTACKER", against, playerId });
}

/**
 * Annule la dernière action (§29).
 *
 * Ce n'est pas une suppression arbitraire : l'état est recalculé depuis l'historique
 * amputé, et les matchs persistés sont retirés si la clôture est défaite — sans quoi la
 * base garderait des matchs que le journal ne justifie plus.
 */
export async function undoLastAction(
  tournamentId: string,
  roundId: string,
): Promise<PairingResponse> {
  await requireCoach();

  const context = await loadContext(roundId);
  if (!context) {
    return { ok: false, message: "Cette ronde est introuvable." };
  }

  const last = context.actions[context.actions.length - 1];
  if (!last) {
    return { ok: false, message: "Il n'y a aucune action à annuler." };
  }

  const rebuilt = replayActions(
    context.protocol,
    context.ourPlayerIds,
    context.opponentPlayerIds,
    withoutLastAction(context.actions.map(toEngineAction)),
  );

  if (!rebuilt.ok) {
    return { ok: false, message: rebuilt.error.message };
  }

  const supabase = await createClient();

  if (rebuilt.state.phase !== "COMPLETE") {
    await supabase.from("matches").delete().eq("round_id", roundId);
  }

  await supabase.from("pairing_actions").delete().eq("id", last.id);

  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}/pairing`);
  return { ok: true };
}
