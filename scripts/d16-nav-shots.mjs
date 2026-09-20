/* global window */
// D1.6 navigation states: idle, hover preview, mega panel, scrolled, keyboard
// focus, "More" overflow, and the mobile navigator (closed / open / services).
//   node scripts/d16-nav-shots.mjs [label]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const label = process.argv[2] ?? "nav";
const dir = `.playwright/screenshots/d1-6/${label}`;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

async function desktop(width, route = "/projects") {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1200);
  const header = page.locator("header.public-header");
  await header.screenshot({ path: `${dir}/${width}-header-idle.png` });
  await page.getByRole("link", { name: /About/u }).first().hover();
  await page.waitForTimeout(450);
  await header.screenshot({ path: `${dir}/${width}-header-hover.png` });
  await page
    .getByRole("link", { name: /Services/u })
    .first()
    .hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/${width}-mega-panel.png` });
  await page
    .getByRole("link", { name: /Supervision/u })
    .first()
    .hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/${width}-mega-panel-supervision.png` });
  await page.mouse.move(width / 2, 700);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 640));
  await page.waitForTimeout(800);
  await header.screenshot({ path: `${dir}/${width}-header-scrolled.png` });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
  await header.screenshot({ path: `${dir}/${width}-header-focus.png` });
  await context.close();
  console.log("desktop", width);
}

async function mobile() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
  await page.goto(base + "/services", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${dir}/390-header.png`,
    clip: { x: 0, y: 0, width: 390, height: 120 },
  });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/390-menu-open.png` });
  await page.getByRole("button", { name: "Show services" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/390-menu-services.png` });
  await page
    .getByRole("link", { name: /Projects/u })
    .first()
    .focus();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/390-menu-projects-focus.png` });
  await context.close();
  console.log("mobile");
}

await desktop(1440);
await desktop(1120, "/about");
await mobile();
await browser.close();
