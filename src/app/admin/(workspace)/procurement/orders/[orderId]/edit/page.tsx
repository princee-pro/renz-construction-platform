import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PurchaseOrderEditor } from "@/features/procurement/components/po-editor";
import { newPoLine, orderableRequirements } from "@/features/procurement/po-editor-model";
import { loadPoDetail, loadProjectProcurement } from "@/features/procurement/procurement-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit draft purchase order | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function EditPurchaseOrderPage({
  params,
}: PageProps<"/admin/procurement/orders/[orderId]/edit">) {
  await requirePermission("procurement.orders.write");
  const route = await params;
  const parsed = idSchema.safeParse(route.orderId);
  if (!parsed.success) notFound();
  const detail = await loadPoDetail(parsed.data);
  if (!detail) notFound();
  // Issued, cancelled and closed orders are immutable: there is nothing to edit.
  if (detail.purchase_order.lifecycle_state !== "draft") {
    redirect(`/admin/procurement/orders/${detail.purchase_order.id}`);
  }
  const procurement = await loadProjectProcurement(detail.project.id);
  const requirements = procurement ? orderableRequirements(procurement.requirements) : [];
  const order = detail.purchase_order;

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/orders", label: "Purchase Orders" },
          { href: `/admin/procurement/orders/${order.id}`, label: "Draft" },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Changes are saved as a new draft version. Another staff member's save in the meantime is reported as a conflict, never overwritten."
        eyebrow="Draft purchase order"
        title={`Edit draft for ${detail.supplier.display_name}`}
      />
      <PurchaseOrderEditor
        initial={{
          projectId: detail.project.id,
          projectTitle: detail.project.title,
          supplierId: detail.supplier.id,
          supplierLabel: detail.supplier.display_name,
          currency: order.currency,
          taxRate: String(order.tax_rate),
          reference: order.reference ?? "",
          expectedDeliveryDate: order.expected_delivery_date ?? "",
          notes: order.notes ?? "",
          terms: order.terms ?? "",
          lines: detail.lines.map((line) =>
            newPoLine({
              key: line.id,
              description: line.description,
              quantity: String(line.quantity),
              unit_label: line.unit_label,
              unit_price: String(line.unit_price),
              material_requirement_id: line.material_requirement_id ?? "",
              material_id: line.material_id ?? "",
              over_order_confirmed: line.over_order_confirmed,
              requirement_label: line.requirement
                ? `${line.requirement.item_name} · ${line.requirement.required_quantity} ${line.requirement.unit_label} required`
                : "",
              requirement_remaining:
                requirements.find((entry) => entry.id === line.material_requirement_id)
                  ?.remaining_to_order ?? "",
            }),
          ),
          requirements,
          preselectedRequirementId: "",
        }}
        mode="edit"
        orderId={order.id}
        version={order.version}
      />
    </main>
  );
}
