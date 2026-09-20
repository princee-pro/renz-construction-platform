import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/database.types";

/**
 * Creates the anonymous, stateless S4 projection client. It deliberately has
 * no cookie session and no path to the server-only operator credential.
 */
export function createPublicSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !publishableKey) return null;

  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
