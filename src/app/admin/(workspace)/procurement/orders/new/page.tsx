import type { Metadata } from "next";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { loadProjectDetail } from "@/features/operational-projects/project-data";
import { loadPartnerDetail } from "@/features/partners/partner-data";
import { PurchaseOrderEditor } from "@/features/procurement/components/po-editor";
import { orderableRequirements } from "@/features/procurement/po-editor-model";
import { loadProjectProcurement } from "@/features/procurement/procurement-data";
import { dateAfterDays, loadDocumentDefaults } from "@/features/settings/settings-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New purchase order | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Project-first (`?project=` and optionally `?requirement=`) and supplier-
 * first (`?supplier=`) entry points preselect their side. Approved
 * requirements of the project are offered as order lines; the database
 * re-checks project membership and approval on save.
 */
export default async function NewPurchaseOrderPage({
  searchParams,
}: PageProps<"/admin/procurement/orders/new">) {
  await requirePermission("procurement.orders.write");
  const params = await searchParams;
  const projectParam = idSchema.safeParse(first(params["project"]));
  const supplierParam = idSchema.safeParse(first(params["supplier"]));
  const requirementParam = idSchema.safeParse(first(params["requirement"]));
  const [project, supplier, procurement, defaults] = await Promise.all([
    projectParam.success ? loadProjectDetail(projectParam.data) : null,
    supplierParam.success ? loadPartnerDetail(supplierParam.data) : null,
    projectParam.success ? loadProjectProcurement(projectParam.data) : null,
    loadDocumentDefaults(),
  ]);
  const expectedDelivery = defaults ? dateAfterDays(defaults.po_expected_delivery_days) : "";
  const activeProject = project && !project.project.archived_at ? project.project : null;
  const activeSupplier =
    supplier && !supplier.partner.archived_at && supplier.partner.capabilities.includes("supplier")
      ? supplier.partner
      : null;

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/orders", label: "Purchase Orders" },
          { label: "New purchase order" },
        ]}
      />
      <PageHeader
        description="Save a draft first. Issuing assigns the official RENZ-PO number, freezes the details, and makes the order shareable with the supplier."
        eyebrow="Procurement"
        title="New purchase order"
      />
      <PurchaseOrderEditor
        initial={{
          projectId: activeProject?.id ?? "",
          projectTitle: activeProject?.title ?? "",
          supplierId: activeSupplier?.id ?? "",
          supplierLabel: activeSupplier?.display_name ?? "",
          currency: activeProject?.budget_currency ?? defaults?.default_currency ?? "",
          taxRate: defaults ? String(defaults.po_tax_rate) : "0",
          reference: "",
          expectedDeliveryDate: expectedDelivery,
          notes: "",
          terms: defaults?.po_terms ?? "",
          lines: [],
          requirements:
            activeProject && procurement ? orderableRequirements(procurement.requirements) : [],
          preselectedRequirementId: requirementParam.success ? requirementParam.data : "",
        }}
        mode="create"
      />
    </main>
  );
}
