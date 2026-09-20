import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { BusinessSettingsView } from "@/features/settings/components/business-settings";
import { PublishPanel } from "@/features/settings/components/publish-panel";
import { loadBusinessSettings } from "@/features/settings/settings-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Page({ searchParams }: PageProps<"/admin/settings/business">) {
  await requirePermission("settings.business.read");
  const [params, access, data] = await Promise.all([
    searchParams,
    getCurrentAdminAccess(),
    loadBusinessSettings(),
  ]);
  const section = first(params["section"]);
  void section;
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "Business" },
        ]}
      />
      <PageHeader
        description="Identity, public contact channels, location, hours and social links. Save drafts here, then publish the public configuration."
        eyebrow="Settings"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="Business"
      />
      <SettingsNav current="business" permissions={access.permissions} />
      {data ? (
        <>
          <PublishPanel
            canPublish={access.permissions.includes("settings.business.write")}
            hasUnpublishedChanges={
              JSON.stringify({
                ...data.published,
                published_at: undefined,
                snapshot_id: undefined,
              }) !== JSON.stringify(data.preview)
            }
            publishedAt={data.published.published_at ?? null}
          />
          <BusinessSettingsView
            canWrite={access.permissions.includes("settings.business.write")}
            data={data}
            initialSection={section}
          />
        </>
      ) : (
        <p className="quiet-empty" role="alert">
          Business could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
