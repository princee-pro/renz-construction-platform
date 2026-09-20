import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { loadProjectContractors } from "@/features/assignments/assignment-data";
import { ProjectCommandCenter } from "@/features/operational-projects/components/project-command-center";
import { loadProjectInvoices } from "@/features/invoices/invoice-data";
import { loadProjectOriginatingLead } from "@/features/leads/lead-data";
import { loadProjectDetail } from "@/features/operational-projects/project-data";
import {
  loadProjectDeliverySummary,
  loadProjectProcurement,
} from "@/features/procurement/procurement-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Project | RENZ Administration",
  robots: { index: false, follow: false },
};

const projectIdSchema = z.string().uuid();

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function OperationalProjectDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/operations/projects/[projectId]">) {
  await requirePermission("operations.projects.read");
  const [route, query] = await Promise.all([params, searchParams]);
  const parsedId = projectIdSchema.safeParse(route.projectId);
  if (!parsedId.success) notFound();
  const [detail, access] = await Promise.all([
    loadProjectDetail(parsedId.data),
    getCurrentAdminAccess(),
  ]);
  if (!detail) notFound();
  const financeRead = access.permissions.includes("finance.invoices.read");
  const partnersRead = access.permissions.includes("partners.read");
  const materialsRead = access.permissions.includes("procurement.materials.read");
  const ordersRead = access.permissions.includes("procurement.orders.read");
  const [invoices, contractors, procurement, deliverySummary, originatingLead] = await Promise.all([
    financeRead ? loadProjectInvoices(parsedId.data) : Promise.resolve(null),
    partnersRead ? loadProjectContractors(parsedId.data) : Promise.resolve(null),
    materialsRead || ordersRead ? loadProjectProcurement(parsedId.data) : Promise.resolve(null),
    loadProjectDeliverySummary(parsedId.data),
    access.permissions.includes("leads.read")
      ? loadProjectOriginatingLead(parsedId.data)
      : Promise.resolve(null),
  ]);

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/projects", label: "Projects" },
          { label: detail.project.title },
        ]}
      />
      <ProjectCommandCenter
        canWrite={access.permissions.includes("operations.projects.write")}
        detail={detail}
        finance={{
          read: financeRead,
          write: access.permissions.includes("finance.invoices.write"),
        }}
        invoices={invoices}
        originatingLead={originatingLead}
        contractors={contractors}
        delivery={{
          partnersRead,
          assign: access.permissions.includes("contractors.assign"),
          materialsRead,
          materialsWrite: access.permissions.includes("procurement.materials.write"),
          ordersRead,
          ordersWrite: access.permissions.includes("procurement.orders.write"),
        }}
        deliverySummary={deliverySummary}
        initialSection={first(query["tab"])}
        procurement={procurement}
      />
    </main>
  );
}
