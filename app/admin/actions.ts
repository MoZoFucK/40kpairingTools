"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  forgetImpersonator,
  isSuperAdminEmail,
  readImpersonator,
  rememberImpersonator,
  requireSuperAdmin,
} from "@/lib/auth/superAdmin";

/**
 * Ouvre une session au nom de `email` dans le navigateur courant.
 *
 * Le lien magique est généré côté serveur avec la clé secrète, puis consommé aussitôt :
 * aucun e-mail n'est envoyé et le jeton ne quitte jamais le serveur. Les sessions que le
 * compte a ouvertes ailleurs ne sont pas touchées.
 */
async function signInAs(email: string): Promise<boolean> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error || !data.properties?.hashed_token) {
    return false;
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });

  return !verifyError;
}

export async function impersonate(formData: FormData): Promise<void> {
  const superAdmin = await requireSuperAdmin();
  const targetId = String(formData.get("userId") ?? "");

  if (!targetId || targetId === superAdmin.id) {
    redirect("/admin");
  }

  const { data, error } = await createAdminClient().auth.admin.getUserById(targetId);
  const email = data.user?.email;

  if (error || !email) {
    redirect("/admin?erreur=compte");
  }

  // Le cookie est posé avant de changer de session : si la connexion échoue, il est
  // retiré juste après et rien n'a changé.
  await rememberImpersonator(superAdmin.id);

  if (!(await signInAs(email))) {
    await forgetImpersonator();
    redirect("/admin?erreur=connexion");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function stopImpersonation(): Promise<void> {
  const originalId = await readImpersonator();
  await forgetImpersonator();

  // La session empruntée est fermée (dans ce navigateur seulement) : elle ne doit pas
  // survivre au retour, et le vrai titulaire garde ses propres sessions.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  if (!originalId) {
    redirect("/login");
  }

  const { data } = await createAdminClient().auth.admin.getUserById(originalId);
  const email = data.user?.email;

  // Double contrôle : même avec un cookie valide, on ne rouvre que le compte super admin.
  if (!email || !isSuperAdminEmail(email) || !(await signInAs(email))) {
    redirect("/login");
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}
