import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { InvoiceCommandCenter } from "@/features/invoices/components/invoice-command-center";
import { loadInvoiceDetail } from "@/features/invoices/invoice-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function InvoicePage({
  params,
}: PageProps<"/admin/finance/invoices/[invoiceId]">) {
  await requirePermission("finance.invoices.read");
  const route = await params;
  const parsed = idSchema.safeParse(route.invoiceId);
  if (!parsed.success) notFound();
  const [detail, access] = await Promise.all([
    loadInvoiceDetail(parsed.data),
    getCurrentAdminAccess(),
  ]);
  if (!detail) notFound();

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/finance/invoices", label: "Invoices" },
          { label: detail.invoice.invoice_number ?? "Draft" },
        ]}
      />
      <InvoiceCommandCenter
        detail={detail}
        permissions={{
          write: access.permissions.includes("finance.invoices.write"),
          issue: access.permissions.includes("finance.invoices.issue"),
          payments: access.permissions.includes("finance.payments.write"),
          void: access.permissions.includes("finance.invoices.void"),
        }}
      />
    </main>
  );
}
