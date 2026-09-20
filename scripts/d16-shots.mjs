/* global window, document */
// D1.6 pixel review: stitched full-page captures for a list of routes at one
// width. Usage: node scripts/d16-shots.mjs <label> <width> /route [/route ...]
// Output: .playwright/screenshots/d1-6/<label>/<width>-<route>.png
// Set RENZ_SHOT_BASE to target another server (default: the dev server).
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const [, , label = "review", width = "1440", ...routes] = process.argv;
const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const dir = `.playwright/screenshots/d1-6/${label}`;
mkdirSync(dir, { recursive: true });
const viewport = +width < 768 ? 844 : +width >= 1920 ? 1080 : 900;
const reduced = process.env.RENZ_SHOT_REDUCED === "true";
const viewportOnly = process.env.RENZ_SHOT_VIEWPORT_ONLY === "true";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: +width, height: viewport },
  deviceScaleFactor: 1,
  reducedMotion: reduced ? "reduce" : "no-preference",
});
const page = await context.newPage();
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));

for (const route of routes) {
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForSelector("main");
  await page.waitForTimeout(Number(process.env.RENZ_SHOT_WAIT ?? 4200));
  const name = route.replace(/[^a-z0-9]+/giu, "_").replace(/^_|_$/gu, "") || "home";
  if (viewportOnly) {
    await page.screenshot({ type: "png", path: `${dir}/${width}-${name}.png` });
    console.log("captured", width, route);
    continue;
  }
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const tiles = [];
  for (let y = 0; y < total; y += viewport) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(y === 0 ? 300 : 700);
    const actualY = await page.evaluate(() => window.scrollY);
    tiles.push({ buffer: await page.screenshot({ type: "png" }), top: actualY });
    if (actualY < y - 64) break;
  }
  const last = tiles.at(-1);
  await sharp({
    create: {
      width: +width,
      height: last ? last.top + viewport : viewport,
      channels: 3,
      background: "#fff",
    },
  })
    .composite(tiles.map((t) => ({ input: t.buffer, left: 0, top: t.top })))
    .png()
    .toFile(`${dir}/${width}-${name}.png`);
  console.log("captured", width, route, `${total}px`);
}
await browser.close();
