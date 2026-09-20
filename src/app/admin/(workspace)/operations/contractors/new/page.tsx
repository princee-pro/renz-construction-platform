import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PartnerForm, emptyPartnerForm } from "@/features/partners/components/partner-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New contractor | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewContractorPage() {
  await requirePermission("partners.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/contractors", label: "Contractors" },
          { label: "New contractor" },
        ]}
      />
      <PageHeader
        description="One trade partner record per real person or company. If they also supply materials, tick both capabilities here or add the supplier capability later — never create a second record."
        eyebrow="Operations"
        title="New contractor"
      />
      <PartnerForm
        defaultCapability="contractor"
        initial={emptyPartnerForm}
        mode="create"
        returnHref="/admin/operations/contractors"
      />
    </main>
  );
}
