import type { AdminPermission } from "@/lib/auth/permissions";

export type AdminNavigationItem = Readonly<{
  href: string;
  label: string;
  description: string;
  permission: AdminPermission;
  group: string;
}>;

export const adminNavigation: readonly AdminNavigationItem[] = [
  {
    href: "/admin",
    label: "Overview",
    description: "What needs attention",
    permission: "content.read",
    group: "Overview",
  },
  {
    href: "/admin/operations/leads",
    label: "Leads",
    description: "Enquiries and pipeline",
    permission: "leads.read",
    group: "Work",
  },
  {
    href: "/admin/operations/clients",
    label: "Clients",
    description: "Clients and their history",
    permission: "clients.read",
    group: "Work",
  },
  {
    href: "/admin/operations/projects",
    label: "Projects",
    description: "Sites, stages and progress",
    permission: "operations.projects.read",
    group: "Work",
  },
  {
    href: "/admin/operations/contractors",
    label: "Contractors",
    description: "Builders, trades and their work",
    permission: "partners.read",
    group: "Delivery",
  },
  {
    href: "/admin/procurement/materials",
    label: "Materials",
    description: "What you buy, and its units",
    permission: "procurement.materials.read",
    group: "Delivery",
  },
  {
    href: "/admin/procurement/suppliers",
    label: "Suppliers",
    description: "Who you buy from",
    permission: "partners.read",
    group: "Delivery",
  },
  {
    href: "/admin/procurement/orders",
    label: "Purchase Orders",
    description: "Orders and deliveries",
    permission: "procurement.orders.read",
    group: "Delivery",
  },
  {
    href: "/admin/finance",
    label: "Finance",
    description: "Invoiced, paid, outstanding",
    permission: "finance.invoices.read",
    group: "Money",
  },
  {
    href: "/admin/finance/invoices",
    label: "Invoices",
    description: "Drafts, issued, payments",
    permission: "finance.invoices.read",
    group: "Money",
  },
  {
    href: "/admin/finance/contractor-payables",
    label: "Contractor Payables",
    description: "Agreed, paid, remaining",
    permission: "partners.read",
    group: "Money",
  },
  {
    href: "/admin/website",
    label: "Website",
    description: "Pages, site map, publishing",
    permission: "website.read",
    group: "Website",
  },
  {
    href: "/admin/content/services",
    label: "Services",
    description: "Public services and their pages",
    permission: "content.read",
    group: "Website",
  },
  {
    href: "/admin/content/projects",
    label: "Projects",
    description: "Projects and studies on the website",
    permission: "content.read",
    group: "Website",
  },
  {
    href: "/admin/content/insights",
    label: "Insights",
    description: "Articles",
    permission: "content.read",
    group: "Website",
  },
  {
    href: "/admin/website/media",
    label: "Media",
    description: "Images, videos and their rights",
    permission: "media.read",
    group: "Website",
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    description: "What changed, for you",
    permission: "notifications.read",
    group: "Business",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    description: "Trends over time, by currency",
    permission: "analytics.read",
    group: "Business",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Business details, website, legal, system",
    permission: "settings.business.read",
    group: "System",
  },
  {
    href: "/admin/settings/launch-readiness",
    label: "Launch Readiness",
    description: "Can we go live?",
    permission: "settings.website.read",
    group: "System",
  },
  {
    href: "/admin/security",
    label: "Security",
    description: "Account and MFA",
    permission: "security.manage",
    group: "System",
  },
] as const;

export function visibleAdminNavigation(
  permissions: readonly string[],
): readonly AdminNavigationItem[] {
  const allowed = new Set(permissions);
  return adminNavigation.filter((item) => allowed.has(item.permission));
}

export function groupedAdminNavigation(
  items: readonly AdminNavigationItem[],
): readonly (readonly [string, readonly AdminNavigationItem[]])[] {
  const groups = new Map<string, AdminNavigationItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.group);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(item.group, [item]);
    }
  }
  return [...groups.entries()];
}
