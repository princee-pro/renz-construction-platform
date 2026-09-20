import { describe, expect, it } from "vitest";

import {
  analyticsRangeQuery,
  describeChange,
  formatAmount,
  formatBucket,
  formatHours,
  resolveAnalyticsRange,
} from "@/features/analytics/analytics-contract";
import {
  normalizeNotificationFilters,
  notificationListUrl,
  relativeTime,
  safeNotificationHref,
} from "@/features/notifications/notification-contract";
import {
  canonicalPathKey,
  deviceClassFor,
  pathDimension,
} from "@/features/website-analytics/analytics-policy";
import {
  analyticsBatchSchema,
  normalizeEvents,
} from "@/features/website-analytics/analytics-schema";

const today = "2026-09-13";

describe("analytics range (C9 §7)", () => {
  it("defaults to the last 30 business days", () => {
    const range = resolveAnalyticsRange({}, today);
    expect(range).toMatchObject({ preset: "30d", from: "2026-08-15", to: today, days: 30 });
  });

  it("supports the bounded presets", () => {
    expect(resolveAnalyticsRange({ range: "7d" }, today)).toMatchObject({
      from: "2026-09-07",
      days: 7,
    });
    expect(resolveAnalyticsRange({ range: "90d" }, today)).toMatchObject({
      from: "2026-06-16",
      days: 90,
    });
    expect(resolveAnalyticsRange({ range: "ytd" }, today)).toMatchObject({
      from: "2026-01-01",
      to: today,
      days: 256,
    });
  });

  it("validates a custom range server-side and falls back when invalid", () => {
    expect(
      resolveAnalyticsRange({ range: "custom", from: "2026-06-01", to: "2026-06-30" }, today),
    ).toMatchObject({ preset: "custom", from: "2026-06-01", to: "2026-06-30", days: 30 });
    const inverted = resolveAnalyticsRange(
      { range: "custom", from: "2026-06-30", to: "2026-06-01" },
      today,
    );
    expect(inverted.preset).toBe("30d");
    expect(inverted.corrected).toBe(true);
    const future = resolveAnalyticsRange(
      { range: "custom", from: "2026-09-01", to: "2027-01-01" },
      today,
    );
    expect(future.corrected).toBe(true);
    const tooLong = resolveAnalyticsRange(
      { range: "custom", from: "2020-01-01", to: today },
      today,
    );
    expect(tooLong.corrected).toBe(true);
    expect(
      resolveAnalyticsRange({ range: "custom", from: "2026-02-30", to: today }, today).corrected,
    ).toBe(true);
  });

  it("treats bare from/to as a custom range and serialises to URL params", () => {
    const range = resolveAnalyticsRange({ from: "2026-05-01", to: "2026-05-31" }, today);
    expect(range.preset).toBe("custom");
    expect(analyticsRangeQuery(range)).toBe("range=custom&from=2026-05-01&to=2026-05-31");
    expect(analyticsRangeQuery(resolveAnalyticsRange({ range: "7d" }, today))).toBe("range=7d");
  });

  it("describes change with domain-aware meaning", () => {
    expect(describeChange(12, 10, "positive")).toMatchObject({
      delta: 2,
      percent: 20,
      meaning: "positive",
    });
    expect(describeChange(8, 10, "positive").meaning).toBe("attention");
    expect(describeChange(5, 2, "attention").meaning).toBe("attention");
    expect(describeChange(1, 2, "attention").meaning).toBe("positive");
    expect(describeChange(3, 0, "neutral")).toMatchObject({
      percent: null,
      label: "+3 (no prior data)",
    });
    expect(describeChange(0, 0, "positive").label).toBe("No change");
  });

  it("formats amounts per currency without mixing them", () => {
    expect(formatAmount(1500000, "RWF")).toBe("RWF 1,500,000");
    expect(formatAmount(1234.5, "USD")).toBe("USD 1,234.50");
    expect(formatHours(4.5)).toBe("4.5 h");
    expect(formatHours(72)).toBe("3 days");
    expect(formatHours(null)).toBe("—");
    expect(formatBucket("2026-06-01", "week")).toBe("w/c Jun 1");
    expect(formatBucket("2026-06-01", "day")).toBe("Jun 1");
  });
});

describe("website analytics policy (C9 §46–48, §94)", () => {
  it("canonicalises approved public paths and strips query strings", () => {
    expect(canonicalPathKey("/services/design?utm_source=x#top")).toBe("/services/design");
    expect(canonicalPathKey("/Services/Design/")).toBe("/services/design");
    expect(canonicalPathKey("/")).toBe("/");
    expect(canonicalPathKey("/start-a-project?service=design")).toBe("/start-a-project");
  });

  it("rejects admin, api, document, next and unknown paths", () => {
    expect(canonicalPathKey("/admin/operations/leads")).toBeNull();
    expect(canonicalPathKey("/api/analytics/events")).toBeNull();
    expect(canonicalPathKey("/i/abcdef0123")).toBeNull();
    expect(canonicalPathKey("/po/abcdef0123")).toBeNull();
    expect(canonicalPathKey("/_next/static/x.js")).toBeNull();
    expect(canonicalPathKey("/RENZ-LEAD-2026-000001")).toBeNull();
    expect(canonicalPathKey("/services/someone@example.test")).toBeNull();
    expect(canonicalPathKey("")).toBeNull();
  });

  it("derives service and case study dimensions from the path only", () => {
    expect(pathDimension("/services/design")).toEqual({ event: "service_view", slug: "design" });
    expect(pathDimension("/projects/villa-one")).toEqual({
      event: "case_study_view",
      slug: "villa-one",
    });
    expect(pathDimension("/about")).toBeNull();
  });

  it("normalises batches: fixed vocabulary, bounded dimensions, rejected events dropped", () => {
    const { accepted, rejected } = normalizeEvents([
      { t: "page_view", p: "/services/design?email=a@b.c", dc: "mobile" },
      { t: "service_view", p: "/services/design", d: "design" },
      { t: "service_view", p: "/services/design", d: "other-slug" },
      { t: "cta_click", p: "/", d: "start_project" },
      { t: "cta_click", p: "/", d: "buy_now" },
      { t: "page_view", p: "/admin" },
      { t: "project_intake_start", p: "/start-a-project", d: "design" },
    ]);
    expect(rejected).toBe(3);
    expect(accepted).toEqual([
      { t: "page_view", p: "/services/design", d: "", dc: "mobile" },
      { t: "service_view", p: "/services/design", d: "design", dc: "unknown" },
      { t: "cta_click", p: "/", d: "start_project", dc: "unknown" },
      { t: "project_intake_start", p: "/start-a-project", d: "", dc: "unknown" },
    ]);
  });

  it("refuses arbitrary event names, extra fields and oversized batches", () => {
    expect(analyticsBatchSchema.safeParse({ events: [{ t: "custom", p: "/" }] }).success).toBe(
      false,
    );
    expect(
      analyticsBatchSchema.safeParse({ events: [{ t: "page_view", p: "/", extra: 1 }] }).success,
    ).toBe(false);
    expect(
      analyticsBatchSchema.safeParse({ events: [{ t: "cta_click", p: "/", d: "<script>" }] })
        .success,
    ).toBe(false);
    expect(
      analyticsBatchSchema.safeParse({
        events: Array.from({ length: 21 }, () => ({ t: "page_view", p: "/" })),
      }).success,
    ).toBe(false);
    expect(analyticsBatchSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it("buckets device class from viewport width only", () => {
    expect(deviceClassFor(390)).toBe("mobile");
    expect(deviceClassFor(768)).toBe("tablet");
    expect(deviceClassFor(1440)).toBe("desktop");
    expect(deviceClassFor(0)).toBe("unknown");
  });
});

describe("notification contract (C9 §76, §82)", () => {
  it("follows only admin-relative links", () => {
    expect(safeNotificationHref("/admin/operations/leads/abc")).toBe("/admin/operations/leads/abc");
    expect(safeNotificationHref("/admin/operations/projects/abc?tab=procurement")).toBe(
      "/admin/operations/projects/abc?tab=procurement",
    );
    expect(safeNotificationHref("https://evil.example/admin")).toBeNull();
    expect(safeNotificationHref("/i/token")).toBeNull();
    expect(safeNotificationHref(null)).toBeNull();
  });

  it("normalises filters and round-trips them through the URL", () => {
    const filters = normalizeNotificationFilters({
      state: "unread",
      category: "finance",
      severity: "urgent",
      from: "2026-09-01",
      to: "bad",
      cc: "2026-09-10T00:00:00Z",
      ci: "11111111-1111-4111-8111-111111111111",
    });
    expect(filters).toMatchObject({
      state: "unread",
      category: "finance",
      severity: "urgent",
      from: "2026-09-01",
      to: "",
    });
    expect(notificationListUrl(filters)).toBe(
      "/admin/notifications?state=unread&category=finance&severity=urgent&from=2026-09-01&cc=2026-09-10T00%3A00%3A00Z&ci=11111111-1111-4111-8111-111111111111",
    );
    expect(normalizeNotificationFilters({ category: "nope" }).category).toBe("");
    expect(notificationListUrl(normalizeNotificationFilters({}))).toBe("/admin/notifications");
  });

  it("renders relative times", () => {
    const now = Date.parse("2026-09-13T12:00:00Z");
    expect(relativeTime("2026-09-13T11:59:40Z", now)).toBe("just now");
    expect(relativeTime("2026-09-13T11:30:00Z", now)).toBe("30 min ago");
    expect(relativeTime("2026-09-13T09:00:00Z", now)).toBe("3 h ago");
    expect(relativeTime("2026-09-11T09:00:00Z", now)).toBe("2 d ago");
  });
});
