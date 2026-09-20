import { z } from "zod";

import { addCalendarDays, calendarDaysBetween } from "@/lib/time/business-time";

// ---------------------------------------------------------------------
// Date range (C9 §7): bounded presets + validated custom range, carried in
// URL search params. Days are business-timezone calendar days; the server
// re-validates the window (`private.analytics_window`).
// ---------------------------------------------------------------------

export const analyticsRangePresets = ["7d", "30d", "90d", "ytd", "custom"] as const;
export type AnalyticsRangePreset = (typeof analyticsRangePresets)[number];

export const analyticsRangePresetLabels: Readonly<Record<AnalyticsRangePreset, string>> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "This year",
  custom: "Custom range",
};

export type AnalyticsRange = Readonly<{
  preset: AnalyticsRangePreset;
  from: string;
  to: string;
  days: number;
  /** True when a custom input was rejected and the default was applied instead. */
  corrected: boolean;
}>;

const isoDate = /^\d{4}-\d{2}-\d{2}$/u;

function validDate(value: string): boolean {
  if (!isoDate.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * Resolves the URL search params to a validated range. `today` is the
 * business-timezone calendar day (never the browser's or the server's own).
 */
export function resolveAnalyticsRange(
  raw: Readonly<Record<string, string | string[] | undefined>>,
  today: string,
): AnalyticsRange {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const presetRaw = first("range");
  const preset = (analyticsRangePresets as readonly string[]).includes(presetRaw)
    ? (presetRaw as AnalyticsRangePreset)
    : presetRaw === "" && (first("from") || first("to"))
      ? "custom"
      : "30d";
  const fallback = (): AnalyticsRange => ({
    preset: "30d",
    from: addCalendarDays(today, -29),
    to: today,
    days: 30,
    corrected: preset === "custom",
  });
  if (preset === "7d") {
    return { preset, from: addCalendarDays(today, -6), to: today, days: 7, corrected: false };
  }
  if (preset === "30d") return { ...fallback(), corrected: false };
  if (preset === "90d") {
    return { preset, from: addCalendarDays(today, -89), to: today, days: 90, corrected: false };
  }
  if (preset === "ytd") {
    const from = `${today.slice(0, 4)}-01-01`;
    return {
      preset,
      from,
      to: today,
      days: calendarDaysBetween(from, today) + 1,
      corrected: false,
    };
  }
  const from = first("from");
  const to = first("to") || today;
  if (!validDate(from) || !validDate(to)) return fallback();
  if (to < from || to > today) return fallback();
  const days = calendarDaysBetween(from, to) + 1;
  if (days > 731) return fallback();
  return { preset: "custom", from, to, days, corrected: false };
}

export function analyticsRangeQuery(range: AnalyticsRange): string {
  const params = new URLSearchParams();
  params.set("range", range.preset);
  if (range.preset === "custom") {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return params.toString();
}

// ---------------------------------------------------------------------
// Response contracts (presentation-ready aggregates; currencies separate)
// ---------------------------------------------------------------------

const count = z.number().int().nonnegative();
const money = z.number();
const nullableNumber = z.number().nullable();
const rangeEcho = z.object({
  from: z.string(),
  to: z.string(),
  days: count,
  bucket: z.enum(["day", "week"]),
  timezone: z.string(),
});
const counts = z.record(z.string(), count);

export const leadAnalyticsSchema = z.object({
  new_leads: count,
  open_leads: count,
  unassigned_leads: count,
  awaiting_first_contact: count,
  status_counts: counts,
  funnel: z.array(z.object({ stage: z.string(), count })),
  type_counts: counts,
  source_counts: counts,
  service_interest: z.array(
    z.object({ service_key: z.string(), enquiries: count, qualified: count, won: count }),
  ),
  response: z.object({
    contacted_count: count,
    median_hours: nullableNumber,
    average_hours: nullableNumber,
    awaiting_first_contact: count,
    target_hours: count,
    within_target_count: count,
  }),
  qualification: z.object({
    qualified_count: count,
    median_hours: nullableNumber,
    average_hours: nullableNumber,
  }),
  outcome: z.object({
    won_count: count,
    lost_count: count,
    win_rate: nullableNumber,
    won_median_days: nullableNumber,
    lost_median_days: nullableNumber,
  }),
  lost_reasons: z.array(z.object({ reason: z.string().nullable(), count })),
  trend: z.array(z.object({ bucket: z.string(), submitted: count, won: count })),
  range: rangeEcho,
});
export type LeadAnalytics = z.infer<typeof leadAnalyticsSchema>;

export const projectAnalyticsSchema = z.object({
  active_projects: count,
  status_counts: counts,
  phase_counts: counts,
  priority_counts: counts,
  active_high_priority: count,
  schedule: z.object({
    ending_soon_window_days: count,
    ending_soon: count,
    behind_planned_end: count,
    no_end_date: count,
    completed_in_period: count,
    created_in_period: count,
  }),
  budget_by_currency: z.array(
    z.object({ currency: z.string(), total: money, project_count: count }),
  ),
  origin: z.object({
    from_leads: count,
    manual: count,
    all_time_from_leads: count,
    all_time_total: count,
  }),
  phase_aging: z.array(
    z.object({
      phase: z.string(),
      count,
      average_days: nullableNumber,
      max_days: z.number().nullable(),
    }),
  ),
  trend: z.array(z.object({ bucket: z.string(), created: count, completed: count })),
  range: rangeEcho,
});
export type ProjectAnalytics = z.infer<typeof projectAnalyticsSchema>;

export const agingBuckets = ["not_due", "1_30", "31_60", "61_90", "90_plus"] as const;
export const agingBucketLabels: Readonly<Record<(typeof agingBuckets)[number], string>> = {
  not_due: "Not yet due",
  "1_30": "1–30 days overdue",
  "31_60": "31–60 days overdue",
  "61_90": "61–90 days overdue",
  "90_plus": "Over 90 days overdue",
};

export const financeCurrencySchema = z.object({
  currency: z.string(),
  issued_count: count,
  invoiced_amount: money,
  collected_amount: money,
  collected_on_period_invoices: money,
  collection_rate: nullableNumber,
  outstanding_amount: money,
  outstanding_count: count,
  overdue_amount: money,
  overdue_count: count,
  paid_count: count,
  partially_paid_count: count,
  unpaid_count: count,
  payment_count: count,
  aging: z.array(z.object({ bucket: z.string(), amount: money, invoice_count: count })),
  payment_trend: z.array(z.object({ bucket: z.string(), amount: money, payment_count: count })),
  invoice_trend: z.array(z.object({ bucket: z.string(), amount: money, invoice_count: count })),
});
export const financeAnalyticsSchema = z.object({
  by_currency: z.array(financeCurrencySchema),
  issued_count: count,
  draft_count: count,
  void_count_in_period: count,
  range: rangeEcho,
});
export type FinanceAnalytics = z.infer<typeof financeAnalyticsSchema>;
export type FinanceCurrencyAnalytics = z.infer<typeof financeCurrencySchema>;

export const contractorAnalyticsSchema = z.object({
  active_contractors: count,
  contractor_partners: count,
  status_counts: counts,
  active_assignments: count,
  completed_in_period: count,
  created_in_period: count,
  ending_soon_window_days: count,
  ending_soon: count,
  finance_by_currency: z.array(
    z.object({
      currency: z.string(),
      committed: money,
      paid: money,
      remaining: money,
      assignment_count: count,
      paid_in_period: money,
    }),
  ),
  performance: z.object({
    rated_count: count,
    average_rating: nullableNumber,
    awaiting_rating: count,
    top_rated: z.array(
      z.object({
        partner_id: z.string(),
        display_name: z.string(),
        average_rating: z.number(),
        rated_count: count,
      }),
    ),
  }),
});
export type ContractorAnalytics = z.infer<typeof contractorAnalyticsSchema>;

export const procurementAnalyticsSchema = z.object({
  open_orders: count,
  delayed_orders: count,
  expected_soon_window_days: count,
  expected_soon: count,
  issued_in_period: count,
  closed_in_period: count,
  cancelled_in_period: count,
  receipts_in_period: count,
  receiving_states: counts,
  material_required_soon_window_days: count,
  requirements_due_soon: count,
  requirements_past_due: count,
  value_by_currency: z.array(
    z.object({
      currency: z.string(),
      ordered_value: money,
      order_count: count,
      open_ordered_value: money,
      open_order_count: count,
    }),
  ),
  trend: z.array(z.object({ bucket: z.string(), issued: count, receipts: count })),
});
export type ProcurementAnalytics = z.infer<typeof procurementAnalyticsSchema>;

export const deliveryAnalyticsSchema = z.object({
  contractors: contractorAnalyticsSchema.optional(),
  procurement: procurementAnalyticsSchema.optional(),
  range: rangeEcho,
});
export type DeliveryAnalytics = z.infer<typeof deliveryAnalyticsSchema>;

export const websiteAnalyticsSchema = z.object({
  first_party_enabled: z.boolean(),
  third_party_enabled: z.boolean(),
  third_party_provider: z.string().nullable(),
  retention_days: count,
  page_views: count,
  interactions: count,
  trend: z.array(z.object({ bucket: z.string(), page_views: count, interactions: count })),
  top_pages: z.array(z.object({ path_key: z.string(), page_views: count })),
  service_views: z.array(
    z.object({
      service_slug: z.string(),
      views: count,
      enquiries: count,
      qualified: count,
      won: count,
    }),
  ),
  case_study_views: z.array(z.object({ case_study_slug: z.string(), views: count })),
  cta_clicks: z.array(z.object({ cta_key: z.string(), clicks: count })),
  intake: z.object({
    project_intake_start: count,
    project_intake_submit: count,
    service_enquiry_start: count,
    service_enquiry_submit: count,
    contact_submit: count,
    material_enquiry_submit: count,
  }),
  device_classes: counts,
  range: rangeEcho,
});
export type WebsiteAnalytics = z.infer<typeof websiteAnalyticsSchema>;

const headlineSchema = z.object({
  new_leads: count.optional(),
  won_leads: count.optional(),
  lost_leads: count.optional(),
  projects_created: count.optional(),
  projects_completed: count.optional(),
  invoices_issued: count.optional(),
  invoiced_by_currency: z.record(z.string(), money).optional(),
  collected_by_currency: z.record(z.string(), money).optional(),
  orders_issued: count.optional(),
  page_views: count.optional(),
});
export type AnalyticsHeadline = z.infer<typeof headlineSchema>;

export const analyticsOverviewSchema = z.object({
  range: rangeEcho,
  previous_range: z.object({ from: z.string(), to: z.string() }),
  headline: headlineSchema,
  previous_headline: headlineSchema,
  leads: leadAnalyticsSchema.optional(),
  projects: projectAnalyticsSchema.optional(),
  finance: financeAnalyticsSchema.optional(),
  contractors: contractorAnalyticsSchema.optional(),
  procurement: procurementAnalyticsSchema.optional(),
  website: websiteAnalyticsSchema.optional(),
  domains: z.object({
    leads: z.boolean(),
    projects: z.boolean(),
    finance: z.boolean(),
    contractors: z.boolean(),
    procurement: z.boolean(),
    website: z.boolean(),
  }),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

// ---------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------

export const funnelStageLabels: Readonly<Record<string, string>> = {
  submitted: "Submitted",
  contacted: "Contacted",
  qualified: "Qualified",
  site_visit: "Site visit",
  proposal: "Proposal",
  won: "Won",
};

export const ctaKeyLabels: Readonly<Record<string, string>> = {
  start_project: "Start a Project",
  whatsapp: "WhatsApp",
  email: "Email",
  service_enquiry: "Service enquiry",
  view_project: "View project",
  contact: "Contact",
  material_enquiry: "Material enquiry",
};

export const deviceClassLabels: Readonly<Record<string, string>> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

export const receivingStateLabels: Readonly<Record<string, string>> = {
  received: "Fully received",
  partially_received: "Partially received",
  not_received: "Not received",
  delayed: "Delayed",
};

/**
 * Domain-aware trend meaning (C9 §97–98): an increase is not universally
 * good. `direction` says what an increase means for the business.
 */
export type ChangeMeaning = "positive" | "attention" | "neutral";

export function describeChange(
  current: number,
  previous: number,
  increaseMeans: ChangeMeaning,
): Readonly<{ delta: number; percent: number | null; meaning: ChangeMeaning; label: string }> {
  const delta = current - previous;
  const percent = previous === 0 ? null : Math.round((delta / previous) * 1000) / 10;
  const meaning: ChangeMeaning =
    delta === 0
      ? "neutral"
      : delta > 0
        ? increaseMeans
        : increaseMeans === "positive"
          ? "attention"
          : increaseMeans === "attention"
            ? "positive"
            : "neutral";
  const sign = delta > 0 ? "+" : "";
  const label =
    percent === null
      ? previous === 0 && current === 0
        ? "No change"
        : `${sign}${delta} (no prior data)`
      : `${sign}${delta} (${sign}${percent}%)`;
  return { delta, percent, meaning, label };
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

export function formatAmount(value: number, currency: string): string {
  const digits = ["RWF", "JPY", "UGX", "TZS", "KES", "XAF", "XOF"].includes(currency) ? 0 : 2;
  return `${currency} ${new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}`;
}

export function formatHours(value: number | null): string {
  if (value === null) return "—";
  if (value >= 48) return `${Math.round((value / 24) * 10) / 10} days`;
  return `${value} h`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/** Bucket label for trend axes; weeks read as "w/c" (week commencing). */
export function formatBucket(bucket: string, granularity: "day" | "week"): string {
  const [y, m, d] = bucket.split("-").map(Number) as [number, number, number];
  const label = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return granularity === "week" ? `w/c ${label}` : label;
}
