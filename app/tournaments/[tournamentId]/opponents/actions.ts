"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isDisposition } from "@/lib/lists/dispositions";
import { ruleKey } from "@/lib/validation/army";
import {
  hasErrors,
  optionalText,
  validatePlayer,
  validateTeam,
  type FieldErrors,
} from "@/lib/validation/team";

export interface FormState {
  errors?: FieldErrors;
  message?: string;
}

function readableError(message: string): string {
  if (message.includes("violates row-level security")) {
    return "Tu n'as pas les droits sur ce tournoi.";
  }
  return "L'enregistrement a échoué. Réessaie dans un instant.";
}

export async function createOpponentTeam(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "");
  const shortName = optionalText(String(formData.get("shortName") ?? ""));

  const errors = validateTeam({ name, shortName });
  if (hasErrors(errors)) {
    return { errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      kind: "OPPONENT",
      name: name.trim(),
      short_name: shortName ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { message: readableError(error?.message ?? "") };
  }

  revalidatePath(`/tournaments/${tournamentId}/opponents`);
  redirect(`/tournaments/${tournamentId}/opponents/${data.id}`);
}

export async function renameOpponentTeam(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "");
  const shortName = optionalText(String(formData.get("shortName") ?? ""));

  const errors = validateTeam({ name, shortName });
  if (hasErrors(errors)) {
    return { errors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name: name.trim(), short_name: shortName ?? null })
    .eq("id", teamId);

  if (error) {
    return { message: readableError(error.message) };
  }

  revalidatePath(`/tournaments/${tournamentId}/opponents/${teamId}`);
  return { message: "Équipe enregistrée." };
}

/**
 * Enregistre un joueur adverse, sa liste, et met à jour le référentiel de règles.
 *
 * Les règles d'armée et de détachement sont saisies une fois puis réutilisées (§17) : si
 * le coach en fournit une, elle est écrite dans le référentiel partagé. Une règle vide ne
 * remplace jamais une règle existante — on n'efface pas par omission.
 */
export async function saveOpponentPlayer(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = optionalText(String(formData.get("playerId") ?? ""));

  const input = {
    name: String(formData.get("name") ?? ""),
    army: String(formData.get("army") ?? ""),
    detachment: optionalText(String(formData.get("detachment") ?? "")),
    listName: optionalText(String(formData.get("listName") ?? "")),
  };

  const errors = validatePlayer(input);
  if (hasErrors(errors)) {
    return { errors };
  }

  const listContent = optionalText(String(formData.get("listContent") ?? ""));
  const notes = optionalText(String(formData.get("notes") ?? ""));
  const rawDisposition = String(formData.get("disposition") ?? "");
  const armyRule = optionalText(String(formData.get("armyRule") ?? ""));
  const detachmentRule = optionalText(String(formData.get("detachmentRule") ?? ""));

  const row = {
    name: input.name.trim(),
    army: input.army.trim(),
    detachment: input.detachment ?? null,
    list_name: input.listName ?? null,
    list_content: listContent ?? null,
    notes: notes ?? null,
    disposition: isDisposition(rawDisposition) ? rawDisposition : null,
  };

  const supabase = await createClient();
  const { error } = playerId
    ? await supabase.from("players").update(row).eq("id", playerId)
    : await supabase.from("players").insert({ ...row, team_id: teamId });

  if (error) {
    return { message: readableError(error.message) };
  }

  if (armyRule) {
    await upsertArmyRule(row.army, armyRule);
  }
  if (detachmentRule && row.detachment) {
    await upsertDetachmentRule(row.army, row.detachment, detachmentRule);
  }

  revalidatePath(`/tournaments/${tournamentId}/opponents/${teamId}`);
  return { message: playerId ? "Joueur modifié." : "Joueur ajouté." };
}

export async function deleteOpponentPlayer(formData: FormData): Promise<void> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");

  const supabase = await createClient();
  await supabase.from("players").delete().eq("id", playerId);

  revalidatePath(`/tournaments/${tournamentId}/opponents/${teamId}`);
}

/**
 * Règles d'armée du référentiel partagé, exposées à l'interface pour pré-remplir les
 * champs dès que le coach saisit une armée déjà connue.
 */
export async function lookupRules(
  army: string,
  detachment?: string,
): Promise<{ armyRule: string | null; detachmentRule: string | null }> {
  const supabase = await createClient();
  const key = ruleKey(army);

  if (key.length === 0) {
    return { armyRule: null, detachmentRule: null };
  }

  const { data: armyRows } = await supabase.from("army_rules").select("army, rule");
  const armyRule =
    armyRows?.find((row) => ruleKey(row.army) === key)?.rule ?? null;

  let detachmentRule: string | null = null;
  const detachmentKey = ruleKey(detachment ?? "");

  if (detachmentKey.length > 0) {
    const { data: detachmentRows } = await supabase
      .from("detachment_rules")
      .select("army, detachment, rule");
    detachmentRule =
      detachmentRows?.find(
        (row) => ruleKey(row.army) === key && ruleKey(row.detachment) === detachmentKey,
      )?.rule ?? null;
  }

  return { armyRule, detachmentRule };
}

async function upsertArmyRule(army: string, rule: string): Promise<void> {
  const supabase = await createClient();
  const key = ruleKey(army);

  const { data } = await supabase.from("army_rules").select("id, army");
  const existing = data?.find((row) => ruleKey(row.army) === key);

  if (existing) {
    await supabase.from("army_rules").update({ rule }).eq("id", existing.id);
  } else {
    await supabase.from("army_rules").insert({ army: army.trim(), rule });
  }
}

async function upsertDetachmentRule(
  army: string,
  detachment: string,
  rule: string,
): Promise<void> {
  const supabase = await createClient();
  const armyKeyValue = ruleKey(army);
  const detachmentKeyValue = ruleKey(detachment);

  const { data } = await supabase
    .from("detachment_rules")
    .select("id, army, detachment");
  const existing = data?.find(
    (row) =>
      ruleKey(row.army) === armyKeyValue &&
      ruleKey(row.detachment) === detachmentKeyValue,
  );

  if (existing) {
    await supabase.from("detachment_rules").update({ rule }).eq("id", existing.id);
  } else {
    await supabase
      .from("detachment_rules")
      .insert({ army: army.trim(), detachment: detachment.trim(), rule });
  }
}
