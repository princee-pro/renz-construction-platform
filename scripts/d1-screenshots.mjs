/* global window, document */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";
import sharp from "sharp";

// D1 screenshot-driven workflow (brief §85–89): render real pixels of the
// public site (and, with a signed-in storage state, the Admin) at the
// required widths. Usage:
//   node scripts/d1-screenshots.mjs <round> [baseURL]
// Rounds: desktop | mobile | extremes | all. Output: .playwright/screenshots/d1/<round>/.

async function stitch(tiles, width, height, path, scale = 1) {
  const last = tiles.at(-1);
  const totalHeight = (last ? last.top + height : height) * scale;
  const composite = tiles.map((tile) => ({ input: tile.buffer, left: 0, top: tile.top * scale }));
  await sharp({
    create: { width: width * scale, height: totalHeight, channels: 3, background: "#ffffff" },
  })
    .composite(composite)
    .png({ compressionLevel: 8 })
    .toFile(path);
}

const round = process.argv[2] ?? "desktop";
const baseURL = process.argv[3] ?? "http://localhost:3000";
const outRoot = join(process.cwd(), ".playwright", "screenshots", "d1", round);
mkdirSync(outRoot, { recursive: true });

const publicRoutes = [
  ["home", "/"],
  ["services", "/services"],
  ["service-design", "/services/design"],
  ["service-executions", "/services/executions"],
  ["service-hybrid", "/services/hybrid-service"],
  ["service-supervision", "/services/supervision"],
  ["service-consultations", "/services/consultations"],
  ["projects", "/projects"],
  ["project-detail", "/projects/ridge-residence"],
  ["about", "/about"],
  ["insights", "/insights"],
  ["contact", "/contact"],
  ["start-project", "/start-a-project"],
  ["service-enquiry", "/enquire/service?service=design"],
  ["material-enquiry", "/enquire/materials"],
];

const plans = {
  desktop: { width: 1440, height: 900, routes: publicRoutes },
  mobile: {
    width: 390,
    height: 844,
    routes: publicRoutes.filter(([name]) =>
      [
        "home",
        "services",
        "service-design",
        "projects",
        "project-detail",
        "contact",
        "start-project",
        "material-enquiry",
      ].includes(name),
    ),
  },
  tablet: {
    width: 768,
    height: 1024,
    routes: publicRoutes.filter(([name]) =>
      ["home", "services", "project-detail", "start-project"].includes(name),
    ),
  },
  wide: {
    width: 1920,
    height: 1080,
    routes: publicRoutes.filter(([name]) =>
      ["home", "services", "projects", "contact"].includes(name),
    ),
  },
  narrow: {
    width: 320,
    height: 640,
    routes: publicRoutes.filter(([name]) => ["home", "start-project", "contact"].includes(name)),
  },
  // 1440 desktop at 200% browser zoom == 720 CSS px at 2x.
  zoom: {
    width: 720,
    height: 450,
    scale: 2,
    routes: publicRoutes.filter(([name]) =>
      ["home", "services", "service-design", "start-project"].includes(name),
    ),
  },
};

const selected = round === "all" ? Object.entries(plans) : [[round, plans[round]]];
const browser = await chromium.launch();
for (const [name, plan] of selected) {
  if (!plan) throw new Error(`Unknown round ${name}`);
  const context = await browser.newContext({
    viewport: { width: plan.width, height: plan.height },
    deviceScaleFactor: plan.scale ?? 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  // Skip the brand opener so captures show the page, not the intro.
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("renz-s9ap-opener-seen", "true");
    } catch {
      /* ignore */
    }
  });
  for (const [routeName, path] of plan.routes) {
    const target = `${baseURL}${path}`;
    try {
      await page.goto(target, { waitUntil: "load", timeout: 90_000 });
      await page.locator("main h1").first().waitFor({ state: "attached", timeout: 60_000 });
      await page.waitForTimeout(1_500);
      // Sticky, parallax and in-view choreography only make sense at real
      // scroll positions, so stitch viewport captures instead of one
      // full-page resize.
      const step = plan.height;
      const tiles = [];
      for (
        let y = 0;
        y < (await page.evaluate(() => document.documentElement.scrollHeight));
        y += step
      ) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(y === 0 ? 300 : 650);
        const actualY = await page.evaluate(() => window.scrollY);
        tiles.push({ buffer: await page.screenshot({ type: "png" }), top: actualY });
        if (actualY < y - 64) break;
      }
      await stitch(
        tiles,
        plan.width,
        plan.height,
        join(outRoot, `${plan.width}-${routeName}.png`),
        plan.scale ?? 1,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      if (routeName === "home" && plan.width <= 768) {
        const menu = page.getByRole("button", { name: /menu/iu }).first();
        if (await menu.count()) {
          await menu.click();
          await page.waitForTimeout(700);
          await page.screenshot({ path: join(outRoot, `${plan.width}-home-menu.png`) });
        }
      }
      console.log(`captured ${plan.width} ${routeName}`);
    } catch (error) {
      console.log(
        `FAILED ${plan.width} ${routeName}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  await context.close();
}
await browser.close();
