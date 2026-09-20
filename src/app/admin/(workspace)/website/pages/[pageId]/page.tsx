import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { PageEditor } from "@/features/website/components/page-editor";
import { loadWebsitePage } from "@/features/website/data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit page | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function WebsitePageEditorPage({
  params,
}: PageProps<"/admin/website/pages/[pageId]">) {
  await requirePermission("website.read");
  const { pageId } = await params;
  if (!z.string().uuid().safeParse(pageId).success) notFound();
  const detail = await loadWebsitePage(pageId);
  if (!detail) notFound();
  const typeLabel =
    detail.page.page_type === "system"
      ? "System page"
      : detail.page.page_type === "content"
        ? "Content page"
        : detail.page.page_type === "custom"
          ? "Custom page"
          : "Global content";
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/website", label: "Website" },
          { href: "/admin/website/pages", label: "Pages" },
          { label: detail.page.title },
        ]}
      />
      <PageHeader
        description={`${typeLabel}${detail.page.page_type === "global" ? "" : ` · ${detail.page.path}`}. Changes remain private until you publish.`}
        eyebrow="Website"
        status={<RealtimeRefresh entityTypes={["website_page"]} />}
        title={detail.page.title}
      />
      <PageEditor detail={detail} />
    </main>
  );
}
