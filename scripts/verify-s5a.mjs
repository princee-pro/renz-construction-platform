import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

const credentials = getLocalSupabaseCredentials();
const environment = { ...process.env };
delete environment.NO_COLOR;
Object.assign(environment, {
  DO_NOT_TRACK: "1",
  ...Object.fromEntries([
    ["NEXT_PUBLIC_SUPABASE_URL", credentials.url],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", credentials.publishableKey],
    ["SUPABASE_SECRET_KEY", credentials.secretKey],
    ["SUPABASE_ANON_KEY", credentials.anonymousKey],
  ]),
});

function run(args, label, timeout) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: environment,
    maxBuffer: 20 * 1024 * 1024,
    timeout,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status ?? "unknown"}.`);
  }
}

run([join(root, "node_modules", "next", "dist", "bin", "next"), "build"], "S5A build", 240_000);
run(
  [join(root, "node_modules", "@playwright", "test", "cli.js"), "test", ...process.argv.slice(2)],
  "S5A browser verification",
  // C9: the full suite (S5A/S6A/S9 + C4–C9) runs ~30 minutes on the 8 GB
  // development machine; a killed run still executes the global teardown
  // (db reset) so the timeout must never cut it short. Pass a spec path to
  // verify one suite at a time.
  3_600_000,
);

process.stdout.write("S5A local browser verification passed with synthetic fixtures reconciled.\n");
