import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { parseStatusEnvironment, root, runSupabase } from "./s4-local.mjs";

// Read-only production-browser verification against the existing local stack.
const status = runSupabase(["status", "--output", "env"], { timeout: 30_000 });
const values = parseStatusEnvironment(status.stdout ?? "");
if (status.error || status.status !== 0 || !values.API_URL || !values.PUBLISHABLE_KEY) {
  throw new Error(
    "The existing local Supabase stack must be running; no credentials were printed.",
  );
}
const endpoint = new URL(values.API_URL);
if (
  endpoint.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)
) {
  throw new Error("Brand verification only supports a local Supabase endpoint.");
}
const environment = { ...process.env };
for (const key of Object.keys(environment)) {
  if (/^(?:SUPABASE_|NEXT_PUBLIC_SUPABASE_)/u.test(key)) delete environment[key];
}
Object.assign(environment, {
  NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY,
  RENZ_CLIENT_PREVIEW: "true",
  NEXT_TELEMETRY_DISABLED: "1",
});

function run(args, label, timeout) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: environment,
    stdio: "inherit",
    timeout,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status ?? "unknown"}).`);
  }
}

if (!process.argv.includes("--skip-build")) {
  run(
    [join(root, "node_modules", "next", "dist", "bin", "next"), "build"],
    "Production build",
    600_000,
  );
}
run(
  [
    join(root, "node_modules", "@playwright", "test", "cli.js"),
    "test",
    "--config",
    "playwright.frontend.config.ts",
    "tests/e2e/renz-brand.spec.ts",
  ],
  "Read-only responsive brand verification",
  600_000,
);
