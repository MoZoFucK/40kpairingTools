"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_PAGE = "/compte/mot-de-passe";

/** N'accepte qu'un chemin interne : `//exemple.com` serait lu comme une autre origine. */
function safePath(value: string, fallback: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

/**
 * Consomme le jeton du lien reçu (e-mail ou message privé) et ouvre la session.
 *
 * Déclenché par un clic, jamais par la simple ouverture de l'adresse : les robots qui
 * génèrent les aperçus de liens (Discord, messageries, antivirus de boîte mail) ouvrent
 * l'URL en GET et consommaient le jeton, à usage unique, avant le destinataire.
 *
 * Deux formes de lien sont acceptées :
 * - `token_hash` + `type` : lien généré par scripts/recovery-links.mjs ou par un modèle
 *   d'e-mail personnalisé, valable quel que soit le navigateur ;
 * - `code` : modèle d'e-mail par défaut de Supabase (flux PKCE), qui exige le navigateur
 *   où la demande a été faite.
 */
export async function confirmLink(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType | "";
  const code = String(formData.get("code") ?? "");

  // Après une réinitialisation ou une invitation, le compte doit choisir son mot de passe.
  const fallback = type === "recovery" || type === "invite" ? PASSWORD_PAGE : "/dashboard";
  const suite = safePath(String(formData.get("suite") ?? ""), fallback);

  const supabase = await createClient();
  let failed = true;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }

  redirect(failed ? "/login?erreur=lien" : suite);
}
