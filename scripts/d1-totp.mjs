// Prints the current authenticator code for a synthetic admin actor (local only).
import { readFileSync } from "node:fs";
import { currentTotp } from "../tests/e2e/support/totp.mjs";
const key = process.argv[2] ?? "superA";
const f = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = f.actors[key];
if (!actor) {
  console.error("unknown actor", key, Object.keys(f.actors));
  process.exit(1);
}
console.log(
  `${actor.email}\npassword: ${actor.password}\ncode now: ${currentTotp(actor.totpSecret)}`,
);
