"use server";

import { createClient } from "@/lib/supabase/server";

export interface PasswordFormState {
  error?: string;
  notice?: string;
}

const MIN_LENGTH = 8;

/**
 * Définit le mot de passe du compte connecté.
 *
 * Sert à la fois au changement volontaire et à la fin du parcours « Mot de passe
 * oublié » : le lien reçu par e-mail ouvre une session, puis mène ici.
 */
export async function updatePassword(
  _state: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < MIN_LENGTH) {
    return { error: `Le mot de passe doit faire au moins ${MIN_LENGTH} caractères.` };
  }
  if (password !== confirmation) {
    return { error: "Les deux mots de passe ne sont pas identiques." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Ta session a expiré. Redemande un lien depuis la page de connexion." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.message.toLowerCase().includes("different from the old")) {
      return { error: "Choisis un mot de passe différent de l'actuel." };
    }
    if (error.message.toLowerCase().includes("weak") || error.message.includes("characters")) {
      return { error: "Ce mot de passe est trop faible. Allonge-le ou varie les caractères." };
    }
    return { error: "Le mot de passe n'a pas pu être enregistré. Réessaie dans un instant." };
  }

  return { notice: "Mot de passe enregistré. Il servira dès ta prochaine connexion." };
}
