import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { LaunchReadinessView } from "@/features/settings/components/launch-readiness";
import { loadLaunchReadiness } from "@/features/settings/settings-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch Readiness | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Page({
  searchParams,
}: PageProps<"/admin/settings/launch-readiness">) {
  await requirePermission("settings.website.read");
  const [params, access, data] = await Promise.all([
    searchParams,
    getCurrentAdminAccess(),
    loadLaunchReadiness(),
  ]);
  const section = first(params["section"]);
  void section;
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "Launch Readiness" },
        ]}
      />
      <PageHeader
        description="Can we safely publish this website? Deterministic checks, the client evidence still owed, and the preview / live switch."
        eyebrow="Settings"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="Launch Readiness"
      />
      <SettingsNav current="launch-readiness" permissions={access.permissions} />
      {data ? (
        <LaunchReadinessView
          canSwitchMode={
            access.permissions.includes("settings.website.write") && data.is_super_admin
          }
          data={data}
        />
      ) : (
        <p className="quiet-empty" role="alert">
          Launch Readiness could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
