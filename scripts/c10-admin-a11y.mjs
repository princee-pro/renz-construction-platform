/* global document, window */
// C10 §56–58, §92–95, §131 — admin accessibility, responsiveness and
// screenshot matrix on the production server, signed in as the synthetic
// owner. For every route at 320 / 768 / 1440 px: axe (serious + critical
// only, no rule disabled), no horizontal overflow, one screenshot. Then the
// C10 keyboard paths: Help drawer opens from the keyboard and closes with
// Escape, focus returns; Quick Find opens with Ctrl+K; the sign-out button
// and navigation are reachable by Tab.
//   node scripts/c10-admin-a11y.mjs [base] [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

import { currentTotp } from "../tests/e2e/support/totp.mjs";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const outDir = process.argv[3] ?? ".playwright/screenshots/c10/admin";
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
const widths = (process.argv[4] ?? "320,768,1440").split(",").map(Number);
const routes = {
  overview: "/admin",
  clients: "/admin/operations/clients",
  "client-new": "/admin/operations/clients/new",
  projects: "/admin/operations/projects",
  leads: "/admin/operations/leads",
  contractors: "/admin/operations/contractors",
  finance: "/admin/finance",
  invoices: "/admin/finance/invoices",
  "invoice-new": "/admin/finance/invoices/new",
  orders: "/admin/procurement/orders",
  materials: "/admin/procurement/materials",
  notifications: "/admin/notifications",
  analytics: "/admin/analytics",
  website: "/admin/website",
  pages: "/admin/website/pages",
  media: "/admin/website/media",
  settings: "/admin/settings",
  staff: "/admin/settings/staff",
  system: "/admin/settings/system",
  readiness: "/admin/settings/launch-readiness",
  security: "/admin/security",
  password: "/admin/security/password",
};

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const results = [];
let failures = 0;

async function signIn(context) {
  const page = await context.newPage();
  await page.goto(`${base}/admin/sign-in?next=%2Fadmin`, { waitUntil: "load" });
  await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
  await page.getByLabel("Password").fill(actor.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/mfa/u, { timeout: 30000 });
  await page
    .getByRole("textbox", { name: "Authenticator code" })
    .fill(currentTotp(actor.totpSecret));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
  return page;
}

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 720 : 900 },
    reducedMotion: "reduce",
    // No mobile-viewport emulation: it lets the layout viewport grow to fit
    // overflowing content and hides exactly the 320 px defects this checks.
    hasTouch: width < 700,
  });
  const page = await signIn(context);
  for (const [name, route] of Object.entries(routes)) {
    await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    await page.screenshot({ path: join(outDir, `${name}-${width}.png`), fullPage: true });
    const row = {
      route,
      width,
      overflowPx: overflow,
      violations: serious.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      })),
    };
    results.push(row);
    const bad = overflow > 0 || serious.length > 0;
    if (bad) failures += 1;
    console.log(
      `${bad ? "FAIL" : "ok  "} ${String(width).padStart(4)} ${name.padEnd(14)} overflow ${overflow}px  serious ${serious.length}${serious.length ? " " + serious.map((v) => v.id).join(",") : ""}`,
    );
  }
  await context.close();
}

// Keyboard paths (desktop).
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await signIn(context);
await page.goto(`${base}/admin`, { waitUntil: "load" });
const help = page.getByRole("button", { name: "Help for this page" });
await help.focus();
await page.keyboard.press("Enter");
const drawer = page.locator("dialog.admin-help-drawer[open]");
const drawerOpen = await drawer.isVisible().catch(() => false);
await page.keyboard.press("Escape");
const drawerClosed = !(await drawer.isVisible().catch(() => false));
const focusBack = await page.evaluate(() =>
  document.activeElement?.classList.contains("admin-help-button"),
);
await page.keyboard.press("Control+K");
const quickFind = await page
  .getByLabel("Search clients, projects, and case studies")
  .isVisible()
  .catch(() => false);
await page.keyboard.press("Escape");
let signOutReachable = false;
let tabs = 0;
for (; tabs < 150 && !signOutReachable; tabs += 1) {
  await page.keyboard.press("Tab");
  signOutReachable = await page.evaluate(() =>
    document.activeElement?.classList.contains("admin-sign-out"),
  );
}
const keyboard = { drawerOpen, drawerClosed, focusBack, quickFind, signOutReachable, tabs };
console.log("keyboard", keyboard);
if (!drawerOpen || !drawerClosed || !focusBack || !quickFind || !signOutReachable) failures += 1;
await browser.close();
writeFileSync(join(outDir, "results.json"), JSON.stringify({ results, keyboard }, null, 2));
console.log(`\n${results.length} route×width checks, ${failures} failures → ${outDir}`);
process.exit(failures ? 1 : 0);
