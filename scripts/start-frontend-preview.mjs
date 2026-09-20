import { spawn } from "node:child_process";
import { join } from "node:path";

import { parseStatusEnvironment, root, runSupabase } from "./s4-local.mjs";

// Read the running local stack. Never reset, seed, create users, or request privileged data.
const status = runSupabase(["status", "--output", "env"], { timeout: 30_000 });
if (status.error || status.status !== 0) {
  throw new Error("Start the existing local Supabase stack before frontend verification.");
}

const values = parseStatusEnvironment(status.stdout ?? "");
const url = values.API_URL;
const publishableKey = values.PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error("The local public connection is unavailable; credential output was suppressed.");
}
const endpoint = new URL(url);
if (
  endpoint.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)
) {
  throw new Error("Frontend verification requires the existing local Supabase endpoint.");
}

const environment = { ...process.env };
for (const key of Object.keys(environment)) {
  if (/^(?:SUPABASE_|NEXT_PUBLIC_SUPABASE_)/u.test(key)) delete environment[key];
}

const server = spawn(
  process.execPath,
  [join(root, "node_modules", "next", "dist", "bin", "next"), "start", "--port", "3101"],
  {
    cwd: root,
    env: {
      ...environment,
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      RENZ_CLIENT_PREVIEW: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);

server.once("error", () => {
  process.stderr.write("The local frontend preview server could not start.\n");
  process.exitCode = 1;
});
server.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.kill(signal));
}
