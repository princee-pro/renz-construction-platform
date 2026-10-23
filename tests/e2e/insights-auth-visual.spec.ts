import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
});

test("Insights uses transparent navigation and labelled media", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/insights");

  const header = page.locator(".public-header");
  await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".insights-featured-figure img")).toBeVisible();
  await expect(page.locator(".insights-film")).toBeVisible();
  await expect(page.getByText("Concept visual / not project evidence").first()).toBeVisible();

  await page.evaluate(() => scrollTo(0, 700));
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect(header).toHaveCSS("background-color", "rgb(0, 0, 0)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("insights-rich-desktop.png") });
});

test("Insight article and auth shell remain rich at narrow widths", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/insights/preparing-a-clear-construction-brief");
  await expect(page.locator(".article-plate img")).toBeVisible();
  await expect(page.getByText("Concept visual / not project evidence").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("article-rich-mobile.png") });

  await page.goto("/admin/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to the Control Room" })).toBeVisible();
  await expect(page.locator(".auth-cinematic .cinematic-poster")).toBeVisible();
  await expect(page.getByText("Concept visual / not project evidence")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeEditable();
  await expect(page.getByLabel("Password")).toBeEditable();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("auth-rich-mobile.png") });
});

test("auth visual motion uses the shared poster-first video path", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/sign-in");
  await expect(page.locator(".auth-cinematic .cinematic-poster")).toBeVisible();
  await expect(page.locator(".auth-cinematic video")).toBeAttached({ timeout: 5_000 });
  await page.screenshot({ path: testInfo.outputPath("auth-rich-desktop.png") });
});
