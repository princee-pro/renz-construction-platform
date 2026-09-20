import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// C7 configuration browser acceptance (brief §67–§70).
//
// Serial: business → publish → public; WhatsApp texting-only; location card
// appears / disappears; SEO metadata; legal draft vs published; two-session
// conflict + realtime cue; site mode gate; responsive + accessibility. The
// global teardown resets the local database (authorized baseline restored).

const screenshotRoot = ".playwright/screenshots/c7";
const businessName = "SYNTHETIC C7 BROWSER LTD";
const businessEmail = "synthetic-c7-browser@example.test";

async function expectNoSeriousAxeViolations(page: Page) {
  // D1: entrance animations fade content in; audit colours at rest, not
  // mid-fade (finite animations only — marquees and progress loops are ignored).
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

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}

async function secondSession(browser: Browser, actorKey: string, next: string) {
  const actor = fixtures().actors[actorKey];
  if (!actor) throw new Error(`Synthetic actor ${actorKey} was unavailable.`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInWithMfa(page, actor, next);
  return { context, page };
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish public configuration", exact: true }).click();
  await page.getByRole("button", { name: "Confirm publish", exact: true }).click();
  // The confirm form closes only when the publish action succeeds.
  await expect(page.getByRole("button", { name: "Confirm publish", exact: true })).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.getByText("Public configuration published.")).toBeVisible();
  await expect(page.locator(".publish-panel .status-badge")).toHaveText("Published", {
    timeout: 15_000,
  });
}

test.describe.serial("RENZ C7 configuration", () => {
  test("keeps an AAL1 staff actor out of Settings", async ({ page }) => {
    const actor = fixtures().actors["aal1"];
    if (!actor) throw new Error("Synthetic AAL1 actor was unavailable.");
    await page.goto("/admin/sign-in?next=%2Fadmin%2Fsettings");
    await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
    await page.getByLabel("Password").fill(actor.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    for (const path of ["/admin/settings", "/admin/settings/business", "/admin/settings/system"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    }
  });

  test("edits the business profile as a draft, publishes, and the public site follows", async ({
    page,
    browser,
  }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actor, "/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Public configuration" })).toBeVisible();

    // Public contact before any publish: authorized fallback, WhatsApp texting only.
    const anonymous = await browser.newContext();
    const publicPage = await anonymous.newPage();
    await publicPage.goto("/contact");
    await expect(
      publicPage.getByRole("link", { name: "renzconstruuction@gmail.com" }).first(),
    ).toBeVisible();
    await expect(publicPage.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(publicPage.locator('a[href^="https://wa.me/447412853143"]').first()).toBeVisible();
    await expect(publicPage.getByRole("heading", { name: /^Find/u })).toHaveCount(0);

    // Draft edit.
    await page.goto("/admin/settings/business");
    await page.getByRole("textbox", { name: "Display name" }).fill(businessName);
    await page.getByRole("textbox", { name: "Primary email" }).fill(businessEmail);
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText(/saved as draft/u)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".publish-panel")).toContainText("Unpublished changes");

    // Public unchanged before publish.
    await publicPage.goto("/contact");
    await expect(
      publicPage.getByRole("link", { name: "renzconstruuction@gmail.com" }).first(),
    ).toBeVisible();

    // WhatsApp channel (texting only) + publish.
    await page.getByRole("button", { name: "Contact channels", exact: true }).click();
    await page.getByRole("button", { name: "Add channel", exact: true }).first().click();
    await page.getByLabel("Type").selectOption("whatsapp");
    await page.getByRole("textbox", { name: "Label" }).fill("WhatsApp");
    await page.getByRole("textbox", { name: "Value" }).fill("+44 7412 853143");
    await page.getByRole("button", { name: "Add channel", exact: true }).last().click();
    await expect(page.getByText("Contact channel saved.")).toBeVisible({ timeout: 15_000 });
    await publish(page);

    // Public follows: new email in Contact and footer; still no tel:.
    await publicPage.goto("/contact");
    await expect(publicPage.getByRole("link", { name: businessEmail }).first()).toBeVisible();
    await expect(publicPage.getByRole("contentinfo")).toContainText(businessName);
    await expect(publicPage.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(publicPage.locator('a[href^="https://wa.me/447412853143"]').first()).toBeVisible();
    await expectNoSeriousAxeViolations(publicPage);

    // Location: configure + publish → card; unpublish + republish → gone.
    await page.getByRole("button", { name: "Location", exact: true }).click();
    await page.getByRole("textbox", { name: "Street address" }).fill("SYNTHETIC 1 Example Street");
    await page.getByRole("textbox", { name: "City" }).fill("SYNTHETIC CITY");
    await page
      .getByRole("textbox", { name: "Maps URL" })
      .fill("https://maps.example.test/synthetic");
    await page
      .getByRole("textbox", { name: "Directions URL" })
      .fill("https://maps.example.test/synthetic/directions");
    await page.getByRole("checkbox", { name: /Publish this location/u }).check();
    await page.getByRole("button", { name: "Save location", exact: true }).click();
    await expect(page.getByText(/Location saved/u)).toBeVisible({ timeout: 15_000 });
    await publish(page);
    await publicPage.goto("/contact");
    await expect(publicPage.getByRole("heading", { name: /^Find/u })).toBeVisible();
    await expect(publicPage.getByRole("link", { name: "View on Map" })).toBeVisible();
    await expect(publicPage.getByRole("link", { name: "Get Directions" })).toBeVisible();
    await expect(publicPage.getByRole("button", { name: "Copy Address" })).toBeVisible();
    await expect(publicPage.locator(".location-card")).toContainText("SYNTHETIC CITY");
    await page.goto("/admin/settings/business?section=location");
    await expect(page.getByRole("checkbox", { name: /Publish this location/u })).toBeChecked();
    await page.getByRole("checkbox", { name: /Publish this location/u }).uncheck();
    await page.getByRole("button", { name: "Save location", exact: true }).click();
    await expect(page.getByText(/Location saved/u)).toBeVisible({ timeout: 15_000 });
    await publish(page);
    await publicPage.goto("/contact");
    await expect(publicPage.getByRole("heading", { name: /^Find/u })).toHaveCount(0);
    await expect(publicPage.locator(".location-card")).toHaveCount(0);

    // SEO + canonical → metadata; preview keeps noindex.
    await page.goto("/admin/settings/website");
    await page
      .getByRole("textbox", { name: "Canonical site URL" })
      .fill("https://synthetic.example.test");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText(/saved as draft/u)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "SEO", exact: true }).click();
    await page.getByRole("textbox", { name: "Site name" }).fill("SYNTHETIC SITE");
    await page
      .getByRole("textbox", { name: "Default meta description" })
      .fill(
        "SYNTHETIC meta description long enough to satisfy the launch readiness description check.",
      );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText(/saved as draft/u)).toBeVisible({ timeout: 15_000 });
    await publish(page);
    // CR1: every published page carries its own owner-edited description
    // (Pages → Page settings & SEO); the C7 default only backs pages without
    // one, so the public check here is the site name and robots state.
    await publicPage.goto("/");
    expect(await publicPage.locator('meta[property="og:site_name"]').getAttribute("content")).toBe(
      "SYNTHETIC SITE",
    );
    expect(
      await publicPage.locator('meta[name="robots"]').first().getAttribute("content"),
    ).toContain("noindex");
    const robots = await publicPage.request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /");
    await anonymous.close();
  });

  test("keeps legal drafts private until a super admin publishes, and enforces conflicts + realtime", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, "/admin/settings/legal");
    const anonymous = await browser.newContext();
    const publicPage = await anonymous.newPage();
    await publicPage.goto("/privacy");
    await expect(publicPage.getByText("has not been published yet")).toBeVisible();

    await page.getByRole("textbox", { name: "Title" }).fill("SYNTHETIC Privacy Notice");
    await page
      .getByRole("textbox", { name: "Body" })
      .fill(
        "## Scope\n\nSYNTHETIC reviewed privacy body.\n\n## Enquiries and project submissions\n\nSYNTHETIC intake coverage (C8 readiness requires the published notice to cover online enquiries).",
      );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    // The editor remounts on the new version; the starter flag is gone so publishing is offered.
    await expect(page.getByRole("button", { name: "Publish revision", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await publicPage.goto("/privacy");
    await expect(publicPage.getByText("has not been published yet")).toBeVisible();

    // Admin (no settings.legal.publish) sees no publish control.
    const admin = await secondSession(browser, "admin", "/admin/settings/legal");
    await expect(admin.page.getByRole("button", { name: "Publish revision" })).toHaveCount(0);
    await admin.context.close();

    await page.getByRole("button", { name: "Publish revision", exact: true }).click();
    await page.getByRole("button", { name: "Confirm publish", exact: true }).click();
    await expect(page.getByText("Published · revision 1")).toBeVisible({ timeout: 15_000 });
    await publicPage.goto("/privacy");
    await expect(
      publicPage.getByRole("heading", { name: "SYNTHETIC Privacy Notice", level: 1 }),
    ).toBeVisible();
    await expect(publicPage.getByText("SYNTHETIC reviewed privacy body.")).toBeVisible();
    // A new draft does not change the public page until published again.
    await page.getByRole("textbox", { name: "Body" }).fill("SYNTHETIC second draft.");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText("Draft differs from published")).toBeVisible({ timeout: 15_000 });
    await publicPage.goto("/privacy");
    await expect(publicPage.getByText("SYNTHETIC reviewed privacy body.")).toBeVisible();
    await anonymous.close();

    // Two-session conflict on the business profile + realtime cue.
    await page.goto("/admin/settings/business");
    await expect(page.locator(".realtime-status", { hasText: "Live" })).toBeVisible({
      timeout: 20_000,
    });
    const other = await secondSession(browser, "superB", "/admin/settings/business");
    await other.page.getByRole("textbox", { name: "Tagline" }).fill("SYNTHETIC tagline B");
    await other.page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(other.page.getByText(/saved as draft/u)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".realtime-status", { hasText: "Updated just now" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("textbox", { name: "Tagline" }).fill("SYNTHETIC tagline A stale");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText(/saved these settings first/u)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("textbox", { name: "Tagline" })).toHaveValue(
      "SYNTHETIC tagline A stale",
    );
    await page.getByRole("button", { name: "Reload latest", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Tagline" })).toHaveValue(
      "SYNTHETIC tagline B",
      {
        timeout: 15_000,
      },
    );
    await other.context.close();
  });

  test("refuses going live while required checks block, then goes live and returns to preview", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, "/admin/settings/launch-readiness");
    await expect(page.getByRole("heading", { name: "Launch Readiness", level: 1 })).toBeVisible();
    await expect(page.locator(".readiness-list").first()).toContainText("Terms of use published");
    await page.getByRole("button", { name: "Go live", exact: true }).click();
    await page.getByRole("button", { name: "Confirm: go live", exact: true }).click();
    await expect(page.getByText(/Required launch checks are not satisfied/u)).toBeVisible({
      timeout: 15_000,
    });
    await expectNoSeriousAxeViolations(page);

    // Complete prerequisites: publish terms.
    await page.goto("/admin/settings/legal");
    await page.getByRole("button", { name: "Terms of Use (unpublished)", exact: true }).click();
    await page.getByRole("textbox", { name: "Title" }).fill("SYNTHETIC Terms");
    await page.getByRole("textbox", { name: "Body" }).fill("SYNTHETIC terms body.");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("button", { name: "Publish revision", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Publish revision", exact: true }).click();
    await page.getByRole("button", { name: "Confirm publish", exact: true }).click();
    await expect(page.getByText("Published · revision 1")).toBeVisible({ timeout: 15_000 });

    // Admin cannot switch modes.
    const admin = await secondSession(browser, "admin", "/admin/settings/launch-readiness");
    await expect(admin.page.getByRole("button", { name: "Go live" })).toHaveCount(0);
    await admin.context.close();

    await page.goto("/admin/settings/launch-readiness");
    await page.getByRole("button", { name: "Go live", exact: true }).click();
    await page.getByRole("button", { name: "Confirm: go live", exact: true }).click();
    await expect(page.getByText("Site mode is now live.")).toBeVisible({ timeout: 15_000 });
    const anonymous = await browser.newContext();
    const publicPage = await anonymous.newPage();
    const robots = await publicPage.request.get("/robots.txt");
    const robotsText = await robots.text();
    expect(robotsText).toContain("Allow: /");
    expect(robotsText).toContain("Disallow: /admin");
    const sitemap = await publicPage.request.get("/sitemap.xml");
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("https://synthetic.example.test/contact");
    expect(sitemapText).not.toContain("/admin");
    expect(sitemapText).not.toContain("/po/");
    await publicPage.goto("/");
    expect(
      await publicPage.locator('meta[name="robots"]').first().getAttribute("content"),
    ).toContain("index");
    expect(
      await publicPage.locator('meta[name="robots"]').first().getAttribute("content"),
    ).not.toContain("noindex");
    await anonymous.close();

    // Restore preview.
    await page.goto("/admin/settings/launch-readiness");
    await page.getByRole("button", { name: "Return to preview", exact: true }).click();
    await page.getByRole("button", { name: "Confirm: go preview", exact: true }).click();
    await expect(page.getByText("Site mode is now preview.")).toBeVisible({ timeout: 15_000 });

    // Quick Find surfaces settings.
    await page.keyboard.press("Control+k");
    const quickFind = page.getByRole("dialog", { name: "Quick find" });
    await quickFind
      .getByRole("textbox", { name: "Search clients, projects, and case studies" })
      .fill("Launch");
    await expect(quickFind.getByText("SETTING").first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
  });

  test("lays out every settings screen at 390 / 768 / 1440 (+320 and 200% zoom) with axe passing", async ({
    page,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, "/admin/settings");
    const screens: readonly (readonly [string, string, string])[] = [
      ["overview", "/admin/settings", "Public configuration"],
      ["business", "/admin/settings/business", "Business profile"],
      ["contact", "/admin/settings/business?section=contact", "Contact channels"],
      ["location", "/admin/settings/business?section=location", "Street address"],
      ["website", "/admin/settings/website", "Canonical site URL"],
      ["seo", "/admin/settings/website?section=seo", "Title template"],
      ["legal", "/admin/settings/legal", "Privacy Notice"],
      ["system", "/admin/settings/system", "Document defaults"],
      ["staff", "/admin/settings/staff", "Staff & Access"],
      ["launch", "/admin/settings/launch-readiness", "System checks"],
    ];
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
      for (const [name, path, landmark] of screens) {
        await page.goto(path);
        await expect(page.getByText(landmark).first()).toBeVisible();
        await expect(page.locator("main[aria-busy='true']")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        await page.screenshot({ path: `${screenshotRoot}/${width}-${name}.png`, fullPage: true });
      }
    }
    for (const width of [320, 720]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of [
        "/admin/settings/business",
        "/admin/settings/system",
        "/admin/settings/launch-readiness",
      ]) {
        await page.goto(path);
        await expect(page.locator("main[aria-busy='true']")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/admin/settings",
      "/admin/settings/business",
      "/admin/settings/system",
      "/admin/settings/staff",
    ]) {
      await page.goto(path);
      await expectNoSeriousAxeViolations(page);
    }
  });
});
