import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { NotificationPreferencesForm } from "@/features/notifications/components/notification-preferences";
import { loadNotificationPreferences } from "@/features/notifications/notification-data";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";
import { loadBusinessTimezone } from "@/lib/time/business-timezone-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notification preferences | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NotificationSettingsPage() {
  await requirePermission("notifications.read");
  const [access, preferences, timeZone] = await Promise.all([
    getCurrentAdminAccess(),
    loadNotificationPreferences(),
    loadBusinessTimezone(),
  ]);
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "Notifications" },
        ]}
      />
      <PageHeader
        description="Which in-app notification categories reach you. Security and system notifications cannot be switched off. Email is not configured; nothing is sent by email."
        eyebrow="Settings"
        title="Notifications"
      />
      <SettingsNav current="notifications" permissions={access.permissions} />
      {preferences ? (
        <NotificationPreferencesForm preferences={preferences} timeZone={timeZone} />
      ) : (
        <p className="quiet-empty" role="alert">
          Preferences could not be loaded. Try again.
        </p>
      )}
    </main>
  );
}
