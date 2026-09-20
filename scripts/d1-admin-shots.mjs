// D1 admin screenshot round against the running dev server (port 3000).
// Requires .playwright/s5a-fixtures.json (run `node scripts/d1-seed-actors.mjs`).
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { currentTotp } from "../tests/e2e/support/totp.mjs";

const width = Number(process.argv[2] ?? 1440);
const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA ?? fixtures.actors.visual;
const dir = `.playwright/screenshots/d1/admin`;
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 } });
await page.goto(`${base}/admin/sign-in?next=%2Fadmin`);
await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
await page.getByLabel("Password").fill(actor.password);
await page.screenshot({ path: `${dir}/${width}-sign-in.png` });
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin\/mfa\?/u);
await page.screenshot({ path: `${dir}/${width}-mfa.png` });
await page.getByRole("textbox", { name: "Authenticator code" }).fill(currentTotp(actor.totpSecret));
await page.getByRole("button", { name: "Verify and continue" }).click();
await page.waitForURL((url) => url.pathname === "/admin", { timeout: 15000 });

const only = process.env.RENZ_SHOT_ONLY;
const extra = process.env.RENZ_SHOT_EXTRA ? JSON.parse(process.env.RENZ_SHOT_EXTRA) : [];
const routes = [
  ["dashboard", "/admin"],
  ["leads", "/admin/leads"],
  ["projects", "/admin/projects"],
  ["content-services", "/admin/content/services"],
  ["service-new", "/admin/content/services/new"],
  ["finance", "/admin/finance"],
  ["analytics", "/admin/analytics"],
  ["notifications", "/admin/notifications"],
  ["settings", "/admin/settings"],
  ["launch", "/admin/settings/launch-readiness"],
  ["leads-ops", "/admin/operations/leads"],
  ["projects-ops", "/admin/operations/projects"],
  ["invoices", "/admin/finance/invoices"],
  ["orders", "/admin/procurement/orders"],
];
for (const [name, route] of [...routes, ...extra]) {
  if (only && name !== only && !extra.some(([extraName]) => extraName === name)) continue;
  const response = await page.goto(`${base}${route}`, { waitUntil: "load" });
  if (!response || response.status() >= 400) {
    console.log("skip", route, response?.status());
    continue;
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${width}-${name}.png`, fullPage: true });
  console.log("captured", width, name);
}
if (width < 768) {
  await page.goto(`${base}/admin`);
  await page.getByRole("button", { name: "Open administration menu" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${width}-drawer.png` });
}
await browser.close();
