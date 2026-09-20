import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules", "supabase", "dist", "supabase.js");
const typeScript = join(root, "scripts", "database-types.mjs");
const leadConcurrency = join(root, "scripts", "verify-lead-concurrency.mjs");
const environment = { ...process.env, DO_NOT_TRACK: "1" };
let ownsLocalStack = false;

function probe(executable, args) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    env: environment,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 10_000,
    windowsHide: true,
  });
}

function inspectExistingProjectContainers() {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const rootConfig = config.split(/^\s*\[/mu)[0] ?? "";
  const matches = [...rootConfig.matchAll(/^project_id\s*=\s*"([^"]+)"\s*$/gmu)];
  const projectId = matches[0]?.[1];

  if (matches.length !== 1 || !projectId || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(projectId)) {
    throw new Error(
      "Database verification requires one safe local project_id in supabase/config.toml.",
    );
  }

  // This is the exact project label used by Supabase CLI 2.116.0 for cleanup.
  const inventory = probe("docker", [
    "ps",
    "--all",
    "--filter",
    `label=com.supabase.cli.project=${projectId}`,
    "--format",
    "{{.ID}}",
  ]);

  if (inventory.error || inventory.status !== 0) {
    throw new Error("Local Docker project inventory failed; no stack operation was attempted.");
  }

  const containerIds = (inventory.stdout ?? "").trim();
  if (containerIds && !/^[a-f0-9]+(?:\r?\n[a-f0-9]+)*$/u.test(containerIds)) {
    throw new Error(
      "Local Docker project inventory was unexpected; no stack operation was attempted.",
    );
  }

  return containerIds.length > 0;
}

function run(executable, args, label, showOutput = true) {
  console.log(`Database verification: ${label}`);
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    env: environment,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (showOutput && stdout.trim()) {
    process.stdout.write(stdout);
  }
  if (showOutput && stderr.trim()) {
    process.stderr.write(stderr);
  }
  if (result.error || result.status !== 0) {
    if (!showOutput) {
      console.error(`${label} failed; sensitive local stack output was suppressed.`);
    }
    throw new Error(`${label} exited with code ${result.status ?? "unknown"}`);
  }
}

async function resetWithTransientRetry(label) {
  const maxAttempts = 3;
  const retryable =
    /error running container|removal (?:is )?already in progress|being removed|container .* already exists/iu;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`Database verification: ${label}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);
    const result = spawnSync(process.execPath, [cli, "db", "reset", "--local"], {
      cwd: root,
      encoding: "utf8",
      env: environment,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    });

    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    if (result.status === 0 && !result.error) {
      if (stdout.trim()) process.stdout.write(stdout);
      if (stderr.trim()) process.stderr.write(stderr);
      return;
    }

    const output = `${stdout}\n${stderr}`;
    if (attempt < maxAttempts && retryable.test(output)) {
      console.warn(
        `Database reset encountered a transient local-container race; waiting before retry ${attempt + 1}/${maxAttempts}.`,
      );
      await sleep(5_000 * attempt);
      continue;
    }

    if (stdout.trim()) process.stdout.write(stdout);
    if (stderr.trim()) process.stderr.write(stderr);
    throw new Error(`${label} exited with code ${result.status ?? "unknown"}`);
  }
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

function projectDbHealthy() {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const projectId = /^project_id\s*=\s*"([A-Za-z0-9][A-Za-z0-9._-]*)"\s*$/mu.exec(config)?.[1];
  if (!projectId) return false;

  const container = probe("docker", [
    "inspect",
    "--format",
    "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}",
    `supabase_db_${projectId}`,
  ]);
  return container.status === 0 && /^running\|healthy$/u.test((container.stdout ?? "").trim());
}

function requiredProjectServicesHealthy() {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const projectId = /^project_id\s*=\s*"([A-Za-z0-9][A-Za-z0-9._-]*)"\s*$/mu.exec(config)?.[1];
  if (!projectId) return false;

  const required = [
    ["db", true],
    ["storage", true],
    ["auth", true],
    ["rest", false],
    ["kong", false],
    ["inbucket", true],
  ];

  return required.every(([service, requiresHealth]) => {
    const container = probe("docker", [
      "inspect",
      "--format",
      "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}",
      `supabase_${service}_${projectId}`,
    ]);
    if (container.status !== 0) return false;
    const state = (container.stdout ?? "").trim();
    return requiresHealth
      ? /^running\|healthy$/u.test(state)
      : /^running\|(?:healthy|none)$/u.test(state);
  });
}

async function waitForStackReady(label) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const status = probe(process.execPath, [cli, "status", "--output", "json"]);
    if (status.status === 0 && projectDbHealthy() && requiredProjectServicesHealthy()) {
      console.log(`Database verification: ${label} (stack stable)`);
      return;
    }
    await sleep(2_000);
  }
  throw new Error(`${label} timed out while waiting for the local stack to stabilize.`);
}

try {
  const hasExistingContainers = inspectExistingProjectContainers();
  const existingStack = probe(process.execPath, [cli, "status", "--output", "json"]);

  if (existingStack.error || existingStack.status === null) {
    throw new Error("Local stack status probe failed; no stack operation was attempted.");
  }

  if (existingStack.status === 0) {
    console.log("Database verification: use existing local stack");
    await waitForStackReady("existing stack");
  } else {
    if (hasExistingContainers) {
      throw new Error(
        "An existing local project stack is not healthy. Recover it explicitly before verification; no containers were changed.",
      );
    }
    ownsLocalStack = true;
    run(process.execPath, [cli, "start"], "start local stack", false);
  }

  await resetWithTransientRetry("first clean reset");
  await waitForStackReady("first clean reset");
  await resetWithTransientRetry("second clean reset");
  await waitForStackReady("second clean reset");
  run(process.execPath, [cli, "test", "db", "--local"], "pgTAP suite");
  await resetWithTransientRetry("restore S4 schema after isolated pgTAP suite");
  await waitForStackReady("restored S4 schema");
  run(process.execPath, [leadConcurrency], "lead concurrency");
  run(process.execPath, [cli, "db", "lint", "--local", "--fail-on", "warning"], "database lint");
  run(process.execPath, [typeScript, "check"], "generated type drift check");
  console.log("Database verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database verification failed.");
  process.exitCode = 1;
} finally {
  if (ownsLocalStack) {
    try {
      run(process.execPath, [cli, "stop"], "clean local shutdown", false);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Local stack shutdown failed.");
      process.exitCode = 1;
    }
  }
}
