import type { Metadata } from "next";

import { SystemHealthPanel } from "@/components/admin/system-health";
import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SystemSettingsView } from "@/features/settings/components/system-settings";
import { loadIntakeSettings } from "@/features/leads/lead-data";
import { environmentPresence, loadSystemSettings } from "@/features/settings/settings-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";
import { runHealthChecks } from "@/lib/ops/health";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Page({ searchParams }: PageProps<"/admin/settings/system">) {
  await requirePermission("settings.system.read");
  const [params, access, data, intake] = await Promise.all([
    searchParams,
    getCurrentAdminAccess(),
    loadSystemSettings(),
    loadIntakeSettings(),
  ]);
  // System Health is owner-only (C10 §35); the probes run server-side.
  const health = access.roles.includes("super_admin") ? await runHealthChecks() : null;
  const section = first(params["section"]);
  void section;
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "System" },
        ]}
      />
      <PageHeader
        description="System health, document defaults for new drafts, operational thresholds and numbering."
        eyebrow="Settings"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="System"
      />
      <SettingsNav current="system" permissions={access.permissions} />
      {data ? (
        <>
          {health ? <SystemHealthPanel report={health} /> : null}
          <SystemSettingsView data={data} environment={environmentPresence()} intake={intake} />
        </>
      ) : (
        <p className="quiet-empty" role="alert">
          System could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
