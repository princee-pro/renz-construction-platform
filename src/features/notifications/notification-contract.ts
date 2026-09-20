import { z } from "zod";

export const notificationCategories = [
  "leads",
  "projects",
  "finance",
  "contractors",
  "procurement",
  "website",
  "security",
  "system",
] as const;
export type NotificationCategory = (typeof notificationCategories)[number];

export const notificationCategoryLabels: Readonly<Record<NotificationCategory, string>> = {
  leads: "Leads",
  projects: "Projects",
  finance: "Finance",
  contractors: "Contractors",
  procurement: "Procurement",
  website: "Website",
  security: "Security",
  system: "System",
};

export const notificationSeverities = ["info", "attention", "urgent"] as const;
export type NotificationSeverity = (typeof notificationSeverities)[number];

export const notificationSeverityLabels: Readonly<Record<NotificationSeverity, string>> = {
  info: "Info",
  attention: "Attention",
  urgent: "Urgent",
};

export const notificationSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(notificationCategories),
  severity: z.enum(notificationSeverities),
  title: z.string(),
  body_short: z.string().nullable(),
  entity_type: z.string().nullable(),
  entity_id: z.string().nullable(),
  href: z.string().nullable(),
  created_at: z.string(),
  read_at: z.string().nullable(),
  archived_at: z.string().nullable(),
});
export type NotificationItem = z.infer<typeof notificationSchema>;

export const notificationSummarySchema = z.object({
  unread_count: z.number().int().nonnegative(),
  latest: z.array(notificationSchema),
});
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;

export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  has_more: z.boolean(),
  unread_count: z.number().int().nonnegative(),
  category_counts: z.record(z.string(), z.number().int().nonnegative()),
  timezone: z.string(),
});
export type NotificationList = z.infer<typeof notificationListSchema>;

export const notificationPreferencesSchema = z.object({
  categories: z.array(
    z.object({
      category: z.enum(notificationCategories),
      mandatory: z.boolean(),
      in_app_enabled: z.boolean(),
    }),
  ),
  email: z.object({ configured: z.boolean(), detail: z.string() }),
  last_sweep: z
    .object({
      started_at: z.string(),
      finished_at: z.string().nullable(),
      produced_count: z.number().int().nonnegative(),
      trigger_kind: z.string(),
    })
    .nullable(),
  can_run_sweep: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export type NotificationListFilters = Readonly<{
  state: "all" | "unread" | "archived";
  category: NotificationCategory | "";
  severity: NotificationSeverity | "";
  from: string;
  to: string;
  cursorCreatedAt: string;
  cursorId: string;
}>;

export function normalizeNotificationFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): NotificationListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const date = (value: string) => (/^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : "");
  const state = first("state");
  const category = first("category");
  const severity = first("severity");
  return {
    state: state === "unread" || state === "archived" ? state : "all",
    category: (notificationCategories as readonly string[]).includes(category)
      ? (category as NotificationCategory)
      : "",
    severity: (notificationSeverities as readonly string[]).includes(severity)
      ? (severity as NotificationSeverity)
      : "",
    from: date(first("from")),
    to: date(first("to")),
    cursorCreatedAt: first("cc"),
    cursorId: /^[0-9a-f-]{36}$/u.test(first("ci")) ? first("ci") : "",
  };
}

export function notificationListUrl(
  filters: NotificationListFilters,
  overrides: Partial<NotificationListFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.state !== "all") params.set("state", merged.state);
  if (merged.category) params.set("category", merged.category);
  if (merged.severity) params.set("severity", merged.severity);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.cursorCreatedAt && merged.cursorId) {
    params.set("cc", merged.cursorCreatedAt);
    params.set("ci", merged.cursorId);
  }
  const query = params.toString();
  return query ? `/admin/notifications?${query}` : "/admin/notifications";
}

/** Only admin-relative links produced by the database are ever followed. */
export function safeNotificationHref(href: string | null): string | null {
  if (!href) return null;
  return /^\/admin(\/[a-z0-9_-]+)*(\?[a-z0-9_=&-]+)?$/u.test(href) ? href : null;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso));
}
