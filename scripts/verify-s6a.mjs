import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

const credentials = getLocalSupabaseCredentials();
const environment = { ...process.env };
delete environment.NO_COLOR;
Object.assign(environment, {
  DO_NOT_TRACK: "1",
  RENZ_CLIENT_PREVIEW: "true",
  ...Object.fromEntries([
    ["NEXT_PUBLIC_SUPABASE_URL", credentials.url],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", credentials.publishableKey],
    ["SUPABASE_SECRET_KEY", credentials.secretKey],
    ["SUPABASE_ANON_KEY", credentials.anonymousKey],
  ]),
});

function run(args, label, timeout, additionalEnvironment = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...environment, ...additionalEnvironment },
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

const generatedDataCache = join(root, ".next", "cache");

try {
  run([join(root, "node_modules", "next", "dist", "bin", "next"), "build"], "S6A build", 240_000);
  run(
    [join(root, "node_modules", "@playwright", "test", "cli.js"), "test", ...process.argv.slice(2)],
    "S6A browser verification",
    900_000,
  );

  if (process.argv.length === 2) {
    // The first Playwright server is fully stopped here. Remove only its ignored,
    // generated data cache so the next build proves the newly published fixture.
    rmSync(generatedDataCache, { force: true, recursive: true });
    run(
      [join(root, "node_modules", "next", "dist", "bin", "next"), "build"],
      "S6A governed-project fixture rebuild",
      240_000,
    );
    run(
      [
        join(root, "node_modules", "@playwright", "test", "cli.js"),
        "test",
        "tests/e2e/s6a-project-populated.spec.ts",
      ],
      "S6A governed published-project browser verification",
      360_000,
      { RENZ_E2E_PUBLISHED_PROJECT: "true" },
    );
  }
} finally {
  // Publication fixtures are reset by Playwright teardown. Reconcile the generated
  // data cache too so no test-only public record can survive into a later local run.
  rmSync(generatedDataCache, { force: true, recursive: true });
}

process.stdout.write(
  "S6A public experience and S5A regression verification passed with synthetic fixtures reconciled.\n",
);
