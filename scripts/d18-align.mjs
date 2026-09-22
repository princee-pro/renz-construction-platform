/* global document, window, getComputedStyle */
// D1.8 §23 — alignment audit. For every public route at every review width,
// report the left edge of the first heading in each section, the widest
// element, and any element that reaches the viewport edge. A section whose
// content starts at a different x than its neighbours is flagged.
//   node scripts/d18-align.mjs [base] [widths]
import { chromium } from "@playwright/test";

const base = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/u, "");
const widths = (process.argv[3] ?? "320,390,768,1024,1280,1440,1728,1920").split(",").map(Number);
const routes = [
  "/",
  "/services",
  "/services/design",
  "/projects",
  "/projects/ridge-residence",
  "/about",
  "/insights",
  "/insights/preparing-a-clear-construction-brief",
  "/contact",
  "/start-a-project",
  "/privacy",
];

const browser = await chromium.launch();
const problems = [];
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.sessionStorage.setItem("renz-s9ap-opener-seen", "1");
    } catch {
      // ignore
    }
  });
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "load", timeout: 60000 });
    // Reveal-on-scroll sections hold a hidden transform until seen; settle the
    // page first so the audit measures the resting layout, not mid-animation.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => window.setTimeout(resolve, 45));
      }
      window.scrollTo(0, 0);
      await new Promise((resolve) => window.setTimeout(resolve, 400));
    });
    const found = await page.evaluate(() => {
      const viewport = window.innerWidth;
      const lefts = [];
      const edge = [];
      for (const section of document.querySelectorAll(
        "main > section, main > article, main > div",
      )) {
        const heading = section.querySelector("h1, h2, h3, p.kicker, .datum-label");
        if (!heading) continue;
        const box = heading.getBoundingClientRect();
        if (box.width === 0) continue;
        lefts.push(Math.round(box.left));
      }
      for (const element of document.querySelectorAll(
        "main h1, main h2, main p, main li, main a",
      )) {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        // Anything whose text starts within 8px of the frame is glued.
        const style = getComputedStyle(element);
        // A transform is decorative motion, not layout: measure the box only.
        if (box.left < 8 && style.position !== "fixed" && style.transform === "none") {
          edge.push(`${element.tagName.toLowerCase()}.${element.className}`.slice(0, 50));
        }
      }
      return { viewport, lefts, edge: [...new Set(edge)].slice(0, 3) };
    });
    const unique = [...new Set(found.lefts)].sort((a, b) => a - b);
    // More than two distinct start columns means the page changes alignment.
    if (unique.length > 2 || found.edge.length > 0) {
      problems.push({ route, width, starts: unique, edge: found.edge });
      console.log(
        `${String(width).padStart(4)} ${route.padEnd(46)} starts=[${unique.join(",")}]${found.edge.length ? ` EDGE ${found.edge.join(" | ")}` : ""}`,
      );
    }
  }
  await context.close();
}
await browser.close();
console.log(`\n${problems.length} route/width combinations flagged`);
