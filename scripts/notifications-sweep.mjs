import { createClient } from "@supabase/supabase-js";

import { getLocalSupabaseCredentials } from "./s4-local.mjs";

// C9 timed notification sweep (§72–73): idempotent, safe to run hourly.
// Uses the server credential from the environment when present (deployment)
// or the local stack otherwise. No scheduler is wired yet (C10/Release).

function credentials() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url, key };
  const local = getLocalSupabaseCredentials();
  return { url: local.url, key: local.secretKey };
}

const { url, key } = credentials();
const client = createClient(url, key, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const { data, error } = await client.rpc("run_notification_sweep", { trigger_kind: "scheduled" });
if (error) {
  console.error(`notifications:sweep failed: ${error.message}`);
  process.exit(1);
}
console.log(
  `notifications:sweep run ${data?.run_id ?? "?"}: ${data?.produced ?? 0} new notification(s) at ${data?.finished_at ?? ""}`,
);
