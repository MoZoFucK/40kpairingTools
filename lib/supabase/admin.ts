import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client à clé secrète, qui contourne la RLS.
 *
 * Réservé aux scripts d'administration : seed, migrations de données, promotion d'un
 * utilisateur en COACH. Ne jamais l'employer pour servir une requête utilisateur — ce
 * serait contourner toutes les protections décrites au §12.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
