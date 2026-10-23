import { defineConfig, devices } from "@playwright/test";

const suppliedBaseURL = process.env["RENZ_FRONTEND_BASE_URL"];
const baseURL = suppliedBaseURL ?? "http://127.0.0.1:3101";
const target = new URL(baseURL);

if (
  target.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
  target.username ||
  target.password ||
  target.pathname !== "/" ||
  target.search ||
  target.hash
) {
  throw new Error("Frontend verification must target a local HTTP origin without credentials.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch:
    /(?:s6a-public|s9ap-public|s9bp-public|s9bp-visual|renz-brand|insights-auth-visual)\.spec\.ts/u,
  outputDir: ".playwright/frontend-results",
  // This harness never creates actors, resets data, seeds records, or signs into admin.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  reporter: "line",
  use: {
    baseURL,
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(suppliedBaseURL
    ? {}
    : {
        webServer: {
          command: "node scripts/start-frontend-preview.mjs",
          reuseExistingServer: false,
          timeout: 120_000,
          url: baseURL,
        },
      }),
});
