/* global document */
// C10 §79: loads public and admin pages in Chromium and reports every CSP
// violation (console + securitypolicyviolation events). Exits 1 on any.
//   node scripts/c10-csp-check.mjs [base]
import { readFileSync } from "node:fs";

import { chromium } from "@playwright/test";

import { currentTotp } from "../tests/e2e/support/totp.mjs";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const violations = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (message) => {
  if (/Content Security Policy|Refused to/u.test(message.text())) {
    violations.push(`${page.url()} :: ${message.text().slice(0, 200)}`);
  }
});
await page.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (event) => {
    console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
  });
});
async function visit(route, after) {
  await page.goto(base + route, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(3000);
  if (after) await after();
}
await visit("/");
await visit("/projects");
await visit("/projects/kigali-infill-apartments", async () => {
  await page.locator(".gallery-grid .gallery-frame-button").first().click();
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
});
await visit("/contact");
await visit("/start-a-project");
// Admin: sign in with the synthetic owner (realtime websocket, quick find, help).
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
await visit("/admin/sign-in");
await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
await page.getByLabel("Password").fill(actor.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin\/mfa/u, { timeout: 30000 });
await page.getByRole("textbox", { name: "Authenticator code" }).fill(currentTotp(actor.totpSecret));
await page.getByRole("button", { name: "Verify and continue" }).click();
await page.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Help for this page" }).click();
await page.waitForTimeout(500);
await page.keyboard.press("Escape");
await visit("/admin/website");
await visit("/admin/settings/staff");
await visit("/admin/settings/system");
await browser.close();
if (violations.length > 0) {
  console.log("CSP violations:\n" + violations.join("\n"));
  process.exit(1);
}
console.log("no CSP violations on the sampled routes");
