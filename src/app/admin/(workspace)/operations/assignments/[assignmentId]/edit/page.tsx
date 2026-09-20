import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { loadAssignmentDetail } from "@/features/assignments/assignment-data";
import { AssignmentForm } from "@/features/assignments/components/assignment-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit assignment | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function EditAssignmentPage({
  params,
}: PageProps<"/admin/operations/assignments/[assignmentId]/edit">) {
  await requirePermission("contractors.assign");
  const route = await params;
  const parsed = idSchema.safeParse(route.assignmentId);
  if (!parsed.success) notFound();
  const detail = await loadAssignmentDetail(parsed.data);
  if (!detail) notFound();
  const assignment = detail.assignment;
  if (assignment.status === "cancelled" || assignment.archived_at) {
    redirect(`/admin/operations/assignments/${assignment.id}`);
  }
  const financeLocked = detail.payments.some((payment) => !payment.reversed_at);

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/contractors", label: "Contractors" },
          {
            href: `/admin/operations/contractors/${detail.partner.id}`,
            label: detail.partner.display_name,
          },
          { href: `/admin/operations/assignments/${assignment.id}`, label: "Assignment" },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description={
          financeLocked
            ? "Payments have been recorded: the currency is frozen and the agreed amount changes only through the audited Adjust action on the assignment page."
            : "Scope, schedule, rate and agreed amount. Another staff member's save in the meantime is reported as a conflict, never overwritten."
        }
        eyebrow="Contractor assignment"
        title={`Edit assignment · ${detail.partner.display_name}`}
      />
      <AssignmentForm
        assignmentId={assignment.id}
        financeLocked={financeLocked}
        initial={{
          projectId: detail.project.id,
          projectTitle: detail.project.title,
          partnerId: detail.partner.id,
          partnerLabel: detail.partner.display_name,
          scope: assignment.scope,
          specialization: assignment.specialization ?? "",
          status: assignment.status,
          startDate: assignment.start_date ?? "",
          endDate: assignment.end_date ?? "",
          rateType: assignment.rate_type ?? "",
          rateAmount: assignment.rate_amount === null ? "" : String(assignment.rate_amount),
          currency: assignment.currency ?? "",
          plannedUnits: assignment.planned_units === null ? "" : String(assignment.planned_units),
          agreedAmount: assignment.agreed_amount === null ? "" : String(assignment.agreed_amount),
          paymentTerms: assignment.payment_terms ?? "",
        }}
        mode="edit"
        version={assignment.version}
      />
    </main>
  );
}
