import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { StaffRegisterView } from "@/features/settings/components/staff-register";
import { loadStaffRegister } from "@/features/settings/settings-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff & Access | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Page({ searchParams }: PageProps<"/admin/settings/staff">) {
  await requirePermission("staff.read");
  const [params, access, data] = await Promise.all([
    searchParams,
    getCurrentAdminAccess(),
    loadStaffRegister(),
  ]);
  const section = first(params["section"]);
  void section;
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "Staff & Access" },
        ]}
      />
      <PageHeader
        description="Who can sign in, with which role, and whether MFA is enrolled. Role and status changes are Super Admin actions and are audited."
        eyebrow="Settings"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="Staff & Access"
      />
      <SettingsNav current="staff" permissions={access.permissions} />
      {data ? (
        <StaffRegisterView data={data} />
      ) : (
        <p className="quiet-empty" role="alert">
          Staff & Access could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
