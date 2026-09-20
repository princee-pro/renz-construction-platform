import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PrintButton } from "@/features/invoices/components/print-button";
import { PurchaseOrderDocumentView } from "@/features/procurement/components/po-document";
import { loadPoDetail } from "@/features/procurement/procurement-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print purchase order | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

/** Clean print view of the issued document (or a draft preview). */
export default async function PrintPurchaseOrderPage({
  params,
}: PageProps<"/admin/procurement/orders/[orderId]/print">) {
  await requirePermission("procurement.orders.read");
  const route = await params;
  const parsed = idSchema.safeParse(route.orderId);
  if (!parsed.success) notFound();
  const detail = await loadPoDetail(parsed.data);
  if (!detail) notFound();
  const order = detail.purchase_order;

  const draftPreview =
    order.lifecycle_state === "draft"
      ? {
          id: order.id,
          purchase_order_number: null,
          lifecycle_state: "draft" as const,
          currency: order.currency,
          tax_rate: order.tax_rate,
          issue_date: order.issue_date,
          expected_delivery_date: order.expected_delivery_date,
          reference: order.reference,
          notes: order.notes,
          terms: order.terms,
          cancelled_at: null,
          closed_at: null,
          issuer: { name: "RENZ Construction Services Ltd", tax_label: "Tax" },
          supplier: {
            display_name: detail.supplier.display_name,
            ...(detail.supplier.company_name ? { company_name: detail.supplier.company_name } : {}),
            ...(detail.supplier.email ? { email: detail.supplier.email } : {}),
            ...(detail.supplier.phone_display ? { phone: detail.supplier.phone_display } : {}),
          },
          project: { title: detail.project.title },
          lines: detail.lines.map((line) => ({ ...line, received_quantity: 0 })),
          subtotal: detail.financials.subtotal,
          tax_amount: detail.financials.tax_amount,
          total: detail.financials.total,
          delivery_state: "not_received" as const,
        }
      : null;
  const document = draftPreview ?? detail.document;
  if (!document) notFound();

  return (
    <main className="workspace-page print-page" id="main-content">
      <div className="print-toolbar">
        <Link className="button button-quiet" href={`/admin/procurement/orders/${order.id}`}>
          Back to purchase order
        </Link>
        <PrintButton />
        {order.lifecycle_state !== "draft" ? (
          <a className="button button-secondary" href={`/admin/procurement/orders/${order.id}/pdf`}>
            Download PDF
          </a>
        ) : null}
      </div>
      <PurchaseOrderDocumentView document={document} variant="print" />
    </main>
  );
}
