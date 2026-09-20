import { expect, test, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

/**
 * D1 — the one authoritative final-design visual suite. It replaces the
 * S6A, S9A-P and S9B-P capture suites. Every capture also asserts the page
 * never scrolls horizontally, and the admin pass proves the public type
 * system and mark reach the workspace without changing any workflow.
 */
const screenshotRoot = ".playwright/screenshots/final-design";
const capturePass = process.env["RENZ_D1_CAPTURE_PASS"] ?? "pass1";

async function settle(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toBeVisible();
  await page.evaluate(async () => {
    const limit = document.documentElement.scrollHeight;
    for (let y = 0; y < limit; y += Math.max(window.innerHeight * 0.75, 480)) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => window.setTimeout(resolve, 35));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
}

async function capture(page: Page, route: string, viewport: string, name: string): Promise<void> {
  await settle(page, route);
  expect(
    await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth),
    `${route} must not overflow horizontally at ${viewport}`,
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `${screenshotRoot}/${capturePass}-${viewport}-${name}.png`,
  });
}

const journeys = [
  ["/", "home"],
  ["/services", "services"],
  ["/services/design", "service-design"],
  ["/services/executions", "service-executions"],
  ["/projects", "projects"],
  ["/projects/ridge-residence", "project-ridge"],
  ["/about", "about"],
  ["/insights", "insights"],
  ["/insights/preparing-a-clear-construction-brief", "insight-article"],
  ["/contact", "contact"],
  ["/start-a-project", "start"],
  ["/enquire/service?service=design", "service-enquiry"],
  ["/enquire/materials", "material-enquiry"],
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("renz-s9ap-opener-seen", "true");
  });
});

test("captures the final public design at desktop", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [route, name] of journeys) {
    await capture(page, route, "1440", name);
  }
});

test("captures the final public design at mobile and tablet", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, name] of journeys) {
    await capture(page, route, "390", name);
  }
  await settle(page, "/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "RENZ / Navigation" })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: `${screenshotRoot}/${capturePass}-390-menu.png`,
  });
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 768, height: 1024 });
  for (const [route, name] of journeys.slice(0, 6)) {
    await capture(page, route, "768", name);
  }
});

test("captures the brand opener frames and the wizard mid-journey", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => sessionStorage.removeItem("renz-s9ap-opener-seen"));
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator(".brand-opener")).toBeVisible();
  await page.screenshot({ path: `${screenshotRoot}/${capturePass}-1440-opener.png` });
  await expect(page.locator(".brand-opener")).toHaveCount(0, { timeout: 5_000 });

  await settle(page, "/start-a-project");
  // The radio itself is visually hidden; the tile label is the pointer target.
  await page
    .locator("label.intake-choice", { hasText: /^0?1?\s*Design/u })
    .first()
    .click();
  await expect(page.getByRole("radio", { name: /^Design/u })).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your project", level: 2 })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `${screenshotRoot}/${capturePass}-1440-start-step-2.png`,
  });
  await page.evaluate(() => sessionStorage.clear());
});

test("captures the auth experience at desktop, tablet and mobile", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = fixtures().actors["visual"];
  if (!actor) throw new Error("Synthetic visual actor was unavailable.");
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/admin/sign-in?next=%2Fadmin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      animations: "disabled",
      fullPage: width < 768,
      path: `${screenshotRoot}/${capturePass}-${width}-auth-sign-in.png`,
    });
    expect(
      await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
  await page.getByLabel("Password").fill(actor.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/mfa\?/u);
  await page.getByRole("textbox", { name: "Authenticator code" }).fill("123");
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `${screenshotRoot}/${capturePass}-390-auth-mfa.png`,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    animations: "disabled",
    path: `${screenshotRoot}/${capturePass}-1440-auth-mfa.png`,
  });
});

test("captures the coherent admin workspace at desktop and mobile", async ({ page }) => {
  test.setTimeout(240_000);
  const actor = fixtures().actors["visual"];
  if (!actor) throw new Error("Synthetic visual actor was unavailable.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInWithMfa(page, actor);
  for (const [route, name] of [
    ["/admin", "admin-overview"],
    ["/admin/analytics", "admin-analytics"],
    ["/admin/notifications", "admin-notifications"],
    ["/admin/content/services", "admin-services"],
    ["/admin/finance", "admin-finance"],
    ["/admin/finance/invoices", "admin-invoices"],
    ["/admin/settings/launch-readiness", "admin-launch-readiness"],
  ] as const) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `${screenshotRoot}/${capturePass}-1440-${name}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin", { waitUntil: "networkidle" });
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `${screenshotRoot}/${capturePass}-390-admin-overview.png`,
  });
  await page.getByRole("button", { name: "Open administration menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: `${screenshotRoot}/${capturePass}-390-admin-drawer.png` });
});
