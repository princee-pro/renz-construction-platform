import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// C8 leads + real intake browser acceptance (brief §123–§137).
//
// Serial: anonymous project intake with a real upload → staff realtime arrival →
// Lead 360 handling → conversion chain → Won; service enquiry with preselection;
// material enquiry → deliberate requirement bridge (no purchase order); contact
// form; anti-abuse (rate limit, form session, upload security); privacy;
// two-staff realtime + conflict; responsive + accessibility. The global
// teardown resets the local database.

const screenshotRoot = ".playwright/screenshots/c8";
const visitorName = "SYNTHETIC C8 VISITOR";
const visitorEmail = "synthetic-c8-visitor@example.test";
const referencePattern = /RENZ-LEAD-\d{4}-\d{6}/u;

const tinyJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);
const tinyPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const tinyPdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

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

async function staffSession(browser: Browser, actorKey: string, next: string) {
  const actor = fixtures().actors[actorKey];
  if (!actor) throw new Error(`Synthetic actor ${actorKey} was unavailable.`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInWithMfa(page, actor, next);
  return { context, page };
}

async function formToken(page: Page): Promise<string> {
  await page.goto("/contact");
  const token = await page.locator('input[name="formToken"]').first().inputValue();
  expect(token).toMatch(/^\d+\.[0-9a-f]{32}\.[0-9a-f]{64}$/u);
  return token;
}

/** Forms refuse zero-time submissions; wait past the minimum interaction window. */
async function waitForInteractionWindow(page: Page) {
  await page.waitForTimeout(3_200);
}

async function acknowledgePrivacyAndSubmit(page: Page, buttonName: string) {
  await page.getByLabel(/I have read the/u).check();
  await waitForInteractionWindow(page);
  await page.getByRole("button", { name: buttonName, exact: true }).click();
}

test.describe.serial("RENZ C8 intake and leads", () => {
  test.setTimeout(240_000);
  let projectReference = "";
  let leadId = "";
  let attachmentUrl = "";

  test("anonymous Start-a-Project intake lands in Leads over realtime and is handled to Won", async ({
    page,
    browser,
  }) => {
    const staff = await staffSession(browser, "superA", "/admin/operations/leads");
    await expect(staff.page.getByRole("heading", { name: "Leads", level: 1 })).toBeVisible();
    await expect(staff.page.locator(".realtime-status")).toContainText(/Live|Updated/u, {
      timeout: 15_000,
    });

    // 1–2. Anonymous visitor, Design preselected from the service page.
    await page.goto("/services/design");
    await page
      .locator(".service-detail-cta")
      .getByRole("link", { name: "Start a Project" })
      .click();
    await expect(page).toHaveURL(/\/start-a-project\?service=design/u);
    await expect(page.getByRole("heading", { name: "What you need", level: 2 })).toBeFocused();
    await expect(page.getByRole("radio", { name: /^Design/u })).toBeChecked();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 3–4. Context.
    await expect(page.getByRole("heading", { name: "Your project", level: 2 })).toBeFocused();
    await page.getByRole("radio", { name: /^Residential/u }).check();
    await page.getByLabel("Where is the project?").fill("SYNTHETIC district");
    await page
      .getByLabel("What do you want to build?")
      .fill("SYNTHETIC two-storey family house with a garden studio.");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 5. Scale.
    await expect(page.getByRole("heading", { name: "Size", level: 2 })).toBeFocused();
    await page.getByLabel("Approximate floor area (m²)").fill("240");
    await page.getByLabel("Number of floors").fill("2");
    await page.getByRole("radio", { name: "Medium", exact: true }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 6. Parameters, including a budget range.
    await expect(page.getByRole("heading", { name: "Timing and budget", level: 2 })).toBeFocused();
    await page.getByRole("radio", { name: "Just an idea" }).check();
    await page.getByRole("radio", { name: "I have a range in mind" }).check();
    await page.getByLabel("Currency").selectOption("RWF");
    await page.getByRole("spinbutton", { name: "From (optional)" }).fill("50000000");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 7. Upload a tiny safe JPEG.
    await expect(page.getByRole("heading", { name: "Files", level: 2 })).toBeFocused();
    await page
      .getByLabel("Add site photos, sketches or drawings")
      .setInputFiles({ name: "synthetic-site.jpg", mimeType: "image/jpeg", buffer: tinyJpeg });
    await expect(page.getByRole("list", { name: "Attached files" })).toContainText(
      "synthetic-site.jpg",
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 8. Contact.
    await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeFocused();
    await page.locator("#fullName").fill(visitorName);
    await page.locator("#email").fill(visitorEmail);
    await page.locator("#phone").fill("+250 780 000 111");
    await page.getByRole("radio", { name: "WhatsApp", exact: true }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 9–11. Review, privacy, submit.
    await expect(page.getByRole("heading", { name: "Check and send", level: 2 })).toBeFocused();
    await expect(page.locator(".intake-review")).toContainText("Residential");
    await expect(page.locator(".intake-review")).toContainText("synthetic-site.jpg");
    await expect(page.locator(".intake-review")).toContainText("RWF from 50000000");
    await page.getByLabel(/I have read the/u).check();
    await waitForInteractionWindow(page);
    await page.getByRole("button", { name: "Submit project brief", exact: true }).click();

    // 12. Reference on the success page; WhatsApp continuation, no tel:.
    await expect(page).toHaveURL(/\/start-a-project\/success\?ref=RENZ-LEAD-/u, {
      timeout: 20_000,
    });
    const referenceText = await page.locator(".intake-reference code").innerText();
    expect(referenceText).toMatch(referencePattern);
    projectReference = referenceText;
    const whatsapp = page.getByRole("link", { name: "Continue on WhatsApp" });
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=.*RENZ-LEAD-/u);
    expect(await page.locator('a[href^="tel:"]').count()).toBe(0);
    await expectNoSeriousAxeViolations(page);
    await page.screenshot({ path: `${screenshotRoot}/1440-success.png`, fullPage: true });

    // 13. Staff register receives the lead without a manual reload.
    await expect(staff.page.getByText(projectReference)).toBeVisible({ timeout: 20_000 });
    await expect(staff.page.locator(".realtime-status")).toContainText("Updated just now");

    // 14–15. Lead 360; attachment is private (served only through the signed route).
    await staff.page
      .getByRole("link", { name: new RegExp(projectReference, "u") })
      .first()
      .click();
    await expect(staff.page).toHaveURL(/\/admin\/operations\/leads\/[0-9a-f-]{36}$/u);
    leadId = staff.page.url().split("/").at(-1) ?? "";
    await expect(staff.page.getByRole("heading", { level: 1 })).toContainText(visitorName);
    await staff.page.getByRole("button", { name: "Attachments (1)" }).click();
    await expect(staff.page.getByText("Quarantine · pending review")).toBeVisible();
    const preview = staff.page.getByRole("link", { name: "Preview" });
    attachmentUrl = (await preview.getAttribute("href")) ?? "";
    expect(attachmentUrl).toMatch(/^\/api\/leads\/attachments\/[0-9a-f-]{36}$/u);
    const anonymousFetch = await page.request.get(attachmentUrl, { maxRedirects: 0 });
    expect([401, 403, 404]).toContain(anonymousFetch.status());
    await staff.page.getByRole("button", { name: "Mark safe" }).click();
    await expect(staff.page.getByText("Marked safe", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // 16. Assign to self.
    await staff.page.getByRole("button", { name: "Assign to me" }).click();
    await expect(staff.page.getByText("Assigned to you.")).toBeVisible({ timeout: 15_000 });

    // 17. Log WhatsApp contact (and move to Contacted).
    await staff.page.getByRole("button", { name: "Contact", exact: true }).click();
    await staff.page.getByLabel("Type").selectOption("whatsapp");
    await staff.page.getByLabel("Short private note (optional)").fill("SYNTHETIC first message");
    await staff.page.getByRole("button", { name: "Log contact" }).click();
    await expect(staff.page.getByText("Contact logged and stage set to Contacted.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(staff.page.locator(".page-description .status-badge").first()).toHaveText(
      "Contacted",
    );

    // 18. Contacted → Qualified.
    await staff.page.getByRole("button", { name: "→ Qualified" }).click();
    await staff.page.getByRole("button", { name: "Confirm Qualified" }).click();
    await expect(staff.page.locator(".page-description .status-badge").first()).toHaveText(
      "Qualified",
      {
        timeout: 15_000,
      },
    );
    await expect(staff.page.getByRole("button", { name: "Mark Won" })).toBeDisabled();

    // 19. Convert to a new client.
    await staff.page.getByRole("button", { name: "Conversion" }).click();
    await staff.page.getByRole("radio", { name: "Create a client from this lead" }).check();
    await expect(staff.page.getByLabel("Client name")).toHaveValue(visitorName);
    await staff.page.getByRole("button", { name: "Create client from lead" }).click();
    // The conversion panel re-renders as "Linked" once the client exists.
    await expect(
      staff.page.locator(".lead-conversion").getByRole("link", { name: visitorName, exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });

    // 20. Create the operational project (staff choose the phase).
    await staff.page.getByLabel("Starting phase").selectOption("design");
    await staff.page.getByRole("button", { name: "Create operational project" }).click();
    const projectLink = staff.page
      .locator(".lead-conversion")
      .getByRole("link", { name: /Residential for SYNTHETIC C8 VISITOR/u });
    await expect(projectLink).toBeVisible({ timeout: 15_000 });
    const projectHref = (await projectLink.getAttribute("href")) ?? "";

    // 21–22. Client 360 and project carry the relationship both ways.
    const clientHref =
      (await staff.page
        .getByRole("link", { name: visitorName, exact: true })
        .getAttribute("href")) ?? "";
    await staff.page.goto(clientHref);
    await expect(staff.page.getByText("Originating leads")).toBeVisible();
    await expect(staff.page.getByRole("link", { name: projectReference })).toBeVisible();
    await staff.page.goto(projectHref);
    await expect(staff.page.getByText(/From lead/u)).toBeVisible();
    await expect(staff.page.getByRole("link", { name: projectReference })).toBeVisible();

    // 23–24. Mark Won; history preserved.
    await staff.page.goto(`/admin/operations/leads/${leadId}`);
    await staff.page.getByRole("button", { name: "Mark Won" }).click();
    await staff.page.getByRole("button", { name: "Confirm Won" }).click();
    await expect(staff.page.locator(".page-description .status-badge").first()).toHaveText("Won", {
      timeout: 15_000,
    });
    await staff.page.getByRole("button", { name: "Activity" }).click();
    const timeline = staff.page.locator(".lead-timeline");
    await expect(timeline).toContainText("Lead submitted");
    await expect(timeline).toContainText("Assigned");
    await expect(timeline).toContainText("Contact logged: WhatsApp");
    await expect(timeline).toContainText("Stage: Qualified → Won");
    await expect(timeline).toContainText("Converted to client");
    await expect(timeline).toContainText("Operational project created");
    await expectNoSeriousAxeViolations(staff.page);
    await staff.page.screenshot({ path: `${screenshotRoot}/1440-lead-360.png`, fullPage: true });

    // 25. The public reference is not a credential.
    // C10: the proxy answers an anonymous staff route with a real 307 to
    // sign-in (no streamed shell); no lead data reaches the response.
    const anonymousRegister = await page.request.get(
      `/admin/operations/leads?q=${encodeURIComponent(projectReference)}`,
      { maxRedirects: 0 },
    );
    expect(anonymousRegister.status()).toBe(307);
    expect(anonymousRegister.headers()["location"]).toContain("/admin/sign-in");
    const anonymousBody = await anonymousRegister.text();
    expect(anonymousBody).not.toContain(visitorEmail);
    expect(anonymousBody).not.toContain(visitorName);
    await page.goto(`/admin/operations/leads?q=${encodeURIComponent(projectReference)}`);
    await expect(page).toHaveURL(/\/admin\/sign-in/u);
    const anonymousRpc = await page.request.post(
      `${fixtures().supabase.url}/rest/v1/rpc/admin_list_leads`,
      {
        headers: {
          apikey: fixtures().supabase.anonymousKey,
          Authorization: `Bearer ${fixtures().supabase.anonymousKey}`,
          "content-type": "application/json",
        },
        data: { search_query: projectReference },
      },
    );
    expect(anonymousRpc.ok()).toBe(false);
    await staff.context.close();
  });

  test("service enquiry preselects the service and arrives as a Service lead from the service page", async ({
    page,
    browser,
  }) => {
    await page.goto("/services/design");
    await page.getByRole("link", { name: "Enquire about this service" }).click();
    await expect(page).toHaveURL(/\/enquire\/service\?service=design$/u);
    await expect(page.locator("#serviceKey")).toHaveValue("design");
    await page.locator("#fullName").fill("SYNTHETIC C8 SERVICE VISITOR");
    await page.locator("#phone").fill("+44 7000 000 222");
    await page
      .locator("#requirement")
      .fill("SYNTHETIC design enquiry for a small clinic extension.");
    await acknowledgePrivacyAndSubmit(page, "Send service enquiry");
    const reference = await page.locator(".intake-reference code").innerText({ timeout: 20_000 });
    expect(reference).toMatch(referencePattern);

    const staff = await staffSession(browser, "admin", "/admin/operations/leads");
    await staff.page.goto("/admin/operations/leads?type=service");
    await expect(staff.page.getByText(reference)).toBeVisible();
    await staff.page
      .getByRole("link", { name: new RegExp(reference, "u") })
      .first()
      .click();
    await expect(staff.page.locator(".page-description")).toContainText("Service page");
    await expect(staff.page.locator(".page-header .eyebrow")).toContainText("Service Enquiry");
    await staff.page.getByRole("button", { name: "Requirements" }).click();
    await expect(staff.page.locator(".definition-register")).toContainText("Design");
    await staff.context.close();
  });

  test("material enquiry becomes draft material requirements deliberately, never a purchase order", async ({
    page,
    browser,
  }) => {
    await page.goto("/enquire/materials");
    await page.locator("#item_0_description").fill("SYNTHETIC cement 42.5N");
    await page.locator("#item_0_quantity").fill("200");
    await page.locator("#item_0_unit").fill("bags");
    await page.locator("#item_1_description").fill("SYNTHETIC rebar 12mm");
    await page.locator("#item_1_quantity").fill("3");
    await page.locator("#item_1_unit").fill("tonnes");
    await page.locator("#fullName").fill("SYNTHETIC C8 MATERIAL VISITOR");
    await page.locator("#email").fill("synthetic-c8-material@example.test");
    await acknowledgePrivacyAndSubmit(page, "Send material enquiry");
    const reference = await page.locator(".intake-reference code").innerText({ timeout: 20_000 });
    expect(reference).toMatch(referencePattern);

    const staff = await staffSession(browser, "superA", "/admin/operations/leads");
    await staff.page.goto("/admin/operations/leads?type=material");
    await staff.page
      .getByRole("link", { name: new RegExp(reference, "u") })
      .first()
      .click();
    await staff.page.getByRole("button", { name: "Requirements" }).click();
    await expect(staff.page.locator(".lead-items-table")).toContainText("SYNTHETIC cement 42.5N");
    await expect(staff.page.locator(".lead-items-table")).toContainText("SYNTHETIC rebar 12mm");
    await staff.page.getByRole("button", { name: "Conversion" }).click();
    await staff.page.getByRole("radio", { name: "Create a client from this lead" }).check();
    await staff.page.getByRole("button", { name: "Create client from lead" }).click();
    await expect(staff.page.getByLabel("Starting phase")).toBeVisible({ timeout: 15_000 });
    await staff.page.getByLabel("Starting phase").selectOption("procurement");
    await staff.page.getByRole("button", { name: "Create operational project" }).click();
    await expect(staff.page.getByLabel("Include item 1")).toBeVisible({ timeout: 15_000 });
    await staff.page.getByLabel("Include item 1").check();
    await staff.page.getByRole("button", { name: "Create material requirements" }).click();
    await expect(staff.page.getByText(/1 material requirement created as drafts?/u)).toBeVisible({
      timeout: 15_000,
    });
    await expect(staff.page.getByText("No purchase order was created.")).toBeVisible();
    await staff.page.goto("/admin/procurement/orders");
    await expect(staff.page.getByText(/No purchase orders/u).first()).toBeVisible();
    await staff.context.close();
  });

  test("contact form creates a General lead from website_contact with no fabricated project data, seen live by staff", async ({
    page,
    browser,
  }) => {
    const staff = await staffSession(browser, "admin", "/admin");
    await page.goto("/contact");
    await page.locator("#fullName").fill("SYNTHETIC C8 CONTACT VISITOR");
    await page.locator("#email").fill("synthetic-c8-contact@example.test");
    await page.locator("#subject").fill("SYNTHETIC hello");
    await page.locator("#message").fill("SYNTHETIC general question about working with RENZ.");
    await acknowledgePrivacyAndSubmit(page, "Send enquiry");
    const reference = await page.locator(".intake-reference code").innerText({ timeout: 20_000 });
    expect(reference).toMatch(referencePattern);
    await expect(staff.page.getByText(reference).first()).toBeVisible({ timeout: 20_000 });
    await staff.page
      .getByRole("link", { name: new RegExp(reference, "u") })
      .first()
      .click();
    await expect(staff.page.locator(".page-header .eyebrow")).toContainText("General Enquiry");
    await expect(staff.page.locator(".page-description")).toContainText("Website contact");
    await staff.page.getByRole("button", { name: "Requirements" }).click();
    await expect(
      staff.page.getByText("A general enquiry carries no structured requirements"),
    ).toBeVisible();
    await staff.context.close();
  });

  test("anti-abuse: rate limit, form session and upload security refuse what they should", async ({
    page,
  }) => {
    // Upload security through the public route with a live form token.
    const token = await formToken(page);
    const upload = (
      name: string,
      mimeType: string,
      buffer: Buffer,
      extra: Record<string, string> = {},
    ) =>
      page.request.post("/api/intake/uploads", {
        multipart: { file: { name, mimeType, buffer }, formToken: token, ...extra },
      });
    const jpeg = await upload("ok.jpg", "image/jpeg", tinyJpeg);
    expect(jpeg.status()).toBe(201);
    const session = (await jpeg.json()) as { sessionId: string; sessionToken: string };
    const png = await upload("ok.png", "image/png", tinyPng, {
      sessionId: session.sessionId,
      sessionToken: session.sessionToken,
    });
    expect(png.status()).toBe(201);
    expect(
      (
        await upload("evil.svg", "image/svg+xml", Buffer.from("<svg onload=alert(1)></svg>"))
      ).status(),
    ).toBe(422);
    expect(
      (
        await upload(
          "evil.jpg",
          "image/jpeg",
          Buffer.from("<html><script>alert(1)</script></html>"),
        )
      ).status(),
    ).toBe(422);
    expect((await upload("spoof.png", "image/png", tinyJpeg)).status()).toBe(201); // signature wins over the declared type
    expect((await upload("brief.pdf", "application/pdf", tinyPdf)).status()).toBe(422); // images-only launch policy
    expect(
      (
        await upload(
          "huge.jpg",
          "image/jpeg",
          Buffer.concat([tinyJpeg, Buffer.alloc(11 * 1024 * 1024)]),
        )
      ).status(),
    ).toBe(413);
    const foreign = await page.request.post("/api/intake/uploads", {
      multipart: {
        file: { name: "b.jpg", mimeType: "image/jpeg", buffer: tinyJpeg },
        formToken: token,
        sessionId: session.sessionId,
        sessionToken: "f".repeat(64),
      },
    });
    expect(foreign.status()).toBe(403);
    for (let index = 0; index < 3; index += 1) {
      const more = await upload(`more-${index}.jpg`, "image/jpeg", tinyJpeg, {
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
      });
      expect(more.status()).toBe(201);
    }
    const sixth = await upload("sixth.jpg", "image/jpeg", tinyJpeg, {
      sessionId: session.sessionId,
      sessionToken: session.sessionToken,
    });
    expect(sixth.status()).toBe(409);
    expect(
      (
        await page.request.post("/api/intake/uploads", {
          multipart: {
            file: { name: "x.jpg", mimeType: "image/jpeg", buffer: tinyJpeg },
            formToken: "not-a-token",
          },
        })
      ).status(),
    ).toBe(400);
    const crossOrigin = await page.request.post("/api/intake/uploads", {
      headers: { origin: "https://evil.example" },
      multipart: {
        file: { name: "x.jpg", mimeType: "image/jpeg", buffer: tinyJpeg },
        formToken: token,
      },
    });
    expect(crossOrigin.status()).toBe(403);

    // Zero-time submission refused; entered values stay in the form.
    await page.goto("/contact");
    await page.locator("#fullName").fill("SYNTHETIC FAST");
    await page.locator("#email").fill("synthetic-fast@example.test");
    await page.locator("#subject").fill("Fast");
    await page.locator("#message").fill("SYNTHETIC zero-time submission attempt.");
    await page.getByLabel(/I have read the/u).check();
    await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
    await expect(page.getByText(/That was quick/u)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#fullName")).toHaveValue("SYNTHETIC FAST");

    // Rate limit: contact allows 5 per hour per identity (one was used by the
    // contact-form test above); the sixth is refused with a fallback.
    for (let index = 0; index < 4; index += 1) {
      await page.goto("/contact");
      await page.locator("#fullName").fill(`SYNTHETIC RATE ${index}`);
      await page.locator("#email").fill(`synthetic-rate-${index}@example.test`);
      await page.locator("#subject").fill("Rate");
      await page.locator("#message").fill("SYNTHETIC rate limit probe message.");
      await acknowledgePrivacyAndSubmit(page, "Send enquiry");
      await expect(page.locator(".intake-reference code")).toBeVisible({ timeout: 20_000 });
    }
    await page.goto("/contact");
    await page.locator("#fullName").fill("SYNTHETIC RATE 6");
    await page.locator("#email").fill("synthetic-rate-6@example.test");
    await page.locator("#subject").fill("Rate");
    await page.locator("#message").fill("SYNTHETIC rate limit probe message.");
    await acknowledgePrivacyAndSubmit(page, "Send enquiry");
    await expect(page.getByText(/sent several enquiries recently/u)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator(".intake-fallback").getByRole("link", { name: "Message on WhatsApp" }),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\//u);
    await expect(
      page.locator(".intake-fallback").getByRole("link", { name: /Email RENZ/u }),
    ).toHaveAttribute("href", /^mailto:/u);
    expect(await page.content()).not.toMatch(/identity_hash|203\.0\.113|x-forwarded-for/u);
    await expectNoSeriousAxeViolations(page);
  });

  test("privacy: no lead data or lead routes on the public surface", async ({ page }) => {
    const sitemap = await page.request.get("/sitemap.xml");
    const sitemapText = await sitemap.text();
    expect(sitemapText).not.toMatch(/leads|RENZ-LEAD|intake/u);
    const robots = await (await page.request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow");
    for (const path of ["/admin/operations/leads", `/admin/operations/leads/${leadId}`]) {
      const response = await page.request.get(path);
      expect(await response.text()).not.toContain(visitorEmail);
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/sign-in/u);
    }
    await page.goto("/contact");
    await expect(page.getByLabel(/I have read the/u)).not.toBeChecked();
    expect(await page.getByLabel(/marketing/iu).count()).toBe(0);
    await page.goto("/privacy");
    await expect(page.locator("main")).not.toContainText(visitorEmail);
  });

  test("two staff: realtime arrival on Lead 360 and a stale edit is refused", async ({
    browser,
  }) => {
    const a = await staffSession(browser, "superA", `/admin/operations/leads/${leadId}`);
    const b = await staffSession(browser, "admin", `/admin/operations/leads/${leadId}`);
    await expect(a.page.locator(".realtime-dot")).toBeVisible({ timeout: 15_000 });
    await a.page.getByRole("button", { name: "Edit", exact: true }).click();
    await a.page.getByLabel("Summary").fill("SYNTHETIC A edit in progress");

    await b.page.getByRole("button", { name: "Notes" }).click();
    await b.page.getByLabel("New note").fill("SYNTHETIC B note");
    await b.page.getByRole("button", { name: "Add note" }).click();
    await expect(b.page.getByText("Note added.")).toBeVisible({ timeout: 15_000 });
    await b.page.getByRole("button", { name: "Edit", exact: true }).click();
    await b.page.getByLabel("Summary").fill("SYNTHETIC B saved first");
    await b.page.getByRole("button", { name: "Save changes" }).click();
    // A successful save closes B's edit form.
    await expect(b.page.getByLabel("Summary")).toHaveCount(0, { timeout: 15_000 });

    // A's open form is refreshed underneath (realtime pointer → router refresh)
    // but keeps A's typed values and shows the outdated cue.
    await expect(a.page.getByLabel("Summary")).toHaveValue("SYNTHETIC A edit in progress");
    await expect(a.page.getByText(/updated this lead while you were editing/u)).toBeVisible({
      timeout: 20_000,
    });
    await a.page.getByRole("button", { name: "Save changes" }).click();
    await expect(a.page.getByText(/Another staff member changed this lead first/u)).toBeVisible({
      timeout: 15_000,
    });
    await expect(a.page.getByLabel("Summary")).toHaveValue("SYNTHETIC A edit in progress");
    await a.context.close();
    await b.context.close();
  });

  test("lays out intake and lead screens at 390 / 768 / 1440 (+320, 200%) with axe passing", async ({
    page,
    browser,
  }) => {
    const publicRoutes = [
      "/contact",
      "/enquire/service?service=design",
      "/enquire/materials",
      "/start-a-project",
    ];
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const route of publicRoutes) {
        await page.goto(route);
        await expectNoHorizontalOverflow(page);
        await expectNoSeriousAxeViolations(page);
        await page.screenshot({
          path: `${screenshotRoot}/${width}-${route.replace(/[^a-z]+/gu, "-")}.png`,
          fullPage: true,
        });
      }
      // Every wizard step at this width.
      await page.goto("/start-a-project?service=design&project_type=residential");
      // The previous width's walk-through left a refresh-recovery draft; start clean.
      // Clear it only once the wizard has hydrated (it rewrites the draft on mount),
      // so the reload genuinely starts at step 1.
      await page.waitForSelector("#site-top[data-motion]");
      await page.evaluate(() => sessionStorage.removeItem("renz-start-a-project-draft-v1"));
      await page.reload();
      const continueButton = page.getByRole("button", { name: "Continue", exact: true });
      const checkStep = async (step: string) => {
        await expect(page.getByRole("heading", { name: step, level: 2 })).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectNoSeriousAxeViolations(page);
      };
      await checkStep("What you need");
      await continueButton.click();
      await checkStep("Your project");
      await page
        .getByLabel("What do you want to build?")
        .fill("SYNTHETIC responsive walk-through.");
      await continueButton.click();
      await checkStep("Size");
      await continueButton.click();
      await checkStep("Timing and budget");
      await continueButton.click();
      await checkStep("Files");
      await continueButton.click();
      await checkStep("Your details");
      await page.locator("#fullName").fill(visitorName);
      await page.locator("#email").fill(visitorEmail);
      await continueButton.click();
      await checkStep("Check and send");
      await page.screenshot({ path: `${screenshotRoot}/${width}-review.png`, fullPage: true });
    }
    // The last walk-through left a draft at the review step; the 320 / 200% checks start clean.
    await page.evaluate(() => sessionStorage.removeItem("renz-start-a-project-draft-v1"));
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/start-a-project");
    await expect(page.getByRole("heading", { name: "What you need", level: 2 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto("/enquire/materials");
    await expectNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/start-a-project");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(page.getByRole("heading", { name: "What you need", level: 2 })).toBeVisible();

    const staff = await staffSession(browser, "superA", "/admin/operations/leads");
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1440, 900],
    ] as const) {
      await staff.page.setViewportSize({ width, height });
      for (const route of [
        "/admin/operations/leads",
        "/admin/operations/leads?view=pipeline",
        `/admin/operations/leads/${leadId}`,
        "/admin",
      ]) {
        await staff.page.goto(route);
        await expect(staff.page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(staff.page);
        await expectNoSeriousAxeViolations(staff.page);
        await staff.page.screenshot({
          path: `${screenshotRoot}/${width}-${route.replace(/[^a-z]+/gu, "-")}.png`,
          fullPage: true,
        });
      }
    }
    await staff.context.close();
  });
});
