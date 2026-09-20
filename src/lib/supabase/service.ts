import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/database.types";
import { getSupabaseSecretKey, getSupabaseServerEnvironment } from "@/lib/supabase/server-env";

/**
 * The narrow server credential. It never reaches the browser and is only used
 * by server code that has already done its own validation: public intake
 * submission (`intake_*` facades are granted to service_role alone), private
 * signed-URL minting, and cleanup tooling.
 */
export function createServiceSupabaseClient(): SupabaseClient<Database> {
  const environment = getSupabaseServerEnvironment();
  return createClient<Database>(environment.url, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}
