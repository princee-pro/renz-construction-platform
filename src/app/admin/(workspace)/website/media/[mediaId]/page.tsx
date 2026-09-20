import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MediaDetailView } from "@/features/website/components/media-detail";
import { loadMedia } from "@/features/website/media-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Image | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function WebsiteMediaDetailPage({
  params,
}: PageProps<"/admin/website/media/[mediaId]">) {
  await requirePermission("media.read");
  const { mediaId } = await params;
  if (!z.string().uuid().safeParse(mediaId).success) notFound();
  const [access, media] = await Promise.all([getCurrentAdminAccess(), loadMedia(mediaId)]);
  if (!media) notFound();
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/website", label: "Website" },
          { href: "/admin/website/media", label: "Media" },
          { label: media.alt_text ?? media.filename ?? "Image" },
        ]}
      />
      <PageHeader
        description="Alt text, caption, focal point, rights and everywhere this image is used."
        eyebrow="Media"
        title={media.alt_text ?? media.filename ?? "Image"}
      />
      <MediaDetailView
        canManage={access.permissions.includes("media.manage")}
        canReplace={access.permissions.includes("website.pages.write")}
        media={media}
      />
    </main>
  );
}
