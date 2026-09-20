import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// C5 finance browser acceptance (brief §89–§93, §98–§100).
//
// Serial: the invoice created in the workflow test is reused by the realtime,
// concurrency, void, and responsive tests that follow. Every record is
// obviously synthetic; the global teardown resets the local database.

const screenshotRoot = ".playwright/screenshots/c5";
const clientName = "SYNTHETIC C5 BROWSER CLIENT";
const clientEmail = "synthetic-c5-browser@example.test";
const projectTitle = "SYNTHETIC C5 BROWSER PROJECT";

let clientId = "";
let projectId = "";
let invoiceId = "";
let invoiceNumber = "";
let shareUrl = "";

async function expectNoSeriousAxeViolations(page: Page) {
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

function idFromUrl(url: string, segment: string): string {
  const match = new RegExp(`/${segment}/([0-9a-f-]{36})`, "u").exec(url);
  if (!match?.[1]) throw new Error(`No ${segment} id in ${url}`);
  return match[1];
}

async function fillLine(
  page: Page,
  index: number,
  values: readonly [string, string, string, string],
) {
  const item = page.locator(".invoice-line-editor > li").nth(index);
  await item.getByRole("textbox", { name: /^Description/u }).fill(values[0]);
  await item.getByRole("textbox", { name: "Quantity", exact: true }).fill(values[1]);
  await item.getByRole("textbox", { name: "Unit", exact: true }).fill(values[2]);
  await item.getByRole("textbox", { name: "Unit price", exact: true }).fill(values[3]);
}

test.describe.serial("RENZ C5 finance", () => {
  test("keeps an AAL1 staff actor out of Finance", async ({ page }) => {
    const actor = fixtures().actors["aal1"];
    if (!actor) throw new Error("Synthetic AAL1 actor was unavailable.");
    await page.goto("/admin/sign-in?next=%2Fadmin%2Ffinance");
    await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
    await page.getByLabel("Password").fill(actor.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    await page.goto("/admin/finance/invoices");
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
  });

  test("runs the project-first invoice workflow: draft → issue → share → pay", async ({
    page,
    browser,
  }) => {
    const data = fixtures();
    const actor = data.actors["superA"];
    if (!actor) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actor, "/admin/operations/clients/new");

    // Fixtures through the real forms: client + project.
    await page.getByRole("textbox", { name: "Full name" }).fill(clientName);
    await page.getByRole("textbox", { name: "Email" }).fill(clientEmail);
    await page.getByRole("textbox", { name: "Phone" }).fill("+250 780 000 555");
    await page.getByRole("textbox", { name: "Company" }).fill("SYNTHETIC C5 Holdings");
    await page.getByRole("button", { name: "Create Client", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/clients\/[0-9a-f-]{36}$/u);
    clientId = idFromUrl(page.url(), "clients");
    await page.getByRole("link", { name: "Create Project" }).click();
    await page.getByRole("textbox", { name: "Project title" }).fill(projectTitle);
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/projects\/[0-9a-f-]{36}$/u);
    projectId = idFromUrl(page.url(), "projects");

    // Finance navigation exists now that Finance is real.
    const navigation = page.getByRole("navigation", { name: "Administration" }).first();
    await expect(navigation.getByRole("link", { name: /Invoices/u })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Analytics/u })).toHaveCount(1); // C9

    // Project → Invoices tab → Create Invoice (client + project preselected).
    await page.getByRole("button", { name: "Invoices", exact: true }).click();
    await expect(page.getByText("No invoices yet for this project.")).toBeVisible();
    await page.getByRole("link", { name: "Create Invoice" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/finance/invoices/new\\?project=${projectId}`, "u"),
    );
    await expect(page.getByRole("textbox", { name: "Client" })).toHaveValue(clientName);
    await expect(page.getByLabel("Operational project")).toHaveValue(projectId);

    await page.getByRole("textbox", { name: "Currency" }).fill("RWF");
    await page.getByRole("textbox", { name: "Tax rate (%)" }).fill("10");
    await fillLine(page, 0, ["Design coordination", "2", "service", "100000"]);
    await page.getByRole("button", { name: "+ Add item" }).click();
    await fillLine(page, 1, ["Site supervision", "3", "day", "50000"]);
    await expect(page.locator(".invoice-preview-totals")).toContainText("RWF 350,000");
    await expect(page.locator(".invoice-preview-totals")).toContainText("RWF 35,000");
    await expect(page.locator(".invoice-preview-totals")).toContainText("RWF 385,000");
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/finance\/invoices\/[0-9a-f-]{36}$/u);
    invoiceId = idFromUrl(page.url(), "invoices");

    // Draft: no number, document preview shows DRAFT, no share link.
    await expect(page.getByRole("heading", { name: "Draft invoice", level: 1 })).toBeVisible();
    await expect(page.locator("#invoice-document-title")).toHaveText("DRAFT — NOT ISSUED");
    await expect(page.locator(".page-header")).toContainText("Total RWF 385,000");
    await page.getByRole("button", { name: "Client link", exact: true }).click();
    await expect(
      page.getByText("Client links are generated once the invoice is issued."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Document", exact: true }).click();
    await expectNoSeriousAxeViolations(page);

    // Preview page renders the same document.
    await page.getByRole("link", { name: "Preview", exact: true }).click();
    await expect(page).toHaveURL(/\/print$/u);
    await expect(page.locator(".invoice-document")).toContainText("Design coordination");
    await page.goBack();

    // Issue with a due date preset.
    await page.getByRole("button", { name: "Issue Invoice", exact: true }).click();
    await page.getByRole("button", { name: "+14 days" }).click();
    await page.getByRole("button", { name: "Confirm and issue", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^RENZ-\d{4}-\d{6}$/u, {
      timeout: 15_000,
    });
    invoiceNumber = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
    await expect(page.getByRole("link", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Issue Invoice", exact: true })).toHaveCount(0);
    await expect(page.locator(".invoice-document")).toContainText(clientName);
    await expect(page.locator(".invoice-document")).toContainText("SYNTHETIC C5 Holdings");
    await expect(page.locator(".invoice-document")).toContainText(projectTitle);
    await expect(page.locator(".invoice-document")).toContainText("Tax (10%)");
    await expect(page.locator(".invoice-document")).not.toContainText("VAT");
    // Editing an issued invoice is refused at the route.
    await page.goto(`/admin/finance/invoices/${invoiceId}/edit`);
    await expect(page).toHaveURL(new RegExp(`/admin/finance/invoices/${invoiceId}$`, "u"));

    // Client link: generate, copy, and open anonymously.
    await page.getByRole("button", { name: "Client link", exact: true }).click();
    await page.getByRole("button", { name: "Generate Client Link", exact: true }).click();
    const shareBox = page.locator(".share-link-box code");
    await expect(shareBox).toBeVisible({ timeout: 15_000 });
    shareUrl = (await shareBox.textContent()) ?? "";
    expect(shareUrl).toMatch(/\/i\/[A-Za-z0-9_-]{40,64}$/u);
    await expect(page.getByRole("button", { name: "Copy Link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Email Invoice" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();

    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(shareUrl);
    await expect(anonymousPage.getByRole("heading", { level: 1 })).toHaveText(invoiceNumber);
    await expect(anonymousPage.locator(".invoice-document")).toContainText("RWF 385,000");
    await expect(anonymousPage.getByRole("navigation", { name: "Administration" })).toHaveCount(0);
    await expect(anonymousPage.getByRole("button", { name: "Record Payment" })).toHaveCount(0);
    await expectNoSeriousAxeViolations(anonymousPage);
    const anonymousPdf = await anonymousPage.request.get(`${shareUrl}/pdf`);
    expect(anonymousPdf.status()).toBe(200);
    expect(anonymousPdf.headers()["content-type"]).toContain("application/pdf");
    expect((await anonymousPdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const tampered = await anonymousPage.request.get(`${shareUrl.slice(0, -2)}zz`);
    expect(tampered.status()).toBe(404);
    const anonymousAdmin = await anonymousPage.request.get(
      `/admin/finance/invoices/${invoiceId}/pdf`,
    );
    expect([302, 307, 401, 403, 404]).toContain(anonymousAdmin.status());
    await anonymousContext.close();

    // Anonymous API surface stays closed.
    const anonymous = createClient(data.supabase.url, data.supabase.anonymousKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    for (const table of [
      "invoices",
      "invoice_line_items",
      "invoice_payments",
      "invoice_share_links",
    ]) {
      const probe = await anonymous.from(table).select("id").limit(1);
      expect(probe.error !== null || (probe.data ?? []).length === 0).toBe(true);
    }

    // Record a partial payment.
    await page.getByRole("button", { name: "Record Payment", exact: true }).click();
    await page.getByRole("textbox", { name: "Amount (RWF)" }).fill("100000");
    await expect(page.getByText("RWF 285,000").first()).toBeVisible();
    await page.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(
      page.locator(".page-header .status-badge", { hasText: "Partially paid" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".page-header")).toContainText("Balance RWF 285,000");
    await expect(page.locator(".page-header")).not.toContainText("Balance RWF 385,000");

    // Overpayment is refused.
    await page.getByRole("button", { name: "Record Payment", exact: true }).click();
    await page.getByRole("textbox", { name: "Amount (RWF)" }).fill("285001");
    await expect(page.getByRole("button", { name: "Record payment", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    // Staff PDF download.
    const pdf = await page.request.get(`/admin/finance/invoices/${invoiceId}/pdf`);
    expect(pdf.status()).toBe(200);
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.headers()["content-disposition"]).toContain(`${invoiceNumber}.pdf`);
    const pdfText = body.toString("latin1");
    expect(pdfText).not.toContain("SYNTHETIC private");
    expect((pdfText.match(/\/Type\s*\/Page[^s]/gu) ?? []).length).toBe(1);
  });

  test("propagates a payment to another session and completes the invoice", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, `/admin/finance/invoices/${invoiceId}`);
    await expect(page.locator(".page-header")).toContainText("Balance RWF 285,000");
    await expect(page.locator('[title="Live updates connected"]')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => {
      (window as unknown as { __c5NoReload: boolean }).__c5NoReload = true;
    });

    const other = await secondSession(browser, "superB", `/admin/finance/invoices/${invoiceId}`);
    await other.page.getByRole("button", { name: "Record Payment", exact: true }).click();
    await other.page.getByRole("textbox", { name: "Amount (RWF)" }).fill("285000");
    await other.page.getByLabel("Method").selectOption("mobile_money");
    await other.page.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(other.page.locator(".page-header .status-badge", { hasText: "Paid" })).toBeVisible(
      {
        timeout: 15_000,
      },
    );

    // Session A updates without a reload: Paid / balance 0.
    await expect(page.locator(".page-header .status-badge", { hasText: /^Paid$/u })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".page-header")).toContainText("Balance RWF 0");
    expect(
      await page.evaluate(
        () => (window as unknown as { __c5NoReload?: boolean }).__c5NoReload === true,
      ),
    ).toBe(true);

    // Finance overview reflects the payment live.
    await page.goto("/admin/finance");
    await expect(page.getByText("Paid in the last 30 days")).toBeVisible();
    await expect(page.locator(".realtime-status", { hasText: "Live" })).toBeVisible({
      timeout: 20_000,
    });
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.screenshot({ path: `${screenshotRoot}/1440-finance-overview.png`, fullPage: true });

    // Reverse the second payment from A → partially paid / 285,000.
    await page.goto(`/admin/finance/invoices/${invoiceId}`);
    await page.getByRole("button", { name: "Payments", exact: true }).click();
    const secondPayment = page.locator(".payment-list > li", { hasText: "Mobile money" });
    await secondPayment.getByRole("button", { name: "Reverse", exact: true }).click();
    await secondPayment
      .getByRole("textbox", { name: "Reversal reason" })
      .fill("SYNTHETIC duplicate entry");
    await secondPayment.getByRole("button", { name: "Confirm reversal", exact: true }).click();
    await expect(
      page.locator(".page-header .status-badge", { hasText: "Partially paid" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".page-header")).toContainText("Balance RWF 285,000");
    await expect(page.locator(".payment-list")).toContainText("Reversed");
    await expect(page.getByRole("link", { name: "Receipt" }).first()).toBeVisible();
    await other.context.close();
  });

  test("rejects a stale two-actor draft save and preserves the stale values", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, "/admin/finance/invoices/new");
    await page.goto(`/admin/finance/invoices/new?client=${clientId}`);
    await expect(page.getByRole("textbox", { name: "Client" })).toHaveValue(clientName);
    await page.getByRole("textbox", { name: "Currency" }).fill("USD");
    await fillLine(page, 0, ["SYNTHETIC concurrency line", "1", "item", "100"]);
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/finance\/invoices\/[0-9a-f-]{36}$/u);
    const draftId = idFromUrl(page.url(), "invoices");

    await page.goto(`/admin/finance/invoices/${draftId}/edit`);
    const other = await secondSession(browser, "superB", `/admin/finance/invoices/${draftId}/edit`);

    await page.getByRole("textbox", { name: "Reference" }).fill("SYNTHETIC-A");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/finance/invoices/${draftId}$`, "u"));

    const referenceB = other.page.getByRole("textbox", { name: "Reference" });
    await referenceB.fill("SYNTHETIC-B-STALE");
    await other.page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(other.page.getByText(/saved changes to this draft first/u)).toBeVisible();
    await expect(referenceB).toHaveValue("SYNTHETIC-B-STALE");
    await other.page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(other.page.getByText(/saved changes to this draft first/u)).toBeVisible();
    await other.page.getByRole("button", { name: "Reload latest", exact: true }).first().click();
    await expect(other.page.getByRole("textbox", { name: "Reference" })).toHaveValue(
      "SYNTHETIC-A",
      {
        timeout: 15_000,
      },
    );
    await other.context.close();

    // Archive the concurrency draft; it leaves the register.
    await page.getByRole("button", { name: "Archive Draft", exact: true }).click();
    await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
    await expect(page.getByText("This draft is archived.")).toBeVisible({ timeout: 15_000 });
  });

  test("voids the invoice after payments are reversed and verifies the shared link, then responsive", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, `/admin/finance/invoices/${invoiceId}`);

    // Void is refused while a payment is effective.
    await page.getByRole("button", { name: "Void Invoice", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Reason for voiding" })
      .fill("SYNTHETIC issued in error");
    await page.getByRole("button", { name: "Confirm void", exact: true }).click();
    await expect(page.getByText(/Reverse the recorded payments before voiding/u)).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    // Reverse the remaining payment, then void.
    await page.getByRole("button", { name: "Payments", exact: true }).click();
    const firstPayment = page.locator(".payment-list > li", { hasText: "Bank transfer" });
    await firstPayment.getByRole("button", { name: "Reverse", exact: true }).click();
    await firstPayment.getByRole("textbox", { name: "Reversal reason" }).fill("SYNTHETIC cleanup");
    await firstPayment.getByRole("button", { name: "Confirm reversal", exact: true }).click();
    await expect(page.locator(".page-header .status-badge", { hasText: /^Unpaid$/u })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Void Invoice", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Reason for voiding" })
      .fill("SYNTHETIC issued in error");
    await page.getByRole("button", { name: "Confirm void", exact: true }).click();
    await expect(page.locator(".page-header .status-badge", { hasText: /^Void$/u })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(invoiceNumber);
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    for (const label of [
      "Draft created",
      "Invoice issued",
      "Client link generated",
      "Payment recorded",
      "Invoice paid",
      "Payment reversed",
      "Invoice voided",
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    // The client link now shows an unambiguous VOID state.
    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(shareUrl);
    await expect(anonymousPage.getByRole("status")).toContainText("VOID");
    await expect(anonymousPage.locator(".invoice-document")).toContainText("Balance due");
    await anonymousContext.close();

    // Client 360 and project finance sections; activity milestones.
    await page.goto(`/admin/operations/clients/${clientId}`);
    await page.getByRole("button", { name: "Invoices", exact: true }).click();
    await expect(page.getByRole("link", { name: invoiceNumber })).toBeVisible();
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(page.getByText("Invoice issued").first()).toBeVisible();
    await page.goto(`/admin/operations/projects/${projectId}`);
    await page.getByRole("button", { name: "Invoices", exact: true }).click();
    await expect(page.getByRole("link", { name: invoiceNumber })).toBeVisible();

    // Filtered CSV export respects the filters and exposes no internal fields.
    const csv = await page.request.get(`/admin/finance/invoices/export?client=${clientId}`);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const csvText = await csv.text();
    expect(csvText).toContain("Invoice,Client,Project,Lifecycle,Status");
    expect(csvText).toContain(invoiceNumber);
    expect(csvText).not.toContain("SYNTHETIC concurrency line");
    expect(csvText).not.toContain("SYNTHETIC private");
    const anonymousCsv = await browser.newContext();
    const anonymousCsvPage = await anonymousCsv.newPage();
    const denied = await anonymousCsvPage.request.get("/admin/finance/invoices/export");
    expect(denied.status()).not.toBe(200);
    await anonymousCsv.close();

    // Quick Find surfaces the invoice.
    await page.keyboard.press("Control+k");
    const quickFind = page.getByRole("dialog", { name: "Quick find" });
    await quickFind
      .getByRole("textbox", { name: "Search clients, projects, and case studies" })
      .fill(invoiceNumber);
    await expect(quickFind.getByText("INVOICE").first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");

    // Responsive matrix.
    const screens: readonly (readonly [string, string, string])[] = [
      ["finance", "/admin/finance", "Outstanding by currency"],
      ["invoices", "/admin/finance/invoices?lifecycle=&archived=1", invoiceNumber],
      ["invoice", `/admin/finance/invoices/${invoiceId}`, invoiceNumber],
      ["invoice-new", `/admin/finance/invoices/new?client=${clientId}`, "Line items"],
      ["client-finance", `/admin/operations/clients/${clientId}`, clientName],
      ["print", `/admin/finance/invoices/${invoiceId}/print`, invoiceNumber],
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
      const sharedContext = await browser.newContext({ viewport: { width, height: 844 } });
      const sharedPage = await sharedContext.newPage();
      await sharedPage.goto(shareUrl);
      await expect(sharedPage.getByRole("heading", { level: 1 })).toHaveText(invoiceNumber);
      await expectNoHorizontalOverflow(sharedPage);
      await sharedPage.screenshot({
        path: `${screenshotRoot}/${width}-shared.png`,
        fullPage: true,
      });
      await sharedContext.close();
    }
    // 320px and 200% zoom (1440 ÷ 2 = 720px effective viewport) still lay out.
    for (const width of [320, 720]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of [
        `/admin/finance/invoices/new?client=${clientId}`,
        `/admin/finance/invoices/${invoiceId}`,
        "/admin/finance/invoices?archived=1",
      ]) {
        await page.goto(path);
        await expect(page.locator("main[aria-busy='true']")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
      }
      const narrowShared = await browser.newContext({ viewport: { width, height: 844 } });
      const narrowPage = await narrowShared.newPage();
      await narrowPage.goto(shareUrl);
      await expectNoHorizontalOverflow(narrowPage);
      await narrowShared.close();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/finance/invoices/new?client=${clientId}`);
    await expectNoSeriousAxeViolations(page);
    await page.goto(`/admin/finance/invoices/${invoiceId}`);
    await expectNoSeriousAxeViolations(page);
  });
});
