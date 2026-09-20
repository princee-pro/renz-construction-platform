"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  analyticsBatchLimit,
  canonicalPathKey,
  deviceClassFor,
  pathDimension,
  type AnalyticsEvent,
  type BrowserEventType,
} from "@/features/website-analytics/analytics-policy";

/**
 * First-party analytics beacon (C9 §44–53). Sends only the fixed vocabulary
 * with canonical route keys — never query strings, form contents, or
 * identifiers — batched through `navigator.sendBeacon`. Honours Do Not
 * Track / Global Privacy Control. Renders nothing.
 *
 * Interactions are declared in markup, never inferred from destinations:
 *   data-analytics-cta="start_project"       → cta_click on click
 *   data-analytics-event="project_intake_start" → that event on click
 *   data-analytics-form="service_enquiry_start" → that event on first focus
 */
export function WebsiteAnalytics({ enabled }: Readonly<{ enabled: boolean }>) {
  const pathname = usePathname();
  const queue = useRef<AnalyticsEvent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedOnce = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;
    if (
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    ) {
      return;
    }

    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (queue.current.length === 0) return;
      const events = queue.current.splice(0, analyticsBatchLimit);
      const body = JSON.stringify({ events });
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/analytics/events", blob)) {
        void fetch("/api/analytics/events", {
          method: "POST",
          body,
          headers: { "content-type": "application/json" },
          keepalive: true,
        }).catch(() => undefined);
      }
    };

    const enqueue = (t: BrowserEventType, d = "") => {
      const p = canonicalPathKey(window.location.pathname);
      if (!p) return;
      queue.current.push({ t, p, d, dc: deviceClassFor(window.innerWidth) });
      if (queue.current.length >= analyticsBatchLimit) flush();
      else if (!timer.current) timer.current = setTimeout(flush, 2_000);
    };

    // Page view for the current route (once per pathname).
    const pathKey = canonicalPathKey(pathname);
    if (pathKey && !firedOnce.current.has(`view:${pathKey}`)) {
      firedOnce.current.add(`view:${pathKey}`);
      enqueue("page_view");
      const derived = pathDimension(pathKey);
      if (derived) enqueue(derived.event, derived.slug);
    }

    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-analytics-cta],[data-analytics-event]",
      );
      if (!target) return;
      const cta = target.dataset["analyticsCta"];
      if (cta) enqueue("cta_click", cta);
      const custom = target.dataset["analyticsEvent"];
      if (custom === "project_intake_start" || custom === "service_enquiry_start") {
        const key = `event:${custom}:${pathKey ?? ""}`;
        if (!firedOnce.current.has(key)) {
          firedOnce.current.add(key);
          enqueue(custom, target.dataset["analyticsDimension"] ?? "");
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const form = (event.target as Element | null)?.closest<HTMLFormElement>(
        "form[data-analytics-form]",
      );
      const kind = form?.dataset["analyticsForm"];
      if (kind !== "project_intake_start" && kind !== "service_enquiry_start") return;
      const key = `form:${kind}:${pathKey ?? ""}`;
      if (firedOnce.current.has(key)) return;
      firedOnce.current.add(key);
      enqueue(kind, form?.dataset["analyticsDimension"] ?? "");
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled, pathname]);

  return null;
}
