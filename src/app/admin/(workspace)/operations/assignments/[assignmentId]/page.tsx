import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { loadAssignmentDetail } from "@/features/assignments/assignment-data";
import { AssignmentCommandView } from "@/features/assignments/components/assignment-command-view";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contractor assignment | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function AssignmentPage({
  params,
}: PageProps<"/admin/operations/assignments/[assignmentId]">) {
  await requirePermission("partners.read");
  const route = await params;
  const parsed = idSchema.safeParse(route.assignmentId);
  if (!parsed.success) notFound();
  const [detail, access] = await Promise.all([
    loadAssignmentDetail(parsed.data),
    getCurrentAdminAccess(),
  ]);
  if (!detail) notFound();

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
          { label: "Assignment" },
        ]}
      />
      <AssignmentCommandView
        detail={detail}
        permissions={{
          assign: access.permissions.includes("contractors.assign"),
          payments: access.permissions.includes("contractors.payments.write"),
        }}
      />
    </main>
  );
}
