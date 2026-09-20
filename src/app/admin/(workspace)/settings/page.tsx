import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsOverviewView } from "@/features/settings/components/settings-overview";
import { loadSettingsOverview, loadSnapshotHistory } from "@/features/settings/settings-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requireAnyPermission } from "@/features/settings/settings-guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  await requireAnyPermission([
    "settings.business.read",
    "settings.website.read",
    "settings.legal.read",
    "settings.system.read",
    "staff.read",
  ]);
  const [data, history, access] = await Promise.all([
    loadSettingsOverview(),
    loadSnapshotHistory(8),
    getCurrentAdminAccess(),
  ]);
  const canPublish =
    access.permissions.includes("settings.business.write") ||
    access.permissions.includes("settings.website.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Settings" }]} />
      <PageHeader
        description="The RENZ configuration center: business identity, public contact, website, legal, document and operational defaults, staff and launch readiness. Drafts are private until published."
        eyebrow="Configuration"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="Settings"
      />
      <SettingsNav current="overview" permissions={access.permissions} />
      {data ? (
        <SettingsOverviewView canPublish={canPublish} data={data} history={history} />
      ) : (
        <p className="quiet-empty" role="alert">
          Settings could not be loaded. The public site keeps serving its last published
          configuration.
        </p>
      )}
    </main>
  );
}
