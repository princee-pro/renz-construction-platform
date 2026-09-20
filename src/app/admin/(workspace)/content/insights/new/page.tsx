import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CreateInsightForm } from "@/features/insights/components/create-insight-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New insight | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewInsightPage() {
  await requirePermission("content.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/insights", label: "Insights" },
          { label: "New insight" },
        ]}
      />
      <PageHeader
        description="Start with a title and an address; write the article on the next screen. Nothing is public until you publish."
        eyebrow="Insights"
        title="New insight"
      />
      <CreateInsightForm />
    </main>
  );
}
