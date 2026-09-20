import Link from "next/link";

import type { AdminPermission } from "@/lib/auth/permissions";

const entries: readonly Readonly<{
  key: string;
  href: string;
  label: string;
  permission: AdminPermission;
}>[] = [
  {
    key: "overview",
    href: "/admin/settings",
    label: "Overview",
    permission: "settings.business.read",
  },
  {
    key: "business",
    href: "/admin/settings/business",
    label: "Business",
    permission: "settings.business.read",
  },
  {
    key: "website",
    href: "/admin/settings/website",
    label: "Website",
    permission: "settings.website.read",
  },
  {
    key: "legal",
    href: "/admin/settings/legal",
    label: "Legal",
    permission: "settings.legal.read",
  },
  {
    key: "system",
    href: "/admin/settings/system",
    label: "System",
    permission: "settings.system.read",
  },
  { key: "staff", href: "/admin/settings/staff", label: "Staff", permission: "staff.read" },
  {
    key: "notifications",
    href: "/admin/settings/notifications",
    label: "Notifications",
    permission: "notifications.read",
  },
  {
    key: "launch-readiness",
    href: "/admin/settings/launch-readiness",
    label: "Launch readiness",
    permission: "settings.website.read",
  },
];

export function SettingsNav({
  current,
  permissions,
}: Readonly<{ current: string; permissions: readonly string[] }>) {
  return (
    <nav aria-label="Settings sections" className="record-tabs settings-nav">
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
