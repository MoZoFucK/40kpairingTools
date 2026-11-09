import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { supabaseSecretKey } from "@/lib/env";
import { IMPERSONATOR_COOKIE, signImpersonator, verifyImpersonator } from "./impersonation";

/**
 * Super admin : un seul compte, désigné par son adresse e-mail.
 *
 * Indépendant du rôle applicatif (PLAYER / COACH / ADMIN) : ce compte reste joueur dans
 * les tournois. Il gagne seulement l'accès à /admin et la connexion sous un autre compte,
 * un outil de support et de recette.
 *
 * L'adresse vient de `getUser()`, validé par Supabase : un navigateur ne peut pas la
 * falsifier.
 */
export const SUPER_ADMIN_EMAIL = "m.ozeau@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

/** Garde des pages et actions super admin. */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?suite=/admin");
  }
  if (!isSuperAdminEmail(user.email)) {
    redirect("/dashboard?refus=role");
  }
  return user;
}

/** Identifiant du super admin qui navigue sous un autre compte, ou `null`. */
export async function readImpersonator(): Promise<string | null> {
  const store = await cookies();
  return verifyImpersonator(store.get(IMPERSONATOR_COOKIE)?.value, supabaseSecretKey());
}

/** Server Actions uniquement : un Server Component ne peut pas écrire de cookie. */
export async function rememberImpersonator(userId: string): Promise<void> {
  const store = await cookies();
  store.set(IMPERSONATOR_COOKIE, signImpersonator(userId, supabaseSecretKey()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function forgetImpersonator(): Promise<void> {
  const store = await cookies();
  store.delete(IMPERSONATOR_COOKIE);
}
