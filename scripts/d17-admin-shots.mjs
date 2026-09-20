// Admin screenshot round (D1.7 §92). Signs in with the synthetic super_admin
// (MFA) and captures the listed routes at the given width.
//   node scripts/d17-admin-shots.mjs http://127.0.0.1:3100 1440 [routesCsv] [outDir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { currentTotp } from "../tests/e2e/support/totp.mjs";
const base = process.argv[2] ?? "http://127.0.0.1:3100";
const width = Number(process.argv[3] ?? 1440);
const only = process.argv[4]?.split(",");
const dir = process.argv[5] ?? `.playwright/screenshots/d1-7/admin-${width}`;
mkdirSync(dir, { recursive: true });
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
const routes = {
  "sign-in": "/admin/sign-in",
  overview: "/admin",
  leads: "/admin/operations/leads",
  clients: "/admin/operations/clients",
  "op-projects": "/admin/operations/projects",
  finance: "/admin/finance",
  invoices: "/admin/finance/invoices",
  analytics: "/admin/analytics",
  website: "/admin/website",
  "website-pages": "/admin/website/pages",
  "content-projects": "/admin/content/projects",
  "project-editor": "PROJECT_EDITOR",
  media: "/admin/website/media",
  settings: "/admin/settings",
  staff: "/admin/settings/staff",
};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 } });
const page = await context.newPage();
async function shot(name) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/${name}.png` });
  console.log("captured", name);
}
await page.goto(`${base}/admin/sign-in?next=%2Fadmin`, { waitUntil: "networkidle" });
if (!only || only.includes("sign-in")) await shot("sign-in");
await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
await page.getByLabel("Password").fill(actor.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin\/mfa/u, { timeout: 30000 });
if (!only || only.includes("mfa")) await shot("mfa");
for (let attempt = 0; attempt < 2; attempt++) {
  await page
    .getByRole("textbox", { name: "Authenticator code" })
    .fill(currentTotp(actor.totpSecret));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  const ok = await page
    .waitForURL((u) => u.pathname === "/admin", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (ok) break;
  await page.waitForTimeout(31000 - (Date.now() % 30000));
}
for (const [name, route] of Object.entries(routes)) {
  if (name === "sign-in") continue;
  if (only && !only.includes(name)) continue;
  let target = route;
  if (route === "PROJECT_EDITOR") {
    await page.goto(`${base}/admin/content/projects`, { waitUntil: "networkidle" });
    const hrefs = await page
      .locator('a[href^="/admin/content/projects/"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    const href = hrefs.find((h) => h && /\/admin\/content\/projects\/[0-9a-f-]{36}/u.test(h));
    if (!href) continue;
    target = href.split("?")[0] + "?locale=en&section=media";
  }
  await page.goto(base + target, { waitUntil: "networkidle", timeout: 60000 });
  if (name === "project-editor") {
    await page.getByRole("button", { name: /^Media/u }).click();
    await page.waitForTimeout(1500);
  }
  if (name === "drawer" || (width < 768 && name === "overview")) {
    const menu = page.getByRole("button", { name: /menu|navigation/iu }).first();
    if (await menu.count()) {
      await menu.click();
      await shot("drawer");
      await page.keyboard.press("Escape");
    }
  }
  await shot(name);
}
await browser.close();
