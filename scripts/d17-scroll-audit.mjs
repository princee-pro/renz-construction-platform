/* global document, window */
// Viewport-stepped capture (svh layouts break fullPage screenshots). Stitches
// the steps into one tall image per route and 1800px tiles for review.
import { mkdirSync, rmSync } from "node:fs";
import sharp from "sharp";
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:3100";
const width = Number(process.argv[3] ?? 1440);
const only = process.argv[4]?.split(",");
const height = width < 768 ? 844 : 900;
const dir = `.playwright/screenshots/d1-7/scroll-${width}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const routes = {
  home: "/",
  services: "/services",
  design: "/services/design",
  executions: "/services/executions",
  projects: "/projects",
  project: "/projects/ridge-residence",
  about: "/about",
  insights: "/insights",
  article: "/insights/preparing-a-clear-construction-brief",
  contact: "/contact",
  start: "/start-a-project",
};
const browser = await chromium.launch();
for (const [name, route] of Object.entries(routes)) {
  if (only && !only.includes(name)) continue;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const buffers = [];
  for (let y = 0; y < total; y += height) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(700);
    buffers.push(await page.screenshot());
  }
  const composite = buffers.map((input, i) => ({ input, top: i * height, left: 0 }));
  const full = sharp({
    create: { width, height: buffers.length * height, channels: 3, background: "#fff" },
  }).composite(composite);
  await full.png().toFile(`${dir}/${name}.png`);
  const tileDir = `${dir}/tiles-${name}`;
  mkdirSync(tileDir, { recursive: true });
  const H = buffers.length * height;
  for (let y = 0, i = 0; y < H; y += 1800, i++) {
    await sharp(`${dir}/${name}.png`)
      .extract({ left: 0, top: y, width, height: Math.min(1800, H - y) })
      .resize({ width: 960 })
      .toFile(`${tileDir}/${String(i).padStart(2, "0")}.png`);
  }
  console.log("captured", name, total, "steps", buffers.length);
  await context.close();
}
await browser.close();
