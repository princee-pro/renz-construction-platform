import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { ProjectPreview } from "@/features/projects/components/project-preview";
import { loadProjectDetail } from "@/features/projects/project-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private project preview | RENZ Administration",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

const projectIdSchema = z.string().uuid();

export default async function ProjectPreviewPage({
  params,
  searchParams,
}: PageProps<"/admin/content/projects/[projectId]/preview">) {
  await requirePermission("content.read");
  const route = await params;
  const id = projectIdSchema.safeParse(route.projectId);
  if (!id.success) notFound();
  const query = await searchParams;
  const rawLocale = query["locale"];
  const localeCandidate = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale;
  const locale =
    localeCandidate && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(localeCandidate)
      ? localeCandidate
      : "en";
  const detail = await loadProjectDetail(id.data, locale);
  if (!detail || !detail.localization) notFound();

  return (
    <div className="workspace-page-preview">
      <div className="public-container">
        <Breadcrumbs
          items={[
            { href: "/admin", label: "Overview" },
            { href: "/admin/content/projects", label: "Projects" },
            {
              href: `/admin/content/projects/${detail.project.id}?locale=${encodeURIComponent(locale)}`,
              label: detail.localization.title,
            },
            { label: "Private preview" },
          ]}
        />
        <div className="preview-toolbar">
          <Link
            className="button button-secondary"
            href={`/admin/content/projects/${detail.project.id}?locale=${encodeURIComponent(locale)}`}
          >
            Return to editor
          </Link>
        </div>
      </div>
      <ProjectPreview detail={{ ...detail, localization: detail.localization }} />
    </div>
  );
}
