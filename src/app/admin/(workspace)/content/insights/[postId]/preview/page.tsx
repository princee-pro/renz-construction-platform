import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { InsightArticle } from "@/components/site/insight-article";
import { loadInsightDetail } from "@/features/insights/insight-data";
import { loadWebsiteGlobalsPreview } from "@/features/website/data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insight preview | RENZ Administration",
  robots: { index: false, follow: false },
};

/** Staff-only draft preview rendered with the real article component. */
export default async function InsightPreviewPage({
  params,
}: PageProps<"/admin/content/insights/[postId]/preview">) {
  await requirePermission("content.read");
  const { postId } = await params;
  if (!z.string().uuid().safeParse(postId).success) notFound();
  const [detail, globals] = await Promise.all([
    loadInsightDetail(postId),
    loadWebsiteGlobalsPreview(),
  ]);
  if (!detail) notFound();
  const service =
    detail.services.find((entry) => entry.id === detail.post.related_service_id) ?? null;
  return (
    <div className="public-site public-site-preview">
      <div className="preview-bar" role="region" aria-label="Draft preview">
        <p>
          <strong>Previewing draft</strong>
          <span> · {detail.localization.title}</span>
        </p>
        <nav aria-label="Preview actions">
          <Link
            className="preview-bar-link preview-bar-edit"
            href={`/admin/content/insights/${postId}`}
          >
            Edit insight
          </Link>
        </nav>
      </div>
      <InsightArticle
        view={{
          title: detail.localization.title,
          excerpt: detail.localization.excerpt ?? "",
          bodyBlocks: detail.localization.body_blocks,
          topic: detail.post.topic,
          publicationDate: detail.post.publication_date,
          relatedService: service ? { slug: "", name: service.name } : null,
          note: globals.copy.insight_note || null,
          next: null,
          draftPreview: true,
        }}
      />
    </div>
  );
}
