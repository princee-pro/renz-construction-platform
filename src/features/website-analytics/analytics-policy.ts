/**
 * Website analytics policy (C9 §44–55). Shared by the browser beacon and the
 * server endpoint so both sides agree on the fixed vocabulary, the canonical
 * route keys and the bounded dimensions. The database applies the same
 * rules again (`website_analytics_record`); nothing arbitrary is stored.
 */

/** Events the browser may report. Submissions are recorded server-side from the real lead insert. */
export const browserEventTypes = [
  "page_view",
  "cta_click",
  "service_view",
  "service_enquiry_start",
  "project_intake_start",
  "case_study_view",
] as const;
export type BrowserEventType = (typeof browserEventTypes)[number];

export const ctaKeys = [
  "start_project",
  "whatsapp",
  "email",
  "service_enquiry",
  "view_project",
  "contact",
  "material_enquiry",
] as const;
export type CtaKey = (typeof ctaKeys)[number];

export const deviceClasses = ["mobile", "tablet", "desktop", "unknown"] as const;
export type DeviceClass = (typeof deviceClasses)[number];

export const analyticsBatchLimit = 20;

/** One browser event as queued by the beacon (validated server-side by `analytics-schema.ts`). */
export type AnalyticsEvent = Readonly<{
  t: BrowserEventType;
  p: string;
  d?: string | undefined;
  dc?: DeviceClass | undefined;
}>;
export const analyticsRateLimit = { maxHits: 120, windowSeconds: 3600 } as const;
export const analyticsConsentStorageKey = "renz-analytics-consent";

const staticRoutes = new Set([
  "/",
  "/services",
  "/projects",
  "/about",
  "/contact",
  "/start-a-project",
  "/start-a-project/success",
  "/enquire/service",
  "/enquire/materials",
  "/insights",
  "/expertise",
  "/privacy",
  "/terms",
  "/cookies",
]);
const slugRoute = /^\/(services|projects|insights|expertise)\/[a-z0-9-]{1,80}$/u;
const privatePrefix = /^\/(admin|api|i|po|_next|auth)(\/|$)/u;

/**
 * Canonical public route key: lower-cased path with query string and
 * fragment removed, trailing slash dropped, private/admin/document routes
 * and unknown paths rejected (null). Never returns anything a visitor typed
 * beyond an approved slug shape.
 */
export function canonicalPathKey(raw: string): string | null {
  if (!raw) return null;
  let path = raw.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (path === "") return null;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/") return "/";
  if (privatePrefix.test(path)) return null;
  if (staticRoutes.has(path)) return path;
  if (slugRoute.test(path)) return path;
  return null;
}

export function pathDimension(
  pathKey: string,
): Readonly<{ event: BrowserEventType; slug: string } | null> {
  const match = /^\/(services|projects)\/([a-z0-9-]{1,80})$/u.exec(pathKey);
  if (!match) return null;
  return {
    event: match[1] === "services" ? "service_view" : "case_study_view",
    slug: match[2] ?? "",
  };
}

export function deviceClassFor(width: number): DeviceClass {
  if (!Number.isFinite(width) || width <= 0) return "unknown";
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}
