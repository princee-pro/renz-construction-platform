/* global document */
// C10 §88, §111 — admin register performance at scale: sign in as the
// synthetic owner and time each register (server render → DOM ready), count
// rendered rows (pagination must bound them) and record the largest RPC /
// REST response the browser received (nothing may pull a whole table).
//   node scripts/c10-admin-perf.mjs [base]
import { readFileSync, writeFileSync } from "node:fs";

import { chromium } from "@playwright/test";

import { currentTotp } from "../tests/e2e/support/totp.mjs";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
const routes = [
  ["overview", "/admin"],
  ["clients", "/admin/operations/clients"],
  ["projects", "/admin/operations/projects"],
  ["leads", "/admin/operations/leads"],
  ["contractors", "/admin/operations/contractors"],
  ["suppliers", "/admin/procurement/suppliers"],
  ["orders", "/admin/procurement/orders"],
  ["finance", "/admin/finance"],
  ["invoices", "/admin/finance/invoices"],
  ["notifications", "/admin/notifications"],
  ["analytics", "/admin/analytics"],
  ["analytics-finance", "/admin/analytics/finance"],
  ["website", "/admin/website"],
  ["website-pages", "/admin/website/pages"],
];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const rows = [];
let largest = { url: "", bytes: 0 };
page.on("response", (response) => {
  const url = response.url();
  if (!/\/rest\/v1\/|\/api\//u.test(url)) return;
  const length = Number(response.headers()["content-length"] ?? 0);
  if (length > largest.bytes) largest = { url: url.split("?")[0].slice(-70), bytes: length };
});
await page.goto(`${base}/admin/sign-in?next=%2Fadmin`, { waitUntil: "load" });
await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
await page.getByLabel("Password").fill(actor.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin\/mfa/u, { timeout: 30000 });
await page.getByRole("textbox", { name: "Authenticator code" }).fill(currentTotp(actor.totpSecret));
await page.getByRole("button", { name: "Verify and continue" }).click();
await page.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 });
for (const [name, route] of routes) {
  largest = { url: "", bytes: 0 };
  const started = Date.now();
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  const loadMs = Date.now() - started;
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      ttfb: Math.round(nav?.responseStart ?? 0),
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      rows: document.querySelectorAll(
        "ol.service-register > li, ol.ops-client-register > li, ol.ops-project-register > li, .lead-register > li, .partner-register > li, .invoice-register > li, .po-register > li, tbody > tr, .notification-list > li, li[data-register-row]",
      ).length,
      htmlBytes: document.documentElement.outerHTML.length,
    };
  });
  rows.push({ name, route, loadMs, ...metrics, largestResponse: largest });
  console.log(
    `${name.padEnd(18)} ${String(loadMs).padStart(6)} ms  ttfb ${String(metrics.ttfb).padStart(5)}  rows ${String(metrics.rows).padStart(4)}  html ${Math.round(metrics.htmlBytes / 1024)} KB  largest ${Math.round(largest.bytes / 1024)} KB`,
  );
}
// Quick Find at scale.
const started = Date.now();
await page.goto(`${base}/admin`, { waitUntil: "load" });
await page.getByRole("button", { name: "Quick find" }).click();
await page
  .getByLabel("Search clients, projects, and case studies")
  .fill(process.argv[3] ?? "SCALE Client 03");
await page
  .locator("[role=listbox] [role=option]")
  .first()
  .waitFor({ timeout: 15000 })
  .catch(() => undefined);
const results = await page.locator("[role=listbox] [role=option]").count();
console.log(`quick-find           ${Date.now() - started} ms  results ${results}`);
rows.push({ name: "quick-find", results, loadMs: Date.now() - started });
await browser.close();
writeFileSync(".playwright/c10-admin-perf.json", JSON.stringify(rows, null, 2));
