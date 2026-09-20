/* global window, document */
// D1.5 quick public captures (stitched) for a list of routes at one width.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";
const [, , width = "1440", ...routes] = process.argv;
const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const dir = ".playwright/screenshots/d15/public";
mkdirSync(dir, { recursive: true });
const height = +width < 768 ? 844 : 900;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: +width, height } });
const page = await context.newPage();
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
for (const route of routes) {
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForSelector("main h1");
  await page.waitForTimeout(600);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = [];
  for (let y = 0; y < total; y += height) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(y === 0 ? 300 : 600);
    const actualY = await page.evaluate(() => window.scrollY);
    tiles.push({ buffer: await page.screenshot({ type: "png" }), top: actualY });
    if (actualY < y - 64) break;
  }
  const last = tiles.at(-1);
  await sharp({
    create: {
      width: +width,
      height: last ? last.top + height : height,
      channels: 3,
      background: "#fff",
    },
  })
    .composite(tiles.map((t) => ({ input: t.buffer, left: 0, top: t.top })))
    .png()
    .toFile(
      `${dir}/${width}-${route.replace(/[^a-z0-9]+/giu, "_").replace(/^_|_$/gu, "") || "home"}.png`,
    );
  console.log("captured", width, route);
}
await browser.close();
