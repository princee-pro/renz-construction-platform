import "server-only";

import { redirect } from "next/navigation";

import { resolveRequestedRange } from "@/features/analytics/analytics-data";
import { getCurrentAdminAccess, type AdminAccess } from "@/lib/auth/access";
import { requireAal2User, type AdminAuthSnapshot } from "@/lib/auth/guards";
import type { AdminPermission } from "@/lib/auth/permissions";

/**
 * Analytics pages require an active AAL2 staff session, `analytics.read`
 * and the domain permission (C9 §89–92). The database re-checks the same
 * permissions inside every aggregate RPC; this guard only decides routing.
 */
export async function requireAnalytics(
  domain: readonly AdminPermission[],
  raw: Readonly<Record<string, string | string[] | undefined>>,
): Promise<
  Readonly<{
    snapshot: AdminAuthSnapshot;
    access: AdminAccess;
    range: Awaited<ReturnType<typeof resolveRequestedRange>>["range"];
    timeZone: string;
    today: string;
  }>
> {
  const snapshot = await requireAal2User();
  const access = await getCurrentAdminAccess();
  if (
    !access.permissions.includes("analytics.read") ||
    (domain.length > 0 && !domain.some((permission) => access.permissions.includes(permission)))
  ) {
    redirect("/admin/security?error=forbidden");
  }
  const resolved = await resolveRequestedRange(raw);
  return { snapshot, access, ...resolved };
}
