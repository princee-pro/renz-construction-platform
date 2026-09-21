import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { fixtures, signInWithMfa } from "./support/session";

/**
 * R1 §49 — network failure during a submit (C10 left this NOT TESTED).
 * For the public Contact form, the Start-a-Project wizard and an Admin save:
 * offline → no false success, an inline message that says nothing was
 * sent, every value kept; back online → the same button sends exactly one
 * record (public forms carry an idempotency nonce; the admin save is a
 * plain retry). Before R1 an offline submit dropped the visitor into the
 * route error boundary and lost the filled form.
 */
const visitorEmail = "synthetic-r1-offline@example.test";

function operator() {
  const data = fixtures();
  return createClient(data.supabase.url, data.supabase.secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const client = operator();
  await client.from("leads").delete().like("email", "synthetic-r1-offline%");
});

test("contact form offline: inline error, values kept, one lead after reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/contact");
  await page.locator("#fullName").fill("SYNTHETIC R1 OFFLINE VISITOR");
  await page.locator("#email").fill(visitorEmail);
  await page.locator("#subject").fill("SYNTHETIC offline");
  await page.locator("#message").fill("SYNTHETIC message written while offline.");
  await page.getByLabel(/I have read the/u).check();
  await page.waitForTimeout(3_200);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByText(/could not reach RENZ right now/u)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".intake-reference")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
  await expect(page.locator("#message")).toHaveValue("SYNTHETIC message written while offline.");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.locator(".intake-reference code")).toBeVisible({ timeout: 20_000 });
  const { data } = await operator().from("leads").select("id").eq("email", visitorEmail);
  expect(data?.length).toBe(1);
});

test("start-a-project wizard offline at the last step: no false success, one lead after reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/start-a-project?service=design");
  await expect(page.getByRole("radio", { name: /^Design/u })).toBeChecked();
  const next = () => page.getByRole("button", { name: "Continue", exact: true }).click();
  await next();
  await page.getByRole("radio", { name: /^Residential/u }).check();
  await page.getByLabel("Where is the project?").fill("SYNTHETIC district");
  await page.getByLabel("What do you want to build?").fill("SYNTHETIC offline wizard brief.");
  await next();
  await page.getByLabel("Approximate floor area (m²)").fill("120");
  await page.getByLabel("Number of floors").fill("1");
  await page.getByRole("radio", { name: "Medium", exact: true }).check();
  await next();
  await page.getByRole("radio", { name: "Just an idea" }).check();
  await next();
  await next(); // files (none)
  await page.locator("#fullName").fill("SYNTHETIC R1 OFFLINE WIZARD");
  await page.locator("#email").fill(`wizard.${visitorEmail}`);
  await page.locator("#phone").fill("+250 780 000 222");
  await page.getByRole("radio", { name: "WhatsApp", exact: true }).check();
  await next();
  await expect(page.getByRole("heading", { name: "Check and send", level: 2 })).toBeFocused();
  await page.getByLabel(/I have read the/u).check();
  await page.waitForTimeout(3_200);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Submit project brief", exact: true }).click();
  await expect(page.getByText(/could not reach RENZ right now/u)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".intake-reference")).toHaveCount(0);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Submit project brief", exact: true }).click();
  await expect(page.locator(".intake-reference code")).toBeVisible({ timeout: 20_000 });
  const { data } = await operator()
    .from("leads")
    .select("id")
    .eq("email", `wizard.${visitorEmail}`);
  expect(data?.length).toBe(1);
});

test("admin save offline: inline error, edits kept, saved once after reconnect", async ({
  page,
  context,
}) => {
  const owner = fixtures().actors["superA"];
  if (!owner) throw new Error("Synthetic owner missing.");
  await signInWithMfa(page, owner, "/admin/settings/business");
  const name = page.getByRole("textbox", { name: "Display name" });
  const before = await name.inputValue();
  await name.fill("SYNTHETIC R1 OFFLINE NAME");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/server could not be reached/u)).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "This route could not be displayed" }),
  ).toHaveCount(0);
  await expect(name).toHaveValue("SYNTHETIC R1 OFFLINE NAME");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/saved as draft/u)).toBeVisible({ timeout: 20_000 });
  // Restore the value so later suites see the seeded business name.
  await name.fill(before);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/saved as draft/u)).toBeVisible({ timeout: 20_000 });
});
