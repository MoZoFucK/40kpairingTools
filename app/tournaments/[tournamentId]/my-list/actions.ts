"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isDisposition } from "@/lib/lists/dispositions";
import { hasErrors, optionalText, validatePlayer } from "@/lib/validation/team";
import type { FieldErrors } from "@/lib/validation/team";

export interface FormState {
  errors?: FieldErrors;
  message?: string;
}

/**
 * Le joueur enregistre sa propre liste.
 *
 * La fiche visée est retrouvée depuis le compte connecté, jamais depuis un identifiant
 * transmis par le formulaire : sans quoi il suffirait de modifier un champ caché pour
 * écrire dans la fiche d'un autre. La RLS et le trigger `players_guard_self_update`
 * refuseraient l'écriture, mais le serveur ne doit pas s'en remettre à eux (§38).
 */
export async function saveMyList(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "Session expirée. Reconnecte-toi." };
  }

  const { data: ourTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("kind", "OUR_TEAM")
    .maybeSingle();

  const { data: me } = ourTeam
    ? await supabase
        .from("players")
        .select("id")
        .eq("team_id", ourTeam.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!me) {
    return {
      message:
        "Ton compte n'est rattaché à aucune fiche joueur de cette équipe. Ton coach doit faire le rattachement.",
    };
  }

  const input = {
    // Le nom relève du roster tenu par le coach : le joueur ne le modifie pas.
    name: "—",
    army: String(formData.get("army") ?? ""),
    detachment: optionalText(String(formData.get("detachment") ?? "")),
    listName: optionalText(String(formData.get("listName") ?? "")),
  };

  const errors = validatePlayer(input);
  delete (errors as Record<string, string>).name;

  if (hasErrors(errors)) {
    return { errors };
  }

  const rawDisposition = String(formData.get("disposition") ?? "");
  const disposition = isDisposition(rawDisposition) ? rawDisposition : null;

  const { error } = await supabase
    .from("players")
    .update({
      army: input.army.trim(),
      detachment: input.detachment ?? null,
      list_name: input.listName ?? null,
      list_content: optionalText(String(formData.get("listContent") ?? "")) ?? null,
      disposition,
    })
    .eq("id", me.id);

  if (error) {
    return { message: "L'enregistrement a échoué. Réessaie dans un instant." };
  }

  revalidatePath(`/tournaments/${tournamentId}/my-list`);
  return { message: "Ta liste est enregistrée." };
}
