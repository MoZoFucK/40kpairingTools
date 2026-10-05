"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { areEstimatesEditable, canTransition } from "@/lib/rounds/status";
import { isEstimateValue } from "@/lib/estimates/scale";
import type { RoundStatus } from "@/types/domain";

export interface FormState {
  errors?: Readonly<Record<string, string>>;
  message?: string;
}

export async function createRound(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const number = Number(formData.get("number") ?? 0);
  const opponentTeamId = String(formData.get("opponentTeamId") ?? "");

  const errors: Record<string, string> = {};
  if (!Number.isInteger(number) || number < 1) {
    errors.number = "Le numéro de ronde doit être un entier positif.";
  }
  if (!opponentTeamId) {
    errors.opponentTeamId = "Choisis l'équipe adverse de cette ronde.";
  }
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      tournament_id: tournamentId,
      number,
      opponent_team_id: opponentTeamId,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.message.includes("rounds_number_per_tournament")) {
      return { errors: { number: `La ronde ${number} existe déjà.` } };
    }
    return { message: "La création de la ronde a échoué." };
  }

  revalidatePath(`/tournaments/${tournamentId}/rounds`);
  redirect(`/tournaments/${tournamentId}/rounds/${data.id}`);
}

/**
 * Change le statut d'une ronde.
 *
 * La transition demandée est vérifiée côté serveur (§38) : l'interface ne propose que les
 * transitions légales, mais c'est ce contrôle-ci qui fait foi.
 */
export async function changeRoundStatus(formData: FormData): Promise<void> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const roundId = String(formData.get("roundId") ?? "");
  const target = String(formData.get("status") ?? "") as RoundStatus;

  const supabase = await createClient();
  const { data: round } = await supabase
    .from("rounds")
    .select("status")
    .eq("id", roundId)
    .maybeSingle();

  if (!round || !canTransition(round.status, target)) {
    return;
  }

  await supabase.from("rounds").update({ status: target }).eq("id", roundId);

  revalidatePath(`/tournaments/${tournamentId}/rounds/${roundId}`);
}

export interface SaveEstimateResult {
  ok: boolean;
  message?: string;
}

/**
 * Enregistre un estimé d'un joueur.
 *
 * Trois vérifications indépendantes de l'interface : la valeur est dans l'échelle, la
 * fiche joueur appartient bien à l'utilisateur, et la ronde autorise encore la saisie.
 * La RLS refait le même contrôle en base — c'est volontaire, aucune des deux n'est de
 * trop (§38).
 */
export async function saveEstimate(
  playerId: string,
  opponentPlayerId: string,
  value: number,
): Promise<SaveEstimateResult> {
  await requireUser();

  if (!isEstimateValue(value)) {
    return { ok: false, message: "Un estimé doit être compris entre 1 et 5." };
  }

  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, user_id")
    .eq("id", playerId)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!player || !user || player.user_id !== user.id) {
    return { ok: false, message: "Tu ne peux modifier que tes propres estimés." };
  }

  const { data: opponent } = await supabase
    .from("players")
    .select("team_id")
    .eq("id", opponentPlayerId)
    .maybeSingle();

  if (!opponent) {
    return { ok: false, message: "Ce joueur adverse n'existe plus." };
  }

  const { data: rounds } = await supabase
    .from("rounds")
    .select("status")
    .eq("opponent_team_id", opponent.team_id);

  const closed = (rounds ?? []).find((round) => !areEstimatesEditable(round.status));
  if (closed) {
    return {
      ok: false,
      message: "Impossible de modifier cet estimé : la phase d'estimation est verrouillée.",
    };
  }

  const { error } = await supabase
    .from("estimates")
    .upsert(
      { player_id: playerId, opponent_player_id: opponentPlayerId, value },
      { onConflict: "player_id,opponent_player_id" },
    );

  if (error) {
    return { ok: false, message: "L'enregistrement a échoué. Vérifie ta connexion." };
  }

  return { ok: true };
}

/** Rattache un compte utilisateur à une fiche joueur, ou l'en détache. */
export async function linkPlayerAccount(formData: FormData): Promise<void> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const userId = String(formData.get("userId") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("players")
    .update({ user_id: userId.length > 0 ? userId : null })
    .eq("id", playerId);

  revalidatePath(`/tournaments/${tournamentId}`);
}
