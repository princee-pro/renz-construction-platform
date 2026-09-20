import { statSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const target = new URL(process.argv[2] ?? "http://127.0.0.1:3000/");
const origin = target.origin;
const viewport = { width: 1440, height: 1000 };
const browser = await chromium.launch();

async function measureRoute(pathname, { openMenu = false, revealImages = false } = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript(() => {
    globalThis.__renzMetrics = { cls: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) globalThis.__renzMetrics.lcp = entry.startTime;
    }).observe({ buffered: true, type: "largest-contentful-paint" });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!("hadRecentInput" in entry) || !entry.hadRecentInput) {
          globalThis.__renzMetrics.cls += "value" in entry ? entry.value : 0;
        }
      }
    }).observe({ buffered: true, type: "layout-shift" });
  });

  const navigationStarted = Date.now();
  await page.goto(`${origin}${pathname}`);
  await page.waitForLoadState("networkidle");
  const networkIdleMilliseconds = Date.now() - navigationStarted;
  await page.waitForTimeout(pathname === "/" ? 1_450 : 250);

  if (revealImages) {
    for (const image of await page.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForLoadState("networkidle");
  }

  let menuReadyMilliseconds = null;
  if (openMenu) {
    const interactionStarted = Date.now();
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "RENZ / Navigation" }).waitFor({ state: "visible" });
    menuReadyMilliseconds = Date.now() - interactionStarted;
  }

  const metrics = await page.evaluate(
    ({ menuReadyMilliseconds, networkIdleMilliseconds, pathname }) => {
      const resources = performance.getEntriesByType("resource");
      const navigation = performance.getEntriesByType("navigation")[0];
      const summarize = (entries) => ({
        count: entries.length,
        decodedBytes: entries.reduce((sum, entry) => sum + (entry.decodedBodySize ?? 0), 0),
        transferredBytes: entries.reduce((sum, entry) => sum + (entry.transferSize ?? 0), 0),
      });
      const byKind = (kind) => resources.filter((entry) => entry.initiatorType === kind);
      const styleResources = resources.filter((entry) => {
        if (entry.initiatorType === "css") return true;
        try {
          return new URL(entry.name).pathname.endsWith(".css");
        } catch {
          return false;
        }
      });
      return {
        pathname,
        networkIdleMilliseconds,
        interaction: { menuReadyMilliseconds },
        navigation: {
          domContentLoadedMilliseconds:
            "domContentLoadedEventEnd" in navigation ? navigation.domContentLoadedEventEnd : null,
          loadMilliseconds: "loadEventEnd" in navigation ? navigation.loadEventEnd : null,
        },
        webVitals: globalThis.__renzMetrics,
        document: {
          htmlBytes: new Blob([globalThis.document.documentElement.outerHTML]).size,
          scrollHeight: globalThis.document.documentElement.scrollHeight,
        },
        resources: {
          scripts: summarize(byKind("script")),
          styles: summarize(styleResources),
          images: summarize(byKind("img")),
          fonts: summarize(byKind("font")),
          total: summarize(resources),
        },
      };
    },
    { menuReadyMilliseconds, networkIdleMilliseconds, pathname },
  );

  await context.close();
  return metrics;
}

const root = process.cwd();
const conceptSources = [
  join(root, "design", "concepts", "01-homepage-hero.png"),
  join(root, "design", "concepts", "03-homepage-selected-projects.png"),
  join(root, "design", "concepts", "06-project-detail.png"),
];

const metrics = {
  measuredAt: new Date().toISOString(),
  viewport,
  profiles: {
    homeInitial: await measureRoute("/", { openMenu: true }),
    projectsScrolled: await measureRoute("/projects", { revealImages: true }),
    projectStoryScrolled: await measureRoute("/projects/experience-study", {
      revealImages: true,
    }),
  },
  conceptSourceBytes: conceptSources.reduce((sum, path) => sum + statSync(path).size, 0),
};

process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
await browser.close();
