import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousAxeViolations(page: Page): Promise<void> {
  // Audit colours at rest: the hero entrance animations fade elements in, and
  // axe sampling mid-fade reports the blended colour as a contrast failure.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]),
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

test.describe.serial("RENZ S9A-P signature preview contracts", () => {
  test.setTimeout(180_000);

  test("plays a skippable opener once per session without blocking the rendered hero", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("renz-s9ap-opener-test-seeded") !== "true") {
        sessionStorage.removeItem("renz-s9ap-opener-seen");
        sessionStorage.setItem("renz-s9ap-opener-test-seeded", "true");
      }
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".brand-opener")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "From land to landmark" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Start a Project" }).first()).toHaveAttribute(
      "href",
      "/start-a-project",
    );
    await page.getByRole("button", { name: "Skip intro" }).click();
    await expect(page.locator(".brand-opener")).toHaveCount(0);

    await page.reload();
    await expect(page.locator(".brand-opener")).toHaveCount(0);
  });

  test("removes the opener while preserving an instantaneous comparison for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => sessionStorage.removeItem("renz-s9ap-opener-seen"));
    await page.reload();
    await expect(page.locator(".brand-opener")).toBeHidden();

    await page.goto("/projects/experience-study");
    await expect(page.locator(".drawing-reality-resolved")).toBeVisible();
    await expect(page.locator(".drawing-reality-drawing")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Reveal resolved concept" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show drawing" })).toBeVisible();
  });

  test("keeps the project study labelled, document-ordered, and keyboard operable", async ({
    page,
  }) => {
    // D1: the S9A-P experience study became the first concept case study.
    const response = await page.goto("/projects/experience-study");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/projects\/ridge-residence$/u);
    await expect(page.getByRole("heading", { level: 1, name: "Ridge Residence" })).toBeVisible();
    await expect(page.locator(".project-story-chapter")).toHaveCount(9);
    await expect(
      page.getByText(/Generated (?:concept )?visual \/ not RENZ project evidence/iu).first(),
    ).toBeVisible();

    const range = page.getByRole("slider", { name: "Reveal resolved concept" });
    await range.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('output[for="drawing-reality-range"]')).toHaveText("55%");

    await page.setViewportSize({ width: 390, height: 844 });
    const toggle = page.getByRole("button", { name: "Show drawing" });
    await expect(range).toBeHidden();
    await expect(toggle).toBeVisible();
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await expect(page.locator(".drawing-reality")).toHaveAttribute(
      "data-dominant-layer",
      "drawing",
    );
  });

  test("keeps all placeholders non-actionable and intake non-collecting", async ({ page }) => {
    await page.goto("/contact");
    // Email and WhatsApp are real, authorized channels (client correction,
    // C3.5) and are expected to be actionable. Since C7 an unconfigured
    // location is omitted entirely (no placeholder, no map, no invented
    // address) and any phone/tel channel stays absent until calling is enabled.
    await expect(page.locator(".location-card")).toHaveCount(0);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(await page.locator('a[href^="mailto:"]').count()).toBeGreaterThanOrEqual(1);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    // C8: the contact enquiry form is real and never renders tel: or a marketing consent.
    await expect(page.locator("form.intake-form")).toHaveCount(1);
    await expect(page.getByLabel(/marketing/iu)).toHaveCount(0);

    // Since C8 the intake is real: a seven-step wizard that submits only
    // through the origin-validated server action; still no tel: anywhere.
    await page.goto("/start-a-project");
    await expect(page.locator(".intake-progress li")).toHaveCount(7);
    await expect(page.locator("form.intake-wizard")).toHaveCount(1);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  });

  test("renders the complete provisional mark matrix at measured browser sizes", async ({
    page,
  }) => {
    const response = await page.goto("/brand-study");
    expect(response?.status()).toBe(200);
    // /brand-study now compares 3 monogram options (structural/datum/mass)
    // across 5 measured sizes via PreviewRenzIdentity, plus one header
    // comparison mark and one reverse-tone mark per option.
    const gridSizes = [24, 32, 40, 64, 128];
    for (const size of gridSizes) {
      const sizeGroup = page.locator(`.brand-system-grid [data-size="${size}"]`);
      await expect(sizeGroup).toHaveCount(3);
      for (const specimen of await sizeGroup.all()) {
        await expect(specimen.locator("svg")).toHaveAttribute("width", String(size));
        await expect(specimen.locator("svg")).toHaveAttribute("height", String(size));
      }
    }
    await expect(page.locator(".brand-system-study .preview-renz-identity")).toHaveCount(
      1 + gridSizes.length * 3 + 3,
    );
  });

  test("passes serious accessibility checks across signature routes", async ({ page }) => {
    for (const route of [
      "/",
      "/services",
      "/services/design",
      "/projects",
      "/projects/experience-study",
      "/about",
      "/insights",
      "/contact",
      "/start-a-project",
      "/brand-study",
    ]) {
      await page.goto(route);
      await expectNoSeriousAxeViolations(page);
    }
  });
});
