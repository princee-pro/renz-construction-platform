import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { commandEnvironment, root, runOrThrow, runSupabase, supabaseCli } from "./s4-local.mjs";

function readProjectId() {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const projectId = /^project_id\s*=\s*"([A-Za-z0-9][A-Za-z0-9._-]*)"\s*$/mu.exec(config)?.[1];
  if (!projectId) throw new Error("S4 verification could not resolve a safe local project id.");
  return projectId;
}

function hasProjectContainers(projectId) {
  const result = spawnSync(
    "docker",
    [
      "ps",
      "--all",
      "--filter",
      `label=com.supabase.cli.project=${projectId}`,
      "--format",
      "{{.ID}}",
    ],
    { cwd: root, encoding: "utf8", env: commandEnvironment, timeout: 10_000, windowsHide: true },
  );
  if (result.error || result.status !== 0) throw new Error("Docker project inventory failed.");
  return Boolean(result.stdout?.trim());
}

function isHealthy() {
  const result = runSupabase(["status", "--output", "json"], { timeout: 30_000 });
  return !result.error && result.status === 0;
}

async function waitForExistingStack() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (isHealthy()) return true;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return false;
}

function runSupabaseStep(args, label) {
  runOrThrow(process.execPath, [supabaseCli, ...args], label);
}

function runPackageScript(script, label) {
  const npmExecPath = process.env.npm_execpath;
  const options = { timeout: 10 * 60 * 1_000 };
  if (npmExecPath) {
    runOrThrow(process.execPath, [npmExecPath, "run", script], label, options);
    return;
  }
  const corepack = process.platform === "win32" ? "corepack.cmd" : "corepack";
  runOrThrow(corepack, ["pnpm@11.25.0", "run", script], label, options);
}

let ownsLocalStack = false;
let exitCode = 0;

try {
  const projectId = readProjectId();
  const existingContainers = hasProjectContainers(projectId);
  if (!isHealthy()) {
    if (existingContainers) {
      if (!(await waitForExistingStack())) {
        throw new Error(
          "The local project containers exist but are not healthy; recover them explicitly.",
        );
      }
      console.log(
        "S4 verification: existing local stack became healthy after a transient startup state",
      );
    } else {
      ownsLocalStack = true;
      runSupabaseStep(["start"], "start local S4 stack");
    }
  }

  const checks = [
    ["db:verify", "database resets, pgTAP, lint, concurrency, and generated types"],
    ["auth:verify", "S3 Auth/MFA/RBAC regression"],
    ["content:verify", "S4 content and anonymous projection baseline"],
    ["storage:provision", "private Storage bucket provisioning"],
    ["publication:verify", "S4 publication, rights, settings, and projection integration"],
    ["storage:verify", "Storage API upload/download/privacy integration"],
    ["media:reconcile", "report-only media metadata reconciliation"],
    ["verify", "application format, lint, type, tests, design, secrets, build, and audit"],
  ];
  for (const [script, label] of checks) runPackageScript(script, label);
  console.log(
    "S4 verification passed: database, Auth, content, publication, Storage, reconciliation, and application checks.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "S4 verification failed.");
  exitCode = 1;
} finally {
  if (ownsLocalStack) {
    try {
      runSupabaseStep(["stop"], "stop owned local S4 stack");
    } catch (error) {
      console.error(error instanceof Error ? error.message : "local S4 stack shutdown failed.");
      exitCode = 1;
    }
  }
}

process.exitCode = exitCode;
