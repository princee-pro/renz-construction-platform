import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { InvoiceEditor } from "@/features/invoices/components/invoice-editor";
import { newLine } from "@/features/invoices/invoice-editor-model";
import { loadInvoiceDetail } from "@/features/invoices/invoice-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit draft invoice | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function EditInvoicePage({
  params,
}: PageProps<"/admin/finance/invoices/[invoiceId]/edit">) {
  await requirePermission("finance.invoices.write");
  const route = await params;
  const parsed = idSchema.safeParse(route.invoiceId);
  if (!parsed.success) notFound();
  const detail = await loadInvoiceDetail(parsed.data);
  if (!detail) notFound();
  // Issued and void invoices are financially immutable: there is nothing to edit.
  if (detail.invoice.lifecycle_state !== "draft" || detail.invoice.archived_at) {
    redirect(`/admin/finance/invoices/${detail.invoice.id}`);
  }

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/finance/invoices", label: "Invoices" },
          { href: `/admin/finance/invoices/${detail.invoice.id}`, label: "Draft" },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Changes are saved as a new draft version. Another staff member's save in the meantime is reported as a conflict, never overwritten."
        eyebrow="Draft invoice"
        title={`Edit draft for ${detail.client.full_name}`}
      />
      <InvoiceEditor
        initial={{
          clientId: detail.client.id,
          clientLabel: detail.client.full_name,
          projectId: detail.project?.id ?? "",
          currency: detail.invoice.currency,
          taxRate: String(detail.invoice.tax_rate),
          reference: detail.invoice.reference ?? "",
          notes: detail.invoice.notes ?? "",
          paymentTerms: detail.invoice.payment_terms ?? "",
          issueDate: detail.invoice.issue_date ?? "",
          dueDate: detail.invoice.due_date ?? "",
          lines:
            detail.lines.length > 0
              ? detail.lines.map((line) =>
                  newLine({
                    key: line.id,
                    description: line.description,
                    quantity: String(line.quantity),
                    unit_label: line.unit_label ?? "",
                    unit_price: String(line.unit_price),
                  }),
                )
              : [newLine()],
        }}
        invoiceId={detail.invoice.id}
        mode="edit"
        version={detail.invoice.version}
      />
    </main>
  );
}
