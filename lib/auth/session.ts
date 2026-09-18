import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAtLeast } from "@/lib/auth/roles";
import type { UserRole } from "@/types/domain";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
}

/**
 * Identité et rôle de l'utilisateur courant, lus côté serveur.
 *
 * Le rôle vient de la table `profiles`, jamais d'une donnée transmise par le navigateur
 * (§9). `getUser()` est utilisé plutôt que `getSession()` : il fait valider le jeton par
 * Supabase au lieu de faire confiance au cookie.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role,
    displayName: profile.display_name,
  };
}

/** Exige une session valide, sinon redirige vers la page de connexion. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Exige un rôle au moins égal à `minimum`.
 *
 * C'est la garde à appeler en tête de toute Server Action ou page sensible. La validation
 * côté React n'est jamais suffisante (§38) : ce contrôle serveur est celui qui fait foi.
 */
export async function requireRole(minimum: UserRole): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasAtLeast(user.role, minimum)) {
    redirect("/dashboard?refus=role");
  }
  return user;
}

export function requireCoach(): Promise<CurrentUser> {
  return requireRole("COACH");
}

export function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}
