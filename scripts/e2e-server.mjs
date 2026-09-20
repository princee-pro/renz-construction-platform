import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Playwright web server: start the production build with an EMPTY Next data
 * cache. Playwright launches the server before global setup resets and
 * seeds the database, so a cache left by a previous run (published page and
 * media ids that no longer exist) must never be loaded into memory.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const dir of [
  join(root, ".next", "cache", "fetch-cache"),
  join(root, ".next", "dev", "cache", "fetch-cache"),
]) {
  rmSync(dir, { recursive: true, force: true });
}
const port = process.env["RENZ_E2E_PORT"] ?? "3100";
const child = spawn("corepack", ["pnpm@11.25.0", "start", "--port", port], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill());
}
child.on("exit", (code) => process.exit(code ?? 0));
