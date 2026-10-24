import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

// C10 §157–161 — the release-candidate gate. Every check the phases added,
// in one ordered run that STOPS at the first failure and records each
// step's result and duration in .playwright/c10-verify.json.
//
//   pnpm c10:verify                 whole sequence
//   pnpm c10:verify -- --list       print the steps
//   pnpm c10:verify -- --from e2e:c5   resume from a step (ledger keeps earlier results)
//   pnpm c10:verify -- --only build    one step
//
// Each step is a child process (the 8 GB machine cannot hold the whole
// pipeline in one Node heap). Browser suites run one spec file per
// Playwright invocation: each resets and reseeds the local database in its
// own global setup/teardown, so state never leaks between suites. Network
// checks run against a production server this script starts on port 3100
// and stops afterwards. Requirements: the local Supabase stack is running
// and port 3100 is free.

const ledgerPath = join(root, ".playwright", "c10-verify.json");
const pnpm = ["corepack", "pnpm@11.25.0"];
const bin = (...parts) => join(root, "node_modules", ...parts);
const next = join(root, "node_modules", "next", "dist", "bin", "next");
const playwright = join(root, "node_modules", "@playwright", "test", "cli.js");
const supabaseCli = join(root, "node_modules", "supabase", "dist", "supabase.js");
const credentials = getLocalSupabaseCredentials();
const baseEnvironment = {
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
const serverEnvironment = { ...baseEnvironment, NODE_ENV: "production" };

const e2eSpecs = [
  "s5a-admin",
  "s5a-visual",
  "s6a-public",
  "s9ap-public",
  "s9bp-public",
  "d1-visual",
  "cr1-owner-cms",
  "c4-control-room",
  "c5-finance",
  "c6-delivery",
  "c7-settings",
  "c8-intake",
  "c9-intelligence",
  "c10-staff-access",
];

/** @type {Array<{ key: string, label: string, run: () => void }>} */
const steps = [
  step("format", "Prettier check", () =>
    command(process.execPath, [bin("prettier", "bin", "prettier.cjs"), ".", "--check"]),
  ),
  step("lint", "route type generation + ESLint (no warnings)", () => {
    command(process.execPath, [next, "typegen"]);
    command(process.execPath, [bin("eslint", "bin", "eslint.js"), ".", "--max-warnings", "0"]);
  }),
  step("typecheck", "next typegen + tsc --noEmit (strict)", () => {
    rmSync(join(root, ".next", "dev", "types"), { recursive: true, force: true });
    command(process.execPath, [next, "typegen"]);
    command(process.execPath, [bin("typescript", "bin", "tsc"), "--noEmit"]);
  }),
  step("unit", "vitest unit", () =>
    command(process.execPath, [bin("vitest", "vitest.mjs"), "run", "--project", "unit"]),
  ),
  step("component", "vitest component", () =>
    command(process.execPath, [bin("vitest", "vitest.mjs"), "run", "--project", "component"]),
  ),
  step("design", "DESIGN.md lint + token check", () => {
    command(process.execPath, [
      bin("@google", "design.md", "dist", "index.js"),
      "lint",
      "DESIGN.md",
    ]);
    command(process.execPath, [join(root, "scripts", "design-tokens.mjs"), "check"]);
  }),
  step("secrets", "secret scan (committable files)", () =>
    command(process.execPath, [join(root, "scripts", "scan-secrets.mjs")]),
  ),
  step("db:reset", "clean database reset (migrations + seed)", () =>
    command(process.execPath, [supabaseCli, "db", "reset", "--local"], 600_000),
  ),
  step("db:test", "pgTAP suite", () =>
    command(process.execPath, [supabaseCli, "test", "db", "--local"], 900_000),
  ),
  step("db:lint", "database lint (fail on warning)", () =>
    command(
      process.execPath,
      [supabaseCli, "db", "lint", "--local", "--fail-on", "warning"],
      600_000,
    ),
  ),
  step("db:types", "generated types match the schema", () =>
    command(process.execPath, [join(root, "scripts", "database-types.mjs"), "check"], 300_000),
  ),
  step("db:verify", "S2–S6A database contract", () =>
    command(process.execPath, [join(root, "scripts", "verify-database.mjs")], 600_000),
  ),
  step("build", "next build (production)", () => {
    rmSync(join(root, ".next", "dev", "types"), { recursive: true, force: true });
    command(process.execPath, [next, "build"], 900_000);
  }),
  step("audit", "dependency audit + public bundle audit", () => {
    command(pnpm, ["audit:production"]);
    command(process.execPath, [join(root, "scripts", "audit-public-bundles.mjs")]);
  }),
  step("network", "headers, CSP, security probe against the production server", () =>
    withServer(() => {
      // The CSP walk signs in as the synthetic owner (same seed as the E2E
      // global setup); the reset above removed it.
      command(process.execPath, [join(root, "scripts", "d1-seed-actors.mjs")], 300_000);
      command(process.execPath, [join(root, "scripts", "c10-headers.mjs")], 120_000);
      command(process.execPath, [join(root, "scripts", "c10-csp-check.mjs")], 300_000);
      command(process.execPath, [join(root, "scripts", "verify-c10-security.mjs")], 600_000);
    }),
  ),
  step("verify:c4-c9", "C4–C9 network verification scripts", () => {
    for (const phase of ["c4", "c5", "c6", "c7", "c8", "c9"]) {
      command(process.execPath, [join(root, "scripts", `verify-${phase}.mjs`)], 900_000);
    }
  }),
  ...e2eSpecs.map((spec) =>
    step(`e2e:${spec}`, `Playwright ${spec}`, () =>
      command(
        process.execPath,
        [playwright, "test", `tests/e2e/${spec}.spec.ts`],
        spec.startsWith("c") || spec.startsWith("cr") ? 1_800_000 : 1_200_000,
      ),
    ),
  ),
  step("db:concurrency", "lead intake concurrency proof", () =>
    command(process.execPath, [join(root, "scripts", "verify-lead-concurrency.mjs")], 600_000),
  ),
];

function step(key, label, run) {
  return { key, label, run };
}

function command(bin, args, timeout = 600_000) {
  const isArray = Array.isArray(bin);
  const executable = isArray ? bin[0] : bin;
  const fullArgs = isArray ? [...bin.slice(1), ...args] : args;
  const result = spawnSync(executable, fullArgs, {
    cwd: root,
    env: baseEnvironment,
    stdio: "inherit",
    timeout,
    shell: isArray && process.platform === "win32",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${executable} ${fullArgs.slice(-2).join(" ")} exited with ${result.status}`);
  }
}

async function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

function withServer(work) {
  const child = spawn("corepack", ["pnpm@11.25.0", "start", "--port", "3100"], {
    cwd: root,
    env: serverEnvironment,
    stdio: ["ignore", "ignore", "inherit"],
    shell: process.platform === "win32",
    windowsHide: true,
  });
  try {
    command(
      process.execPath,
      [join(root, "scripts", "wait-for-server.mjs"), "http://127.0.0.1:3100/api/health"],
      120_000,
    );
    work();
  } finally {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    } else {
      child.kill();
    }
  }
}

function loadLedger() {
  try {
    return JSON.parse(readFileSync(ledgerPath, "utf8"));
  } catch {
    return { runs: [] };
  }
}

const args = process.argv.slice(2);
if (args.includes("--list")) {
  for (const item of steps) console.log(`${item.key.padEnd(22)} ${item.label}`);
  process.exit(0);
}
const only = args[args.indexOf("--only") + 1];
const from = args[args.indexOf("--from") + 1];
let selected = steps;
if (args.includes("--only")) selected = steps.filter((item) => item.key === only);
else if (args.includes("--from")) {
  const index = steps.findIndex((item) => item.key === from);
  if (index < 0) throw new Error(`unknown step ${from}`);
  selected = steps.slice(index);
}
if (selected.length === 0) throw new Error("no step selected");
if (selected.some((item) => item.key === "network" || item.key.startsWith("e2e:"))) {
  if (!(await portFree(3100)))
    throw new Error("port 3100 is in use; stop the running server first");
}

mkdirSync(join(root, ".playwright"), { recursive: true });
const ledger = loadLedger();
const run = { startedAt: new Date().toISOString(), steps: {} };
if (args.includes("--from") || args.includes("--only")) {
  const previous = ledger.runs.at(-1);
  if (previous && !previous.finishedAt) {
    Object.assign(run.steps, previous.steps);
    ledger.runs.pop();
  }
}
ledger.runs.push(run);
const save = () => writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

for (const item of selected) {
  const started = Date.now();
  process.stdout.write(`\n=== C10 ${item.key} — ${item.label}\n`);
  try {
    item.run();
    run.steps[item.key] = { status: "pass", seconds: Math.round((Date.now() - started) / 1000) };
    save();
  } catch (error) {
    run.steps[item.key] = {
      status: "fail",
      seconds: Math.round((Date.now() - started) / 1000),
      error: error instanceof Error ? error.message : String(error),
    };
    save();
    console.error(`\nC10 verify STOPPED at ${item.key}: ${run.steps[item.key].error}`);
    process.exit(1);
  }
}
run.finishedAt = new Date().toISOString();
save();
const passed = Object.values(run.steps).filter((entry) => entry.status === "pass").length;
console.log(
  `\nC10 verify: ${passed}/${steps.length} steps passed (ledger: .playwright/c10-verify.json)`,
);
if (existsSync(join(root, ".playwright", "s5a-fixtures.json"))) {
  console.log(
    "note: .playwright/s5a-fixtures.json exists (a suite left it); delete before scan:secrets --all",
  );
}
