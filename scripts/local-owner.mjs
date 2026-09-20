import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { currentTotp } from "../tests/e2e/support/totp.mjs";
import { admin, client, credentials, removeUserByEmail } from "./c4-local.mjs";
import { runLocalSql } from "./s4-local.mjs";

// Local-only owner account for manual use of the Admin. The security model
// (password + TOTP, AAL2 enforced in Postgres) is unchanged; this script only
// removes the phone-app step on the local stack by enrolling the TOTP factor
// itself and printing the current code on demand.
//
//   node scripts/local-owner.mjs create   recreate the owner and its TOTP factor
//   node scripts/local-owner.mjs code     print the current 6-digit sign-in code

const email = "owner@renz.local";
const password = "Renz-Local-Admin-2026!";
const secretDirectory = join(process.cwd(), ".local");
const secretFile = join(secretDirectory, "owner-totp.txt");

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/u.test(credentials.url)) {
  throw new Error("local-owner only runs against the local Supabase stack.");
}

const command = process.argv[2] ?? "create";

if (command === "code") {
  const secret = readFileSync(secretFile, "utf8").trim();
  console.log(currentTotp(secret));
  process.exit();
}

if (command !== "create") {
  throw new Error(`Unknown command: ${command}`);
}

await removeUserByEmail(email);
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: "RENZ Owner (local)" },
});
if (created.error || !created.data.user) throw new Error("Local owner creation failed.");
runLocalSql(
  `select private.bootstrap_super_admin('${created.data.user.id}'::uuid);`,
  "local owner bootstrap",
);

const owner = client(credentials.publishableKey);
const signedIn = await owner.auth.signInWithPassword({ email, password });
if (signedIn.error) throw new Error("Local owner password sign-in failed.");
const enrolled = await owner.auth.mfa.enroll({ factorType: "totp", friendlyName: "Local" });
if (enrolled.error || !enrolled.data?.totp) throw new Error("Local owner TOTP enrolment failed.");
const verified = await owner.auth.mfa.challengeAndVerify({
  factorId: enrolled.data.id,
  code: currentTotp(enrolled.data.totp.secret),
});
if (verified.error) throw new Error("Local owner TOTP verification failed.");
await owner.auth.signOut();

mkdirSync(secretDirectory, { recursive: true });
writeFileSync(secretFile, `${enrolled.data.totp.secret}\n`, "utf8");
console.log(
  JSON.stringify({
    ok: true,
    email,
    password,
    totpSecretFile: secretFile,
    codeCommand: "corepack pnpm@11.25.0 local:owner:code",
  }),
);
process.exit();
