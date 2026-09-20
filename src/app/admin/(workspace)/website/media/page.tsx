import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MediaLibrary } from "@/features/website/components/media-library";
import { WebsiteNav } from "@/features/website/components/website-nav";
import { loadMediaList, mediaFilters, type MediaFilter } from "@/features/website/media-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function WebsiteMediaPage({
  searchParams,
}: PageProps<"/admin/website/media">) {
  await requirePermission("media.read");
  const params = await searchParams;
  const query = first(params["q"]).slice(0, 100);
  const filterValue = first(params["filter"]);
  const filter: MediaFilter = (mediaFilters as readonly string[]).includes(filterValue)
    ? (filterValue as MediaFilter)
    : "all";
  const [access, list] = await Promise.all([getCurrentAdminAccess(), loadMediaList(query, filter)]);
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/website", label: "Website" },
          { label: "Media" },
        ]}
      />
      <PageHeader
        description="Upload images, write alt text, set the focal point, confirm rights and see where each image is used. An image in use can be replaced but never deleted by accident."
        eyebrow="Website"
        title="Media library"
      />
      <WebsiteNav current="media" permissions={access.permissions} />
      <MediaLibrary
        canManage={access.permissions.includes("media.manage")}
        canUpload={access.permissions.includes("media.upload")}
        filter={filter}
        list={list}
        query={query}
      />
    </main>
  );
}
