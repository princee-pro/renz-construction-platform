import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ContentRevisionsPanel } from "@/features/content-revisions/components/content-revisions-panel";
import { loadContentRevisions } from "@/features/content-revisions/revision-data";
import { ProjectEditor } from "@/features/projects/components/project-editor";
import { ProjectPlacementForm } from "@/features/projects/components/project-placement-form";
import { loadProjectPresentation } from "@/features/projects/project-presentation";
import { loadOperationalProjectForCaseStudy } from "@/features/operational-projects/project-data";
import {
  projectPhaseLabels,
  projectStatusLabels,
} from "@/features/operational-projects/project-contract";
import { loadPublishableServices, loadProjectDetail } from "@/features/projects/project-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Case study editor | RENZ Administration",
  robots: { index: false, follow: false },
};

const projectIdSchema = z.string().uuid();

function localeFrom(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(candidate) ? candidate : "en";
}

export default async function ProjectEditorPage({
  params,
  searchParams,
}: PageProps<"/admin/content/projects/[projectId]">) {
  await requirePermission("content.read");
  const route = await params;
  const parsedId = projectIdSchema.safeParse(route.projectId);
  if (!parsedId.success) notFound();
  const query = await searchParams;
  const locale = localeFrom(query["locale"]);
  const [detail, access, availableServices, operationalProject, presentation, revisions] =
    await Promise.all([
      loadProjectDetail(parsedId.data, locale),
      getCurrentAdminAccess(),
      loadPublishableServices(),
      loadOperationalProjectForCaseStudy(parsedId.data),
      loadProjectPresentation(parsedId.data),
      loadContentRevisions("project", parsedId.data),
    ]);
  if (!detail || !detail.localization) notFound();
  const typedDetail = { ...detail, localization: detail.localization };

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/projects", label: "Projects" },
          { label: detail.localization.title },
        ]}
      />
      <PageHeader
        actions={
          <>
            <Link
              className="button button-secondary"
              href={`/admin/content/projects/${detail.project.id}/preview?locale=${encodeURIComponent(locale)}`}
            >
              Private preview
            </Link>
            <Link className="button button-secondary" href="/admin/content/projects">
              Back to register
            </Link>
          </>
        }
        description="Edit the project, upload media, relate services and choose its website placement, then publish. A published project stays online while you work; changes go live when you publish them."
        eyebrow="Project editor"
        title={detail.localization.title}
      />
      {operationalProject ? (
        <aside
          aria-labelledby="linked-operational-project-heading"
          className="admin-panel linked-record-panel"
        >
          <div>
            <p className="eyebrow">Operational project</p>
            <h2 id="linked-operational-project-heading">{operationalProject.title}</h2>
            <p className="page-description">
              This case study is the public representation of a private operational project (
              {projectStatusLabels[operationalProject.status]} ·{" "}
              {projectPhaseLabels[operationalProject.current_phase]}
              {operationalProject.archived_at ? " · Archived" : ""}). Client identity, budget, and
              notes stay on the operational record and never enter this public content.
            </p>
          </div>
          <Link
            className="button button-secondary"
            href={`/admin/operations/projects/${operationalProject.id}`}
          >
            Open operational project
          </Link>
        </aside>
      ) : null}
      <ProjectEditor
        studyProject={presentation ? presentation.evidence_class !== "real_project" : false}
        availableServices={availableServices}
        canArchive={access.permissions.includes("content.archive")}
        canPublish={access.permissions.includes("content.publish")}
        canVerify={access.permissions.includes("claims.verify")}
        canWrite={access.permissions.includes("content.write")}
        detail={typedDetail}
        placementPanel={
          presentation ? (
            <ProjectPlacementForm
              canWrite={
                access.permissions.includes("content.write") &&
                detail.project.publication_status !== "archived"
              }
              presentation={presentation}
              projectId={detail.project.id}
              projectVersion={detail.project.version}
            />
          ) : null
        }
        revisionsPanel={
          <ContentRevisionsPanel
            canPublish={access.permissions.includes("content.publish")}
            contentType="project"
            ready={detail.readiness.ready}
            revisions={revisions}
            status={detail.project.publication_status}
            targetId={detail.project.id}
            version={detail.project.version}
          />
        }
      />
    </main>
  );
}
