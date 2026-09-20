import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

function localSupabaseEnvironment(): Record<string, string> {
  const cli = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
  const output = execFileSync(process.execPath, [cli, "status", "--output", "env"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, DO_NOT_TRACK: "1" },
    timeout: 30_000,
    windowsHide: true,
  });
  const values: Record<string, string> = {};
  for (const line of output.split(/\r?\n/u)) {
    const match = /^([A-Z][A-Z0-9_]*)="([\s\S]*)"$/u.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) values[match[1]] = match[2];
  }
  const url = values["API_URL"];
  const publishableKey = values["PUBLISHABLE_KEY"];
  const secretKey = values["SECRET_KEY"] ?? values["SERVICE_ROLE_KEY"];
  const anonymousKey = values["ANON_KEY"];
  if (!url || !publishableKey || !secretKey || !anonymousKey) {
    throw new Error("Local Supabase browser-test environment is incomplete.");
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    SUPABASE_SECRET_KEY: secretKey,
    SUPABASE_ANON_KEY: anonymousKey,
  };
}

const baseURL = "http://127.0.0.1:3100";
const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  ),
);

export default defineConfig({
  testDir: "./tests/e2e",
  // S6A/S9AP visual captures target the pre-C3.5 public home (`.public-hero`,
  // `.proposition-section`); S9BP supersedes them for the current experience.
  outputDir: ".playwright/results",
  globalSetup: "./tests/e2e/global-setup.mjs",
  globalTeardown: "./tests/e2e/global-teardown.mjs",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  reporter: process.env["CI"]
    ? [["line"], ["html", { outputFolder: ".playwright/report", open: "never" }]]
    : "line",
  use: {
    baseURL,
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    env: {
      ...inheritedEnvironment,
      ...localSupabaseEnvironment(),
      RENZ_CLIENT_PREVIEW: "true",
      // CR1: the server starts before global setup reseeds; keep the public
      // content cache window short so nothing stale survives the seed.
      RENZ_PUBLIC_CACHE_SECONDS: "5",
      // C8: the production server needs the anti-abuse secret; Turnstile stays
      // unconfigured in tests, so the explicit test bypass is enabled.
      INTAKE_RATE_LIMIT_SECRET: "synthetic-e2e-test-intake-secret-000000",
      RENZ_INTAKE_ALLOW_DEV_BYPASS: "true",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/admin/sign-in`,
  },
});
