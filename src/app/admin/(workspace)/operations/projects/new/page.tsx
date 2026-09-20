import type { Metadata } from "next";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CreateProjectForm } from "@/features/operational-projects/components/create-project-form";
import { loadClientDetail } from "@/features/clients/client-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New project | RENZ Administration",
  robots: { index: false, follow: false },
};

const clientIdSchema = z.string().uuid();

export default async function NewOperationalProjectPage({
  searchParams,
}: PageProps<"/admin/operations/projects/new">) {
  await requirePermission("operations.projects.write");
  const params = await searchParams;
  const rawClient = params["client"];
  const candidateClientId = Array.isArray(rawClient) ? rawClient[0] : rawClient;
  const parsedClientId = candidateClientId ? clientIdSchema.safeParse(candidateClientId) : null;
  const preselectedClient =
    parsedClientId && parsedClientId.success ? await loadClientDetail(parsedClientId.data) : null;

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/projects", label: "Projects" },
          { label: "New project" },
        ]}
      />
      <PageHeader
        description="Attach this project to an existing client. Status, phase, and priority default to the earliest sensible values."
        eyebrow="Projects"
        title="Create operational project"
      />
      <CreateProjectForm
        initialClientId={preselectedClient?.client.id}
        initialClientLabel={preselectedClient?.client.full_name}
      />
    </main>
  );
}
