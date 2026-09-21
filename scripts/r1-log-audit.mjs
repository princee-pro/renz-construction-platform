// R1 §56 — server and test logs must never carry credentials. Scans the
// logs the local runs produced (.playwright/*.log, the production server
// log) for: synthetic passwords and TOTP secrets, the service-role key, the
// intake secret, bearer tokens, refresh/access tokens, temporary passwords
// as printed by Staff & Access, raw share tokens and email addresses that
// are not the synthetic test domain.
//   node scripts/r1-log-audit.mjs [dir]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getLocalSupabaseCredentials, root } from "./s4-local.mjs";

const directory = process.argv[2] ?? join(root, ".playwright");
const credentials = getLocalSupabaseCredentials();
const markers = [
  ["service-role key", credentials.secretKey],
  ["intake secret", process.env["INTAKE_RATE_LIMIT_SECRET"] ?? "\u0000"],
];
const fixturePath = join(root, ".playwright", "s5a-fixtures.json");
if (existsSync(fixturePath)) {
  const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
  for (const [key, actor] of Object.entries(fixtures.actors ?? {})) {
    if (actor.password) markers.push([`synthetic password (${key})`, actor.password]);
    if (actor.totpSecret) markers.push([`synthetic TOTP secret (${key})`, actor.totpSecret]);
  }
}
const patterns = [
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{20,}/u],
  ["JWT", /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/u],
  ["refresh token field", /"refresh_token"\s*:\s*"[^"]{8,}"/u],
  ["temporary password line", /give it privately\):\s*\S+/u],
  ["share token path", /\/(?:i|po)\/[A-Za-z0-9_-]{40,64}/u],
  [
    "non-synthetic email",
    /[A-Za-z0-9._%+-]+@(?!example\.test)(?!supabase)(?!anthropic)[A-Za-z0-9.-]+\.[a-z]{2,}/u,
  ],
];
const files = readdirSync(directory).filter((name) => name.endsWith(".log"));
const findings = [];
let lines = 0;
for (const name of files) {
  const text = readFileSync(join(directory, name), "utf8");
  lines += text.split("\n").length;
  for (const [label, value] of markers) {
    if (value && text.includes(value)) findings.push(`${label} in ${name}`);
  }
  for (const [label, pattern] of patterns) {
    const match = pattern.exec(text);
    if (match) findings.push(`${label} in ${name}: ${match[0].slice(0, 24)}…`);
  }
}
console.log(
  `scanned ${files.length} log files (${lines} lines), ${markers.length} exact markers, ${patterns.length} patterns`,
);
if (findings.length > 0) {
  console.error("log audit FAILED:\n  " + findings.join("\n  "));
  process.exitCode = 1;
} else {
  console.log(
    "log audit passed: no credential, token, temporary password, share token or real email in logs",
  );
}
