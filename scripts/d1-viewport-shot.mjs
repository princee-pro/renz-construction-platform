/* global window, document */
import { chromium } from "@playwright/test";
const [, , width = "1440", height = "900", frac = "0.4", out = "hstory.png", route = "/"] =
  process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: +height } });
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
await page.goto("http://localhost:3000" + route, { waitUntil: "load" });
await page.waitForSelector("main h1");
const box = await page.evaluate(() => {
  const el = document.querySelector(".horizontal-story");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});
const target = box.top + (box.height - +height) * +frac;
// scroll progressively so scroll-linked springs settle
for (let y = 0; y <= target; y += 400) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(40);
}
await page.evaluate((v) => window.scrollTo(0, v), target);
await page.waitForTimeout(1200);
await page.screenshot({ path: `.playwright/screenshots/d1/${out}` });
await browser.close();
