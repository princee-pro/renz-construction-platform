import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PartnerForm, emptyPartnerForm } from "@/features/partners/components/partner-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New supplier | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewSupplierPage() {
  await requirePermission("partners.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/suppliers", label: "Suppliers" },
          { label: "New supplier" },
        ]}
      />
      <PageHeader
        description="One trade partner record per real person or company. If they also work as a contractor, tick both capabilities here or add the contractor capability later — never create a second record."
        eyebrow="Procurement"
        title="New supplier"
      />
      <PartnerForm
        defaultCapability="supplier"
        initial={emptyPartnerForm}
        mode="create"
        returnHref="/admin/procurement/suppliers"
      />
    </main>
  );
}
