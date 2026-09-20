import type { AdminPermission } from "@/lib/auth/permissions";

/**
 * Plain-English view of the RBAC model (C10 §24, §31, §158). The permission
 * keys stay authoritative; this map only explains them to the owner, grouped
 * by business area, as "Can …" / "Cannot …" sentences. Adding a permission
 * without a line here is harmless — it simply is not summarised.
 */
export type CapabilityGroup = Readonly<{
  key: "clients" | "projects" | "finance" | "delivery" | "website" | "analytics" | "system";
  label: string;
  lines: readonly Readonly<{ permission: AdminPermission; can: string; cannot: string }>[];
}>;

export const capabilityGroups: readonly CapabilityGroup[] = [
  {
    key: "clients",
    label: "Leads & clients",
    lines: [
      { permission: "leads.read", can: "see enquiries (leads)", cannot: "see enquiries" },
      { permission: "leads.write", can: "update and assign leads", cannot: "update leads" },
      { permission: "leads.convert", can: "turn a lead into a client", cannot: "convert leads" },
      { permission: "clients.read", can: "see clients", cannot: "see clients" },
      { permission: "clients.write", can: "add and edit clients", cannot: "edit clients" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    lines: [
      { permission: "operations.projects.read", can: "see projects", cannot: "see projects" },
      {
        permission: "operations.projects.write",
        can: "create and manage projects",
        cannot: "change projects",
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    lines: [
      { permission: "finance.invoices.read", can: "view invoices", cannot: "view invoices" },
      { permission: "finance.invoices.write", can: "draft invoices", cannot: "draft invoices" },
      { permission: "finance.invoices.issue", can: "issue invoices", cannot: "issue invoices" },
      { permission: "finance.payments.write", can: "record payments", cannot: "record payments" },
      { permission: "finance.invoices.void", can: "void invoices", cannot: "void invoices" },
      {
        permission: "contractors.payments.write",
        can: "record contractor payments",
        cannot: "record contractor payments",
      },
    ],
  },
  {
    key: "delivery",
    label: "Contractors & procurement",
    lines: [
      { permission: "partners.read", can: "see contractors and suppliers", cannot: "see partners" },
      { permission: "partners.write", can: "add and edit partners", cannot: "edit partners" },
      { permission: "contractors.assign", can: "assign contractors", cannot: "assign contractors" },
      {
        permission: "procurement.orders.write",
        can: "prepare purchase orders",
        cannot: "prepare purchase orders",
      },
      {
        permission: "procurement.orders.issue",
        can: "issue purchase orders",
        cannot: "issue purchase orders",
      },
      {
        permission: "procurement.receipts.write",
        can: "record deliveries",
        cannot: "record deliveries",
      },
    ],
  },
  {
    key: "website",
    label: "Website",
    lines: [
      {
        permission: "content.write",
        can: "edit services, projects and insights",
        cannot: "edit website content",
      },
      { permission: "content.publish", can: "publish content", cannot: "publish content" },
      { permission: "website.pages.write", can: "edit pages", cannot: "edit pages" },
      { permission: "website.publish", can: "publish pages", cannot: "publish pages" },
      {
        permission: "website.navigation.write",
        can: "change navigation and footer",
        cannot: "change navigation",
      },
      { permission: "media.upload", can: "upload images", cannot: "upload images" },
      {
        permission: "settings.website.write",
        can: "change website settings",
        cannot: "change website settings",
      },
    ],
  },
  {
    key: "analytics",
    label: "Analytics & notifications",
    lines: [
      { permission: "analytics.read", can: "see analytics", cannot: "see analytics" },
      {
        permission: "analytics.finance.read",
        can: "see finance analytics",
        cannot: "see finance analytics",
      },
      {
        permission: "notifications.read",
        can: "receive notifications",
        cannot: "receive notifications",
      },
    ],
  },
  {
    key: "system",
    label: "Staff & system",
    lines: [
      { permission: "staff.read", can: "see the staff list", cannot: "see the staff list" },
      { permission: "staff.manage", can: "manage staff accounts", cannot: "manage staff" },
      {
        permission: "settings.business.write",
        can: "change business details",
        cannot: "change business details",
      },
      {
        permission: "settings.legal.publish",
        can: "publish legal pages",
        cannot: "publish legal pages",
      },
      {
        permission: "security.manage",
        can: "manage own security (MFA)",
        cannot: "manage security",
      },
    ],
  },
];

export type CapabilitySummary = Readonly<{
  group: CapabilityGroup["label"];
  can: readonly string[];
  cannot: readonly string[];
}>;

/** "Can …" and "Cannot …" per business area for a permission set. */
export function summariseCapabilities(
  permissions: ReadonlySet<string> | readonly string[],
): readonly CapabilitySummary[] {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  return capabilityGroups.map((group) => ({
    group: group.label,
    can: group.lines.filter((line) => set.has(line.permission)).map((line) => line.can),
    cannot: group.lines.filter((line) => !set.has(line.permission)).map((line) => line.cannot),
  }));
}

/** Owner-facing descriptions of the role templates (RBAC keys stay authoritative). */
export const roleDescriptions: Readonly<
  Record<string, Readonly<{ label: string; note: string; privileged: boolean }>>
> = {
  super_admin: {
    label: "Owner / Super Admin",
    note: "Everything, including staff accounts, roles and security. Give this only to an owner.",
    privileged: true,
  },
  admin: {
    label: "Admin",
    note: "Runs the business day to day: leads, clients, projects, finance, delivery and the website. Cannot manage staff.",
    privileged: true,
  },
  project_manager: {
    label: "Project Manager",
    note: "Leads, clients, projects, contractors and purchase orders. Sees invoices but cannot issue them.",
    privileged: false,
  },
  finance: {
    label: "Finance",
    note: "Invoices, payments and contractor payments, with read access to clients and projects.",
    privileged: false,
  },
  content_editor: {
    label: "Content Editor",
    note: "Website pages, services, project studies, insights and media. No client or finance data.",
    privileged: false,
  },
  viewer: {
    label: "View Only",
    note: "Can look at registers and analytics. Cannot change anything.",
    privileged: false,
  },
};
