import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createDraft, fixtures, signInWithMfa } from "./support/session";

const screenshotRoot = ".playwright/screenshots";

test("mobile and tablet admin compositions are intentional", async ({ page }) => {
  const actor = fixtures().actors["visual"];
  if (!actor) throw new Error("Synthetic visual actor was unavailable.");
  await signInWithMfa(page, actor);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open administration menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: `${screenshotRoot}/mobile-admin-drawer.png` });
  await page.getByRole("button", { name: "Close administration menu" }).click();

  await page.goto("/admin/content/services/new");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Draft not created")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Service name" })).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshotRoot}/mobile-validation.png`, fullPage: true });
  await page.getByRole("textbox", { name: "Service name" }).fill("SYNTHETIC S5A Visual");
  await page.getByRole("textbox", { name: "Public slug" }).fill("synthetic-s5a-visual");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/services\/[0-9a-f-]+\?locale=en$/u);
  await page.screenshot({ path: `${screenshotRoot}/mobile-service-editor.png`, fullPage: true });

  await page.goto("/admin/content/services");
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await page.screenshot({ path: `${screenshotRoot}/mobile-services-list.png`, fullPage: true });
  const mobileAxe = await new AxeBuilder({ page }).analyze();
  expect(
    mobileAxe.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);

  for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
    expect(
      await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 768, height: 1024 });
  await createDraft(page, "Tablet");
  await page.screenshot({ path: `${screenshotRoot}/tablet-service-editor.png`, fullPage: true });
  expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
