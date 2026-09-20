import Link from "next/link";

import type { AdminPermission } from "@/lib/auth/permissions";

const entries: readonly Readonly<{
  key: string;
  href: string;
  label: string;
  permission: AdminPermission;
}>[] = [
  { key: "overview", href: "/admin/website", label: "Overview", permission: "website.read" },
  { key: "pages", href: "/admin/website/pages", label: "Pages", permission: "website.read" },
  { key: "sitemap", href: "/admin/website/sitemap", label: "Site map", permission: "website.read" },
  {
    key: "services",
    href: "/admin/content/services",
    label: "Services",
    permission: "content.read",
  },
  {
    key: "projects",
    href: "/admin/content/projects",
    label: "Projects",
    permission: "content.read",
  },
  {
    key: "insights",
    href: "/admin/content/insights",
    label: "Insights",
    permission: "content.read",
  },
  { key: "media", href: "/admin/website/media", label: "Media", permission: "media.read" },
  {
    key: "navigation",
    href: "/admin/settings/website?section=navigation",
    label: "Navigation",
    permission: "settings.website.read",
  },
  { key: "footer", href: "/admin/website/footer", label: "Footer", permission: "website.read" },
  { key: "globals", href: "/admin/website/globals", label: "Globals", permission: "website.read" },
  {
    key: "seo",
    href: "/admin/settings/website?section=seo",
    label: "SEO",
    permission: "settings.website.read",
  },
  {
    key: "legal",
    href: "/admin/settings/legal",
    label: "Legal",
    permission: "settings.legal.read",
  },
];

/** WEBSITE control-center navigation (CR1 §6). Working C7 / C3 editors are linked, not duplicated. */
export function WebsiteNav({
  current,
  permissions,
}: Readonly<{ current: string; permissions: readonly string[] }>) {
  return (
    <nav aria-label="Website sections" className="record-tabs settings-nav website-nav">
      {entries
        .filter((entry) => permissions.includes(entry.permission))
        .map((entry) => (
          <Link
            aria-current={current === entry.key ? "page" : undefined}
            className={current === entry.key ? "record-tab record-tab-current" : "record-tab"}
            href={entry.href}
            key={entry.key}
          >
            {entry.label}
          </Link>
        ))}
    </nav>
  );
}
