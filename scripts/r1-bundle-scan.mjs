// R1 §8, §20, §23 — nothing secret or local may reach the browser. Scans the
// production build's client assets (.next/static: JS chunks, CSS, source
// maps if any) and the prerendered HTML for: the local secret key, the
// synthetic owner password and TOTP secrets, the intake secret, the task
// token, "service_role", database URLs, SMTP-looking values, and local /
// test origins (localhost, :3000, :3100). Run after `next build`.
//   node scripts/r1-bundle-scan.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

const credentials = getLocalSupabaseCredentials();
const markers = [
  ["service-role key", credentials.secretKey],
  ["intake secret", process.env["INTAKE_RATE_LIMIT_SECRET"] ?? ""],
  ["task token", process.env["RENZ_TASK_TOKEN"] ?? ""],
  ["literal service_role", "service_role"],
  ["SUPABASE_SECRET_KEY name", "SUPABASE_SECRET_KEY"],
  ["postgres URL", "postgres://"],
  ["postgresql URL", "postgresql://"],
  ["smtp URL", "smtp://"],
  ["localhost origin", "http://localhost"],
  ["loopback origin", "http://127.0.0.1"],
  ["port 3000", ":3000/"],
  ["port 3100", ":3100/"],
].filter(([, value]) => value && value.length >= 6);
const fixturePath = join(root, ".playwright", "s5a-fixtures.json");
if (existsSync(fixturePath)) {
  const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
  for (const [key, actor] of Object.entries(fixtures.actors ?? {})) {
    if (actor.password) markers.push([`synthetic password (${key})`, actor.password]);
    if (actor.totpSecret) markers.push([`synthetic TOTP secret (${key})`, actor.totpSecret]);
  }
}

function walk(directory, out = []) {
  if (!existsSync(directory)) return out;
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|css|map|html|txt|json)$/u.test(entry)) out.push(full);
  }
  return out;
}

const files = [
  ...walk(join(root, ".next", "static")),
  ...walk(join(root, ".next", "server", "app")).filter((file) => /\.(html|txt)$/u.test(file)),
];
if (files.length === 0) throw new Error("no build output found; run next build first");
const findings = [];
let bytes = 0;
// Allowed local strings: the configured NEXT_PUBLIC_SUPABASE_URL (baked in
// by design; the production build carries the production project URL) and
// supabase-js's own placeholder default `http://localhost:9999`.
const allowed = [credentials.url, "http://localhost:9999"];
for (const file of files) {
  let text = readFileSync(file, "utf8");
  bytes += text.length;
  for (const value of allowed) text = text.split(value).join("");
  for (const [label, value] of markers) {
    if (text.includes(value)) findings.push(`${label} in ${file.replace(root, "")}`);
  }
}
const maps = files.filter((file) => file.endsWith(".map")).length;
console.log(
  `scanned ${files.length} client/prerender files (${Math.round(bytes / 1024)} KB), ${markers.length} markers, ${maps} source maps`,
);
if (findings.length > 0) {
  console.error("bundle scan FAILED:\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "bundle scan passed: no secret, credential, database URL or local origin in client assets",
  );
}
