import type { Metadata } from "next";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AssignmentForm } from "@/features/assignments/components/assignment-form";
import { loadProjectDetail } from "@/features/operational-projects/project-data";
import { loadPartnerDetail } from "@/features/partners/partner-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assign contractor | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Project-first (`?project=`) and contractor-first (`?partner=`) entry points
 * preselect their side; the other side is picked in the form. The database
 * re-checks both (active project, contractor capability) on submit.
 */
export default async function NewAssignmentPage({
  searchParams,
}: PageProps<"/admin/operations/assignments/new">) {
  await requirePermission("contractors.assign");
  const params = await searchParams;
  const projectParam = idSchema.safeParse(first(params["project"]));
  const partnerParam = idSchema.safeParse(first(params["partner"]));
  const [project, partner] = await Promise.all([
    projectParam.success ? loadProjectDetail(projectParam.data) : null,
    partnerParam.success ? loadPartnerDetail(partnerParam.data) : null,
  ]);
  const activeProject = project && !project.project.archived_at ? project.project : null;
  const activePartner =
    partner && !partner.partner.archived_at && partner.partner.capabilities.includes("contractor")
      ? partner.partner
      : null;

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/contractors", label: "Contractors" },
          { label: "Assign contractor" },
        ]}
      />
      <PageHeader
        description="An assignment ties one contractor to one project with a scope, schedule, rate and agreed amount. The agreed amount is the financial obligation; payments are recorded against it afterwards."
        eyebrow="Operations"
        title="Assign contractor"
      />
      <AssignmentForm
        initial={{
          projectId: activeProject?.id ?? "",
          projectTitle: activeProject?.title ?? "",
          partnerId: activePartner?.id ?? "",
          partnerLabel: activePartner?.display_name ?? "",
          scope: "",
          specialization: activePartner?.specializations[0] ?? "",
          status: "planned",
          startDate: "",
          endDate: "",
          rateType: "",
          rateAmount: "",
          currency: activeProject?.budget_currency ?? "",
          plannedUnits: "",
          agreedAmount: "",
          paymentTerms: "",
        }}
        mode="create"
      />
    </main>
  );
}
