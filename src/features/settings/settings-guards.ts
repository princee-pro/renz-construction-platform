import "server-only";

import { redirect } from "next/navigation";

import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requireAal2User, type AdminAuthSnapshot } from "@/lib/auth/guards";
import type { AdminPermission } from "@/lib/auth/permissions";

/** Settings overview: any settings-domain read permission admits the reader. */
export async function requireAnyPermission(
  permissions: readonly AdminPermission[],
): Promise<AdminAuthSnapshot> {
  const snapshot = await requireAal2User();
  const access = await getCurrentAdminAccess();
  if (!permissions.some((permission) => access.permissions.includes(permission))) {
    redirect("/admin/security?error=forbidden");
  }
  return snapshot;
}
