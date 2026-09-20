import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

// C9 intelligence browser acceptance (brief §104–§125).
//
// Serial: Analytics Center (sections, URL-carried range, CSV, print
// affordance, a11y, responsive) → website analytics off by default (no
// banner, no script, beacon inert) → owner enables first-party analytics and
// publishes → anonymous visits count only approved, privacy-safe events →
// third-party provider with consent (reject never loads, accept loads) →
// Notification Center realtime arrival, routing, mark read, preferences,
// two-session bell update → manual sweep idempotency + Launch Readiness.
// The global teardown resets the local database.

const screenshotRoot = ".playwright/screenshots/c9";
const referencePattern = /RENZ-LEAD-\d{4}-\d{6}/u;

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

function serviceClient() {
  const data = fixtures();
  return createClient(data.supabase.url, data.supabase.secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish public configuration", exact: true }).click();
  await page.getByRole("button", { name: "Confirm publish", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm publish", exact: true })).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.getByText("Public configuration published.")).toBeVisible();
}

async function saveWebsiteDraft(page: Page) {
  await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
  await expect(page.getByText(/saved as draft/u)).toBeVisible({ timeout: 15_000 });
}

/** Forms refuse zero-time submissions; wait past the minimum interaction window. */
async function waitForInteractionWindow(page: Page) {
  await page.waitForTimeout(3_200);
}

async function submitContactLead(page: Page, name: string, email: string): Promise<string> {
  await page.goto("/contact");
  await page.locator("#fullName").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#subject").fill("SYNTHETIC C9 subject");
  await page.locator("#message").fill("SYNTHETIC C9 private message body that must never leak.");
  await page.getByLabel(/I have read the/u).check();
  await waitForInteractionWindow(page);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  const reference = await page.locator(".intake-reference code").innerText({ timeout: 20_000 });
  expect(reference).toMatch(referencePattern);
  return reference;
}

async function analyticsRows(service: ReturnType<typeof serviceClient>) {
  const { data, error } = await service
    .from("website_analytics_daily")
    .select("day, event_type, path_key, dimension, device_class, hit_count");
  expect(error).toBeNull();
  return (data ?? []) as readonly {
    day: string;
    event_type: string;
    path_key: string;
    dimension: string;
    device_class: string;
    hit_count: number;
  }[];
}

test.describe.serial("RENZ C9 analytics and notifications", () => {
  test.setTimeout(240_000);

  test("Analytics Center: sections, URL-carried range, CSV export, a11y and responsive", async ({
    browser,
  }) => {
    const staff = await staffSession(browser, "superA", "/admin/analytics");
    const page = staff.page;
    await expect(page.getByRole("heading", { name: "Executive overview", level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Analytics sections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /against/u, level: 2 })).toBeVisible();
    await expect(page.getByText(/business days in Africa\/Kigali/u)).toBeVisible();
    await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();

    // Presets persist in the URL; the nav carries the range across sections.
    await page.getByRole("link", { name: "Last 7 days" }).click();
    await expect(page).toHaveURL(/range=7d/u);
    await expect(page.getByText(/\(7 days\)/u)).toBeVisible();
    await page
      .getByRole("navigation", { name: "Analytics sections" })
      .getByRole("link", { name: "Leads" })
      .click();
    await expect(page).toHaveURL(/\/admin\/analytics\/leads\?range=7d/u);
    await expect(page.getByRole("heading", { name: "Lead analytics", level: 1 })).toBeVisible();

    // A custom range is validated server-side and shown honestly.
    await page.getByLabel("From").fill("2026-06-01");
    await page.getByLabel("To").fill("2026-06-30");
    await page.getByRole("button", { name: "Apply range" }).click();
    await expect(page).toHaveURL(/range=custom&from=2026-06-01&to=2026-06-30/u);
    await expect(page.getByText(/2026-06-01.*2026-06-30/u).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Funnel/u })).toBeVisible();
    await expect(page.getByText(/Win rate \(Won ÷ \(Won \+ Lost\)\)/u)).toBeVisible();
    await expectNoSeriousAxeViolations(page);

    // An inverted custom range falls back and says so.
    await page.goto("/admin/analytics/leads?range=custom&from=2026-06-30&to=2026-06-01");
    await expect(page.getByText(/requested custom range was invalid/u)).toBeVisible();

    for (const [section, heading] of [
      ["projects", "Project analytics"],
      ["finance", "Finance analytics"],
      ["delivery", "Delivery analytics"],
      ["website", "Website analytics"],
    ] as const) {
      await page.goto(`/admin/analytics/${section}?range=30d`);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
    await expect(page.getByText(/First-party analytics: off/u)).toBeVisible();
    await expect(page.getByText(/not unique visitors/u)).toBeVisible();

    // Finance page never uses revenue / profit wording.
    await page.goto("/admin/analytics/finance?range=30d");
    const financeLabels = await page
      .locator("main.analytics-page dt, main.analytics-page th")
      .allInnerTexts();
    expect(financeLabels.join(" ")).not.toMatch(/revenue|profit|margin/iu);
    await expect(page.getByText(/Currencies are never summed together/u)).toBeVisible();

    // CSV export of an aggregate table only.
    const csv = await page.request.get("/admin/analytics/export?report=lead-funnel&range=7d");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain("Stage,Leads,Share of submitted (%)");
    const unknown = await page.request.get("/admin/analytics/export?report=raw-leads&range=7d");
    expect(unknown.status()).toBe(400);

    // Responsive + a11y on the overview.
    await page.goto("/admin/analytics?range=30d");
    await expectNoSeriousAxeViolations(page);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin/analytics?range=30d");
      await expect(
        page.getByRole("heading", { name: "Executive overview", level: 1 }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${screenshotRoot}/analytics-overview-${width}.png`,
        fullPage: true,
      });
      await page.goto("/admin/analytics/leads?range=30d");
      await expectNoHorizontalOverflow(page);
    }
    await staff.context.close();
  });

  test("website analytics off by default: no consent banner, no provider, beacon inert, endpoint refuses arbitrary events", async ({
    page,
  }) => {
    const service = serviceClient();
    const beaconCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/analytics/events")) beaconCalls.push(request.url());
    });
    await page.goto("/");
    await page.goto("/services");
    await page.waitForTimeout(2_500);
    expect(beaconCalls).toEqual([]);
    await expect(page.locator(".analytics-consent")).toHaveCount(0);
    await expect(page.locator('[data-testid="analytics-provider"]')).toHaveCount(0);

    // Direct calls: valid shape is accepted quietly but nothing is stored while off.
    const quiet = await page.request.post("/api/analytics/events", {
      data: { events: [{ t: "page_view", p: "/", dc: "desktop" }] },
      headers: { "content-type": "application/json" },
    });
    expect(quiet.status()).toBe(204);
    const arbitrary = await page.request.post("/api/analytics/events", {
      data: { events: [{ t: "custom_event", p: "/", payload: { email: "a@b.c" } }] },
      headers: { "content-type": "application/json" },
    });
    expect(arbitrary.status()).toBe(400);
    const method = await page.request.get("/api/analytics/events");
    expect(method.status()).toBe(405);
    expect(await analyticsRows(service)).toEqual([]);
  });

  test("owner enables first-party analytics; anonymous visits count only approved privacy-safe events", async ({
    browser,
    page,
  }) => {
    const service = serviceClient();
    const staff = await staffSession(browser, "superA", "/admin/settings/website");
    await staff.page.getByLabel(/First-party analytics/u).check();
    await saveWebsiteDraft(staff.page);
    await publish(staff.page);

    // Anonymous journey: Home → Services → Design service (with a query string
    // that must be stripped) → header CTA → Start a Project → first interaction.
    // The beacon is a client effect: wait for hydration (D1 marks the root
    // with data-motion once client code runs) before leaving each page.
    const hydrated = () => page.waitForSelector("#site-top[data-motion]");
    await page.goto("/");
    await hydrated();
    await page.goto("/services");
    await hydrated();
    await page.goto("/services/design?utm_source=synthetic&email=visitor@example.test");
    await hydrated();
    await page.locator('[data-analytics-cta="start_project"]').first().click();
    await expect(page).toHaveURL(/\/start-a-project/u);
    await page.getByRole("radio").first().focus();
    await page.getByRole("radio").first().check();
    // Private routes are never counted even if a beacon claims them.
    await page.evaluate(() =>
      fetch("/api/analytics/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          events: [
            { t: "page_view", p: "/admin/operations/leads", dc: "desktop" },
            { t: "page_view", p: "/i/abcdef", dc: "desktop" },
            { t: "cta_click", p: "/", d: "start_project", dc: "desktop" },
          ],
        }),
      }),
    );
    // Real contact submission → server-side contact_submit tied to the lead insert.
    const reference = await submitContactLead(
      page,
      "SYNTHETIC C9 ANALYTICS VISITOR",
      "synthetic-c9-analytics@example.test",
    );
    await page.goto("/about");
    await page.waitForTimeout(2_500);

    const rows = await analyticsRows(service);
    const count = (event: string, path: string, dimension = "") =>
      rows
        .filter(
          (row) => row.event_type === event && row.path_key === path && row.dimension === dimension,
        )
        .reduce((sum, row) => sum + row.hit_count, 0);
    expect(count("page_view", "/")).toBeGreaterThanOrEqual(1);
    expect(count("page_view", "/services")).toBeGreaterThanOrEqual(1);
    expect(count("page_view", "/services/design")).toBeGreaterThanOrEqual(1);
    expect(count("service_view", "/services/design", "design")).toBeGreaterThanOrEqual(1);
    expect(count("cta_click", "/services/design", "start_project")).toBeGreaterThanOrEqual(1);
    expect(count("cta_click", "/", "start_project")).toBeGreaterThanOrEqual(1);
    expect(count("project_intake_start", "/start-a-project")).toBeGreaterThanOrEqual(1);
    expect(count("contact_submit", "/contact")).toBe(1);
    // Privacy: nothing beyond approved keys ever lands.
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toMatch(/\?|@|RENZ-LEAD|\/admin|\/i\/|utm_|example\.test/u);
    expect(
      rows.every((row) => ["mobile", "tablet", "desktop", "unknown"].includes(row.device_class)),
    ).toBe(true);
    expect(rows.every((row) => /^\/[a-z0-9/-]*$/u.test(row.path_key))).toBe(true);
    expect(reference).toMatch(referencePattern);

    // The Website analytics page reflects the counts and never equates views with enquiries.
    await staff.page.goto("/admin/analytics/website?range=7d");
    await expect(staff.page.getByText(/First-party analytics: on/u)).toBeVisible();
    await expect(
      staff.page.getByRole("heading", { name: "Service interest ranking" }),
    ).toBeVisible();
    await expect(staff.page.getByRole("row", { name: /Design/u }).first()).toBeVisible();
    await expect(staff.page.getByText(/Contact submissions/u).first()).toBeVisible();
    await expectNoSeriousAxeViolations(staff.page);
    await staff.context.close();
  });

  test("consent: cookie-setting provider loads only after Accept; Reject never loads; no banner when analytics is off", async ({
    browser,
    page,
  }) => {
    const staff = await staffSession(browser, "superA", "/admin/settings/website");
    await staff.page.getByLabel(/Third-party analytics provider enabled/u).check();
    await staff.page.getByLabel(/Consent required before the provider loads/u).check();
    await staff.page.getByLabel("Third-party provider").selectOption("plausible");
    await staff.page.getByLabel("Provider site id (public)").fill("synthetic.example.test");
    await saveWebsiteDraft(staff.page);
    await publish(staff.page);

    await page.goto("/");
    const banner = page.getByRole("region", { name: "Analytics on this website" });
    await expect(banner).toBeVisible();
    await expect(page.locator('[data-testid="analytics-provider"]')).toHaveCount(0);
    const accept = banner.getByRole("button", { name: "Accept analytics" });
    const reject = banner.getByRole("button", { name: "Reject analytics" });
    // Equal prominence: same class, same size.
    const [acceptBox, rejectBox] = await Promise.all([accept.boundingBox(), reject.boundingBox()]);
    expect(Math.abs((acceptBox?.height ?? 0) - (rejectBox?.height ?? 0))).toBeLessThan(2);
    await expectNoSeriousAxeViolations(page);
    await reject.click();
    await expect(banner).toHaveCount(0);
    await page.goto("/services");
    await expect(page.locator('[data-testid="analytics-provider"]')).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Analytics on this website" })).toHaveCount(0);
    await page.goto("/cookies");
    await expect(page.getByText("Analytics rejected.")).toBeVisible();

    // Accept → the adapter script tag is rendered (the network load itself is out of scope).
    await page.getByRole("button", { name: "Accept analytics" }).click();
    await expect(page.getByText("Analytics accepted.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Analytics on this website" })).toHaveCount(0);
    await expect(page.locator('script[src*="plausible.io"]')).toHaveCount(1, { timeout: 10_000 });

    // Launch Readiness explains the provider/consent state honestly.
    await staff.page.goto("/admin/settings/launch-readiness");
    await expect(staff.page.getByText(/Website analytics configuration/u)).toBeVisible();
    await expect(
      staff.page.getByText(/Published privacy notice describes website analytics/u),
    ).toBeVisible();

    // Turn the provider off again: no banner, no script.
    await staff.page.goto("/admin/settings/website");
    await staff.page.getByLabel(/Third-party analytics provider enabled/u).uncheck();
    await staff.page.getByLabel(/Consent required before the provider loads/u).uncheck();
    await saveWebsiteDraft(staff.page);
    await publish(staff.page);
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Analytics on this website" })).toHaveCount(0);
    await expect(page.locator('[data-testid="analytics-provider"]')).toHaveCount(0);
    await staff.context.close();
  });

  test("Notification Center: realtime arrival, Lead 360 link, mark read, assignee-only routing, preferences", async ({
    browser,
    page,
  }) => {
    const owner = await staffSession(browser, "superA", "/admin/notifications");
    await expect(
      owner.page.getByRole("heading", { name: "Notifications", level: 1 }),
    ).toBeVisible();
    await expect(owner.page.locator(".realtime-status")).toContainText(/Live|Updated/u, {
      timeout: 15_000,
    });
    const badge = owner.page.locator(".admin-topbar .notification-bell-button");
    const unreadBefore = Number((await badge.getAttribute("data-unread")) ?? "0");

    // Anonymous visitor submits a project-style contact → owner sees it live.
    const reference = await submitContactLead(
      page,
      "SYNTHETIC C9 NOTIFY VISITOR",
      "synthetic-c9-notify@example.test",
    );
    const item = owner.page
      .locator(".notification-item")
      .filter({ hasText: "New general enquiry received" })
      .filter({ hasText: reference })
      .first();
    await expect(item).toBeVisible({ timeout: 25_000 });
    await expect(item).not.toContainText("private message body");
    await expect(item).not.toContainText("example.test");
    await expect
      .poll(async () => Number((await badge.getAttribute("data-unread")) ?? "0"), {
        timeout: 15_000,
      })
      .toBeGreaterThan(unreadBefore);

    // Open → Lead 360; Mark read → unread count decreases.
    await item.getByRole("link", { name: "Open" }).click();
    await expect(owner.page).toHaveURL(/\/admin\/operations\/leads\/[0-9a-f-]+$/u);
    await expect(owner.page.locator(".page-header")).toContainText(reference);
    const leadUrl = owner.page.url();
    await owner.page.goto("/admin/notifications?state=unread");
    const unreadItem = owner.page
      .locator(".notification-item")
      .filter({ hasText: reference })
      .first();
    await expect(unreadItem).toBeVisible();
    const countBeforeRead = Number((await badge.getAttribute("data-unread")) ?? "0");
    await unreadItem.getByRole("button", { name: "Mark read" }).click();
    await expect(owner.page.getByText("Marked read.")).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => Number((await badge.getAttribute("data-unread")) ?? "0"), {
        timeout: 15_000,
      })
      .toBeLessThan(countBeforeRead);

    // Assignment routes to the assignee only.
    const assignee = await staffSession(browser, "admin", "/admin/notifications");
    const bystander = await staffSession(browser, "visual", "/admin/notifications");
    await owner.page.goto(leadUrl);
    await owner.page.getByLabel("Assigned staff").selectOption({ label: "SYNTHETIC admin" });
    await owner.page.getByRole("button", { name: "Save assignment" }).click();
    await expect(owner.page.getByText("Lead assigned.")).toBeVisible({ timeout: 15_000 });
    await expect(
      assignee.page
        .locator(".notification-item")
        .filter({ hasText: "Lead assigned to you" })
        .first(),
    ).toBeVisible({ timeout: 25_000 });
    await bystander.page.goto("/admin/notifications");
    await expect(
      bystander.page.locator(".notification-item").filter({ hasText: "Lead assigned to you" }),
    ).toHaveCount(0);
    await expect(
      owner.page.locator(".notification-item").filter({ hasText: "Lead assigned to you" }),
    ).toHaveCount(0);

    // Preferences: the assignee disables Leads → a stage change produces nothing; re-enable → next event notifies.
    await assignee.page.goto("/admin/settings/notifications");
    await expect(
      assignee.page.getByRole("heading", { name: "In-app notifications" }),
    ).toBeVisible();
    await expect(assignee.page.getByLabel(/Security/u)).toBeDisabled();
    await assignee.page.getByLabel(/^Leads/u).uncheck();
    await assignee.page.getByRole("button", { name: "Save preferences" }).click();
    await expect(assignee.page.getByText("Notification preferences saved.")).toBeVisible({
      timeout: 15_000,
    });
    await expectNoSeriousAxeViolations(assignee.page);

    await owner.page.goto(leadUrl);
    await owner.page
      .getByRole("group", { name: "Change stage" })
      .getByRole("button", { name: "Contacted" })
      .click();
    await owner.page.getByRole("button", { name: "Confirm Contacted" }).click();
    await expect(owner.page.getByText("Stage updated.")).toBeVisible({ timeout: 15_000 });
    await assignee.page.goto("/admin/notifications");
    await expect(
      assignee.page.locator(".notification-item").filter({ hasText: "Lead moved to Contacted" }),
    ).toHaveCount(0);

    await assignee.page.goto("/admin/settings/notifications");
    await assignee.page.getByLabel(/^Leads/u).check();
    await assignee.page.getByRole("button", { name: "Save preferences" }).click();
    await expect(assignee.page.getByText("Notification preferences saved.")).toBeVisible({
      timeout: 15_000,
    });
    await assignee.page.goto("/admin");
    const assigneeBadge = assignee.page.locator(".admin-topbar .notification-bell-button");
    const assigneeUnread = Number((await assigneeBadge.getAttribute("data-unread")) ?? "0");

    await owner.page.goto(leadUrl);
    await owner.page
      .getByRole("group", { name: "Change stage" })
      .getByRole("button", { name: "Qualified" })
      .click();
    await owner.page.getByRole("button", { name: "Confirm Qualified" }).click();
    await expect(owner.page.getByText("Stage updated.")).toBeVisible({ timeout: 15_000 });
    // Two-session realtime: the assignee's bell updates without reload.
    await expect
      .poll(async () => Number((await assigneeBadge.getAttribute("data-unread")) ?? "0"), {
        timeout: 25_000,
      })
      .toBeGreaterThan(assigneeUnread);
    await assigneeBadge.click();
    const panel = assignee.page.getByRole("dialog", { name: "Latest notifications" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Lead moved to Qualified")).toBeVisible();
    await assignee.page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(assigneeBadge).toBeFocused();

    // Control Room attention summary + a11y + mobile bell.
    await owner.page.goto("/admin");
    await expect(
      owner.page.getByRole("heading", { name: /unread notification|Nothing unread/u }),
    ).toBeVisible();
    await owner.page.goto("/admin/notifications");
    await expectNoSeriousAxeViolations(owner.page);
    await owner.page.setViewportSize({ width: 390, height: 844 });
    await owner.page.goto("/admin/notifications");
    await expectNoHorizontalOverflow(owner.page);
    await owner.page.screenshot({
      path: `${screenshotRoot}/notifications-390.png`,
      fullPage: true,
    });
    await owner.page.locator(".admin-topbar .notification-bell-button").click();
    await expect(owner.page.getByRole("dialog", { name: "Latest notifications" })).toBeVisible();
    await expectNoHorizontalOverflow(owner.page);

    await owner.context.close();
    await assignee.context.close();
    await bystander.context.close();
  });

  test("timed sweep runs from Settings and is idempotent; Launch Readiness reports the scheduler state", async ({
    browser,
  }) => {
    const owner = await staffSession(browser, "superA", "/admin/settings/notifications");
    await owner.page.getByRole("button", { name: "Run sweep now" }).click();
    await expect(owner.page.getByText(/Sweep finished: \d+ new notification/u)).toBeVisible({
      timeout: 20_000,
    });
    await owner.page.getByRole("button", { name: "Run sweep now" }).click();
    await expect(owner.page.getByText(/Sweep finished: 0 new notifications\./u)).toBeVisible({
      timeout: 20_000,
    });
    await owner.page.goto("/admin/settings/launch-readiness");
    await expect(owner.page.getByText("Timed notification sweep scheduler")).toBeVisible();
    await expect(owner.page.getByText(/Timed notification task endpoint armed/u)).toBeVisible();
    await expectNoSeriousAxeViolations(owner.page);

    // The task endpoint is unarmed without RENZ_TASK_TOKEN and never public.
    const task = await owner.page.request.post("/api/tasks/notifications-sweep");
    expect(task.status()).toBe(404);
    await owner.context.close();
  });
});
