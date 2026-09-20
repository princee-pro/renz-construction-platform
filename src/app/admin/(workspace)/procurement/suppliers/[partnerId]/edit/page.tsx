import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PartnerForm } from "@/features/partners/components/partner-form";
import { loadPartnerDetail } from "@/features/partners/partner-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit supplier | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function EditSupplierPage({
  params,
}: PageProps<"/admin/procurement/suppliers/[partnerId]/edit">) {
  await requirePermission("partners.write");
  const route = await params;
  const parsed = idSchema.safeParse(route.partnerId);
  if (!parsed.success) notFound();
  const detail = await loadPartnerDetail(parsed.data);
  if (!detail) notFound();
  if (detail.partner.archived_at) redirect(`/admin/procurement/suppliers/${detail.partner.id}`);
  const partner = detail.partner;

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/suppliers", label: "Suppliers" },
          { href: `/admin/procurement/suppliers/${partner.id}`, label: partner.display_name },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Identity, contact and profile details. Capabilities are added from the partner page, never removed."
        eyebrow="Procurement"
        title={`Edit ${partner.display_name}`}
      />
      <PartnerForm
        defaultCapability="supplier"
        initial={{
          displayName: partner.display_name,
          companyName: partner.company_name ?? "",
          contactName: partner.contact_name ?? "",
          email: partner.email ?? "",
          phone: partner.phone_display ?? "",
          address: partner.address ?? "",
          notes: partner.notes ?? "",
          specializations: partner.specializations,
          availability: partner.availability_status,
          capabilities: partner.capabilities,
        }}
        mode="edit"
        partnerId={partner.id}
        returnHref={`/admin/procurement/suppliers/${partner.id}`}
        version={partner.version}
      />
    </main>
  );
}
