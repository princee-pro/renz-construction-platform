import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

/**
 * C10 §35–36 operational health: safe categories only — never a URL, key,
 * table name, stack trace or environment value. Each check is a small
 * bounded probe with its own timeout so a hanging dependency cannot hang
 * the whole endpoint.
 */
export type HealthState = "ok" | "warning" | "blocked";

export type HealthCheck = Readonly<{
  key: string;
  label: string;
  state: HealthState;
  /** Plain-English note without internals. */
  note: string;
}>;

export type HealthReport = Readonly<{
  status: HealthState;
  version: string;
  build: string;
  environment: "production" | "development" | "test";
  timestamp: string;
  checks: readonly HealthCheck[];
}>;

function timeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("failed"));
      },
    );
  });
}

function appVersion(): string {
  if (process.env["RENZ_APP_VERSION"]) return process.env["RENZ_APP_VERSION"];
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function buildId(): string {
  if (process.env["RENZ_BUILD_ID"]) return process.env["RENZ_BUILD_ID"];
  try {
    return readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8")
      .trim()
      .slice(0, 12);
  } catch {
    return "dev";
  }
}

function present(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];
  const environment =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "development";

  // Configuration presence (never the values).
  const supabaseConfigured =
    present("NEXT_PUBLIC_SUPABASE_URL") &&
    present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") &&
    present("SUPABASE_SECRET_KEY");
  checks.push({
    key: "auth",
    label: "Sign-in service configured",
    state: supabaseConfigured ? "ok" : "blocked",
    note: supabaseConfigured
      ? "Supabase URL, publishable key and server key are set."
      : "A Supabase setting is missing on the server.",
  });
  // C10 §83 fail-fast configuration: test-only switches must be absent in
  // a production build. Health goes "blocked" so the go-live checklist and
  // any uptime probe see it at once.
  const testSwitches = ["RENZ_INTAKE_ALLOW_DEV_BYPASS", "RENZ_CLIENT_PREVIEW"].filter(
    (name) => process.env[name] === "true",
  );
  checks.push({
    key: "test_switches",
    label: "Test-only switches absent",
    state: testSwitches.length === 0 ? "ok" : environment === "production" ? "blocked" : "warning",
    note:
      testSwitches.length === 0
        ? "No test-only switch is set."
        : `${testSwitches.length} test-only switch(es) set; they must be absent in a live deployment.`,
  });
  checks.push({
    key: "intake_secret",
    label: "Public form protection configured",
    state: present("INTAKE_RATE_LIMIT_SECRET")
      ? "ok"
      : environment === "production"
        ? "blocked"
        : "warning",
    note: present("INTAKE_RATE_LIMIT_SECRET")
      ? "The intake anti-abuse secret is set."
      : "The intake anti-abuse secret is missing; public forms refuse submissions in production.",
  });

  // Live probes (service role, bounded, no data returned).
  let client: ReturnType<typeof createServiceSupabaseClient> | null;
  try {
    client = createServiceSupabaseClient();
  } catch {
    client = null;
  }
  if (!client) {
    checks.push(
      { key: "database", label: "Database reachable", state: "blocked", note: "No server client." },
      {
        key: "storage",
        label: "Media storage reachable",
        state: "blocked",
        note: "No server client.",
      },
      {
        key: "content",
        label: "Public content available",
        state: "blocked",
        note: "No server client.",
      },
      { key: "migrations", label: "Database up to date", state: "warning", note: "Not checked." },
    );
  } else {
    try {
      const probe = await timeout(client.rpc("public_site_configuration"), 4000);
      checks.push({
        key: "database",
        label: "Database reachable",
        state: probe.error ? "blocked" : "ok",
        note: probe.error ? "The database did not answer." : "The database answered.",
      });
      const configuration =
        probe.data && typeof probe.data === "object"
          ? (probe.data as { site_mode?: string; website?: { canonical_base_url?: string | null } })
          : {};
      const mode = configuration.site_mode;
      const canonical = configuration.website?.canonical_base_url;
      checks.push({
        key: "content",
        label: "Public content available",
        state: probe.error ? "blocked" : mode ? "ok" : "warning",
        note: probe.error
          ? "The public configuration could not be read."
          : mode
            ? `Site mode: ${mode}.`
            : "The public configuration has not been published yet.",
      });
      // The canonical address is owner-published configuration (Settings →
      // Website), not an environment value.
      checks.push({
        key: "base_url",
        label: "Public site address published",
        state: canonical ? "ok" : environment === "production" ? "warning" : "ok",
        note: canonical
          ? "A canonical site address is published."
          : "No canonical site address is published; links fall back to the request host.",
      });
    } catch {
      checks.push(
        { key: "database", label: "Database reachable", state: "blocked", note: "Timed out." },
        { key: "content", label: "Public content available", state: "blocked", note: "Timed out." },
      );
    }
    try {
      const buckets = await timeout(client.storage.listBuckets(), 4000);
      const names = new Set((buckets.data ?? []).map((bucket) => bucket.id));
      const missing = ["editorial-originals", "editorial-derivatives", "lead-intake"].filter(
        (name) => !names.has(name),
      );
      checks.push({
        key: "storage",
        label: "Media storage reachable",
        state: buckets.error ? "blocked" : missing.length === 0 ? "ok" : "warning",
        note: buckets.error
          ? "Storage did not answer."
          : missing.length === 0
            ? "All media buckets exist."
            : `${missing.length} media bucket(s) missing.`,
      });
      // Media signing: a signed URL for a bucket root object path proves the
      // signer works; the object need not exist for the signature to be issued.
      if (!buckets.error && names.has("editorial-derivatives")) {
        const signed = await timeout(
          client.storage.from("editorial-derivatives").createSignedUrl("health/probe.webp", 30),
          4000,
        );
        checks.push({
          key: "signing",
          label: "Media signing works",
          state:
            signed.error && !/not found|object/iu.test(signed.error.message) ? "blocked" : "ok",
          note:
            signed.error && !/not found|object/iu.test(signed.error.message)
              ? "Signed media links could not be issued."
              : "Signed media links can be issued.",
        });
      }
    } catch {
      checks.push({
        key: "storage",
        label: "Media storage reachable",
        state: "blocked",
        note: "Timed out.",
      });
    }
    try {
      const migrations = await timeout(client.rpc("ops_migration_state"), 4000);
      const latest =
        migrations.data && typeof migrations.data === "object"
          ? (migrations.data as { latest?: string | null }).latest
          : null;
      const expected = latestLocalMigration();
      checks.push({
        key: "migrations",
        label: "Database up to date",
        state: migrations.error
          ? "warning"
          : expected && latest && latest >= expected
            ? "ok"
            : "warning",
        note: migrations.error
          ? "The migration history could not be read."
          : expected && latest && latest >= expected
            ? "The latest migration is applied."
            : "The database is behind the application's migrations.",
      });
    } catch {
      checks.push({
        key: "migrations",
        label: "Database up to date",
        state: "warning",
        note: "Not checked.",
      });
    }
  }

  const status: HealthState = checks.some((check) => check.state === "blocked")
    ? "blocked"
    : checks.some((check) => check.state === "warning")
      ? "warning"
      : "ok";
  return {
    status,
    version: appVersion(),
    build: buildId(),
    environment,
    timestamp: new Date().toISOString(),
    checks,
  };
}

/**
 * The newest migration version shipped with this build: the migrations
 * folder when it is deployed alongside the app, else RENZ_LATEST_MIGRATION
 * (set by the deployment runbook), else unknown (reported as a warning).
 */
function latestLocalMigration(): string | null {
  // Build-time value (next.config.ts) or the host's explicit setting first:
  // the deployed function bundle has no migrations folder.
  if (process.env["RENZ_LATEST_MIGRATION"]) return process.env["RENZ_LATEST_MIGRATION"];
  try {
    const files = readdirSync(join(process.cwd(), "supabase", "migrations"))
      .filter((name) => /^\d{14}_.+\.sql$/u.test(name))
      .sort();
    const last = files.at(-1);
    return last ? last.slice(0, 14) : (process.env["RENZ_LATEST_MIGRATION"] ?? null);
  } catch {
    return process.env["RENZ_LATEST_MIGRATION"] ?? null;
  }
}
