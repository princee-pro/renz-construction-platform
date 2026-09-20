/* global window, document */
// Lists <img> elements that never complete after scrolling a route (lazy-load audit).
import { chromium } from "@playwright/test";
const [, , route = "/", width = "390"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: 844 } });
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
await page.goto((process.env.RENZ_BASE ?? "http://localhost:3000") + route, {
  waitUntil: "load",
  timeout: 120000,
});
await page.evaluate(async () => {
  for (
    let y = 0;
    y < document.documentElement.scrollHeight;
    y += Math.max(window.innerHeight * 0.7, 320)
  ) {
    window.scrollTo({ top: y, behavior: "instant" });
    await new Promise((r) => window.setTimeout(r, 60));
  }
  window.scrollTo({ top: 0, behavior: "instant" });
});
await page.waitForTimeout(Number(process.env.RENZ_WAIT ?? 4000));
const pending = await page.evaluate(() =>
  [...document.images]
    .filter((i) => !(i.complete && i.naturalWidth > 0))
    .map((i) => ({
      src: i.currentSrc || i.getAttribute("src"),
      loading: i.loading,
      rect: i.getBoundingClientRect().toJSON(),
      cls: i.parentElement?.className,
    })),
);
console.log(JSON.stringify(pending, null, 1));
await browser.close();
