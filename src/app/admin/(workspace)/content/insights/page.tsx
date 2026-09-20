import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { InsightListView } from "@/features/insights/components/insight-list";
import { loadInsightList } from "@/features/insights/insight-data";
import { WebsiteNav } from "@/features/website/components/website-nav";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights | RENZ Administration",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function InsightsPage({ searchParams }: PageProps<"/admin/content/insights">) {
  await requirePermission("content.read");
  const params = await searchParams;
  const query = first(params["q"]).slice(0, 100);
  const status = first(params["status"]);
  const [access, list] = await Promise.all([
    getCurrentAdminAccess(),
    loadInsightList(query, status),
  ]);
  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/website", label: "Website" },
          { label: "Insights" },
        ]}
      />
      <PageHeader
        actions={
          access.permissions.includes("content.write") ? (
            <Link className="button button-primary" href="/admin/content/insights/new">
              New insight
            </Link>
          ) : null
        }
        description="Articles on the Insights page. Write, preview, publish; the index places featured and pinned articles first, then the newest."
        eyebrow="Website"
        title="Insights"
      />
      <WebsiteNav current="insights" permissions={access.permissions} />
      <form action="/admin/content/insights" className="service-filters" method="get" role="search">
        <div className="field-group filter-search">
          <label htmlFor="insight-search">Search insights</label>
          <input
            autoComplete="off"
            defaultValue={query}
            id="insight-search"
            maxLength={100}
            name="q"
            placeholder="Title or address"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="insight-status">Status</label>
          <select defaultValue={status || "all"} id="insight-status" name="status">
            <option value="all">
              All ({list.counts.draft + list.counts.published + list.counts.archived})
            </option>
            <option value="draft">Draft ({list.counts.draft})</option>
            <option value="published">Published ({list.counts.published})</option>
            <option value="archived">Archived ({list.counts.archived})</option>
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
      </form>
      <section aria-label="Insights" className="register-section">
        <InsightListView list={list} />
      </section>
    </main>
  );
}
