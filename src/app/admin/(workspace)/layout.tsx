import type { ReactNode } from "react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { loadNotificationSummary } from "@/features/notifications/notification-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { roleDescriptions } from "@/lib/auth/capabilities";
import { requireAal2User } from "@/lib/auth/guards";
import { visibleAdminNavigation } from "@/lib/admin/navigation";

export const dynamic = "force-dynamic";

export default async function AdminWorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [snapshot, access] = await Promise.all([requireAal2User(), getCurrentAdminAccess()]);
  const roleLabel =
    access.roles.map((key) => roleDescriptions[key]?.label ?? key).join(", ") || "Staff";
  // The bell only exists for notifications.read holders; the summary is the
  // server-rendered initial state, refreshed over realtime pointers.
  const notifications = access.permissions.includes("notifications.read")
    ? await loadNotificationSummary()
    : undefined;

  return (
    <div className="admin-workspace-shell">
      <AdminNavigation
        displayName={snapshot.displayName ?? "Staff member"}
        items={visibleAdminNavigation(access.permissions)}
        notifications={notifications}
        permissions={access.permissions}
        roleLabel={roleLabel}
      />
      <div className="admin-workspace-content">{children}</div>
    </div>
  );
}
