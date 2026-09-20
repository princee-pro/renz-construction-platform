import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { CreatePageForm } from "@/features/website/components/create-page-form";
import { PageList } from "@/features/website/components/page-list";
import { WebsiteNav } from "@/features/website/components/website-nav";
import { loadWebsitePages } from "@/features/website/data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pages | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function WebsitePagesPage() {
  await requirePermission("website.read");
  const [access, pages] = await Promise.all([getCurrentAdminAccess(), loadWebsitePages()]);
  const canWrite = access.permissions.includes("website.pages.write");
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/website", label: "Website" },
          { label: "Pages" },
        ]}
      />
      <PageHeader
        description="Every public page, its published state and any draft changes. System pages stay online; content and custom pages can be created, unpublished and archived."
        eyebrow="Website"
        status={<RealtimeRefresh entityTypes={["website_page"]} />}
        title="Pages"
      />
      <WebsiteNav current="pages" permissions={access.permissions} />
      <PageList pages={pages} />
      {canWrite ? <CreatePageForm /> : null}
    </main>
  );
}
