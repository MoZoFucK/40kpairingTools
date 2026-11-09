"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  notice?: string;
}

/**
 * Les messages d'erreur sont réécrits en français et restent volontairement vagues sur
 * la cause exacte : distinguer « mot de passe incorrect » de « compte inexistant »
 * révélerait quels comptes existent.
 */
function readableError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (message.includes("Email not confirmed")) {
    return "Ce compte n'est pas encore confirmé. Vérifie ta boîte mail.";
  }
  return "La connexion a échoué. Réessaie dans un instant.";
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const suite = String(formData.get("suite") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Renseigne ton adresse e-mail et ton mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: readableError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(suite.startsWith("/") ? suite : "/dashboard");
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Renseigne ton adresse e-mail." };
  }

  // Le lien du mail ouvre une session puis mène à la page de choix du mot de passe.
  // Cette URL doit figurer dans les « Redirect URLs » du projet Supabase.
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?suite=/compte/mot-de-passe`,
  });

  // Réponse identique que le compte existe ou non, pour ne pas révéler sa présence.
  return {
    notice:
      "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
