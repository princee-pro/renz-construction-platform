import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New project | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewProjectPage() {
  await requirePermission("content.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/projects", label: "Projects" },
          { label: "New draft" },
        ]}
      />
      <PageHeader
        description="Create the minimum private identity, then complete story, media, services, and review in the editor."
        eyebrow="Case studies"
        title="New case study draft"
      />
      <CreateProjectForm />
    </main>
  );
}
