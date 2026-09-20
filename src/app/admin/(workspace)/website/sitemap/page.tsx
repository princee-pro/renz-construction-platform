import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { SitemapTable } from "@/features/website/components/sitemap-table";
import { WebsiteNav } from "@/features/website/components/website-nav";
import { loadWebsiteSitemap } from "@/features/website/data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site map | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function WebsiteSitemapPage() {
  await requirePermission("website.read");
  const [access, rows] = await Promise.all([getCurrentAdminAccess(), loadWebsiteSitemap()]);
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/website", label: "Website" },
          { label: "Site map" },
        ]}
      />
      <PageHeader
        description="Every public address on the website: pages, services, projects, insights and legal pages, with their published state, draft changes, SEO state and the place to edit them."
        eyebrow="Website"
        title="Site map"
      />
      <WebsiteNav current="sitemap" permissions={access.permissions} />
      <SitemapTable rows={rows} />
    </main>
  );
}
