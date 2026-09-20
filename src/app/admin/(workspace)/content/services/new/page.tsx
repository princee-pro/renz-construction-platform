import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CreateServiceForm } from "@/features/services/components/create-service-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New service | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewServicePage() {
  await requirePermission("content.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/services", label: "Services" },
          { label: "New draft" },
        ]}
      />
      <PageHeader
        description="Create the minimum private identity, then complete and review the draft in the editor."
        eyebrow="Services"
        title="New service draft"
      />
      <CreateServiceForm />
    </main>
  );
}
