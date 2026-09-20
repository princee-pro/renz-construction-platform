import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const supabaseCli = join(root, "node_modules", "supabase", "dist", "supabase.js");
export const commandEnvironment = { ...process.env, DO_NOT_TRACK: "1" };

function localDatabaseContainerName() {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const projectId = /^project_id\s*=\s*"([A-Za-z0-9][A-Za-z0-9._-]*)"\s*$/mu.exec(config)?.[1];
  if (!projectId) {
    throw new Error("The local Supabase project id could not be resolved safely.");
  }
  return `supabase_db_${projectId}`;
}

export function runLocalSql(sql, label = "local SQL") {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      localDatabaseContainerName(),
      "psql",
      "-X",
      "--no-align",
      "--tuples-only",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "--set=VERBOSITY=sqlstate",
      "--username=postgres",
      "--dbname=postgres",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: commandEnvironment,
      input: sql,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
      windowsHide: true,
    },
  );

  if (result.error || result.status !== 0) {
    const errorLines = (result.stderr ?? "")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    const detail = errorLines.find((line) => /^(ERROR|DETAIL|CONTEXT):/u.test(line));
    const sqlState = errorLines
      .map((line) => /(?:ERROR|SQLSTATE)\s*:?\s*([0-9A-Z]{5})/iu.exec(line)?.[1])
      .find(Boolean);
    throw new Error(
      `${label} failed${sqlState ? ` (SQLSTATE ${sqlState})` : ""}${detail ? `: ${detail}` : "; local database output was suppressed."}`,
    );
  }

  return result.stdout?.trim() ?? "";
}

export function runSupabase(args, options = {}) {
  return spawnSync(process.execPath, [supabaseCli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: commandEnvironment,
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    windowsHide: true,
  });
}

export function parseStatusEnvironment(stdout) {
  const values = {};
  for (const line of stdout.split(/\r?\n/u)) {
    const match = /^([A-Z][A-Z0-9_]*)="([\s\S]*)"$/u.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) {
      values[match[1]] = match[2];
    }
  }
  return values;
}

export function getLocalSupabaseCredentials() {
  const status = runSupabase(["status", "--output", "env"], { timeout: 30_000 });
  if (status.error || status.status !== 0) {
    throw new Error(
      "The local Supabase stack is not healthy; start it before running this S4 command.",
    );
  }

  const values = parseStatusEnvironment(status.stdout ?? "");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? values.API_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    values.PUBLISHABLE_KEY;
  const anonymousKey = process.env.SUPABASE_ANON_KEY ?? values.ANON_KEY;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    values.SECRET_KEY ??
    values.SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !anonymousKey || !secretKey) {
    throw new Error("Local Supabase credentials are unavailable; no local client was created.");
  }

  return { url, publishableKey, anonymousKey, secretKey };
}

export function createLocalAdminClient() {
  const { url, secretKey } = getLocalSupabaseCredentials();
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createLocalClient(keyType = "publishable") {
  const credentials = getLocalSupabaseCredentials();
  const key = keyType === "anonymous" ? credentials.anonymousKey : credentials.publishableKey;
  return createClient(credentials.url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runOrThrow(executable, args, label, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
    env: commandEnvironment,
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    windowsHide: true,
  });

  if (options.showOutput !== false) {
    if (result.stdout?.trim()) process.stdout.write(result.stdout);
    if (result.stderr?.trim()) process.stderr.write(result.stderr);
  }

  if (result.error || result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status ?? "unknown"}.`);
  }

  return result;
}
