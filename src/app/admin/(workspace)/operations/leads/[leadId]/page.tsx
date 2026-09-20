import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { Lead360 } from "@/features/leads/components/lead-360";
import { loadLeadAssignees, loadLeadDetail } from "@/features/leads/lead-data";
import { requirePermission } from "@/lib/auth/guards";
import { loadBusinessTimezone } from "@/lib/time/business-timezone-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Lead | RENZ Administration",
  robots: { index: false, follow: false },
};

const leadIdSchema = z.string().uuid();

export default async function LeadDetailPage({
  params,
}: PageProps<"/admin/operations/leads/[leadId]">) {
  const snapshot = await requirePermission("leads.read");
  const route = await params;
  const parsedId = leadIdSchema.safeParse(route.leadId);
  if (!parsedId.success) notFound();
  const [detail, assignees, timeZone] = await Promise.all([
    loadLeadDetail(parsedId.data),
    loadLeadAssignees(),
    loadBusinessTimezone(),
  ]);
  if (!detail) notFound();
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/leads", label: "Leads" },
          { label: detail.lead.reference },
        ]}
      />
      <Lead360
        assignees={assignees}
        currentUserId={snapshot.userId}
        detail={detail}
        timeZone={timeZone}
      />
    </main>
  );
}
