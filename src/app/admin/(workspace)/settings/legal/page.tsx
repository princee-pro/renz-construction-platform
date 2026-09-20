import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { LegalCenter } from "@/features/settings/components/legal-center";
import { loadLegalPages } from "@/features/settings/settings-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legal Center | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Page({ searchParams }: PageProps<"/admin/settings/legal">) {
  await requirePermission("settings.legal.read");
  const [params, access, data] = await Promise.all([
    searchParams,
    getCurrentAdminAccess(),
    loadLegalPages(),
  ]);
  const section = first(params["section"]);
  void section;
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "Legal Center" },
        ]}
      />
      <PageHeader
        description="Privacy, terms and cookie pages as owner-managed content. Drafts are private; the public routes show only the published revision."
        eyebrow="Settings"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="Legal Center"
      />
      <SettingsNav current="legal" permissions={access.permissions} />
      {data ? (
        <LegalCenter canWrite={access.permissions.includes("settings.legal.write")} data={data} />
      ) : (
        <p className="quiet-empty" role="alert">
          Legal Center could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
