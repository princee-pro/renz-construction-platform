import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ContentRevisionsPanel } from "@/features/content-revisions/components/content-revisions-panel";
import { loadContentRevisions } from "@/features/content-revisions/revision-data";
import { InsightEditor } from "@/features/insights/components/insight-editor";
import { loadInsightDetail } from "@/features/insights/insight-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insight editor | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function InsightEditorPage({
  params,
}: PageProps<"/admin/content/insights/[postId]">) {
  await requirePermission("content.read");
  const { postId } = await params;
  if (!z.string().uuid().safeParse(postId).success) notFound();
  const [detail, access, revisions] = await Promise.all([
    loadInsightDetail(postId),
    getCurrentAdminAccess(),
    loadContentRevisions("post", postId),
  ]);
  if (!detail) notFound();
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/insights", label: "Insights" },
          { label: detail.localization.title },
        ]}
      />
      <PageHeader
        actions={
          <Link className="button button-secondary" href="/admin/content/insights">
            Back to insights
          </Link>
        }
        description="Write and save the article, preview it, mark it reviewed, then publish. A published article stays online while you work; changes go live when you publish them."
        eyebrow="Insight editor"
        title={detail.localization.title}
      />
      <InsightEditor
        canArchive={access.permissions.includes("content.archive")}
        canPublish={access.permissions.includes("content.publish")}
        canWrite={access.permissions.includes("content.write")}
        detail={detail}
        revisionsPanel={
          <ContentRevisionsPanel
            canPublish={access.permissions.includes("content.publish")}
            contentType="post"
            ready={detail.readiness.ready}
            revisions={revisions}
            status={detail.post.publication_status}
            targetId={detail.post.id}
            version={detail.post.version}
          />
        }
      />
    </main>
  );
}
