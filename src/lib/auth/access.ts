import "server-only";

import type { AdminPermission } from "@/lib/auth/permissions";
import { getAdminAuthSnapshot } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminAccess = Readonly<{
  roles: readonly string[];
  permissions: readonly string[];
}>;

export type ActionAuthorization =
  | Readonly<{ ok: true; userId: string }>
  | Readonly<{
      ok: false;
      reason: "signed_out" | "disabled" | "mfa_required" | "forbidden" | "unavailable";
      reauthHref: string;
    }>;

export async function getCurrentAdminAccess(): Promise<AdminAccess> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("current_user_access");
  if (error) {
    throw new Error("Current administrator access could not be loaded.");
  }

  return {
    roles: [...new Set((data ?? []).map((entry) => entry.role_key))].sort(),
    permissions: [...new Set((data ?? []).map((entry) => entry.permission_key))].sort(),
  };
}

export async function authorizeServerAction(
  permission: AdminPermission,
): Promise<ActionAuthorization> {
  const snapshot = await getAdminAuthSnapshot();
  if (!snapshot) {
    return { ok: false, reason: "signed_out", reauthHref: "/admin/sign-in" };
  }
  if (snapshot.accountStatus !== "active") {
    return { ok: false, reason: "disabled", reauthHref: "/admin/sign-in?error=access" };
  }
  if (snapshot.currentLevel !== "aal2") {
    return {
      ok: false,
      reason: "mfa_required",
      reauthHref: snapshot.verifiedTotpFactorCount > 0 ? "/admin/mfa" : "/admin/mfa/enroll",
    };
  }

  const client = await createServerSupabaseClient();
  const { data: allowed, error } = await client.rpc("current_user_has_permission", {
    requested_permission: permission,
  });
  if (error) {
    return { ok: false, reason: "unavailable", reauthHref: "/admin/sign-in" };
  }
  if (allowed !== true) {
    return { ok: false, reason: "forbidden", reauthHref: "/admin/security?error=forbidden" };
  }
  return { ok: true, userId: snapshot.userId };
}
