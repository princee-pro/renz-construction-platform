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
    description: "Operational status",
    permission: "content.read",
    group: "Overview",
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    description: "What changed, for you",
    permission: "notifications.read",
    group: "Overview",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    description: "Trends over time, by currency",
    permission: "analytics.read",
    group: "Overview",
  },
  {
    href: "/admin/operations/leads",
    label: "Leads",
    description: "Enquiries and pipeline",
    permission: "leads.read",
    group: "Operations",
  },
  {
    href: "/admin/operations/clients",
    label: "Clients",
    description: "Client CRM",
    permission: "clients.read",
    group: "Operations",
  },
  {
    href: "/admin/operations/projects",
    label: "Projects",
    description: "Operational project workspace",
    permission: "operations.projects.read",
    group: "Operations",
  },
  {
    href: "/admin/operations/contractors",
    label: "Contractors",
    description: "Trade partners and assignments",
    permission: "partners.read",
    group: "Operations",
  },
  {
    href: "/admin/procurement/materials",
    label: "Materials",
    description: "Catalog and units",
    permission: "procurement.materials.read",
    group: "Procurement",
  },
  {
    href: "/admin/procurement/suppliers",
    label: "Suppliers",
    description: "Supplier-capable partners",
    permission: "partners.read",
    group: "Procurement",
  },
  {
    href: "/admin/procurement/orders",
    label: "Purchase Orders",
    description: "Orders and deliveries",
    permission: "procurement.orders.read",
    group: "Procurement",
  },
  {
    href: "/admin/finance",
    label: "Finance",
    description: "Invoiced, paid, outstanding",
    permission: "finance.invoices.read",
    group: "Finance",
  },
  {
    href: "/admin/finance/invoices",
    label: "Invoices",
    description: "Drafts, issued, payments",
    permission: "finance.invoices.read",
    group: "Finance",
  },
  {
    href: "/admin/finance/contractor-payables",
    label: "Contractor Payables",
    description: "Agreed, paid, remaining",
    permission: "partners.read",
    group: "Finance",
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
    description: "Public services register",
    permission: "content.read",
    group: "Website",
  },
  {
    href: "/admin/content/projects",
    label: "Projects",
    description: "Public projects and studies",
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
    description: "Images, alt text, rights",
    permission: "media.read",
    group: "Website",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Business, website, legal, system",
    permission: "settings.business.read",
    group: "Settings",
  },
  {
    href: "/admin/settings/launch-readiness",
    label: "Launch Readiness",
    description: "Can we go live?",
    permission: "settings.website.read",
    group: "Settings",
  },
  {
    href: "/admin/security",
    label: "Security",
    description: "Account and MFA",
    permission: "security.manage",
    group: "Security",
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
