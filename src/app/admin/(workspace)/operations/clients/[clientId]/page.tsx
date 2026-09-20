import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { ClientDetailView } from "@/features/clients/components/client-detail";
import { loadClientDetail } from "@/features/clients/client-data";
import { loadClientInvoices } from "@/features/invoices/invoice-data";
import { loadClientLeads } from "@/features/leads/lead-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Client | RENZ Administration",
  robots: { index: false, follow: false },
};

const clientIdSchema = z.string().uuid();

export default async function ClientDetailPage({
  params,
}: PageProps<"/admin/operations/clients/[clientId]">) {
  await requirePermission("clients.read");
  const route = await params;
  const parsedId = clientIdSchema.safeParse(route.clientId);
  if (!parsedId.success) notFound();
  const [detail, access] = await Promise.all([
    loadClientDetail(parsedId.data),
    getCurrentAdminAccess(),
  ]);
  if (!detail) notFound();
  const financeRead = access.permissions.includes("finance.invoices.read");
  const [invoices, originatingLeads] = await Promise.all([
    financeRead ? loadClientInvoices(parsedId.data) : Promise.resolve(null),
    access.permissions.includes("leads.read")
      ? loadClientLeads(parsedId.data)
      : Promise.resolve(null),
  ]);

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/clients", label: "Clients" },
          { label: detail.client.full_name },
        ]}
      />
      <ClientDetailView
        canWrite={access.permissions.includes("clients.write")}
        detail={detail}
        finance={{
          read: financeRead,
          write: access.permissions.includes("finance.invoices.write"),
        }}
        invoices={invoices}
        originatingLeads={originatingLeads}
      />
    </main>
  );
}
