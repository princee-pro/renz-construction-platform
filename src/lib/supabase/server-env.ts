import "server-only";

import { getPublicSupabaseEnvironment } from "@/lib/supabase/public-env";

export function getSupabaseServerEnvironment() {
  return getPublicSupabaseEnvironment();
}

export function getSupabaseSecretKey(): string {
  const secretKey = process.env["SUPABASE_SECRET_KEY"];

  if (!secretKey) {
    throw new Error("Supabase server secret environment is not configured.");
  }

  return secretKey;
}
