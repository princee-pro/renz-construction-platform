/* global document */
// D1.6 performance record (brief §104): LCP, transferred bytes by kind and
// the hero media weight per route at 1440 and 390, against a production
// server. Writes .playwright/d16-measure.json and prints a table.
//   node scripts/d16-measure.mjs [http://127.0.0.1:3100]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const routes = [
  "/",
  "/services",
  "/services/design",
  "/projects",
  "/about",
  "/contact",
  "/start-a-project",
];
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];
const browser = await chromium.launch();
const rows = [];
for (const viewport of viewports) {
  for (const route of routes) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem("renz-s9ap-opener-seen", "true");
      globalThis.__lcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) globalThis.__lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    // Cross-origin media (signed Storage URLs) hides transferSize from the
    // page, so image/video bytes are summed from the network side.
    const network = { image: 0, media: 0 };
    page.on("response", (response) => {
      const type = response.request().resourceType();
      const length = Number(response.headers()["content-length"] ?? 0);
      if (type === "image") network.image += length;
      if (type === "media") network.media += length;
    });
    const started = Date.now();
    await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
    await page.waitForLoadState("networkidle");
    // let the hero video (if any) request and start
    await page.waitForTimeout(3000);
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource");
      const sum = (filter) =>
        entries.filter(filter).reduce((total, entry) => total + (entry.transferSize ?? 0), 0);
      const path = (entry) => new URL(entry.name).pathname;
      const video = document.querySelector(".cinematic-video");
      return {
        lcp: Math.round(globalThis.__lcp),
        js: sum((entry) => path(entry).endsWith(".js")),
        css: sum((entry) => path(entry).endsWith(".css")),
        fonts: sum((entry) => /\.woff2?$/u.test(path(entry))),
        images: sum(
          (entry) => entry.initiatorType === "img" || /\.(webp|png|jpe?g|avif)$/u.test(path(entry)),
        ),
        video: sum(
          (entry) => entry.initiatorType === "video" || /\.(webm|mp4)$/u.test(path(entry)),
        ),
        total: sum(() => true),
        videoMode: document.querySelector(".cinematic")?.dataset.mode ?? "none",
        videoReady: document.querySelector(".cinematic")?.dataset.ready === "true",
        videoPlaying: video ? !video.paused : null,
      };
    });
    rows.push({
      viewport: viewport.name,
      route,
      loadMs: Date.now() - started,
      ...metrics,
      images: network.image,
      video: network.media,
      total: metrics.total + network.image + network.media,
    });
    await context.close();
  }
}
await browser.close();
mkdirSync(".playwright", { recursive: true });
writeFileSync(
  ".playwright/d16-measure.json",
  JSON.stringify({ measuredAt: new Date().toISOString(), base, rows }, null, 2),
);
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
console.log("| vw | route | LCP ms | JS | CSS | fonts | images | video | total | video |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) {
  console.log(
    `| ${r.viewport} | ${r.route} | ${r.lcp} | ${kb(r.js)} | ${kb(r.css)} | ${kb(r.fonts)} | ${kb(r.images)} | ${kb(r.video)} | ${kb(r.total)} | ${r.videoMode}${r.videoPlaying ? " playing" : ""} |`,
  );
}
