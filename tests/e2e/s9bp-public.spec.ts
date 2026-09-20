import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/services",
  "/projects",
  "/about",
  "/insights",
  "/contact",
  "/start-a-project",
  "/privacy",
  "/terms",
  "/brand-study",
] as const;

// D1.7: twelve studies in display order — the six concept studies and the six
// Rwanda-context studies (their card label differs).
const conceptProjects = [
  ["ridge-residence", "Ridge Residence", "concept study"],
  ["courtyard-house", "Courtyard House", "concept study"],
  ["urban-workspace", "Urban Workspace", "concept study"],
  ["lake-retreat", "Lake Retreat", "concept study"],
  ["community-pavilion", "Community Pavilion", "concept study"],
  ["industrial-campus", "Industrial Campus", "concept study"],
  ["kigali-infill-apartments", "Kigali Infill Apartments", "rwanda context concept study"],
  ["musanze-highlands-lodge", "Musanze Highlands Lodge", "rwanda context concept study"],
  ["bugesera-logistics-hub", "Bugesera Logistics Hub", "rwanda context concept study"],
  ["huye-learning-courtyard", "Huye Learning Courtyard", "rwanda context concept study"],
  ["rubavu-lakeside-residences", "Rubavu Lakeside Residences", "rwanda context concept study"],
  ["rwamagana-production-yard", "Rwamagana Production Yard", "rwanda context concept study"],
] as const;

async function visit(page: Page, route: string): Promise<void> {
  const response = await page.goto(route, { waitUntil: "networkidle" });
  expect(response?.status(), route).toBe(200);
  await expect(page.getByRole("main")).toHaveAttribute("id", "main-content");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function revealDocument(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (
      let position = 0;
      position < document.documentElement.scrollHeight;
      position += Math.max(window.innerHeight * 0.7, 320)
    ) {
      window.scrollTo({ top: position, behavior: "instant" });
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("renz-s9ap-opener-seen", "true");
  });
});

test("public routes hydrate without recoverable React errors", async ({ page }) => {
  test.setTimeout(180_000);
  const hydrationErrors: string[] = [];
  const hydrationPattern =
    /hydration|hydrated|server rendered html didn't match|minified react error #418/iu;

  page.on("pageerror", (error) => {
    if (hydrationPattern.test(error.message)) hydrationErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && hydrationPattern.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });

  for (const route of [
    ...publicRoutes,
    "/services/design",
    "/projects/ridge-residence",
    "/insights/preparing-a-clear-construction-brief",
  ]) {
    await visit(page, route);
  }

  expect(hydrationErrors).toEqual([]);
});

test("public routes retain document semantics, noindex, and local media delivery", async ({
  page,
}) => {
  test.setTimeout(180_000);
  for (const route of publicRoutes) {
    await visit(page, route);
    await expect(page.locator('html[lang="en"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/iu);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /nofollow/iu);
    const externalResources = await page
      .locator("script[src], img[src], video[src]")
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute("src"))
          .filter((source): source is string => Boolean(source))
          .filter((source) => new URL(source, location.href).origin !== location.origin),
      );
    expect(externalResources, route).toEqual([]);
  }
});

test("all twelve labelled project studies have working details and next-study navigation", async ({
  page,
}) => {
  test.setTimeout(480_000);
  await visit(page, "/projects");
  // CR1: the studies index is rendered from the published projects register.
  const collection = page.getByRole("region", { name: "Concept project studies" });
  await expect(collection.locator("article")).toHaveCount(12);
  await expect(
    page.getByRole("status").filter({ hasText: /none is a completed RENZ project/iu }),
  ).toBeVisible();

  for (let index = 0; index < conceptProjects.length; index += 1) {
    const project = conceptProjects[index];
    const nextProject = conceptProjects[(index + 1) % conceptProjects.length];
    if (!project || !nextProject) throw new Error("The concept verification matrix is incomplete.");
    const [slug, title, badge] = project;
    await visit(page, "/projects");
    const link = page.getByRole("link", { name: `Open ${title} ${badge}` });
    await expect(link).toHaveAttribute("href", `/projects/${slug}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`, "u"));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.locator(".project-story-chapter")).toHaveCount(9);
    // D1 repeats the provenance line through the study (hero, media plane, gallery).
    await expect(
      page.getByText("Generated concept visual / not RENZ project evidence").first(),
    ).toBeVisible();
    // D1.7: a seven-piece gallery and its lightbox.
    await expect(page.locator(".gallery-grid .gallery-frame")).toHaveCount(7);
    await expect(
      page.getByRole("navigation", { name: "Case-study chapters" }).getByRole("link"),
    ).toHaveCount(9);
    const next = page.locator(".next-study a");
    await expect(next).toHaveAttribute("href", `/projects/${nextProject[0]}`);
    await expect(next.getByRole("heading", { name: nextProject[1] })).toHaveCount(1);
  }
});

test("unknown public records retain actual 404 responses", async ({ page }) => {
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

test("old /expertise routes redirect to /services as a compatibility bridge", async ({ page }) => {
  const indexResponse = await page.goto("/expertise");
  expect(indexResponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/services$/u);

  const detailResponse = await page.goto("/expertise/anything");
  expect(detailResponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/services$/u);
});

test("mobile navigation traps focus, restores it, and follows its selected route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, "/");
  const trigger = page.getByRole("button", { name: "Menu", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "RENZ / Navigation" });
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("html")).toHaveClass(/public-menu-open/u);
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link", { name: "Start a Project" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("html")).not.toHaveClass(/public-menu-open/u);
  await trigger.click();
  await dialog.getByRole("link", { name: /Projects/iu }).click();
  await expect(page).toHaveURL(/\/projects$/u);
  await expect(dialog).not.toBeVisible();
});

test("drawing comparison is keyboard operable on desktop and touch-sized on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit(page, "/projects/ridge-residence");
  const range = page.getByRole("slider", { name: "Reveal resolved concept" });
  await range.focus();
  await page.keyboard.press("Home");
  await expect(range).toHaveValue("0");
  await expect(page.locator(".drawing-reality")).toHaveAttribute("data-dominant-layer", "drawing");
  await page.keyboard.press("End");
  await expect(range).toHaveValue("100");
  await expect(page.locator(".drawing-reality")).toHaveAttribute("data-dominant-layer", "reality");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(range).toBeHidden();
  const toggle = page.getByRole("button", { name: "Show drawing", exact: true });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await expect(toggle).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".drawing-reality")).toHaveAttribute("data-dominant-layer", "drawing");
  await expect(
    page.getByRole("button", { name: "Show resolved concept", exact: true }),
  ).toBeVisible();
});

test("the intake wizard is reversible, recovers a refresh, and makes no write requests before submit", async ({
  page,
}) => {
  // C8 replaced the preview-only guided experience with the real seven-step
  // intake. Moving back and forward keeps values; a refresh recovers the
  // non-sensitive draft; nothing is written until the visitor submits.
  await visit(page, "/start-a-project");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  await expect(page.locator(".intake-progress li")).toHaveCount(7);
  const choice = page.getByRole("radio", { name: /^Design/u });
  await choice.focus();
  await page.keyboard.press("Space");
  await expect(choice).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your project", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(choice).toBeChecked();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("radio", { name: /^Design/u })).toBeChecked();
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => location.search)).toBe("");
  await page.evaluate(() => sessionStorage.clear());

  await visit(page, "/contact");
  await expect(page.locator("form.intake-form")).toHaveCount(1);
  expect(
    await page.locator('a[href^="mailto:"], a[href^="https://wa.me/"]').count(),
    "the authorized RENZ email/WhatsApp links should be present on /contact",
  ).toBeGreaterThanOrEqual(1);
});

test("reduced motion keeps content and controls visible without continuing animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/");
  await expect(page.locator(".brand-opener")).toBeHidden();
  await revealDocument(page);
  const movingAnimations = await page.evaluate(
    () =>
      document.getAnimations().filter((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return animation.playState === "running" && Number(timing?.duration ?? 0) > 1;
      }).length,
  );
  expect(movingAnimations).toBe(0);
  await visit(page, "/projects/ridge-residence");
  await expect(page.getByRole("slider", { name: "Reveal resolved concept" })).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
});

for (const width of [320, 390, 768, 1440]) {
  test(`public experience reflows at ${width}px without horizontal page scrolling`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    for (const route of [
      "/",
      "/projects",
      "/projects/ridge-residence",
      "/services",
      "/services/design",
      "/about",
      "/insights",
      "/contact",
      "/start-a-project",
      "/brand-study",
    ]) {
      await visit(page, route);
      await revealDocument(page);
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.document, `${route} document width at ${width}`).toBeLessThanOrEqual(
        dimensions.viewport,
      );
      expect(dimensions.body, `${route} body width at ${width}`).toBeLessThanOrEqual(
        dimensions.viewport,
      );
    }
  });
}

test("public pages and open navigation have no serious accessibility violations", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [...publicRoutes, "/projects/ridge-residence"]) {
    await visit(page, route);
    await revealDocument(page);
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      ),
      route,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, "/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});
