/**
 * Server-side validation + normalization for the C9 analytics beacon. Kept
 * apart from `analytics-policy.ts` (D1) so the public bundle ships only the
 * plain path/device helpers, not zod. Semantics are unchanged.
 */
import { z } from "zod";

import {
  analyticsBatchLimit,
  browserEventTypes,
  canonicalPathKey,
  ctaKeys,
  deviceClasses,
  pathDimension,
  type AnalyticsEvent,
} from "@/features/website-analytics/analytics-policy";

export const analyticsEventSchema = z
  .object({
    t: z.enum(browserEventTypes),
    p: z.string().max(200),
    d: z
      .string()
      .max(80)
      .regex(/^[a-z0-9_-]*$/u)
      .optional(),
    dc: z.enum(deviceClasses).optional(),
  })
  .strict();

export const analyticsBatchSchema = z
  .object({ events: z.array(analyticsEventSchema).min(1).max(analyticsBatchLimit) })
  .strict();

/** Normalizes a browser batch: canonical paths, bounded dimensions; drops what does not fit. */
export function normalizeEvents(
  events: readonly AnalyticsEvent[],
): Readonly<{ accepted: readonly AnalyticsEvent[]; rejected: number }> {
  const accepted: AnalyticsEvent[] = [];
  let rejected = 0;
  for (const event of events) {
    const pathKey = canonicalPathKey(event.p);
    if (!pathKey) {
      rejected += 1;
      continue;
    }
    const dimension = event.d ?? "";
    if (event.t === "cta_click" && !(ctaKeys as readonly string[]).includes(dimension)) {
      rejected += 1;
      continue;
    }
    const derived = pathDimension(pathKey);
    if (
      (event.t === "service_view" || event.t === "case_study_view") &&
      (!derived || derived.event !== event.t || derived.slug !== dimension)
    ) {
      rejected += 1;
      continue;
    }
    accepted.push({
      t: event.t,
      p: pathKey,
      d: event.t === "page_view" || event.t === "project_intake_start" ? "" : dimension,
      dc: event.dc ?? "unknown",
    });
  }
  return { accepted, rejected };
}
