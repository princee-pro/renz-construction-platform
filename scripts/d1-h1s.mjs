import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
for (const r of [
  "/",
  "/services",
  "/services/design",
  "/projects",
  "/projects/ridge-residence",
  "/about",
  "/insights",
  "/contact",
  "/start-a-project",
  "/enquire/service",
  "/enquire/materials",
  "/projects/experience-study",
]) {
  const res = await page.goto("http://localhost:3000" + r, { waitUntil: "load" });
  const h1 = await page
    .locator("main h1")
    .first()
    .textContent()
    .catch(() => null);
  console.log(
    res.status(),
    r,
    "→",
    page.url().replace("http://localhost:3000", ""),
    "|",
    h1?.trim(),
  );
}
await browser.close();
