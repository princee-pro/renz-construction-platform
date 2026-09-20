import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { PublishPanel } from "@/features/settings/components/publish-panel";
import { WebsiteSettingsView } from "@/features/settings/components/website-settings";
import { loadWebsiteSettings } from "@/features/settings/settings-data";
import { loadWebsitePages } from "@/features/website/data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Page({ searchParams }: PageProps<"/admin/settings/website">) {
  await requirePermission("settings.website.read");
  const [params, access, data, pages] = await Promise.all([
    searchParams,
    getCurrentAdminAccess(),
    loadWebsiteSettings(),
    loadWebsitePages().catch(() => []),
  ]);
  // Custom / content pages the owner can add to the navigation (published only; CR1 §61, §79).
  const customPages = pages
    .filter(
      (page) =>
        (page.page_type === "custom" || page.page_type === "content") &&
        page.status === "published",
    )
    .map((page) => ({
      key: `page:${page.path.replace(/^\//u, "")}`,
      title: page.title,
      path: page.path,
    }));
  const section = first(params["section"]);
  void section;
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/settings", label: "Settings" },
          { label: "Website" },
        ]}
      />
      <PageHeader
        description="Website copy and calls to action, navigation, brand media, SEO and the preview / live site mode."
        eyebrow="Settings"
        status={<RealtimeRefresh entityTypes={["settings"]} />}
        title="Website"
      />
      <SettingsNav current="website" permissions={access.permissions} />
      {data ? (
        <>
          <PublishPanel
            canPublish={access.permissions.includes("settings.website.write")}
            hasUnpublishedChanges={
              JSON.stringify({
                ...data.published,
                published_at: undefined,
                snapshot_id: undefined,
              }) !== JSON.stringify(data.preview)
            }
            publishedAt={data.published.published_at ?? null}
          />
          <WebsiteSettingsView
            canWrite={
              access.permissions.includes("settings.website.write") ||
              access.permissions.includes("website.navigation.write")
            }
            customPages={customPages}
            data={data}
            initialSection={section}
          />
        </>
      ) : (
        <p className="quiet-empty" role="alert">
          Website could not be loaded. Try again; the public site is unaffected.
        </p>
      )}
    </main>
  );
}
