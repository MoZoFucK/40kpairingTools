"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  hasErrors,
  optionalText,
  validatePlayer,
  validateTeam,
  validateTournament,
  type FieldErrors,
} from "@/lib/validation/team";

/**
 * Mutations de gestion d'équipe.
 *
 * Chaque action commence par `requireCoach()` : la RLS protège déjà les données, mais une
 * règle importante doit être vérifiée côté serveur en plus (§38). Une validation React ne
 * suffit jamais.
 */

export interface FormState {
  errors?: FieldErrors;
  message?: string;
}

function readableError(message: string): string {
  if (message.includes("teams_single_our_team")) {
    return "Ce tournoi a déjà une équipe. Modifie-la plutôt que d'en créer une seconde.";
  }
  if (message.includes("players_single_account_per_team")) {
    return "Ce compte est déjà rattaché à un autre joueur de l'équipe.";
  }
  if (message.includes("violates row-level security")) {
    return "Tu n'as pas les droits sur ce tournoi.";
  }
  return "L'enregistrement a échoué. Réessaie dans un instant.";
}

export async function createTournament(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCoach();

  const name = String(formData.get("name") ?? "");
  const teamSize = Number(formData.get("teamSize") ?? 6);

  const errors = validateTournament({ name, teamSize });
  if (hasErrors(errors)) {
    return { errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .insert({ name: name.trim(), team_size: teamSize, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { message: readableError(error?.message ?? "") };
  }

  revalidatePath("/tournaments");
  redirect(`/tournaments/${data.id}`);
}

export async function updateTournament(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "");
  const teamSize = Number(formData.get("teamSize") ?? 6);

  const errors = validateTournament({ name, teamSize });
  if (hasErrors(errors)) {
    return { errors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ name: name.trim(), team_size: teamSize })
    .eq("id", tournamentId);

  if (error) {
    return { message: readableError(error.message) };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { message: "Tournoi enregistré." };
}

export async function saveOurTeam(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const teamId = optionalText(String(formData.get("teamId") ?? ""));
  const name = String(formData.get("name") ?? "");
  const shortName = optionalText(String(formData.get("shortName") ?? ""));

  const errors = validateTeam({ name, shortName });
  if (hasErrors(errors)) {
    return { errors };
  }

  const supabase = await createClient();
  const { error } = teamId
    ? await supabase
        .from("teams")
        .update({ name: name.trim(), short_name: shortName ?? null })
        .eq("id", teamId)
    : await supabase.from("teams").insert({
        tournament_id: tournamentId,
        kind: "OUR_TEAM",
        name: name.trim(),
        short_name: shortName ?? null,
      });

  if (error) {
    return { message: readableError(error.message) };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { message: "Équipe enregistrée." };
}

export async function savePlayer(
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

  const row = {
    name: input.name.trim(),
    army: input.army.trim(),
    detachment: input.detachment ?? null,
    list_name: input.listName ?? null,
  };

  const supabase = await createClient();
  const { error } = playerId
    ? await supabase.from("players").update(row).eq("id", playerId)
    : await supabase.from("players").insert({ ...row, team_id: teamId });

  if (error) {
    return { message: readableError(error.message) };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { message: playerId ? "Joueur modifié." : "Joueur ajouté." };
}

export async function deletePlayer(formData: FormData): Promise<void> {
  await requireCoach();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");

  const supabase = await createClient();
  await supabase.from("players").delete().eq("id", playerId);

  revalidatePath(`/tournaments/${tournamentId}`);
}
