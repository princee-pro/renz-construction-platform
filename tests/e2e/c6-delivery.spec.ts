import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// C6 delivery browser acceptance (brief §137–§142).
//
// Serial: the contractor, assignment, supplier, material and purchase order
// created in the workflow tests are reused by the realtime, concurrency and
// responsive tests that follow. Every record is obviously synthetic; the
// global teardown resets the local database.

const screenshotRoot = ".playwright/screenshots/c6";
const clientName = "SYNTHETIC C6 BROWSER CLIENT";
const projectTitle = "SYNTHETIC C6 BROWSER PROJECT";
const contractorName = "SYNTHETIC C6 BROWSER MASON";
const supplierName = "SYNTHETIC C6 BROWSER CEMENT";
const materialName = "SYNTHETIC C6 Browser Cement 42.5N";

let projectId = "";
let contractorId = "";
let assignmentId = "";
let supplierId = "";
let orderId = "";
let orderNumber = "";
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

async function pickFromResults(page: Page, label: string, query: string, result: string) {
  await page.getByRole("textbox", { name: label }).fill(query);
  await page
    .locator(".client-picker-results button", { hasText: result })
    .first()
    .click({ timeout: 15_000 });
}

test.describe.serial("RENZ C6 delivery", () => {
  test("keeps an AAL1 staff actor out of Contractors and Procurement", async ({ page }) => {
    const actor = fixtures().actors["aal1"];
    if (!actor) throw new Error("Synthetic AAL1 actor was unavailable.");
    await page.goto("/admin/sign-in?next=%2Fadmin%2Foperations%2Fcontractors");
    await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
    await page.getByLabel("Password").fill(actor.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    for (const path of [
      "/admin/operations/contractors",
      "/admin/procurement/orders",
      "/admin/procurement/materials",
      "/admin/finance/contractor-payables",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    }
  });

  test("runs the contractor workflow: partner → project assignment → payments → rating", async ({
    page,
  }) => {
    const data = fixtures();
    const actor = data.actors["superA"];
    if (!actor) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actor, "/admin/operations/clients/new");

    // Fixtures through the real forms: client + project.
    await page.getByRole("textbox", { name: "Full name" }).fill(clientName);
    await page.getByRole("textbox", { name: "Email" }).fill("synthetic-c6-client@example.test");
    await page.getByRole("button", { name: "Create Client", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/clients\/[0-9a-f-]{36}$/u);
    await page.getByRole("link", { name: "Create Project" }).click();
    await page.getByRole("textbox", { name: "Project title" }).fill(projectTitle);
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/projects\/[0-9a-f-]{36}$/u);
    projectId = idFromUrl(page.url(), "projects");

    // Navigation carries the delivery side now.
    const navigation = page.getByRole("navigation", { name: "Administration" }).first();
    await expect(navigation.getByRole("link", { name: /Contractors/u })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Purchase Orders/u })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Contractor Payables/u })).toBeVisible();

    // Project → Contractors tab → empty state → Assign Contractor (project preselected).
    await page.getByRole("button", { name: "Contractors", exact: true }).click();
    await expect(page.getByText("No contractors assigned yet.")).toBeVisible();

    // Create the contractor through the register.
    await page.goto("/admin/operations/contractors");
    await expect(page.getByText("No contractors yet")).toBeVisible();
    await page.getByRole("link", { name: "Add the first contractor" }).click();
    await page.getByRole("textbox", { name: "Display name" }).fill(contractorName);
    await page.getByRole("textbox", { name: "Phone" }).fill("+250 780 000 777");
    await page.getByRole("checkbox", { name: "Masonry" }).check();
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("button", { name: "Create Contractor", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/contractors\/[0-9a-f-]{36}$/u);
    contractorId = idFromUrl(page.url(), "contractors");
    await expect(page.getByRole("heading", { name: contractorName, level: 1 })).toBeVisible();

    // Assign from the project side: contractor picked, project preselected.
    await page.goto(`/admin/operations/assignments/new?project=${projectId}`);
    await expect(page.getByRole("textbox", { name: "Project" })).toHaveValue(projectTitle);
    await pickFromResults(page, "Contractor", "SYNTHETIC C6 BROWSER", contractorName);
    await page.getByRole("textbox", { name: "Scope of work" }).fill("SYNTHETIC masonry works");
    await page.getByLabel("Rate type").selectOption("fixed_project");
    await page.getByRole("textbox", { name: /^Rate/u }).fill("950000");
    await page.getByRole("textbox", { name: "Currency" }).fill("RWF");
    await page.getByRole("textbox", { name: "Agreed amount" }).fill("950000");
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("button", { name: "Assign Contractor", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/assignments\/[0-9a-f-]{36}$/u);
    assignmentId = idFromUrl(page.url(), "assignments");
    await expect(page.locator(".page-header")).toContainText("Agreed RWF 950,000");
    await expect(page.locator(".page-header .status-badge", { hasText: "Planned" })).toBeVisible();

    // Activate, then pay 350000.
    await page.getByRole("button", { name: "Change Status", exact: true }).click();
    await page.getByLabel("New status").selectOption("active");
    await page.getByRole("button", { name: "Update status", exact: true }).click();
    await expect(page.locator(".page-header .status-badge", { hasText: "Active" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Record Payment", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Amount (RWF)" }).fill("350000");
    await page.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(page.locator(".page-header")).toContainText("Remaining RWF 600,000", {
      timeout: 15_000,
    });

    // Project Contractors tab shows committed / paid / remaining per currency.
    await page.goto(`/admin/operations/projects/${projectId}?tab=contractors`);
    await expect(page.getByText("RWF committed")).toBeVisible();
    await expect(page.locator(".relationship-finance-grid")).toContainText("RWF 950,000");
    await expect(page.locator(".relationship-finance-grid")).toContainText("RWF 350,000");
    await expect(page.locator(".relationship-finance-grid")).toContainText("RWF 600,000");
    await expect(page.getByRole("link", { name: contractorName })).toBeVisible();

    // Contractor Payables lists the assignment.
    await page.goto("/admin/finance/contractor-payables");
    await expect(page.locator(".payables-register")).toContainText(contractorName);
    await expect(page.locator(".payables-register")).toContainText("RWF 600,000");
    await expectNoSeriousAxeViolations(page);
  });

  test("propagates a contractor payment to another session, reverses it, completes and rates", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, `/admin/operations/assignments/${assignmentId}`);
    await expect(page.locator(".page-header")).toContainText("Remaining RWF 600,000");
    await expect(page.locator('[title="Live updates connected"]')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => {
      (window as unknown as { __c6NoReload: boolean }).__c6NoReload = true;
    });

    const other = await secondSession(
      browser,
      "superB",
      `/admin/operations/assignments/${assignmentId}`,
    );
    await other.page.getByRole("button", { name: "Record Payment", exact: true }).click();
    await other.page.getByRole("spinbutton", { name: "Amount (RWF)" }).fill("600000");
    await other.page.getByLabel("Method").selectOption("mobile_money");
    await other.page.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(other.page.locator(".page-header")).toContainText("Remaining RWF 0", {
      timeout: 15_000,
    });

    // Session A updates without a reload: remaining 0, Paid.
    await expect(page.locator(".page-header")).toContainText("Remaining RWF 0", {
      timeout: 20_000,
    });
    expect(
      await page.evaluate(
        () => (window as unknown as { __c6NoReload?: boolean }).__c6NoReload === true,
      ),
    ).toBe(true);
    await other.context.close();

    // Overpayment is refused once nothing remains: the button is gone.
    await expect(page.getByRole("button", { name: "Record Payment", exact: true })).toHaveCount(0);

    // Reverse the second payment → partially paid / 600,000 remaining.
    await page.getByRole("button", { name: "Payments", exact: true }).click();
    const secondPayment = page.locator(".payment-list > li", { hasText: "Mobile money" });
    await secondPayment.getByRole("button", { name: "Reverse", exact: true }).click();
    await secondPayment
      .getByRole("textbox", { name: "Reversal reason" })
      .fill("SYNTHETIC duplicate entry");
    await secondPayment.getByRole("button", { name: "Confirm reversal", exact: true }).click();
    await expect(page.locator(".page-header")).toContainText("Remaining RWF 600,000", {
      timeout: 15_000,
    });
    await expect(page.locator(".payment-list")).toContainText("Reversed");

    // Pay the remainder, complete, rate 5 with an accessible scale.
    await page.getByRole("button", { name: "Record Payment", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Amount (RWF)" }).fill("600000");
    await page.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(page.locator(".page-header")).toContainText("Remaining RWF 0", {
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Change Status", exact: true }).click();
    await page.getByLabel("New status").selectOption("completed");
    await page.getByRole("button", { name: "Update status", exact: true }).click();
    await expect(page.locator(".page-header .status-badge", { hasText: "Completed" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Rate Performance", exact: true }).click();
    await page.getByRole("radio", { name: "5 — Excellent" }).check();
    await page.getByRole("textbox", { name: "Note (optional)" }).fill("SYNTHETIC excellent finish");
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("button", { name: "Save rating", exact: true }).click();
    await page.getByRole("button", { name: "Performance", exact: true }).click();
    await expect(page.getByText("5 — Excellent")).toBeVisible({ timeout: 15_000 });

    // Contractor 360 shows the derived average and the milestone activity.
    await page.goto(`/admin/operations/contractors/${contractorId}`);
    await expect(page.locator(".admin-record-view .page-header")).toContainText("5 / 5");
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    for (const label of ["Assignment created", "Payment recorded", "Payment reversed"]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("runs the procurement workflow: supplier → material → requirement → PO → issue → deliveries", async ({
    page,
    browser,
  }) => {
    const data = fixtures();
    const actor = data.actors["superA"];
    if (!actor) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actor, "/admin/procurement/suppliers/new");

    await page.getByRole("textbox", { name: "Display name" }).fill(supplierName);
    await page.getByRole("textbox", { name: "Company name" }).fill("SYNTHETIC C6 CEMENT LTD");
    await page.getByRole("textbox", { name: "Email" }).fill("synthetic-c6-browser@example.test");
    await page.getByRole("button", { name: "Create Supplier", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/procurement\/suppliers\/[0-9a-f-]{36}$/u);
    supplierId = idFromUrl(page.url(), "suppliers");

    // Material with the preferred supplier.
    await page.goto("/admin/procurement/materials/new");
    await page.getByRole("textbox", { name: "Material name" }).fill(materialName);
    await page.getByLabel("Default unit").fill("bag");
    await page.getByRole("textbox", { name: "Internal code" }).fill("SYN-C6-BROWSER");
    await pickFromResults(
      page,
      "Preferred supplier (optional)",
      "SYNTHETIC C6 BROWSER",
      supplierName,
    );
    await page.getByRole("button", { name: "Create material", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/procurement\/materials\/[0-9a-f-]{36}$/u);
    await expect(page.getByRole("heading", { name: materialName, level: 1 })).toBeVisible();
    // Duplicate awareness on a second attempt with the same code.
    await page.goto("/admin/procurement/materials/new");
    await page.getByRole("textbox", { name: "Material name" }).fill("Another cement");
    await page.getByRole("textbox", { name: "Internal code" }).fill("syn-c6-browser");
    await expect(page.getByText("Possible existing materials")).toBeVisible({ timeout: 10_000 });

    // Requirement on the project (100 bags, approved), then Order → PO editor.
    await page.goto(`/admin/operations/projects/${projectId}?tab=procurement`);
    await page.getByRole("button", { name: "Add Requirement", exact: true }).click();
    await page.getByRole("textbox", { name: "Item" }).fill("SYNTHETIC cement");
    await page.getByRole("spinbutton", { name: "Required quantity" }).fill("100");
    await page.getByLabel("Unit", { exact: true }).fill("bag");
    await page.getByRole("button", { name: "Add requirement", exact: true }).click();
    await expect(page.locator(".requirement-list")).toContainText("SYNTHETIC cement", {
      timeout: 15_000,
    });
    await expect(page.locator(".requirement-list")).toContainText("Not ordered");
    await page.locator(".requirement-list").getByRole("link", { name: "Order" }).click();
    await expect(page).toHaveURL(/\/admin\/procurement\/orders\/new\?project=/u);

    // Editor: project locked, requirement pre-added; pick the supplier; 10% test tax.
    await expect(page.getByRole("textbox", { name: "Project" })).toHaveValue(projectTitle);
    await expect(page.locator(".po-line-requirement")).toContainText("SYNTHETIC cement");
    await expect(
      page.locator(".po-line-editor li").first().getByRole("textbox", { name: "Quantity" }),
    ).toHaveValue("100");
    await pickFromResults(page, "Supplier", "SYNTHETIC C6 BROWSER", supplierName);
    await page.getByRole("textbox", { name: "Currency" }).fill("RWF");
    await page.getByRole("textbox", { name: "Tax rate (%)" }).fill("10");
    await page
      .locator(".po-line-editor li")
      .first()
      .getByRole("textbox", { name: "Unit price" })
      .fill("10000");
    await expect(page.locator(".invoice-preview-totals")).toContainText("RWF 1,000,000");
    await expect(page.locator(".invoice-preview-totals")).toContainText("RWF 100,000");
    await expect(page.locator(".invoice-preview-totals")).toContainText("RWF 1,100,000");
    // Over-order needs confirmation before the draft can be saved.
    await page
      .locator(".po-line-editor li")
      .first()
      .getByRole("textbox", { name: "Quantity" })
      .fill("150");
    await expect(page.getByRole("button", { name: "Confirm over-orders to save" })).toBeDisabled();
    await page
      .locator(".po-line-editor li")
      .first()
      .getByRole("textbox", { name: "Quantity" })
      .fill("100");
    await expectNoSeriousAxeViolations(page);
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/procurement\/orders\/[0-9a-f-]{36}$/u);
    orderId = idFromUrl(page.url(), "orders");
    await expect(
      page.getByRole("heading", { name: "Draft purchase order", level: 1 }),
    ).toBeVisible();
    await expect(page.locator(".page-header")).toContainText("Total RWF 1,100,000");
    await expect(page.locator("#po-document-title")).toHaveText("DRAFT");

    // Issue: official RENZ-PO number, immutable afterwards.
    await page.getByRole("button", { name: "Issue Purchase Order", exact: true }).click();
    await page.getByRole("button", { name: "Confirm and issue", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^RENZ-PO-\d{4}-\d{6}$/u, {
      timeout: 15_000,
    });
    orderNumber = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
    await expect(page.getByRole("link", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(page.locator(".invoice-document")).toContainText(supplierName);
    await expect(page.locator(".invoice-document")).toContainText(projectTitle);
    await expect(page.locator(".invoice-document")).toContainText("Tax (10%)");
    await page.goto(`/admin/procurement/orders/${orderId}/edit`);
    await expect(page).toHaveURL(new RegExp(`/admin/procurement/orders/${orderId}$`, "u"));

    // Supplier link, opened anonymously; PDF; tampered token 404.
    await page.getByRole("button", { name: "Supplier link", exact: true }).click();
    await page.getByRole("button", { name: "Generate Supplier Link", exact: true }).click();
    const shareBox = page.locator(".share-link-box code");
    await expect(shareBox).toBeVisible({ timeout: 15_000 });
    shareUrl = (await shareBox.textContent()) ?? "";
    expect(shareUrl).toMatch(/\/po\/[A-Za-z0-9_-]{40,64}$/u);
    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(shareUrl);
    await expect(anonymousPage.getByRole("heading", { level: 1 })).toHaveText(orderNumber);
    await expect(anonymousPage.locator(".invoice-document")).toContainText("RWF 1,100,000");
    await expect(anonymousPage.getByRole("navigation", { name: "Administration" })).toHaveCount(0);
    await expect(anonymousPage.getByRole("button", { name: "Record Delivery" })).toHaveCount(0);
    await expectNoSeriousAxeViolations(anonymousPage);
    const anonymousPdf = await anonymousPage.request.get(`${shareUrl}/pdf`);
    expect(anonymousPdf.status()).toBe(200);
    expect((await anonymousPdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const tampered = await anonymousPage.request.get(`${shareUrl.slice(0, -2)}zz`);
    expect(tampered.status()).toBe(404);
    const anonymousAdmin = await anonymousPage.request.get(
      `/admin/procurement/orders/${orderId}/pdf`,
      { maxRedirects: 0 },
    );
    expect([302, 307, 401, 403, 404]).toContain(anonymousAdmin.status());
    await anonymousContext.close();
    const anonymous = createClient(data.supabase.url, data.supabase.anonymousKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    for (const table of ["trade_partners", "purchase_orders", "purchase_order_receipts"]) {
      const probe = await anonymous.from(table).select("id").limit(1);
      expect(probe.error !== null || (probe.data ?? []).length === 0).toBe(true);
    }

    // Deliveries: 40 bags; over-receipt refused client-side; staff PDF.
    await page.getByRole("button", { name: "Record Delivery", exact: true }).click();
    await page.getByRole("spinbutton", { name: /^Received/u }).fill("101");
    await expect(page.getByRole("button", { name: "Record delivery", exact: true })).toBeDisabled();
    await page.getByRole("spinbutton", { name: /^Received/u }).fill("40");
    await page.getByRole("textbox", { name: "Delivery reference" }).fill("SYNTHETIC DN-1");
    await page.getByRole("button", { name: "Record delivery", exact: true }).click();
    await expect(
      page.locator(".page-header .status-badge", { hasText: "Partially received" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".page-header")).toContainText("Received 40 / 100");
    const pdf = await page.request.get(`/admin/procurement/orders/${orderId}/pdf`);
    expect(pdf.status()).toBe(200);
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.headers()["content-disposition"]).toContain(`${orderNumber}.pdf`);
    expect(body.toString("latin1")).not.toContain("SYNTHETIC private");

    // Project Procurement tab: Required / Ordered / Received / Remaining.
    await page.goto(`/admin/operations/projects/${projectId}?tab=procurement`);
    const requirementRow = page.locator(".requirement-list > li", { hasText: "SYNTHETIC cement" });
    await expect(requirementRow).toContainText("Partially received");
    await expect(requirementRow.locator('[data-label="Ordered"]')).toHaveText("100");
    await expect(requirementRow.locator('[data-label="Received"]')).toHaveText("40");
    await expect(requirementRow.locator('[data-label="Remaining"]')).toHaveText("60");
    await expect(page.locator(".relationship-finance-grid")).toContainText("RWF 1,100,000");
    await expect(page.getByRole("link", { name: orderNumber })).toBeVisible();
    // Overview carries the cost/delivery position by currency, without profit.
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await expect(page.locator(".delivery-position-table")).toContainText("RWF 1,100,000");
    await expect(page.locator(".delivery-position-table")).toContainText("RWF 950,000");
    await expect(page.locator(".delivery-position-table")).not.toContainText(/profit|margin/iu);
  });

  test("propagates a delivery to another session, blocks a stale draft save, closes and verifies", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, `/admin/procurement/orders/${orderId}`);
    await expect(page.locator(".page-header")).toContainText("Received 40 / 100");
    await expect(page.locator('[title="Live updates connected"]')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => {
      (window as unknown as { __c6NoReload: boolean }).__c6NoReload = true;
    });

    const other = await secondSession(browser, "superB", `/admin/procurement/orders/${orderId}`);
    await other.page.getByRole("button", { name: "Record Delivery", exact: true }).click();
    await other.page.getByRole("button", { name: "All outstanding", exact: true }).click();
    await other.page.getByRole("button", { name: "Record delivery", exact: true }).click();
    await expect(
      other.page.locator(".page-header .status-badge", { hasText: /^Received$/u }),
    ).toBeVisible({ timeout: 15_000 });
    // Session A: Received 100 / 100 without a reload.
    await expect(page.locator(".page-header")).toContainText("Received 100 / 100", {
      timeout: 20_000,
    });
    expect(
      await page.evaluate(
        () => (window as unknown as { __c6NoReload?: boolean }).__c6NoReload === true,
      ),
    ).toBe(true);
    await expect(page.getByRole("button", { name: "Record Delivery", exact: true })).toHaveCount(0);
    await other.context.close();

    // Reverse the second receipt → partially received / 40; cancel refused with receipts.
    await page.getByRole("button", { name: "Deliveries", exact: true }).click();
    const receipts = page.locator(".payment-list > li");
    await expect(receipts).toHaveCount(2);
    const latest = receipts.filter({ hasNotText: "SYNTHETIC DN-1" }).first();
    await latest.getByRole("button", { name: "Reverse", exact: true }).click();
    await latest.getByRole("textbox", { name: "Reversal reason" }).fill("SYNTHETIC counted twice");
    await latest.getByRole("button", { name: "Confirm reversal", exact: true }).click();
    await expect(page.locator(".page-header")).toContainText("Received 40 / 100", {
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Cancel Order", exact: true })).toHaveCount(0);

    // Stale two-actor draft save on a fresh draft (supplier-first entry).
    await page.goto(`/admin/procurement/orders/new?supplier=${supplierId}`);
    await expect(page.getByRole("textbox", { name: "Supplier" })).toHaveValue(supplierName);
    // The picker is a controlled input: typing before hydration is discarded.
    await page.waitForLoadState("networkidle");
    await pickFromResults(page, "Project", "SYNTHETIC C6 BROWSER", projectTitle);
    await page.getByRole("textbox", { name: "Currency" }).fill("USD");
    const firstLine = page.locator(".po-line-editor li").first();
    await firstLine
      .getByRole("textbox", { name: /^Description/u })
      .fill("SYNTHETIC concurrency line");
    await firstLine.getByLabel("Unit", { exact: true }).fill("piece");
    await firstLine.getByRole("textbox", { name: "Unit price" }).fill("100");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/procurement\/orders\/[0-9a-f-]{36}$/u);
    const draftId = idFromUrl(page.url(), "orders");
    await page.goto(`/admin/procurement/orders/${draftId}/edit`);
    const editor = await secondSession(
      browser,
      "superB",
      `/admin/procurement/orders/${draftId}/edit`,
    );
    await page.getByRole("textbox", { name: "Reference" }).fill("SYNTHETIC-A");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/procurement/orders/${draftId}$`, "u"));
    const referenceB = editor.page.getByRole("textbox", { name: "Reference" });
    await referenceB.fill("SYNTHETIC-B-STALE");
    await editor.page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(editor.page.getByText(/saved changes to this draft first/u)).toBeVisible();
    await expect(referenceB).toHaveValue("SYNTHETIC-B-STALE");
    await editor.page.getByRole("button", { name: "Reload latest", exact: true }).first().click();
    await expect(editor.page.getByRole("textbox", { name: "Reference" })).toHaveValue(
      "SYNTHETIC-A",
      {
        timeout: 15_000,
      },
    );
    await editor.context.close();

    // Close the issued order with a reason; the supplier link shows CLOSED; then revoke.
    await page.goto(`/admin/procurement/orders/${orderId}`);
    await page.getByRole("button", { name: "Close Order", exact: true }).click();
    await page.getByRole("textbox", { name: "Reason" }).fill("SYNTHETIC short delivery accepted");
    await page.getByRole("button", { name: "Confirm close", exact: true }).click();
    await expect(page.locator(".page-header .status-badge", { hasText: /^Closed$/u })).toBeVisible({
      timeout: 15_000,
    });
    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(shareUrl);
    await expect(anonymousPage.locator(".invoice-status")).toContainText("CLOSED");
    await anonymousContext.close();
    await page.getByRole("button", { name: "Supplier link", exact: true }).click();
    await page.getByRole("button", { name: "Revoke Link", exact: true }).click();
    await expect(page.getByText("Supplier link not generated")).toBeVisible({ timeout: 15_000 });
    const revokedContext = await browser.newContext();
    const revokedPage = await revokedContext.newPage();
    const revoked = await revokedPage.request.get(shareUrl);
    expect(revoked.status()).toBe(404);
    await revokedContext.close();
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    for (const label of [
      "Purchase order created",
      "Purchase order issued",
      "Supplier link generated",
      "Delivery received",
      "Delivery receipt reversed",
      "Purchase order closed",
      "Supplier link revoked",
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    // Supplier 360 lists the order; capability upgrade offer for the contractor.
    await page.goto(`/admin/procurement/suppliers/${supplierId}`);
    await page.getByRole("button", { name: "Purchase orders", exact: true }).click();
    await expect(page.getByRole("link", { name: orderNumber })).toBeVisible();
    await page.goto(`/admin/operations/contractors/${contractorId}`);
    await page.getByRole("button", { name: "Add supplier capability", exact: true }).click();
    await expect(
      page.locator(".page-header .status-badge", { hasText: /^Supplier$/u }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Add supplier capability" })).toHaveCount(0);

    // Control Room delivery module + queue; Quick Find surfaces the PO and contractor.
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Contractors, orders & deliveries" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery action queue" })).toBeVisible();
    await page.keyboard.press("Control+k");
    const quickFind = page.getByRole("dialog", { name: "Quick find" });
    await quickFind
      .getByRole("textbox", { name: "Search clients, projects, and case studies" })
      .fill(orderNumber);
    await expect(quickFind.getByText("PURCHASE ORDER").first()).toBeVisible({ timeout: 10_000 });
    await quickFind
      .getByRole("textbox", { name: "Search clients, projects, and case studies" })
      .fill(contractorName);
    await expect(quickFind.getByText("CONTRACTOR").first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
  });

  test("lays out every delivery screen at 390 / 768 / 1440 (+320 and 200% zoom) without overflow", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, "/admin");
    const screens: readonly (readonly [string, string, string])[] = [
      ["overview", "/admin", "Delivery action queue"],
      ["contractors", "/admin/operations/contractors", contractorName],
      ["contractor", `/admin/operations/contractors/${contractorId}`, contractorName],
      ["assignment", `/admin/operations/assignments/${assignmentId}`, "SYNTHETIC masonry works"],
      ["assignment-new", `/admin/operations/assignments/new?project=${projectId}`, "Scope of work"],
      ["payables", "/admin/finance/contractor-payables", contractorName],
      ["materials", "/admin/procurement/materials", materialName],
      ["suppliers", "/admin/procurement/suppliers", supplierName],
      ["orders", "/admin/procurement/orders", orderNumber],
      ["order", `/admin/procurement/orders/${orderId}`, orderNumber],
      ["order-new", `/admin/procurement/orders/new?project=${projectId}`, "Order lines"],
      [
        "project-procurement",
        `/admin/operations/projects/${projectId}?tab=procurement`,
        "Material requirements",
      ],
      [
        "project-contractors",
        `/admin/operations/projects/${projectId}?tab=contractors`,
        "RWF committed",
      ],
      ["project-overview", `/admin/operations/projects/${projectId}`, "Cost & delivery position"],
      ["print", `/admin/procurement/orders/${orderId}/print`, orderNumber],
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
        `/admin/operations/assignments/${assignmentId}`,
        `/admin/procurement/orders/${orderId}`,
        `/admin/procurement/orders/new?project=${projectId}`,
        "/admin/finance/contractor-payables",
      ]) {
        await page.goto(path);
        await expect(page.locator("main[aria-busy='true']")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/procurement/orders/${orderId}`);
    await expectNoSeriousAxeViolations(page);
    await page.goto(`/admin/operations/assignments/${assignmentId}`);
    await expectNoSeriousAxeViolations(page);
    await page.goto("/admin/procurement/orders");
    await expectNoSeriousAxeViolations(page);
    void browser;
  });
});
