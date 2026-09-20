import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  ["/", "From land to landmark"],
  ["/services", "Services for every stage of your project."],
  ["/projects", "Explore project studies."],
  ["/about", "One team from planning to handover."],
  ["/insights", "Simple guides for planning and building."],
  ["/contact", "Tell us about your project."],
  ["/start-a-project", "Tell us what you want to build."],
  ["/privacy", "Privacy notice"],
  ["/terms", "Terms of use"],
] as const;

async function expectNoSeriousAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

test.describe.serial("RENZ S6A public experience", () => {
  test("serves every approved public route as a noindex semantic document", async ({ page }) => {
    for (const [route, heading] of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.getByRole("main")).toHaveAttribute("id", "main-content");
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/iu);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /nofollow/iu);
      // Preview site mode is marked internally (C7); the label disappears once live.
      await expect(page.locator(".client-preview-label")).toHaveText("Preview");

      if (route !== "/privacy" && route !== "/terms") {
        const currentLink =
          route === "/start-a-project"
            ? page.locator("#public-navigation-dialog .public-menu-cta")
            : page.locator(`#public-navigation-dialog a[href="${route}"]`);
        await expect(currentLink).toHaveAttribute("aria-current", "page");
      }

      const foreignScripts = await page.locator("script[src]").evaluateAll((scripts) =>
        scripts
          .map((script) => script.getAttribute("src"))
          .filter((source): source is string => Boolean(source))
          .filter(
            (source) => new URL(source, window.location.href).origin !== window.location.origin,
          ),
      );
      expect(foreignScripts, route).toEqual([]);
    }
  });

  test("renders labelled preview studies without fabricating proof", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Six sites, six ideas." })).toBeVisible();
    // Every study card carries the concept label; none reads as delivered work.
    await expect(page.locator(".study-card")).toHaveCount(6);
    for (const card of await page.locator(".study-card").all()) {
      await expect(card.getByText(/Concept study/iu).first()).toBeAttached();
    }
    await expect(
      page.getByRole("status").filter({ hasText: /none is a completed RENZ project/iu }),
    ).toBeVisible();
    expect(await page.getByRole("img").count()).toBeGreaterThanOrEqual(6);

    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Tell us about your project." })).toBeVisible();
    expect(await page.locator('a[href^="mailto:"]').count()).toBeGreaterThanOrEqual(1);
    // The WhatsApp number is texting-only (client correction, C3.5): no tel:
    // link may ever appear anywhere on the public site.
    expect(await page.locator('a[href^="tel:"]').count()).toBe(0);
    expect(await page.locator('a[href^="https://wa.me/"]').count()).toBeGreaterThanOrEqual(1);

    await page.goto("/start-a-project");
    // C8: the real seven-step intake; it acknowledges the Privacy Notice and never renders tel:.
    await expect(page.locator("form.intake-wizard")).toHaveCount(1);
    await expect(page.locator(".intake-progress li")).toHaveCount(7);
    expect(await page.locator('a[href^="tel:"]').count()).toBe(0);
  });

  test("returns an actual 404 for missing or unpublished public records", async ({ page }) => {
    for (const route of [
      "/services/synthetic-missing",
      "/projects/synthetic-missing",
      "/insights/synthetic-missing",
    ]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: "That page could not be found." }),
      ).toBeVisible();
    }
  });

  test("keeps the mobile navigation modal, reversible, and keyboard-owned", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Menu" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "RENZ / Navigation" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("html")).toHaveClass(/public-menu-open/u);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("html")).not.toHaveClass(/public-menu-open/u);

    await trigger.click();
    await dialog.getByRole("link", { name: /Services/iu }).click();
    await expect(page).toHaveURL(/\/services$/u);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Services for every stage of your project.",
      }),
    ).toBeVisible();
  });

  test("keeps the old /expertise routes as compatibility redirects to /services", async ({
    page,
  }) => {
    const indexResponse = await page.goto("/expertise");
    expect(indexResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/services$/u);

    const detailResponse = await page.goto("/expertise/anything");
    expect(detailResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/services$/u);
  });

  test("honors reduced motion and has no serious accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
    await page.goto("/");
    await expect(page.locator(".public-site")).toHaveAttribute("data-motion", "reduced");
    await expectNoSeriousAxeViolations(page);

    await page.goto("/projects");
    await expectNoSeriousAxeViolations(page);
  });
});
