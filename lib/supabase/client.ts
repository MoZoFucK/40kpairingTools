"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase pour le navigateur. Il n'utilise que la clé publiable : toute la
 * protection des données repose sur les policies RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
