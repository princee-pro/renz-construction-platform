import "server-only";

import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_BUSINESS_TIMEZONE, isValidTimeZone } from "@/lib/time/business-time";

/**
 * The configured RENZ business timezone for the current staff request
 * (C7 business profile → `admin_business_timezone`). Memoized per request;
 * falls back to the seeded default when the RPC is unavailable so that
 * rendering never breaks on a settings outage.
 */
export const loadBusinessTimezone = cache(async (): Promise<string> => {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("admin_business_timezone");
    if (error || typeof data !== "string" || !isValidTimeZone(data)) {
      return DEFAULT_BUSINESS_TIMEZONE;
    }
    return data;
  } catch {
    return DEFAULT_BUSINESS_TIMEZONE;
  }
});
