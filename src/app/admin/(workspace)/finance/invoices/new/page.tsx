import type { Metadata } from "next";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { loadClientDetail } from "@/features/clients/client-data";
import { InvoiceEditor } from "@/features/invoices/components/invoice-editor";
import { newLine } from "@/features/invoices/invoice-editor-model";
import { loadProjectDetail } from "@/features/operational-projects/project-data";
import { loadDocumentDefaults } from "@/features/settings/settings-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New invoice | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Client-first (`?client=`) and project-first (`?project=`) entry points
 * preselect the relationship; the project's client always wins so the pair
 * can never disagree before the database checks it again.
 */
export default async function NewInvoicePage({
  searchParams,
}: PageProps<"/admin/finance/invoices/new">) {
  await requirePermission("finance.invoices.write");
  const params = await searchParams;
  const projectParam = idSchema.safeParse(first(params["project"]));
  const clientParam = idSchema.safeParse(first(params["client"]));

  const [project, defaults] = await Promise.all([
    projectParam.success ? loadProjectDetail(projectParam.data) : null,
    loadDocumentDefaults(),
  ]);
  const clientId = project?.client.id ?? (clientParam.success ? clientParam.data : "");
  const client = clientId ? await loadClientDetail(clientId) : null;
  const activeClient = client && !client.client.archived_at ? client.client : null;

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/finance/invoices", label: "Invoices" },
          { label: "New invoice" },
        ]}
      />
      <PageHeader
        description="Save a draft first. Issuing assigns the official number, freezes the details, and makes the invoice shareable with the client."
        eyebrow="Finance"
        title="New invoice"
      />
      <InvoiceEditor
        initial={{
          clientId: activeClient?.id ?? "",
          clientLabel: activeClient?.full_name ?? "",
          projectId:
            project && !project.project.archived_at && activeClient ? project.project.id : "",
          currency: project?.project.budget_currency ?? defaults?.default_currency ?? "",
          taxRate: defaults ? String(defaults.invoice_tax_rate) : "0",
          reference: "",
          notes: "",
          paymentTerms: defaults?.invoice_payment_terms ?? "",
          issueDate: "",
          dueDate: "",
          lines: [newLine()],
        }}
        mode="create"
      />
    </main>
  );
}
