// Prints the local synthetic staff sign-in details and the current
// authenticator code (30-second TOTP) for the Control Room at /admin/sign-in.
// Local development only: the accounts come from scripts/d1-seed-actors.mjs.
//   node scripts/staff-code.mjs [superA|superB|admin|visual|aal1]
import { readFileSync } from "node:fs";

import { currentTotp } from "../tests/e2e/support/totp.mjs";

const which = process.argv[2] ?? "superA";
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors[which];
if (!actor) {
  console.error(`No actor "${which}". Run: node scripts/d1-seed-actors.mjs`);
  process.exit(1);
}
const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`Sign in:   http://localhost:3100/admin/sign-in`);
console.log(`Email:     ${actor.email}`);
console.log(`Password:  ${actor.password}`);
console.log(
  `Code:      ${currentTotp(actor.totpSecret)}   (valid for ${secondsLeft}s; run again for a new one)`,
);
