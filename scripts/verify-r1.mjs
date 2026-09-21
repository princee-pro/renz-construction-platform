import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

// R1 §78 — the release gate in three parts. Nothing here deploys, writes to
// a cloud project or changes the site mode; cloud parts only READ a
// candidate that is already running at the URL you pass.
//
//   pnpm r1:verify            = r1:local  (everything cloud-independent)
//   pnpm r1:local             C10 gate (31 steps) + R1 additions:
//                             network-failure suite, bundle scan, public
//                             audit, cross-browser/vitals/forced-colours
//                             smoke, log audit
//   pnpm r1:cloud <base>      read-only checks against a deployed candidate:
//                             health, headers, public audit (crawl, robots,
//                             sitemap, 404s, WhatsApp, content), browser
//                             smoke (Chromium/Firefox/WebKit, vitals, slow
//                             network, forced colours)
//   pnpm r1:smoke <base>      the two-minute version: health + headers +
//                             critical paths in one browser
//
// Pass `--expect-live` after the base when the candidate is in Live mode
// (public pages then must be indexable).

const [mode = "local", ...rest] = process.argv.slice(2);
const script = (name) => join(root, "scripts", name);
const credentials = getLocalSupabaseCredentials();
const environment = {
  ...process.env,
  DO_NOT_TRACK: "1",
  NEXT_PUBLIC_SUPABASE_URL: credentials.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: credentials.publishableKey,
  SUPABASE_SECRET_KEY: credentials.secretKey,
  SUPABASE_ANON_KEY: credentials.anonymousKey,
  RENZ_CLIENT_PREVIEW: "true",
  INTAKE_RATE_LIMIT_SECRET:
    process.env["INTAKE_RATE_LIMIT_SECRET"] ?? "synthetic-e2e-test-intake-secret-000000",
  RENZ_INTAKE_ALLOW_DEV_BYPASS: "true",
};

function run(label, args, timeout = 900_000) {
  process.stdout.write(`\n=== R1 ${label}\n`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: environment,
    stdio: "inherit",
    timeout,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\nR1 verify STOPPED at ${label}`);
    process.exit(1);
  }
}

function withServer(work) {
  const child = spawn("corepack", ["pnpm@11.25.0", "start", "--port", "3100"], {
    cwd: root,
    env: { ...environment, NODE_ENV: "production" },
    stdio: ["ignore", "ignore", "inherit"],
    shell: process.platform === "win32",
    windowsHide: true,
  });
  try {
    run("wait for the production server", [
      script("wait-for-server.mjs"),
      "http://127.0.0.1:3100/api/health",
    ]);
    work();
  } finally {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    } else {
      child.kill();
    }
  }
}

if (mode === "local") {
  // The whole C10 gate first (stop on failure), then the R1 additions.
  run("C10 gate (pnpm c10:verify)", [script("verify-c10.mjs")], 4 * 3_600_000);
  run(
    "network-failure suite",
    [
      join(root, "node_modules", "@playwright", "test", "cli.js"),
      "test",
      "tests/e2e/r1-network-failure.spec.ts",
    ],
    1_800_000,
  );
  run("bundle scan", [script("r1-bundle-scan.mjs")]);
  // The suites reset the database; restore the reviewed content so the
  // public audit crawls the real site, not an empty seed.
  run("seed actors", [script("d1-seed-actors.mjs")]);
  run("provision storage", [script("storage.mjs"), "provision"]);
  run("seed content", [script("website-seed-content.mjs")]);
  run("seed heroes", [script("website-seed-content.mjs"), "--heroes"]);
  withServer(() => {
    run("public audit", [script("r1-public-audit.mjs"), "http://127.0.0.1:3100"]);
    run("browser smoke", [script("r1-browser-smoke.mjs"), "http://127.0.0.1:3100"]);
  });
  run("log audit", [script("r1-log-audit.mjs")]);
  console.log("\nR1 local: all steps passed");
} else if (mode === "cloud" || mode === "smoke") {
  const base = rest.find((argument) => argument.startsWith("http"));
  if (!base) throw new Error(`usage: verify-r1.mjs ${mode} <https://candidate> [--expect-live]`);
  const live = rest.includes("--expect-live") ? ["--expect-live"] : [];
  run("health", [script("wait-for-server.mjs"), `${base}/api/health`, "5"]);
  run("headers", [script("c10-headers.mjs"), base]);
  if (mode === "cloud") {
    run("public audit", [script("r1-public-audit.mjs"), base, ...live]);
    run("browser smoke", [
      script("r1-browser-smoke.mjs"),
      base,
      ".playwright/screenshots/r1-cloud",
    ]);
  } else {
    run("public audit (smoke)", [script("r1-public-audit.mjs"), base, ...live]);
  }
  console.log(`\nR1 ${mode}: all read-only checks passed against ${base}`);
} else {
  throw new Error("usage: verify-r1.mjs [local | cloud <base> | smoke <base>]");
}
