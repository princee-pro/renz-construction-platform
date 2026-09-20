/* global window */
// D1.6 final screenshot package (brief §138) against the production server.
//   node scripts/d16-final-shots.mjs [http://127.0.0.1:3100]
// Output: .playwright/screenshots/d1-6/final/*.png
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const dir = ".playwright/screenshots/d1-6/final";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

async function shot(name, route, options = {}) {
  const width = options.width ?? 1440;
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(options.wait ?? 4200);
  if (options.before) await options.before(page);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: options.fullPage ?? false });
  await context.close();
  console.log("captured", name);
}

await shot("home-1440", "/");
await shot("home-390", "/", { width: 390 });
await shot("navigation-hover", "/projects", {
  wait: 1500,
  before: async (page) => {
    await page.getByRole("link", { name: /About/u }).first().hover();
    await page.waitForTimeout(500);
  },
});
await shot("mega-menu", "/projects", {
  wait: 1500,
  before: async (page) => {
    await page
      .getByRole("link", { name: /Services/u })
      .first()
      .hover();
    await page.waitForTimeout(700);
    await page
      .getByRole("link", { name: /Supervision/u })
      .first()
      .hover();
    await page.waitForTimeout(500);
  },
});
await shot("mobile-menu", "/services", {
  width: 390,
  wait: 1200,
  before: async (page) => {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Show services" }).click();
    await page.waitForTimeout(500);
  },
});
await shot("services", "/services");
await shot("design", "/services/design");
await shot("execution", "/services/executions");
await shot("hybrid", "/services/hybrid-service");
await shot("supervision", "/services/supervision");
await shot("consultation", "/services/consultations");
await shot("projects", "/projects");
await shot("project-detail", "/projects/ridge-residence");
await shot("about", "/about");
await shot("insights", "/insights");
await shot("contact", "/contact");
await shot("start-project", "/start-a-project");
await shot("scrolled-header", "/about", {
  wait: 1500,
  before: async (page) => {
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(900);
  },
});
await browser.close();
