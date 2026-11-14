"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { areTeamEstimatesEditable } from "@/lib/rounds/status";
import {
  DEFAULT_ESTIMATE_SCALE,
  estimateScale,
  isEstimateValue,
  type EstimateScaleSize,
} from "@/lib/estimates/scale";
import { ESTIMATE_COMMENT_MAX_LENGTH } from "@/lib/estimates/comment";

export interface SaveEstimateResult {
  ok: boolean;
  message?: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Contrôles communs à toute écriture d'un estimé : la fiche appartient à l'utilisateur, et
 * la saisie contre l'équipe de cet adversaire est encore ouverte.
 *
 * Indépendants de l'interface, et refaits par la RLS en base — c'est volontaire, aucun
 * des deux n'est de trop (§38). Renvoie un message de refus, ou `null` si tout est en ordre.
 */
async function refusalFor(
  supabase: Supabase,
  playerId: string,
  opponentPlayerId: string,
): Promise<string | null> {
  const { data: player } = await supabase
    .from("players")
    .select("id, user_id")
    .eq("id", playerId)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!player || !user || player.user_id !== user.id) {
    return "Tu ne peux modifier que tes propres estimés.";
  }

  const { data: opponent } = await supabase
    .from("players")
    .select("team_id")
    .eq("id", opponentPlayerId)
    .maybeSingle();

  if (!opponent) {
    return "Ce joueur adverse n'existe plus.";
  }

  const { data: rounds } = await supabase
    .from("rounds")
    .select("status")
    .eq("opponent_team_id", opponent.team_id);

  if (!areTeamEstimatesEditable((rounds ?? []).map((round) => round.status))) {
    return "Impossible de modifier cet estimé : la phase d'estimation est verrouillée.";
  }

  return null;
}

/** Échelle des estimés du tournoi de ce joueur. */
async function scaleOfPlayer(supabase: Supabase, playerId: string): Promise<EstimateScaleSize> {
  const { data: player } = await supabase
    .from("players")
    .select("team_id")
    .eq("id", playerId)
    .maybeSingle();
  const { data: team } = player
    ? await supabase.from("teams").select("tournament_id").eq("id", player.team_id).maybeSingle()
    : { data: null };
  const { data: tournament } = team
    ? await supabase
        .from("tournaments")
        .select("estimate_scale")
        .eq("id", team.tournament_id)
        .maybeSingle()
    : { data: null };
  return tournament?.estimate_scale ?? DEFAULT_ESTIMATE_SCALE;
}

/** Enregistre la note d'un joueur sur un match possible. */
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
  const refusal = await refusalFor(supabase, playerId, opponentPlayerId);
  if (refusal) {
    return { ok: false, message: refusal };
  }

  const scale = await scaleOfPlayer(supabase, playerId);
  if (!isEstimateValue(value, scale)) {
    return {
      ok: false,
      message: `Ce tournoi note les estimés sur ${scale} : ${estimateScale(scale)
        .map((level) => level.label)
        .join(", ")}.`,
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

/**
 * Enregistre le commentaire facultatif qui accompagne une note.
 *
 * Il complète une note, il ne la remplace pas : sans note posée, il n'y a pas de ligne
 * d'estimé où l'écrire, et la base exige une valeur. Un commentaire vide efface le
 * précédent.
 */
export async function saveEstimateComment(
  playerId: string,
  opponentPlayerId: string,
  comment: string,
): Promise<SaveEstimateResult> {
  await requireUser();

  const trimmed = comment.trim();
  if (trimmed.length > ESTIMATE_COMMENT_MAX_LENGTH) {
    return {
      ok: false,
      message: `Un commentaire ne dépasse pas ${ESTIMATE_COMMENT_MAX_LENGTH} caractères.`,
    };
  }

  const supabase = await createClient();
  const refusal = await refusalFor(supabase, playerId, opponentPlayerId);
  if (refusal) {
    return { ok: false, message: refusal };
  }

  const { data, error } = await supabase
    .from("estimates")
    .update({ comment: trimmed.length > 0 ? trimmed : null })
    .eq("player_id", playerId)
    .eq("opponent_player_id", opponentPlayerId)
    .select("id");

  if (error) {
    return { ok: false, message: "L'enregistrement a échoué. Vérifie ta connexion." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "Pose d'abord ta note : le commentaire l'accompagne." };
  }

  return { ok: true };
}
