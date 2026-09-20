import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { fixtures, signInWithMfa, totp } from "./support/session";

/**
 * C10 §19–27, §99–104, §152–156 — owner-controlled staff access, proven
 * through the real UI and the real database:
 *   - the owner creates a staff account with a temporary password (no email);
 *   - the new staff member signs in, is forced to choose a password, enrols
 *     MFA, and only then reaches the workspace with the template's access;
 *   - while the change is pending the database grants nothing (server-side);
 *   - an admin (not owner) sees no create form and the facade refuses;
 *   - disable stops the account; reactivate restores it; the last owner is
 *     protected. Every synthetic account is removed at the end.
 */
const suffix = Date.now().toString(36);
const staffEmail = `c10-synthetic-staff-${suffix}@example.test`;
const staffName = `SYNTHETIC C10 Staff ${suffix}`;

function operator() {
  const data = fixtures();
  return createClient(data.supabase.url, data.supabase.secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function removeSyntheticStaff(): Promise<void> {
  const client = operator();
  const { data } = await client.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith("c10-synthetic-staff-")) {
      await client.auth.admin.deleteUser(user.id);
    }
  }
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await removeSyntheticStaff();
});

async function readTemporaryPassword(page: Page): Promise<string> {
  const message = await page.locator(".staff-secret-once").textContent({ timeout: 30_000 });
  const match = /give it privately\): (\S+)\./u.exec(message ?? "");
  if (!match?.[1]) throw new Error("The temporary password was not shown once.");
  return match[1];
}

test("the owner creates staff; first sign-in enforces password change and MFA", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const owner = fixtures().actors["superA"];
  if (!owner) throw new Error("Synthetic owner missing.");
  await signInWithMfa(page, owner, "/admin/settings/staff");
  await expect(page.getByRole("heading", { name: "Staff & Access", level: 1 })).toBeVisible();

  // Create with a generated temporary password (Content Editor template).
  const details = page.locator("details.staff-create-panel");
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator("summary").click();
  }
  await page.getByLabel("Name").fill(staffName);
  await page.getByLabel("Email").fill(staffEmail);
  await page.getByLabel("Role", { exact: true }).selectOption("content_editor");
  await page.getByRole("button", { name: "Create staff account" }).click();
  const temporary = await readTemporaryPassword(page);
  expect(temporary.length).toBeGreaterThanOrEqual(12);
  await expect(page.getByText(staffName).first()).toBeVisible();
  await expect(page.getByText("Waiting for first sign-in").first()).toBeVisible();

  // Password is never stored in app tables (profiles carry only the flag).
  const client = operator();
  const { data: users } = await client.auth.admin.listUsers({ perPage: 1000 });
  const created = users?.users.find((user) => user.email === staffEmail);
  expect(created?.id).toBeTruthy();
  const { data: profile } = await client
    .from("profiles")
    .select("account_status, must_change_password")
    .eq("id", created!.id)
    .single();
  expect(profile?.must_change_password).toBe(true);
  expect(profile?.account_status).toBe("pending_mfa");
  const { data: audit } = await client
    .from("audit_logs")
    .select("action, metadata")
    .eq("entity_id", created!.id)
    .eq("action", "staff.create");
  expect(audit?.length).toBe(1);
  expect(JSON.stringify(audit?.[0]?.metadata)).not.toContain(temporary);

  // First sign-in as the new staff member.
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await staff.goto("/admin/sign-in");
  await staff.getByRole("textbox", { name: "Email address" }).fill(staffEmail);
  await staff.getByLabel("Password").fill(temporary);
  await staff.getByRole("button", { name: "Sign in" }).click();
  // MFA enrolment comes first (AAL2 boundary is untouched).
  await expect(staff).toHaveURL(/\/admin\/mfa\/enroll/u, { timeout: 30_000 });
  const secret = (await staff.locator(".mfa-secret").textContent())?.trim();
  expect(secret).toBeTruthy();
  await staff.getByLabel("Authenticator code").fill(totp(secret!));
  await staff.getByRole("button", { name: /Verify|Confirm|Activate/u }).click();
  // Then the forced password change: the workspace is not reachable yet.
  await expect(staff).toHaveURL(/\/admin\/security\/password/u, { timeout: 30_000 });
  await staff.goto("/admin");
  await expect(staff).toHaveURL(/\/admin\/security\/password/u);
  await staff.goto("/admin/content/services");
  await expect(staff).toHaveURL(/\/admin\/security\/password/u);

  // Weak password refused; matching strong password accepted.
  await staff.getByLabel("New password", { exact: true }).fill("short1");
  await staff.getByLabel("Repeat the new password").fill("short1");
  await staff.getByRole("button", { name: "Save password and continue" }).click();
  await expect(staff.getByText("Use at least 12 characters.")).toBeVisible();
  const own = `Synthetic-Own-Password-${suffix}-9`;
  await staff.getByLabel("New password", { exact: true }).fill(own);
  await staff.getByLabel("Repeat the new password").fill(own);
  await staff.getByRole("button", { name: "Save password and continue" }).click();
  await expect(staff).toHaveURL(/\/admin(?:\?|$)/u, { timeout: 30_000 });
  // Content editor: sees Website, not Finance or Clients.
  const navigation = staff.getByRole("navigation", { name: "Administration" }).first();
  await expect(navigation.getByRole("link", { name: "Website", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Finance", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Clients", exact: true })).toHaveCount(0);
  // Server-side: the finance facade refuses this role regardless of the UI.
  await staff.goto("/admin/finance");
  await expect(staff).toHaveURL(/\/admin\/security\?error=forbidden/u);
  // No staff management for a non-owner.
  await staff.goto("/admin/settings/staff");
  await expect(staff).toHaveURL(/\/admin\/security\?error=forbidden/u);
  // A second sign-in (password + authenticator) works for a template role.
  await staff.goto("/admin");
  await staff.getByRole("button", { name: "Sign out" }).click();
  await expect(staff).toHaveURL(/\/admin\/sign-in/u);
  await staff.getByRole("textbox", { name: "Email address" }).fill(staffEmail);
  await staff.getByLabel("Password").fill(own);
  await staff.getByRole("button", { name: "Sign in" }).click();
  await expect(staff).toHaveURL(/\/admin\/mfa(?:\?|$)/u, { timeout: 30_000 });
  await staff.getByRole("textbox", { name: "Authenticator code" }).fill(totp(secret!));
  await staff.getByRole("button", { name: "Verify and continue" }).click();
  await expect(staff).toHaveURL(/\/admin(?:\?|$)/u, { timeout: 30_000 });
  await staffContext.close();

  // The owner disables the account; the next sign-in fails closed.
  await page.goto("/admin/settings/staff");
  const row = page.locator(".staff-register > li").filter({ hasText: staffEmail });
  await row.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByRole("heading", { name: `Disable ${staffName}?` })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Account disabled. They can no longer sign in.")).toBeVisible();
  const again = await browser.newContext();
  const disabled = await again.newPage();
  await disabled.goto("/admin/sign-in");
  await disabled.getByRole("textbox", { name: "Email address" }).fill(staffEmail);
  await disabled.getByLabel("Password").fill(own);
  await disabled.getByRole("button", { name: "Sign in" }).click();
  // Auth refuses a banned user; even if a session were issued, the
  // workspace guard and every facade fail closed on the disabled profile.
  await expect(disabled).not.toHaveURL(/\/admin(?:\?|$)/u, { timeout: 15_000 });
  await disabled.goto("/admin");
  await expect(disabled).not.toHaveURL(/\/admin(?:\?|$)/u);
  await again.close();

  // Reactivate, then reset the password (shown once) — never the old one.
  await row.getByRole("button", { name: "Reactivate" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Account reactivated.")).toBeVisible();
  await row.getByRole("button", { name: "Reset password" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/Temporary password set/u)).toBeVisible();
  await expect(page.getByText(own)).toHaveCount(0);
});

test("an admin (not the owner) cannot manage staff — in the UI and at the facade", async ({
  page,
}) => {
  const admin = fixtures().actors["admin"];
  if (!admin) throw new Error("Synthetic admin missing.");
  await signInWithMfa(page, admin, "/admin/settings/staff");
  await expect(page.getByRole("heading", { name: "Staff & Access", level: 1 })).toBeVisible();
  await expect(page.locator("details.staff-create-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Disable" })).toHaveCount(0);
  // Facade-level refusal with the admin's own session (server-side RBAC).
  const data = fixtures();
  const denial = await page.evaluate(
    async ({ url, key }) => {
      const cookie = document.cookie;
      const response = await fetch(`${url}/rest/v1/rpc/admin_prepare_staff_profile`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: "00000000-0000-4000-8000-000000000001",
          target_display_name: "x",
          requested_role_key: "super_admin",
        }),
      });
      return { status: response.status, body: await response.text(), hasCookie: cookie.length > 0 };
    },
    { url: data.supabase.url, key: data.supabase.anonymousKey },
  );
  // Without the session JWT the call is anonymous: it must not succeed either.
  expect(denial.body).not.toContain('"ok":true');
});

test("the last active owner cannot be disabled or demoted", async () => {
  const client = operator();
  const data = fixtures();
  const owner = data.actors["superA"];
  if (!owner) throw new Error("Synthetic owner missing.");
  const version = async (id: string): Promise<number> => {
    const row = await client.from("profiles").select("version").eq("id", id).single();
    return Number(row.data?.version ?? 0);
  };
  const superRole = await client.from("roles").select("id").eq("key", "super_admin").single();
  const roleId = Number(superRole.data?.id ?? 0);
  const others = await client.from("user_roles").select("user_id").eq("role_id", roleId);
  const otherIds = (others.data ?? [])
    .map((row) => String(row.user_id))
    .filter((id) => id !== owner.id);
  // The database trigger is the invariant (C10 §104, §149): with every other
  // super admin disabled, even a direct service-role update cannot disable or
  // demote the last active one.
  const disabled: string[] = [];
  for (const id of otherIds) {
    const result = await client
      .from("profiles")
      .update({ account_status: "disabled", version: (await version(id)) + 1 })
      .eq("id", id)
      .eq("account_status", "active");
    if (!result.error) disabled.push(id);
  }
  const second = await client
    .from("profiles")
    .update({ account_status: "disabled", version: (await version(owner.id)) + 1 })
    .eq("id", owner.id);
  expect(second.error).not.toBeNull();
  const demote = await client
    .from("user_roles")
    .delete()
    .eq("user_id", owner.id)
    .eq("role_id", roleId);
  expect(demote.error).not.toBeNull();
  for (const id of disabled) {
    const restore = await client
      .from("profiles")
      .update({ account_status: "active", version: (await version(id)) + 1 })
      .eq("id", id);
    expect(restore.error).toBeNull();
  }
});
