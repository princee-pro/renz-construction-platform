/* global document, window */
// D1.8 §30 — visual validation capture. Public routes plus the staff auth
// shell at the review widths, full page, reduced motion off (we want the
// settled state), with the brand opener suppressed so the hero is visible.
//   node scripts/d18-shots.mjs [base] [outDir] [widths] [routesCsv]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const base = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/u, "");
const outDir = process.argv[3] ?? ".playwright/screenshots/d1-8/round1";
const widths = (process.argv[4] ?? "1440,390,768").split(",").map(Number);
const routes = {
  home: "/",
  services: "/services",
  "service-design": "/services/design",
  "service-executions": "/services/executions",
  "service-hybrid": "/services/hybrid-service",
  "service-supervision": "/services/supervision",
  "service-consultations": "/services/consultations",
  projects: "/projects",
  "project-detail": "/projects/ridge-residence",
  about: "/about",
  insights: "/insights",
  "insight-detail": "/insights/preparing-a-clear-construction-brief",
  contact: "/contact",
  "start-a-project": "/start-a-project",
  privacy: "/privacy",
  terms: "/terms",
  "not-found": "/no-such-page-d18",
  "admin-sign-in": "/admin/sign-in",
};
const only = process.argv[5]?.split(",");

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const notes = [];
for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    deviceScaleFactor: 1,
  });
  // The opener plays once per session; suppress it so heroes are captured.
  await context.addInitScript(() => {
    try {
      window.sessionStorage.setItem("renz-s9ap-opener-seen", "1");
    } catch {
      // ignore
    }
  });
  const page = await context.newPage();
  for (const [name, route] of Object.entries(routes)) {
    if (only && !only.includes(name)) continue;
    await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
    // Settle: scroll through so lazy media loads, then return to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => window.setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });
    await page
      .waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 30000 })
      .catch(() => undefined);
    await page.waitForTimeout(700);
    const metrics = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 60) ?? "",
    }));
    await page.screenshot({ path: join(outDir, `${name}-${width}.png`), fullPage: true });
    notes.push({ name, width, ...metrics });
    console.log(
      `${name.padEnd(20)} ${String(width).padStart(4)}  h=${String(metrics.height).padStart(6)}  overflow=${metrics.overflow}  h1="${metrics.h1}"`,
    );
  }
  await context.close();
}
await browser.close();
writeFileSync(join(outDir, "notes.json"), JSON.stringify(notes, null, 2));
console.log(`\n${notes.length} captures → ${outDir}`);
