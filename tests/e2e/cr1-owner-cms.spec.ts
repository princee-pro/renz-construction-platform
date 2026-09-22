import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// CR1 — Owner Website Control System browser acceptance (brief §85–§98).
//
// Serial, one owner (super_admin) session driving Admin only — NO code
// edits during any flow. Home draft → preview → publish → rollback; a custom
// page through navigation and unpublish; reserved routes; Service #6;
// Project #7 with an upload and auto-placement; an Insight; the media
// library; two-session conflict; WhatsApp green + texting-only; XSS refused.
// The global setup migrates the approved content (5 services, 6 studies,
// 3 insights) and the teardown resets the database.

const screenshotRoot = ".playwright/screenshots/cr1";
const uniqueSuffix = String(Date.now()).slice(-5);

function tinyPng(): Buffer {
  // 1×1 PNG, deterministic; enough for the S4 image pipeline.
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
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

async function openHomeEditor(page: Page): Promise<string> {
  await page.goto("/admin/website/pages");
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/website\/pages\/[0-9a-f-]{36}$/u);
  return page.url().split("/").pop() ?? "";
}

test.describe.configure({ mode: "serial" });

test.describe("CR1 owner website control", () => {
  test.beforeEach(({ page }) => {
    // Owner confirmations (unpublish, restore, archive) are native confirm()s.
    page.on("dialog", (dialog) => void dialog.accept());
  });

  test("Home: draft → preview → publish → rollback, with reorder", async ({ page }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/website");
    await expect(page.getByRole("heading", { name: "Website control center" })).toBeVisible();
    await expect(page.getByText("Public content").first()).toBeVisible();
    await page.screenshot({ path: `${screenshotRoot}/website-overview.png`, fullPage: true });

    await page.goto("/admin/website/sitemap");
    await expect(page.getByRole("heading", { name: "Site map" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "/services/design" })).toBeVisible();

    const pageId = await openHomeEditor(page);
    // The hero is the first (locked) section.
    await page.getByRole("button", { name: /Hero/u }).first().click();
    const headline = page.getByLabel("Headline");
    await headline.fill("SYNTHETIC hero line\nto landmark");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();

    // Public unchanged; preview reflects the draft.
    const publicHome = await page.context().newPage();
    await publicHome.goto("/");
    await expect(publicHome.getByRole("heading", { level: 1 })).toContainText("Brick by Brick");
    await expect(publicHome.getByRole("heading", { level: 1 })).not.toContainText("SYNTHETIC");
    await publicHome.goto(`/preview/website/${pageId}`);
    await expect(publicHome.getByRole("heading", { level: 1 })).toContainText(
      "SYNTHETIC hero line",
    );
    await expect(publicHome.getByRole("link", { name: "Edit page" })).toBeVisible();
    await publicHome.close();

    // Reorder: move the second section down; the draft order changes.
    const secondSection = page.locator(".page-editor-section").nth(1);
    const secondTitle = (await secondSection.locator("strong").first().textContent()) ?? "";
    await secondSection.getByRole("button", { name: "Move down" }).click();
    await expect(page.getByText("Moved down.")).toBeVisible();
    await expect(page.locator(".page-editor-section").nth(2).locator("strong").first()).toHaveText(
      secondTitle,
    );

    // Publish and verify the public site updated atomically.
    await page.getByLabel("What changed (optional)").fill("SYNTHETIC headline test");
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Published as revision \d+\./u)).toBeVisible();
    const publicAfter = await page.context().newPage();
    await publicAfter.goto("/");
    await expect(publicAfter.getByRole("heading", { level: 1 })).toContainText(
      "SYNTHETIC hero line",
    );
    await expectNoHorizontalOverflow(publicAfter);
    await publicAfter.close();

    // Rollback: restore revision 1 as draft, then publish it.
    await page.getByRole("button", { name: "Restore as draft" }).last().click();
    await expect(page.getByText(/Revision 1 restored as the new draft/u)).toBeVisible();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Published as revision \d+\./u)).toBeVisible();
    const publicRestored = await page.context().newPage();
    await publicRestored.goto("/");
    // Revision 1 is the original D1 wording, kept as history: restoring it must
    // bring that wording back, not the current brand line. Preserved history is
    // the point of the rollback control.
    await expect(publicRestored.getByRole("heading", { level: 1 })).toContainText("From land");
    await expect(publicRestored.getByRole("heading", { level: 1 })).not.toContainText("SYNTHETIC");
    await publicRestored.close();
    await page.screenshot({ path: `${screenshotRoot}/home-editor.png`, fullPage: true });
  });

  test("Custom page: reserved route refused, create → publish → navigation → unpublish", async ({
    page,
  }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/website/pages");

    // Reserved addresses are refused.
    await page.getByLabel("Title").fill("Admin");
    await page.getByRole("textbox", { name: "Address" }).fill("admin");
    await page.getByRole("button", { name: "Create draft page" }).click();
    await expect(page.getByText("This address is reserved or not valid.").first()).toBeVisible();
    for (const reserved of ["api", "services", "projects", "i", "po"]) {
      await page.getByRole("textbox", { name: "Address" }).fill(reserved);
      await page.getByRole("button", { name: "Create draft page" }).click();
      await expect(page.getByText("This address is reserved or not valid.").first()).toBeVisible();
    }

    // A real custom page.
    await page.getByLabel("Title").fill("Synthetic Approach");
    await page.getByRole("textbox", { name: "Address" }).fill("synthetic-approach");
    await page.getByRole("button", { name: "Create draft page" }).click();
    await expect(page).toHaveURL(/\/admin\/website\/pages\/[0-9a-f-]{36}$/u);
    const pageId = page.url().split("/").pop() ?? "";

    // Add a FAQ section and a CTA, fill them, save.
    await page.getByLabel("Add a section").selectOption("faq");
    await page.getByRole("button", { name: "Add section" }).click();
    await expect(page.getByText("FAQ added.")).toBeVisible();
    await page.getByLabel("Heading").fill("Synthetic questions");
    await page.getByRole("button", { name: "Add question" }).click();
    await page
      .getByRole("textbox", { name: "Question", exact: true })
      .fill("Is this a synthetic page?");
    await page
      .getByRole("textbox", { name: "Answer", exact: true })
      .fill("Yes — created from Admin without a developer.");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();

    await page.getByLabel("Add a section").selectOption("cta");
    await page.getByRole("button", { name: "Add section" }).click();
    await expect(page.getByText("Call to action added.")).toBeVisible();
    await page.getByLabel("Heading").fill("Talk to RENZ about your synthetic site");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();

    // Not public before publishing.
    const visitor = await page.context().newPage();
    const before = await visitor.goto("/synthetic-approach");
    expect(before?.status()).toBe(404);

    // SEO description is required for a custom page; set it, then publish.
    await page.getByRole("button", { name: "Page settings & SEO" }).click();
    await page.getByLabel("Search description").fill("A synthetic custom page created from Admin.");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Page settings saved.")).toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText(/Published as revision 1\./u)).toBeVisible();
    await visitor.goto("/synthetic-approach");
    await expect(
      visitor.getByRole("heading", { level: 1, name: "Synthetic Approach" }),
    ).toBeVisible();
    await expect(visitor.getByText("Is this a synthetic page?")).toBeVisible();
    await expectNoHorizontalOverflow(visitor);

    // Add to navigation (published pages only).
    await page.goto("/admin/settings/website?section=navigation");
    await page.getByRole("checkbox", { name: /Synthetic Approach/u }).check();
    await page.getByRole("button", { name: "Save navigation" }).click();
    await expect(page.getByText("Navigation saved.")).toBeVisible();
    await page.getByRole("button", { name: "Publish public configuration", exact: true }).click();
    await page.getByRole("button", { name: "Confirm publish", exact: true }).click();
    await expect(page.getByText("Public configuration published.")).toBeVisible({
      timeout: 15_000,
    });
    await visitor.goto("/");
    // D1.6: routes that do not fit the Measured Track fold into "More".
    const primaryNavigation = visitor.getByRole("navigation", { name: "Primary navigation" });
    const more = primaryNavigation.getByRole("button", { name: /More/u });
    if ((await more.count()) > 0) await more.click();
    await expect(primaryNavigation.getByRole("link", { name: "Synthetic Approach" })).toBeVisible();

    // Unpublish is blocked while the navigation links to the page.
    await page.goto(`/admin/website/pages/${pageId}`);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText(/linked from the navigation/u)).toBeVisible();

    // Remove the navigation link, then unpublish; the address stops resolving.
    await page.goto("/admin/settings/website?section=navigation");
    await page.getByRole("checkbox", { name: /Synthetic Approach/u }).uncheck();
    await page.getByRole("button", { name: "Save navigation" }).click();
    await expect(page.getByText("Navigation saved.")).toBeVisible();
    await page.goto(`/admin/website/pages/${pageId}`);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText(/^Unpublished\./u)).toBeVisible();
    const after = await visitor.goto("/synthetic-approach");
    expect(after?.status()).toBe(404);
    await visitor.close();
  });

  test("XSS and unsafe links are refused at the editor boundary", async ({ page }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/website/pages");
    await openHomeEditor(page);
    await page.getByRole("button", { name: /Hero/u }).first().click();
    await page.getByLabel("Summary").fill("<script>alert(1)</script>");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Some fields need attention before this section can be saved."),
    ).toBeVisible();
    await page.getByLabel("Summary").fill("Safe summary");
    await page.getByRole("checkbox", { name: "Show this button" }).nth(1).check();
    await page.getByLabel("Goes to").last().selectOption("external");
    await page.getByLabel("Web address").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Some fields need attention before this section can be saved."),
    ).toBeVisible();
  });

  test("Service #6 appears everywhere once published and disappears when unpublished", async ({
    page,
  }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/content/services/new");
    await page
      .getByRole("textbox", { name: "Service name" })
      .fill("SYNTHETIC LANDSCAPE COORDINATION");
    await page
      .getByRole("textbox", { name: "Public slug" })
      .fill(`synthetic-landscape-coordination-${uniqueSuffix}`);
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/services\/[0-9a-f-]{36}/u);

    await page
      .getByRole("textbox", { name: "Summary" })
      .fill("SYNTHETIC landscape coordination created from Admin only for CR1 acceptance.");
    await page.getByRole("textbox", { name: "Scope" }).fill("SYNTHETIC scope");
    await page
      .getByRole("textbox", { name: "Deliverables" })
      .fill("Planting plan\nDrainage coordination");
    await page.getByRole("textbox", { name: "Exclusions" }).fill("SYNTHETIC exclusions");
    await page
      .getByRole("textbox", { name: "Delivery wording" })
      .fill("SYNTHETIC delivery wording");
    await page.getByRole("textbox", { name: "SEO title" }).fill("SYNTHETIC Landscape | Test");
    await page
      .getByRole("textbox", { name: "SEO description" })
      .fill("SYNTHETIC search description for CR1 acceptance.");
    await page.getByRole("button", { name: "Paragraph" }).click();
    await page
      .getByRole("textbox", { name: "Paragraph" })
      .fill("SYNTHETIC structured body content used only for CR1 verification.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
    // The register save bumps the shared version; load the fresh page state.
    await page.reload();

    // Owner detail fields (sub-services etc.).
    await page.getByLabel("Positioning line").fill("SYNTHETIC coordination of external works.");
    await page
      .getByLabel("Sub-services (one per line)")
      .fill("Planting plan\nDrainage coordination\nExternal lighting");
    await page.getByRole("button", { name: "Save page content" }).click();
    await expect(page.getByText("Service details saved.")).toBeVisible();

    // Evidence → review → publish.
    await page.getByRole("button", { name: "Register evidence" }).click();
    await page
      .getByRole("textbox", { name: "Supported fact" })
      .fill("SYNTHETIC evidence supports this test-only service record.");
    await page.getByLabel("Source type").selectOption("internal_record");
    await page
      .getByRole("textbox", { name: "Source reference" })
      .fill("SYNTHETIC CR1 browser evidence reference");
    await page.getByRole("button", { name: "Register as Unverified" }).click();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await page.getByRole("button", { name: "Verify" }).click();
    await page.getByRole("button", { name: "Confirm verification" }).click();
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Publish" }).click();
    await page.getByRole("button", { name: "Confirm publish" }).click();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

    const visitor = await page.context().newPage();
    await visitor.goto("/services");
    await expect(visitor.getByRole("heading", { level: 1 })).toContainText(
      "Services for every stage of your project.",
    );
    await expect(
      visitor.getByRole("link", { name: /SYNTHETIC LANDSCAPE COORDINATION/u }).first(),
    ).toBeVisible();
    await visitor.goto(`/services/synthetic-landscape-coordination-${uniqueSuffix}`);
    await expect(
      visitor.getByRole("heading", { level: 1, name: "SYNTHETIC LANDSCAPE COORDINATION" }),
    ).toBeVisible();
    await expect(
      visitor
        .getByRole("complementary", { name: "Service summary" })
        .getByText("External lighting"),
    ).toBeVisible();
    await visitor.goto("/");
    await visitor.getByRole("link", { name: "Services", exact: true }).first().hover();
    await expect(visitor.getByRole("navigation", { name: "Primary navigation" })).toContainText(
      "SYNTHETIC LANDSCAPE COORDINATION",
    );
    await expectNoHorizontalOverflow(visitor);

    // Edit while published: the public keeps the last published version until "Publish changes".
    await page.getByLabel("Positioning line").fill("SYNTHETIC coordination — edited while live.");
    await page.getByRole("button", { name: "Save page content" }).click();
    await expect(page.getByText("Service details saved.")).toBeVisible();
    await visitor.goto(`/services/synthetic-landscape-coordination-${uniqueSuffix}`);
    const main = visitor.locator("#main-content");
    await expect(main.getByText("SYNTHETIC coordination of external works.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Draft changes", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Changes published as revision/u)).toBeVisible();
    await visitor.goto(`/services/synthetic-landscape-coordination-${uniqueSuffix}`);
    await expect(main.getByText("SYNTHETIC coordination — edited while live.")).toBeVisible();

    // Unpublish removes it cleanly.
    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("button", { name: "Confirm unpublish" }).click();
    await expect(page.getByRole("button", { exact: true, name: "Publish" })).toBeVisible();
    await visitor.goto("/services");
    await expect(visitor.getByRole("heading", { level: 1 })).toContainText(
      "Services for every stage of your project.",
    );
    await expect(
      visitor.getByRole("link", { name: /SYNTHETIC LANDSCAPE COORDINATION/u }),
    ).toHaveCount(0);
    await visitor.close();
  });

  test("Project #7: upload, relate, feature on Home, auto-placement, unpublish", async ({
    page,
  }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/content/projects/new");
    await page.getByRole("textbox", { name: "Working title" }).fill("SYNTHETIC OWNER PROJECT");
    await page
      .getByRole("textbox", { name: "Public slug" })
      .fill(`synthetic-owner-project-${uniqueSuffix}`);
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/projects\/[0-9a-f-]{36}/u);
    const projectUrl = page.url();

    await page
      .getByRole("textbox", { name: "Public summary" })
      .fill("SYNTHETIC project created from Admin for CR1 acceptance.");
    await page.getByRole("textbox", { name: "Project type" }).fill("Synthetic residential concept");
    await page.getByRole("textbox", { name: "SEO title" }).fill("SYNTHETIC OWNER PROJECT | Test");
    await page
      .getByRole("textbox", { name: "SEO description" })
      .fill("SYNTHETIC project metadata for CR1 acceptance.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
    await page.reload();

    // Website placement: concept study, featured on Home.
    await page.getByRole("button", { name: "Website placement" }).click();
    await page.getByLabel("What this project is").selectOption("concept_study");
    await page.getByRole("checkbox", { name: "Feature on Home" }).check();
    await page.getByLabel("Materials (shown on cards)").fill("Timber / stone");
    await page.getByRole("button", { name: "Save placement" }).click();
    await expect(page.getByText("Website placement saved.")).toBeVisible();

    // Related services: two.
    await page.getByRole("button", { name: "Services" }).click();
    await page.getByRole("checkbox", { name: "Design" }).check();
    await page.getByRole("checkbox", { name: "Supervision" }).check();
    await page.getByRole("button", { name: "Save related services" }).click();
    await expect(page.getByText("Related services updated.")).toBeVisible();

    // Media: upload a generated concept image as the hero and clear its rights.
    await page.getByRole("button", { name: /^Media/u }).click();
    await page
      .getByLabel("Image file")
      .setInputFiles({ name: "synthetic-hero.png", mimeType: "image/png", buffer: tinyPng() });
    // D1.7: the upload form sits behind "Add an image" once the list has items.
    const addImage = page.locator("details.media-upload-details");
    if (!(await addImage.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await addImage.locator("summary").click();
    }
    await page.getByLabel("Where this image comes from").selectOption("production_asset");
    await page.getByLabel("Role in the gallery").selectOption("hero");
    await page
      .getByLabel("Alt text (describe the image)")
      .last()
      .fill("SYNTHETIC generated concept hero; not RENZ project evidence");
    await page.getByRole("button", { name: "Upload & attach" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm rights & show on website" }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await page.getByLabel("Rights holder").fill("RENZ Construction Services Ltd (synthetic)");
    await page.getByRole("button", { name: "Confirm rights & show on website" }).click();
    await expect(
      page.locator(".media-card").getByText("Shown on the website", { exact: true }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // Review + publish.
    await page.getByRole("button", { name: "Overview" }).click();
    await page.getByRole("button", { name: "Mark factually reviewed" }).click();
    await expect(page.getByText(/Factually reviewed/u)).toBeVisible();
    await page.getByRole("button", { name: "Publication" }).click();
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Publish" }).click();
    await page.getByRole("button", { name: "Confirm publish" }).click();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

    // Public: route, index (13 tiles — the twelve seeded studies plus this one — no
    // overlap, filters), related service, home.
    const visitor = await page.context().newPage();
    await visitor.goto(`/projects/synthetic-owner-project-${uniqueSuffix}`);
    await expect(
      visitor.getByRole("heading", { level: 1, name: "SYNTHETIC OWNER PROJECT" }),
    ).toBeVisible();
    await expect(visitor.getByText("Concept study").first()).toBeVisible();
    await visitor.goto("/projects");
    const tiles = visitor.locator(".study-tile");
    await expect(tiles).toHaveCount(13);
    await expect(
      visitor.getByRole("button", { name: /Synthetic residential concept/u }),
    ).toBeVisible();
    // D1.7 rhythm grid: no tile overlaps another (rows may hold several tiles).
    const boxes = await tiles.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
          left: rect.left,
          right: rect.right,
        };
      }),
    );
    for (let index = 1; index < boxes.length; index += 1) {
      for (let other = 0; other < index; other += 1) {
        const a = boxes[index]!;
        const b = boxes[other]!;
        const overlaps =
          a.left < b.right - 1 &&
          a.right > b.left + 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1;
        expect(overlaps).toBe(false);
      }
    }
    await expectNoHorizontalOverflow(visitor);
    await visitor.setViewportSize({ width: 390, height: 844 });
    await visitor.goto("/projects");
    await expect(visitor.locator(".study-tile")).toHaveCount(13);
    await expectNoHorizontalOverflow(visitor);
    await visitor.setViewportSize({ width: 1440, height: 900 });
    await visitor.goto("/services/design");
    await expect(
      visitor.getByRole("link", { name: /SYNTHETIC OWNER PROJECT/u }).first(),
    ).toBeVisible();
    await visitor.goto("/");
    await expect(
      visitor.getByRole("link", { name: /SYNTHETIC OWNER PROJECT/u }).first(),
    ).toBeVisible();

    // Remove from Home but keep in Projects.
    await page.goto(projectUrl);
    await page.getByRole("button", { name: "Website placement" }).click();
    await page.getByRole("checkbox", { name: "Feature on Home" }).uncheck();
    await page.getByRole("button", { name: "Save placement" }).click();
    await expect(page.getByText("Website placement saved.")).toBeVisible();
    await page.getByRole("button", { name: "Publication" }).click();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Changes published as revision/u)).toBeVisible();
    await visitor.goto("/");
    await expect(visitor.getByRole("link", { name: /SYNTHETIC OWNER PROJECT/u })).toHaveCount(0);
    await visitor.goto("/projects");
    await expect(visitor.locator(".study-tile")).toHaveCount(13);

    // Unpublish removes it from the public site.
    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("button", { name: "Confirm unpublish" }).click();
    await expect(page.getByRole("button", { exact: true, name: "Publish" })).toBeVisible();
    await visitor.goto("/projects");
    await expect(visitor.locator(".study-tile")).toHaveCount(12);
    const gone = await visitor.goto(`/projects/synthetic-owner-project-${uniqueSuffix}`);
    expect(gone?.status()).toBe(404);
    await visitor.close();
  });

  test("Insight: write → review → publish → placed on the index → unpublish", async ({ page }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/content/insights/new");
    await page.getByLabel("Title").fill("SYNTHETIC INSIGHT ON CR1");
    await page.getByRole("textbox", { name: "Address" }).fill(`synthetic-insight-${uniqueSuffix}`);
    await page.getByRole("button", { name: "Create draft article" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/insights\/[0-9a-f-]{36}$/u);
    await page.getByLabel("Excerpt").fill("SYNTHETIC excerpt written from Admin.");
    await page
      .getByLabel("Article")
      .fill("## Why\n\nA **synthetic** article body with a [link](/services).\n\n- one\n- two");
    await page.getByLabel("Topic").fill("Before design");
    await page.getByLabel("Related service").selectOption({ label: "Design" });
    await page.getByLabel("Search title").fill("SYNTHETIC insight | Test");
    await page.getByLabel("Search description").fill("SYNTHETIC insight metadata for CR1.");
    await page.getByRole("checkbox", { name: /Pinned/u }).check();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Insight saved.")).toBeVisible();
    await page.getByRole("button", { name: "Mark as reviewed" }).click();
    await expect(page.getByText("Marked as reviewed.")).toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published. The article is on the website.")).toBeVisible();

    const visitor = await page.context().newPage();
    await visitor.goto("/insights");
    // Pinned → the featured story.
    await expect(visitor.locator(".insights-featured-card")).toContainText(
      "SYNTHETIC INSIGHT ON CR1",
    );
    await visitor.goto(`/insights/synthetic-insight-${uniqueSuffix}`);
    await expect(
      visitor.getByRole("heading", { level: 1, name: "SYNTHETIC INSIGHT ON CR1" }),
    ).toBeVisible();
    await expect(visitor.locator(".article-column strong")).toHaveText("synthetic");
    await expect(visitor.locator(".article-column a[href='/services']")).toBeVisible();

    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText(/^Unpublished\./u)).toBeVisible();
    await visitor.goto("/insights");
    await expect(visitor.getByText("SYNTHETIC INSIGHT ON CR1")).toHaveCount(0);
    await visitor.close();
  });

  test("Media library: upload, alt, focal point, rights, in-use protection", async ({ page }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/website/media");
    await page
      .getByLabel("File")
      .setInputFiles({ name: "synthetic-library.png", mimeType: "image/png", buffer: tinyPng() });
    await page.getByLabel("How RENZ holds the rights").selectOption("renz_provided");
    await page.getByLabel("Alt text (what the image shows)").fill("SYNTHETIC library image");
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/website\/media\/[0-9a-f-]{36}$/u, { timeout: 20_000 });
    const mediaId = page.url().split("/").pop() ?? "";
    await expect(page.getByText("Rights to confirm")).toBeVisible();
    await page.getByRole("button", { name: "Confirm rights" }).click();
    await expect(page.getByText("Rights confirmed.")).toBeVisible();

    // Use it as the About page social image, then archiving is blocked.
    await page.goto("/admin/website/pages");
    await page.getByRole("link", { name: "About", exact: true }).first().click();
    await page.getByRole("button", { name: "Page settings & SEO" }).click();
    await page.getByRole("button", { name: "Choose sharing image" }).click();
    await page.getByRole("button", { name: /SYNTHETIC library image/u }).click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Page settings saved.")).toBeVisible();
    await page.goto(`/admin/website/media/${mediaId}`);
    await expect(page.getByText("About", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Archive image" })).toBeDisabled();
  });

  test("Two sessions: a stale section save is refused, nothing overwritten", async ({
    browser,
    page,
  }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/website/pages");
    const pageId = await openHomeEditor(page);
    const other = await secondSession(browser, "superB", `/admin/website/pages/${pageId}`);
    await page.getByRole("button", { name: /Hero/u }).first().click();
    await other.page.getByRole("button", { name: /Hero/u }).first().click();
    // B starts editing FIRST, then A saves: B's unsaved edits survive the
    // realtime refresh and B's save must still be refused (C10 §31 — the
    // hidden version once advanced to A's and B overwrote A silently).
    await other.page.getByLabel("Summary").fill("SYNTHETIC stale summary from B");
    await page.getByLabel("Summary").fill("SYNTHETIC summary from A");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();
    await other.page.waitForTimeout(3_000);
    await expect(other.page.getByLabel("Summary")).toHaveValue("SYNTHETIC stale summary from B");
    await other.page.getByRole("button", { name: "Save section" }).click();
    await expect(other.page.getByText(/Another staff member/u)).toBeVisible();
    // A's version is what the server holds.
    await other.page.reload();
    await other.page.getByRole("button", { name: /Hero/u }).first().click();
    await expect(other.page.getByLabel("Summary")).toHaveValue("SYNTHETIC summary from A");
    await other.context.close();
  });

  test("Globals and footer: process steps reorder, footer statement, About copy", async ({
    page,
  }) => {
    const actor = fixtures().actors["superA"];
    if (!actor) throw new Error("Synthetic super admin missing.");
    await signInWithMfa(page, actor, "/admin/website/globals");
    await expect(page).toHaveURL(/\/admin\/website\/pages\/[0-9a-f-]{36}$/u);

    // Process steps: move the first step down; publish; the public rail follows.
    await page
      .getByRole("button", { name: /Process steps/u })
      .first()
      .click();
    const firstTitle = await page.getByLabel("Title").first().inputValue();
    await page.getByRole("button", { name: "Move step 1 down" }).click();
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Published as revision \d+\./u)).toBeVisible();
    const visitor = await page.context().newPage();
    await visitor.goto("/");
    // D1.7: the process ledger's index rail replaces the horizontal story rail.
    const rail = visitor.locator(".process-ledger-rail li");
    await expect(rail.nth(1)).toContainText(firstTitle);

    // Footer statement.
    await page.goto("/admin/website/footer");
    await page
      .getByRole("button", { name: /Footer options/u })
      .first()
      .click();
    await page.getByLabel("Statement").fill("SYNTHETIC footer statement from Admin.");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Published as revision \d+\./u)).toBeVisible();
    await visitor.goto("/about");
    await expect(visitor.locator(".site-footer-lede")).toHaveText(
      "SYNTHETIC footer statement from Admin.",
    );

    // About copy: the content page uses the same editor as Home.
    await page.goto("/admin/website/pages");
    await page.getByRole("link", { name: "About", exact: true }).first().click();
    await page.locator(".page-editor-section-select").nth(1).click();
    const heading = page.getByLabel("Heading").first();
    await heading.fill("SYNTHETIC about heading");
    await page.getByRole("button", { name: "Save section" }).click();
    await expect(
      page.getByText("Section saved. Changes stay private until you publish."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText(/Published as revision \d+\./u)).toBeVisible();
    await visitor.goto("/about");
    await expect(visitor.getByText("SYNTHETIC about heading")).toBeVisible();
    await visitor.close();
  });

  test("WhatsApp is green, messaging-only, and no tel: link exists publicly", async ({ page }) => {
    const green = "rgb(37, 211, 102)";
    for (const path of ["/", "/contact", "/start-a-project"]) {
      await page.goto(path);
      expect(await page.locator('a[href^="tel:"]').count()).toBe(0);
      const links = page.locator('a[href*="wa.me/"]');
      expect(await links.count()).toBeGreaterThan(0);
      for (const href of await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href") ?? ""),
      )) {
        expect(href.startsWith("https://wa.me/")).toBe(true);
      }
      await expect(page.locator(".floating-whatsapp")).toHaveCSS("background-color", green);
    }
    await page.goto("/contact");
    await expect(page.locator(".contact-route-whatsapp .whatsapp-glyph")).toHaveCSS(
      "color",
      "rgb(7, 94, 84)",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator(".public-menu-contact-whatsapp")).toHaveCSS("color", green);
  });
});
