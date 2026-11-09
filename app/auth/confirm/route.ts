import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_PAGE = "/compte/mot-de-passe";

/**
 * N'accepte qu'un chemin interne : `//exemple.com` serait lu comme une autre origine.
 */
function safePath(value: string | null, fallback: string): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

/**
 * Point d'atterrissage des liens envoyés par e-mail (confirmation de compte, invitation,
 * réinitialisation de mot de passe).
 *
 * Deux formes de lien sont acceptées :
 * - `token_hash` + `type` : modèle d'e-mail personnalisé, fonctionne quel que soit le
 *   navigateur qui ouvre le lien ;
 * - `code` : modèle par défaut de Supabase (flux PKCE), qui exige d'ouvrir le lien dans
 *   le navigateur où la demande a été faite.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Après une réinitialisation ou une invitation, le compte doit choisir son mot de passe.
  const defaultPath = type === "recovery" || type === "invite" ? PASSWORD_PAGE : "/dashboard";
  const suite = safePath(searchParams.get("suite"), defaultPath);

  const supabase = await createClient();
  let failed = true;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }

  if (failed) {
    return NextResponse.redirect(new URL("/login?erreur=lien", request.url));
  }

  return NextResponse.redirect(new URL(suite, request.url));
}
