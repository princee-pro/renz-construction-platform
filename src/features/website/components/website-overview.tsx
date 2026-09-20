import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { PageListItem, WebsiteOverview } from "@/features/website/contracts";

function count(
  block: Readonly<Record<string, number | null>> | null | undefined,
  key: string,
): number {
  return block?.[key] ?? 0;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

const actionLabels: Readonly<Record<string, string>> = {
  "page.create": "created a page",
  "page.update": "edited page settings",
  "page.publish": "published a page",
  "page.unpublish": "unpublished a page",
  "page.archive": "archived a page",
  "section.create": "added a section",
  "section.update": "edited a section",
  "section.reorder": "reordered sections",
  "section.remove": "removed a section",
  "revision.restore": "restored a revision",
  "content.publish": "published content",
  "content.unpublish": "unpublished content",
  "service.update": "edited a service",
  "service.publish": "published service changes",
  "project.update": "edited a project",
  "project.publish": "published project changes",
  "post.update": "edited an insight",
  "post.publish": "published insight changes",
  "post.create": "created an insight",
  "media.register": "uploaded an image",
  "media.rights.update": "confirmed image rights",
  "media.metadata.update": "edited image details",
  "media.archive": "archived an image",
  "media.replace": "replaced an image",
};

/**
 * Website Overview (CR1 §7, §107): counts that mean something to the owner,
 * warnings only where meaningful, quick actions and recent activity. Not
 * analytics — a reading of the public website's state from Admin.
 */
export function WebsiteOverviewView({
  overview,
  pages,
  permissions,
}: Readonly<{
  overview: WebsiteOverview;
  pages: readonly PageListItem[];
  permissions: readonly string[];
}>) {
  const home = pages.find((page) => page.page_key === "home");
  const attention: Array<Readonly<{ label: string; href: string; tone: "warning" | "info" }>> = [];
  const pageDrafts = count(overview.pages, "draft_changes");
  if (pageDrafts > 0)
    attention.push({
      label: `${pageDrafts} page(s) have draft changes not yet published`,
      href: "/admin/website/pages",
      tone: "info",
    });
  const pageErrors = count(overview.pages, "health_errors");
  if (pageErrors > 0)
    attention.push({
      label: `${pageErrors} page(s) reference an image that is not ready or have no sections`,
      href: "/admin/website/pages",
      tone: "warning",
    });
  const seoIssues = count(overview.pages, "seo_issues");
  if (seoIssues > 0)
    attention.push({
      label: `${seoIssues} page(s) are missing a search title or description`,
      href: "/admin/website/sitemap",
      tone: "info",
    });
  const brokenNav = count(overview.navigation, "broken_links");
  if (brokenNav > 0)
    attention.push({
      label: `${brokenNav} navigation link(s) point at an unpublished page`,
      href: "/admin/settings/website?section=navigation",
      tone: "warning",
    });
  if (overview.media) {
    const alt = count(overview.media, "needs_alt");
    if (alt > 0)
      attention.push({
        label: `${alt} image(s) have no alt text`,
        href: "/admin/website/media?filter=needs_alt",
        tone: "info",
      });
    const rights = count(overview.media, "needs_rights");
    if (rights > 0)
      attention.push({
        label: `${rights} image(s) are waiting for rights confirmation`,
        href: "/admin/website/media?filter=needs_rights",
        tone: "info",
      });
  }
  if (overview.projects) {
    const noHero = count(overview.projects, "no_hero");
    if (noHero > 0)
      attention.push({
        label: `${noHero} project(s) have no hero image`,
        href: "/admin/content/projects",
        tone: "info",
      });
    const blocked = count(overview.projects, "blocked");
    if (blocked > 0)
      attention.push({
        label: `${blocked} draft project(s) are not ready to publish yet`,
        href: "/admin/content/projects",
        tone: "info",
      });
  }
  if (overview.insights) {
    const excerpt = count(overview.insights, "missing_excerpt");
    if (excerpt > 0)
      attention.push({
        label: `${excerpt} insight(s) have no excerpt`,
        href: "/admin/content/insights",
        tone: "info",
      });
  }
  if (
    typeof overview.services_without_projects === "number" &&
    overview.services_without_projects > 0
  ) {
    attention.push({
      label: `${overview.services_without_projects} published service(s) have no related published project`,
      href: "/admin/content/projects",
      tone: "info",
    });
  }

  const quick: Array<Readonly<{ label: string; href: string; permission: string }>> = [
    ...(home
      ? [
          {
            label: "Edit Home",
            href: `/admin/website/pages/${home.id}`,
            permission: "website.pages.write",
          },
        ]
      : []),
    { label: "Add Project", href: "/admin/content/projects/new", permission: "content.write" },
    { label: "Add Service", href: "/admin/content/services/new", permission: "content.write" },
    { label: "Write Insight", href: "/admin/content/insights/new", permission: "content.write" },
    { label: "Upload Media", href: "/admin/website/media", permission: "media.upload" },
    { label: "Preview Website", href: "/", permission: "website.read" },
  ];

  return (
    <div className="website-overview">
      <section aria-labelledby="website-counts-title" className="website-overview-block">
        <h2 className="visually-hidden" id="website-counts-title">
          Public content
        </h2>
        <ul className="website-counts">
          <li>
            <span className="website-count-label">Pages published</span>
            <strong>{count(overview.pages, "published")}</strong>
            <small>
              {count(overview.pages, "draft")} unpublished ·{" "}
              {count(overview.pages, "draft_changes")} with draft changes
            </small>
          </li>
          {overview.services ? (
            <li>
              <span className="website-count-label">Services</span>
              <strong>{count(overview.services, "published")}</strong>
              <small>
                {count(overview.services, "draft")} draft ·{" "}
                {count(overview.services, "draft_changes")} with draft changes
              </small>
            </li>
          ) : null}
          {overview.projects ? (
            <li>
              <span className="website-count-label">Projects published</span>
              <strong>{count(overview.projects, "published")}</strong>
              <small>
                {count(overview.projects, "draft")} draft ·{" "}
                {count(overview.projects, "home_featured")} featured on Home
              </small>
            </li>
          ) : null}
          {overview.insights ? (
            <li>
              <span className="website-count-label">Insights published</span>
              <strong>{count(overview.insights, "published")}</strong>
              <small>{count(overview.insights, "draft")} draft</small>
            </li>
          ) : null}
          {overview.media ? (
            <li>
              <span className="website-count-label">Images</span>
              <strong>{count(overview.media, "total")}</strong>
              <small>
                {count(overview.media, "needs_alt")} need alt text ·{" "}
                {count(overview.media, "needs_rights")} need rights
              </small>
            </li>
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="website-quick-title" className="website-overview-block">
        <h2 id="website-quick-title">Quick actions</h2>
        <div className="website-quick-actions">
          {quick
            .filter((entry) => permissions.includes(entry.permission))
            .map((entry) => (
              <Link
                className="button button-secondary"
                href={entry.href}
                key={entry.label}
                {...(entry.href === "/" ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {entry.label}
              </Link>
            ))}
        </div>
      </section>

      <section aria-labelledby="website-attention-title" className="website-overview-block">
        <h2 id="website-attention-title">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="quiet-empty">Nothing needs attention. Every published page is complete.</p>
        ) : (
          <ul className="website-attention">
            {attention.map((entry) => (
              <li key={entry.label}>
                <StatusBadge tone={entry.tone === "warning" ? "blocked" : "review"}>
                  {entry.tone === "warning" ? "Fix" : "Review"}
                </StatusBadge>
                <Link href={entry.href}>{entry.label}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="website-pages-title" className="website-overview-block">
        <h2 id="website-pages-title">Public pages</h2>
        <ol className="website-page-cards">
          {pages
            .filter((page) => page.page_type !== "global")
            .map((page) => (
              <li key={page.id}>
                <Link href={`/admin/website/pages/${page.id}`}>
                  <strong>{page.title}</strong>
                  <span>{page.path}</span>
                </Link>
                <span className="website-page-card-state">
                  <StatusBadge
                    tone={
                      page.status === "published"
                        ? "published"
                        : page.status === "archived"
                          ? "archived"
                          : "draft"
                    }
                  >
                    {page.status === "published"
                      ? "Published"
                      : page.status === "archived"
                        ? "Archived"
                        : "Draft"}
                  </StatusBadge>
                  {page.status === "published" && page.has_draft_changes ? (
                    <StatusBadge tone="review">Draft changes</StatusBadge>
                  ) : null}
                </span>
              </li>
            ))}
        </ol>
      </section>

      <section aria-labelledby="website-activity-title" className="website-overview-block">
        <h2 id="website-activity-title">Recent activity</h2>
        {overview.recent_activity.length === 0 ? (
          <p className="quiet-empty">No website changes recorded yet.</p>
        ) : (
          <ol className="website-activity">
            {overview.recent_activity.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                <time dateTime={entry.at}>{formatDate(entry.at)}</time>
                <span>
                  {entry.actor ?? "Staff"}{" "}
                  {actionLabels[entry.action] ?? entry.action.replace(/[._]/gu, " ")}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="website-help-title" className="website-overview-block website-help">
        <h2 id="website-help-title">How website publishing works</h2>
        <ol>
          <li>
            <strong>Draft.</strong> Edit any page, service, project or insight. Nothing changes for
            visitors.
          </li>
          <li>
            <strong>Preview.</strong> Open the draft with the real website to check it on desktop
            and phone.
          </li>
          <li>
            <strong>Publish.</strong> The whole page goes live at once and a revision is kept.
          </li>
          <li>
            <strong>Revision.</strong> Every publish is listed; restore any revision as a new draft
            and publish again.
          </li>
          <li>
            <strong>Unpublish.</strong> Removes a page, project or insight from the website; the
            draft and history stay in Admin.
          </li>
        </ol>
      </section>
    </div>
  );
}
