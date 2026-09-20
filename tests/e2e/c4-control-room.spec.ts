import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// C4 Control Room browser acceptance (brief §63, §65, §66, §67).
//
// One serial file so the synthetic client/project created in the workflow
// test is reused by the realtime, concurrency, and responsive tests that
// follow. Every record is obviously synthetic; the global teardown resets
// the local database.

const screenshotRoot = ".playwright/screenshots/c4";
const clientName = "SYNTHETIC C4 BROWSER CLIENT";
const clientEmail = "synthetic-c4-browser@example.test";
const clientPhone = "+250 780 000 777";
const projectTitle = "SYNTHETIC C4 BROWSER PROJECT";
const caseStudyTitle = "SYNTHETIC C4 BROWSER CASE STUDY";
const caseStudySlug = "synthetic-c4-browser-case-study";

let clientId = "";
let projectId = "";
let caseStudyId = "";

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

async function waitForLive(page: Page) {
  // The registers/Overview render a "Live" status once the realtime channel
  // is SUBSCRIBED; record pages render the dot with a title instead.
  await expect(
    page.locator('.realtime-status:has-text("Live"), [title="Live updates connected"]').first(),
  ).toBeVisible({ timeout: 20_000 });
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

test.describe.serial("RENZ C4 control room", () => {
  test("keeps an AAL1 staff actor out of the operations workspace", async ({ page }) => {
    const actor = fixtures().actors["aal1"];
    if (!actor) throw new Error("Synthetic AAL1 actor was unavailable.");
    await page.goto("/admin/sign-in?next=%2Fadmin%2Foperations%2Fclients");
    await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
    await page.getByLabel("Password").fill(actor.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    await page.goto("/admin/operations/clients");
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
    await page.goto("/admin/operations/projects");
    await expect(page).toHaveURL(/\/admin\/mfa(?:\?|$)/u);
  });

  test("runs the client → project → case-study workflow end to end", async ({ page }) => {
    const data = fixtures();
    const actor = data.actors["superA"];
    if (!actor) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actor, "/admin/operations/clients");

    // Clients register (empty state or populated) and navigation IA.
    await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Administration" }).first();
    await expect(navigation.getByText("Operations")).toBeVisible();
    // CR1: the content register is "Projects" under Website (alongside operational Projects).
    await expect(navigation.getByRole("link", { name: "Projects", exact: true })).toHaveCount(2);
    await expect(navigation.getByRole("link", { name: "Website", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Payments/u })).toHaveCount(0);
    // Leads (C8) sits above Clients in Operations; Analytics (C9) lives in the Overview group.
    await expect(navigation.getByRole("link", { name: /Leads/u })).toBeVisible();
    await expect(navigation.getByRole("link", { name: /Analytics/u })).toHaveCount(1);
    await expectNoSeriousAxeViolations(page);

    // Create the client (VIP, email + phone) and land on Client 360.
    await page.getByRole("link", { name: "New client" }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/clients\/new$/u);
    await page.getByRole("textbox", { name: "Full name" }).fill(clientName);
    await page.getByLabel("Client tier").selectOption("vip");
    await page.getByRole("textbox", { name: "Email" }).fill(clientEmail);
    await page.getByRole("textbox", { name: "Phone" }).fill(clientPhone);
    await page.getByRole("textbox", { name: "Company" }).fill("SYNTHETIC C4 Holdings");
    await page.getByRole("textbox", { name: "Initial note" }).fill("SYNTHETIC first contact note.");
    await page.getByRole("button", { name: "Create Client", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/clients\/[0-9a-f-]{36}$/u);
    clientId = idFromUrl(page.url(), "clients");
    await expect(page.getByRole("heading", { name: clientName, level: 1 })).toBeVisible();
    await expect(page.locator(".status-badge", { hasText: /^VIP$/u }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy phone" })).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);

    // Duplicate awareness: a second "new client" with the same email surfaces
    // the existing record without blocking.
    await page.goto("/admin/operations/clients/new");
    await page.getByRole("textbox", { name: "Full name" }).fill("SYNTHETIC C4 DUPLICATE PROBE");
    await page.getByRole("textbox", { name: "Email" }).fill(clientEmail);
    await expect(page.getByText("Possible existing clients")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(clientName).first()).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/clients$/u);

    // Create the project from Client 360 (client preselected).
    await page.goto(`/admin/operations/clients/${clientId}`);
    await page.getByRole("link", { name: "Create Project" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/operations/projects/new\\?client=${clientId}`, "u"),
    );
    await expect(page.getByRole("textbox", { name: "Client" })).toHaveValue(clientName);
    await page.getByRole("textbox", { name: "Project title" }).fill(projectTitle);
    await page.getByLabel("Status").selectOption("planning");
    await page.getByLabel("Phase").selectOption("design");
    await page.getByLabel("Priority").selectOption("high");
    await page.getByLabel("Start date").fill("2026-10-01");
    await page.getByLabel("End date").fill("2027-03-31");
    await page.getByRole("textbox", { name: "Budget amount" }).fill("125000000");
    await page.getByRole("textbox", { name: "Budget currency" }).fill("rwf");
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/projects\/[0-9a-f-]{36}$/u);
    projectId = idFromUrl(page.url(), "projects");
    await expect(page.getByRole("heading", { name: projectTitle, level: 1 })).toBeVisible();
    const header = page.locator(".page-header");
    await expect(header.locator(".status-badge", { hasText: /^Planning$/u })).toBeVisible();
    await expect(header.locator(".status-badge", { hasText: /^Design$/u })).toBeVisible();
    await expect(header.locator(".status-badge", { hasText: /^High$/u })).toBeVisible();
    await expect(header.getByText("Budget RWF 125,000,000")).toBeVisible();
    await expect(header.getByText("No public case study")).toBeVisible();
    await expectNoSeriousAxeViolations(page);

    // Client 360 lists the project; Project → Client link works.
    await page.getByRole("link", { name: "Open Client" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/operations/clients/${clientId}$`, "u"));
    await page.getByRole("button", { name: "Projects" }).click();
    await expect(page.getByRole("link", { name: projectTitle })).toBeVisible();
    await page.getByRole("link", { name: projectTitle }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/operations/projects/${projectId}$`, "u"));

    // Status Planning → In Progress, Phase Design → Planning, Priority High → Medium.
    await page.getByRole("button", { name: "Status & Phase" }).click();
    await page.getByLabel("Change status").selectOption("in_progress");
    await page.getByRole("button", { name: "Update status", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Status history" })).toBeVisible();
    await expect(page.getByText(/Planning\s*→\s*In Progress/u).first()).toBeVisible();
    await page.getByLabel("Change phase").selectOption("planning");
    await page.getByRole("button", { name: "Update phase", exact: true }).click();
    await expect(page.getByText(/Design\s*→\s*Planning/u).first()).toBeVisible();
    // A third quick command must still carry the newest version (no spurious
    // conflict after two earlier commands).
    await page.getByLabel("Change priority").selectOption("medium");
    await page.getByRole("button", { name: "Update priority", exact: true }).click();
    await expect(page.locator(".alert-warning, .alert-danger")).toHaveCount(0);
    await expect(
      page.locator(".page-header .status-badge", { hasText: /^Medium$/u }),
    ).toBeVisible();

    // Private note.
    await page.getByRole("button", { name: "Notes" }).click();
    await page.getByRole("textbox", { name: "Add a note" }).fill("SYNTHETIC private site note.");
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByText("SYNTHETIC private site note.")).toBeVisible();

    // Public case study draft from the project.
    await page.getByRole("button", { name: "Public Case Study" }).click();
    await expect(page.getByText("Not linked")).toBeVisible();
    await page.getByRole("button", { name: "Create Draft", exact: true }).click();
    await page.getByRole("textbox", { name: "Working title" }).fill(caseStudyTitle);
    await page.getByRole("textbox", { name: "Slug" }).fill(caseStudySlug);
    await page.getByRole("button", { name: "Create draft", exact: true }).click();
    await expect(page.getByRole("link", { name: "Open Editor" })).toBeVisible();
    await expect(page.locator(".status-badge", { hasText: /^Draft$/u }).first()).toBeVisible();
    caseStudyId = idFromUrl(
      (await page.getByRole("link", { name: "Open Editor" }).getAttribute("href")) ?? "",
      "projects",
    );

    // Privacy invariant: nothing from the client reached the public record.
    const service = createClient(data.supabase.url, data.supabase.secretKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const publicRow = await service.from("projects").select("*").eq("id", caseStudyId).single();
    const localizations = await service
      .from("project_localizations")
      .select("*")
      .eq("project_id", caseStudyId);
    const serialized = JSON.stringify([publicRow.data, localizations.data]);
    for (const forbidden of [
      clientName,
      clientEmail,
      "780 000 777",
      "780000777",
      "125000000",
      "SYNTHETIC C4 Holdings",
      "private site note",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    const anonymous = createClient(data.supabase.url, data.supabase.anonymousKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    for (const table of [
      "clients",
      "operational_projects",
      "operational_project_notes",
      "client_notes",
    ]) {
      const probe = await anonymous.from(table).select("id").limit(1);
      expect(probe.error !== null || (probe.data ?? []).length === 0).toBe(true);
    }

    // Case Study editor offers the reverse link back to the operational project.
    await page.getByRole("link", { name: "Open Editor" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/content/projects/${caseStudyId}`, "u"));
    await expect(page.getByRole("heading", { name: projectTitle, level: 2 })).toBeVisible();
    await page.getByRole("link", { name: "Open operational project" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/operations/projects/${projectId}$`, "u"));

    // Quick Find finds all three record kinds, labelled.
    await page.keyboard.press("Control+k");
    const quickFind = page.getByRole("dialog", { name: "Quick find" });
    await expect(quickFind).toBeVisible();
    await quickFind
      .getByRole("textbox", { name: "Search clients, projects, and case studies" })
      .fill("SYNTHETIC C4 BROWSER");
    await expect(quickFind.getByText("CLIENT").first()).toBeVisible({ timeout: 10_000 });
    await expect(quickFind.getByText("PROJECT").first()).toBeVisible();
    await expect(quickFind.getByText("CASE STUDY").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(quickFind).toBeHidden();

    // Control Room reflects the real records.
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Clients & Projects" })).toBeVisible();
    await expect(page.getByText("Budget by currency")).toBeVisible();
    await expect(page.getByText("RWF").first()).toBeVisible();
    await expect(page.getByText("125,000,000").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Action queue", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();
    await expect(page.getByText("Project created").first()).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("propagates a status change to another session without a manual reload", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, "/admin/operations/projects");
    await expect(page.getByRole("link", { name: projectTitle })).toBeVisible();
    const row = page.locator("li", { has: page.getByRole("link", { name: projectTitle }) });
    await expect(row.getByText("In Progress")).toBeVisible();
    await waitForLive(page);
    // Any full reload would drop this marker.
    await page.evaluate(() => {
      (window as unknown as { __c4NoReload: boolean }).__c4NoReload = true;
    });

    const other = await secondSession(browser, "superB", `/admin/operations/projects/${projectId}`);
    await other.page.getByRole("button", { name: "Status & Phase" }).click();
    await other.page.getByLabel("Change status").selectOption("on_hold");
    await other.page.getByRole("button", { name: "Update status", exact: true }).click();
    await expect(other.page.getByText(/In Progress\s*→\s*On Hold/u).first()).toBeVisible();

    await expect(page.getByText("Updated just now")).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText("On Hold")).toBeVisible({ timeout: 20_000 });
    expect(
      await page.evaluate(
        () => (window as unknown as { __c4NoReload?: boolean }).__c4NoReload === true,
      ),
    ).toBe(true);

    // Control Room active-project count follows an archive from the other session.
    await page.goto("/admin");
    const activeCount = page
      .locator(".metric-register > div", { hasText: "Active projects" })
      .locator("dd");
    const before = Number(await activeCount.textContent());
    await waitForLive(page);
    await other.page.getByRole("button", { name: "Archive", exact: true }).click();
    await other.page.getByRole("button", { name: "Confirm archive", exact: true }).click();
    await expect(
      other.page.locator(".status-badge", { hasText: /^Archived$/u }).first(),
    ).toBeVisible();
    await expect(activeCount).toHaveText(String(before - 1), { timeout: 20_000 });

    // Restore the project for the remaining tests is not possible (archive is
    // one-way in C4); the concurrency test edits the client instead and
    // creates its own project.
    await other.context.close();
  });

  test("rejects a stale two-actor save on the same client and the same project", async ({
    page,
    browser,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, `/admin/operations/clients/${clientId}`);
    const other = await secondSession(browser, "superB", `/admin/operations/clients/${clientId}`);

    // Both open the edit form at the same version.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await other.page.getByRole("button", { name: "Edit", exact: true }).click();
    const companyA = page.getByRole("textbox", { name: "Company" });
    const companyB = other.page.getByRole("textbox", { name: "Company" });
    await companyA.fill("SYNTHETIC authoritative company from A");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    await expect(page.getByText("SYNTHETIC authoritative company from A").first()).toBeVisible();

    // B's page receives the realtime refresh; the open form warns but keeps B's
    // typed value, and B's save is rejected as a conflict.
    await expect(other.page.getByText(/updated this client while you were editing/u)).toBeVisible({
      timeout: 20_000,
    });
    await companyB.fill("SYNTHETIC stale company from B");
    await other.page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(other.page.getByText(/saved changes to this client first/u)).toBeVisible();
    await expect(companyB).toHaveValue("SYNTHETIC stale company from B");
    // Saving again without reloading is still rejected — no silent overwrite.
    await other.page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(other.page.getByText(/saved changes to this client first/u)).toBeVisible();
    await other.page.getByRole("button", { name: "Reload latest", exact: true }).first().click();
    await expect(other.page.getByRole("textbox", { name: "Company" })).toHaveValue(
      "SYNTHETIC authoritative company from A",
      { timeout: 15_000 },
    );
    await other.page.screenshot({
      path: `${screenshotRoot}/desktop-client-conflict-reloaded.png`,
      fullPage: true,
    });

    // Same proof for an operational project (a fresh one, since the workflow
    // project was archived by the realtime test).
    await page.goto(`/admin/operations/projects/new?client=${clientId}`);
    await page
      .getByRole("textbox", { name: "Project title" })
      .fill("SYNTHETIC C4 CONFLICT PROJECT");
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations\/projects\/[0-9a-f-]{36}$/u);
    const conflictProjectId = idFromUrl(page.url(), "projects");
    await other.page.goto(`/admin/operations/projects/${conflictProjectId}`);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await other.page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("textbox", { name: "Description" }).fill("SYNTHETIC description from A");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    const descriptionB = other.page.getByRole("textbox", { name: "Description" });
    await descriptionB.fill("SYNTHETIC stale description from B");
    await other.page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(other.page.getByText(/saved changes to this project first/u)).toBeVisible();
    await expect(descriptionB).toHaveValue("SYNTHETIC stale description from B");
    await other.context.close();
  });

  test("archives the client and keeps history, then verifies responsive layouts", async ({
    page,
  }) => {
    const actorA = fixtures().actors["superA"];
    if (!actorA) throw new Error("Synthetic super admin actor was unavailable.");
    await signInWithMfa(page, actorA, `/admin/operations/clients/${clientId}`);
    await page.getByRole("button", { name: "Archive Client", exact: true }).click();
    await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
    await expect(page.locator(".status-badge", { hasText: /^Archived$/u }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page.getByText("Client created").first()).toBeVisible();
    await expect(page.getByText("Client archived").first()).toBeVisible();

    // Archived client is excluded from the default register but present under Archived.
    await page.goto("/admin/operations/clients");
    await expect(page.getByRole("link", { name: clientName })).toHaveCount(0);
    await page.goto("/admin/operations/clients?status=archived");
    await expect(page.getByRole("link", { name: clientName })).toBeVisible();
    // Archived project keeps its history and client relation.
    await page.goto(`/admin/operations/projects/${projectId}`);
    await expect(page.locator(".status-badge", { hasText: /^Archived$/u }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Client" })).toBeVisible();
    await page.getByRole("button", { name: "Status & Phase" }).click();
    await expect(page.getByText(/Planning\s*→\s*In Progress/u).first()).toBeVisible();

    const screens: readonly (readonly [string, string, string])[] = [
      ["overview", "/admin", "Clients & Projects"],
      ["clients", "/admin/operations/clients?status=all", clientName],
      ["client-360", `/admin/operations/clients/${clientId}`, clientName],
      ["projects", "/admin/operations/projects?scope=all", projectTitle],
      ["project", `/admin/operations/projects/${projectId}`, projectTitle],
    ];
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1024 });
      for (const [name, path, landmark] of screens) {
        await page.goto(path);
        // Wait for real content, not the route skeleton (which also has an h1).
        await expect(page.getByText(landmark).first()).toBeVisible();
        await expect(page.locator("main[aria-busy='true']")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        if (width === 390 && name === "clients") {
          // Mobile register renders records, never the desktop column header.
          await expect(page.getByRole("link", { name: clientName })).toBeVisible();
        }
        await page.screenshot({ path: `${screenshotRoot}/${width}-${name}.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/operations/clients/${clientId}`);
    await expectNoSeriousAxeViolations(page);
  });
});
