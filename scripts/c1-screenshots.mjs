/* eslint-disable no-undef -- page.evaluate() callbacks run in the browser, not Node */
import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const outDir = path.resolve(process.argv[2] ?? "graphify-out/c2-screenshots");
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "768", width: 768, height: 1000 },
  { name: "390", width: 390, height: 900 },
];

const pages = [
  { name: "home", path: "/" },
  { name: "services", path: "/services" },
  { name: "service-design", path: "/services/design" },
  { name: "projects", path: "/projects" },
  { name: "project-ridge", path: "/projects/ridge-residence" },
  { name: "about", path: "/about" },
  { name: "insights", path: "/insights" },
  { name: "start-a-project", path: "/start-a-project" },
  { name: "contact", path: "/contact" },
];

const onlyViewport = process.argv[3];
const onlyPage = process.argv[4];

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  let y = 0;
  while (y < height) {
    y += 800;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(180);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

const browser = await chromium.launch();
for (const viewport of viewports) {
  if (onlyViewport && viewport.name !== onlyViewport) continue;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  for (const target of pages) {
    if (onlyPage && target.name !== onlyPage) continue;
    await page.goto(`http://localhost:3000${target.path}`, { waitUntil: "networkidle" });
    await scrollThrough(page);
    const file = path.join(outDir, `${target.name}-${viewport.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file);
  }
  await context.close();
}
await browser.close();
