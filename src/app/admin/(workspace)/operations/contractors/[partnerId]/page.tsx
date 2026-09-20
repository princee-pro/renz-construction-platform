import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { Partner360 } from "@/features/partners/components/partner-360";
import { loadPartnerDetail } from "@/features/partners/partner-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contractor | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function ContractorPage({
  params,
}: PageProps<"/admin/operations/contractors/[partnerId]">) {
  await requirePermission("partners.read");
  const route = await params;
  const parsed = idSchema.safeParse(route.partnerId);
  if (!parsed.success) notFound();
  const [detail, access] = await Promise.all([
    loadPartnerDetail(parsed.data),
    getCurrentAdminAccess(),
  ]);
  if (!detail) notFound();
  // A partner without this capability lives under its own register; send the
  // reader there rather than showing the wrong sections.
  if (!detail.partner.capabilities.includes("contractor")) {
    redirect(`/admin/procurement/suppliers/${detail.partner.id}`);
  }

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/contractors", label: "Contractors" },
          { label: detail.partner.display_name },
        ]}
      />
      <Partner360
        canAssign={access.permissions.includes("contractors.assign")}
        canOrder={access.permissions.includes("procurement.orders.write")}
        canWrite={access.permissions.includes("partners.write")}
        detail={detail}
        view="contractor"
      />
    </main>
  );
}
