import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { WebsiteOverviewView } from "@/features/website/components/website-overview";
import { WebsiteNav } from "@/features/website/components/website-nav";
import { loadWebsiteOverview, loadWebsitePages } from "@/features/website/data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function WebsiteOverviewPage() {
  await requirePermission("website.read");
  const [access, overview, pages] = await Promise.all([
    getCurrentAdminAccess(),
    loadWebsiteOverview(),
    loadWebsitePages(),
  ]);
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Website" }]} />
      <PageHeader
        description="Read, edit, preview, publish and roll back every public page from here. Changes remain private until you publish."
        eyebrow="Website"
        status={<RealtimeRefresh entityTypes={["website_page", "settings"]} />}
        title="Website control center"
      />
      <WebsiteNav current="overview" permissions={access.permissions} />
      {overview ? (
        <WebsiteOverviewView overview={overview} pages={pages} permissions={access.permissions} />
      ) : (
        <p className="quiet-empty" role="alert">
          The website overview could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
