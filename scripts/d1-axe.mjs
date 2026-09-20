// Quick axe colour-contrast census against the dev server (reduced motion).
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
const routes = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
for (const route of routes.length
  ? routes
  : [
      "/",
      "/projects",
      "/services",
      "/services/design",
      "/projects/ridge-residence",
      "/about",
      "/insights",
      "/contact",
      "/start-a-project",
      "/enquire/service",
      "/enquire/materials",
    ]) {
  await page.goto("http://localhost:3000" + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForSelector("main h1");
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const pairs = new Map();
  for (const v of serious)
    for (const n of v.nodes) {
      const d = n.any[0]?.data ?? {};
      const key =
        v.id === "color-contrast"
          ? `${v.id} ${d.fgColor} on ${d.bgColor} (${d.contrastRatio}) ${d.fontSize}${process.env.RENZ_AXE_NODES ? ` ${n.target.join(" ")}` : ""}`
          : `${v.id}: ${n.html.slice(0, 120)}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  console.log(route, serious.length ? "" : "clean");
  for (const [k, c] of pairs) console.log("  ", c, "×", k);
}
await browser.close();
