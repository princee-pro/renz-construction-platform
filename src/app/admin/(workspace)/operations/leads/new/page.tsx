import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CreateLeadForm } from "@/features/leads/components/create-lead-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New lead | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewLeadPage() {
  await requirePermission("leads.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/leads", label: "Leads" },
          { label: "New lead" },
        ]}
      />
      <PageHeader
        description="Record an enquiry that arrived by WhatsApp, phone, referral or in person. Website submissions arrive here on their own."
        eyebrow="Operations"
        title="New lead"
      />
      <CreateLeadForm />
    </main>
  );
}
