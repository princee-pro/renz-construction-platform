import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { createDraft, fixtures, signInWithMfa } from "./support/session";

const screenshotRoot = ".playwright/screenshots";

async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

test.describe.serial("RENZ S5A administration", () => {
  test("keeps an AAL1 staff actor outside the workspace", async ({ page }) => {
    const actor = fixtures().actors["aal1"];
    if (!actor) throw new Error("Synthetic AAL1 actor was unavailable.");
    await page.goto("/admin/sign-in?next=%2Fadmin%2Fcontent%2Fservices");
    await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
    await page.getByLabel("Password").fill(actor.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    await page.goto("/admin/content/services");
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    await expect(page.getByRole("heading", { name: "Verify your authenticator" })).toBeVisible();
  });

  test("filters admin capability UI and fails a disabled session closed", async ({ page }) => {
    const data = fixtures();
    const actor = data.actors["admin"];
    if (!actor) throw new Error("Synthetic admin actor was unavailable.");
    await signInWithMfa(page, actor);
    const navigation = page.getByRole("navigation", { name: "Administration" });
    await expect(navigation).toContainText("Services");
    // C4: Clients / Projects (operational) / content Projects are real, implemented,
    // admin-authorized routes now. Capability filtering is proven instead by
    // the domains that remain unimplemented never appearing as dead items.
    await expect(navigation).toContainText("Clients");
    await expect(navigation).toContainText("Website");
    await expect(navigation).toContainText("Insights");
    await expect(navigation).toContainText("Leads");
    // C9 shipped Analytics and Notifications; nothing unimplemented remains as a dead item.
    await expect(navigation).toContainText("Analytics");
    await expect(navigation).toContainText("Notifications");
    await page.goto("/admin/content/services");
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
    await page.goto("/admin/content/services/not-a-uuid");
    await expect(
      page.getByRole("heading", { name: "This administration record is unavailable" }),
    ).toBeVisible();

    const operator = createClient(data.supabase.url, data.supabase.secretKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const disabled = await operator
      .from("profiles")
      .update({ account_status: "disabled", version: 3 })
      .eq("id", actor.id);
    expect(disabled.error).toBeNull();
    await page.goto("/admin/content/services");
    await expect(page).toHaveURL(/\/admin\/sign-in\?error=access/u);
  });

  test("completes the service lifecycle and rejects a two-actor stale save", async ({
    browser,
    page,
  }) => {
    const data = fixtures();
    const actorA = data.actors["superA"];
    const actorB = data.actors["superB"];
    if (!actorA || !actorB) throw new Error("Synthetic Super Admin actors were unavailable.");

    await signInWithMfa(page, actorA);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await scrollToTop(page);
    await page.screenshot({ path: `${screenshotRoot}/desktop-overview.png`, fullPage: true });

    const serviceId = await createDraft(page, "Lifecycle");
    await expect(page.getByText("Blocked", { exact: true })).toBeVisible();
    await scrollToTop(page);
    await page.screenshot({
      path: `${screenshotRoot}/desktop-readiness-blocked.png`,
      fullPage: true,
    });

    const serviceName = page.getByRole("textbox", { name: "Service name" });
    await serviceName.fill("");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft not saved")).toBeVisible();
    await page.getByRole("link", { name: "Enter a value." }).click();
    await expect(serviceName).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await serviceName.fill("SYNTHETIC S5A Lifecycle");

    await page
      .getByRole("textbox", { name: "Summary" })
      .fill("SYNTHETIC overview created solely for the S5A browser acceptance workflow.");
    await page.getByRole("textbox", { name: "Scope" }).fill("SYNTHETIC bounded scope");
    await page
      .getByRole("textbox", { name: "Deliverables" })
      .fill("SYNTHETIC bounded deliverables");
    await page.getByRole("textbox", { name: "Exclusions" }).fill("SYNTHETIC exclusions");
    await page
      .getByRole("textbox", { name: "Delivery wording" })
      .fill("SYNTHETIC bounded delivery wording");
    await page.getByRole("textbox", { name: "SEO title" }).fill("SYNTHETIC S5A Service | Test");
    await page
      .getByRole("textbox", { name: "SEO description" })
      .fill("SYNTHETIC search description used solely for browser acceptance.");
    await page.getByRole("button", { name: "Paragraph" }).click();
    await page
      .getByRole("textbox", { name: "Paragraph" })
      .fill("SYNTHETIC structured body content used only for S5A verification.");
    await page.getByRole("link", { name: "Back to register" }).click();
    await expect(page.getByRole("heading", { name: "Leave this editor?" })).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(serviceName).toHaveValue("SYNTHETIC S5A Lifecycle");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
    await scrollToTop(page);
    await page.screenshot({ path: `${screenshotRoot}/desktop-service-editor.png`, fullPage: true });

    await page.getByRole("button", { name: "Register evidence" }).click();
    await page
      .getByRole("textbox", { name: "Supported fact" })
      .fill("SYNTHETIC evidence supports this test-only service record.");
    await page.getByLabel("Source type").selectOption("internal_record");
    await page
      .getByRole("textbox", { name: "Source reference" })
      .fill("SYNTHETIC S5A browser evidence reference");
    await page.getByRole("button", { name: "Register as Unverified" }).click();
    await expect(
      page.getByText("SYNTHETIC evidence supports this test-only service record."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm verification" }).click();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();

    const preview = await page.getByRole("link", { name: "Private preview" }).getAttribute("href");
    expect(preview).not.toBeNull();
    await page.goto(preview ?? "");
    await expect(page.getByText("DRAFT PREVIEW / NOT PUBLIC")).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("id", "main-content");
    await expectNoSeriousAxeViolations(page);
    await page.goto(`/admin/content/services/${serviceId}?locale=en`);

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      path: `${screenshotRoot}/desktop-publish-confirmation.png`,
    });
    await page.getByRole("button", { name: "Confirm publish" }).click();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

    const projection = await fetch(
      `${data.supabase.url}/rest/v1/published_services?id=eq.${serviceId}&select=id,slug`,
      {
        cache: "no-store",
        headers: {
          apikey: data.supabase.anonymousKey,
          authorization: `Bearer ${data.supabase.anonymousKey}`,
        },
      },
    );
    expect(projection.ok).toBe(true);
    expect((await projection.json()) as unknown[]).toHaveLength(1);

    // /expertise/[slug] is now a permanent compatibility redirect to /services (see
    // src/features/services/content.ts dual-source note) and no longer renders
    // `published_services` rows directly; the REST projection checks above and below
    // are the authoritative publish/unpublish assertions for this record.
    const publishedRedirect = await page.goto("/expertise/synthetic-s5a-lifecycle");
    expect(publishedRedirect?.status()).toBe(200);
    await expect(page).toHaveURL(/\/services$/u);
    await page.goto(`/admin/content/services/${serviceId}?locale=en`);

    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("button", { name: "Confirm unpublish" }).click();
    await expect(page.getByText("Service returned to Draft.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { exact: true, name: "Publish" })).toBeVisible();
    const operator = createClient(data.supabase.url, data.supabase.secretKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const unpublishedBase = await operator
      .from("services")
      .select("publication_status,published_at,version")
      .eq("id", serviceId)
      .single();
    expect(unpublishedBase.error).toBeNull();
    expect(unpublishedBase.data).toMatchObject({
      publication_status: "draft",
      published_at: null,
    });
    const unpublishedProjection = await fetch(
      `${data.supabase.url}/rest/v1/published_services?id=eq.${serviceId}&select=id,slug`,
      {
        cache: "no-store",
        headers: {
          apikey: data.supabase.anonymousKey,
          authorization: `Bearer ${data.supabase.anonymousKey}`,
        },
      },
    );
    expect(unpublishedProjection.ok).toBe(true);
    expect((await unpublishedProjection.json()) as unknown[]).toHaveLength(0);
    const unpublishedResponse = await page.goto("/expertise/synthetic-s5a-lifecycle");
    expect(unpublishedResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/services$/u);
    await page.goto(`/admin/content/services/${serviceId}?locale=en`);
    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Confirm archive" }).click();
    await expect(page.locator(".status-badge", { hasText: "Archived" })).toBeVisible();

    await page.goto("/admin/content/services");
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
    await scrollToTop(page);
    await page.screenshot({ path: `${screenshotRoot}/desktop-services-list.png`, fullPage: true });

    const conflictId = await createDraft(page, "Conflict");
    const actorBContext = await browser.newContext();
    const actorBPage = await actorBContext.newPage();
    await signInWithMfa(actorBPage, actorB, `/admin/content/services/${conflictId}`);

    await page
      .getByRole("textbox", { name: "Summary" })
      .fill("SYNTHETIC authoritative update from Actor A.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();

    const actorBName = actorBPage.getByRole("textbox", { name: "Service name" });
    await actorBName.fill("SYNTHETIC preserved stale value from Actor B");
    await actorBPage.getByRole("button", { name: "Sign out" }).click();
    await expect(actorBPage.getByRole("heading", { name: "Leave this editor?" })).toBeVisible();
    await actorBPage.getByRole("button", { name: "Keep editing" }).click();
    await expect(actorBName).toHaveValue("SYNTHETIC preserved stale value from Actor B");
    await actorBPage.getByRole("button", { name: "Save draft" }).click();
    await expect(actorBPage.getByText("Newer version detected")).toBeVisible();
    await expect(actorBName).toHaveValue("SYNTHETIC preserved stale value from Actor B");
    await scrollToTop(actorBPage);
    await actorBPage.screenshot({
      path: `${screenshotRoot}/desktop-version-conflict.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Summary" })).toHaveValue(
      "SYNTHETIC authoritative update from Actor A.",
    );
    await actorBContext.close();
  });
});
