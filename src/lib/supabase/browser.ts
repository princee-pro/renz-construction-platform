"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/database.types";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/public-env";

let browserClient: SupabaseClient<Database> | undefined;

export function getBrowserSupabaseClient(): SupabaseClient<Database> {
  browserClient ??= createBrowserClient<Database>(
    getPublicSupabaseEnvironment().url,
    getPublicSupabaseEnvironment().publishableKey,
  );

  return browserClient;
}
