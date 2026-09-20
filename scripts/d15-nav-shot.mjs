/* global window */
// Captures the desktop header in hero + scrolled states, the open mega panel, and the mobile menu.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const dir = ".playwright/screenshots/d15/nav";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
await page.goto(`${base}/projects`, { waitUntil: "load", timeout: 120000 });
await page.waitForSelector("main h1");
await page.waitForTimeout(800);
await page.screenshot({
  path: `${dir}/1440-header-hero.png`,
  clip: { x: 0, y: 0, width: 1440, height: 140 },
});
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(900);
await page.screenshot({
  path: `${dir}/1440-header-scrolled.png`,
  clip: { x: 0, y: 0, width: 1440, height: 140 },
});
await page.hover(".public-services-nav-item > a");
await page.waitForTimeout(700);
await page.screenshot({
  path: `${dir}/1440-mega.png`,
  clip: { x: 0, y: 0, width: 1440, height: 560 },
});
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/`, { waitUntil: "load", timeout: 120000 });
await page.getByRole("button", { name: "Menu", exact: true }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${dir}/390-menu.png` });
await browser.close();
console.log("done");
