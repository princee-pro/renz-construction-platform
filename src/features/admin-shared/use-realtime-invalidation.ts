"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export type RealtimeConnectionState = "connecting" | "connected" | "disconnected";

export type RealtimeEntityType =
  | "client"
  | "operational_project"
  | "invoice"
  | "trade_partner"
  | "contractor_assignment"
  | "material"
  | "material_requirement"
  | "purchase_order"
  | "settings"
  | "lead"
  | "notification"
  | "website_page";

/**
 * Control Room realtime invalidation (C4 §4-5, §40-41).
 *
 * Subscribes to `public.realtime_events` — a table of PII-free change
 * pointers (`entity_type`/`entity_id`/`action` only, never field values) —
 * filtered to the requested entity types. On a matching insert it calls
 * `router.refresh()` so the current Server Component re-fetches authoritative
 * data through the normal RPCs; the realtime payload itself is never treated
 * as authoritative and is never rendered directly.
 *
 * If the realtime channel cannot connect or drops, ordinary server requests
 * (page loads, form submits) keep working — realtime is a convenience, not
 * a requirement for CRUD, per C4 §60.
 */
export function useAdminRealtimeInvalidation(
  entityTypes: readonly RealtimeEntityType[],
): Readonly<{ connectionState: RealtimeConnectionState; lastUpdatedAt: number | null }> {
  const router = useRouter();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const entityTypesKey = entityTypes.join(",");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const allowed = new Set(entityTypesKey.split(",").filter(Boolean));
    if (allowed.size === 0) return;

    const client = getBrowserSupabaseClient();
    let cancelled = false;
    const channel = client
      .channel(`admin-realtime-${entityTypesKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "realtime_events" },
        (payload: { new?: { entity_type?: string } }) => {
          const entityType = payload.new?.entity_type;
          if (!entityType || !allowed.has(entityType)) return;
          setLastUpdatedAt(Date.now());
          // Coalesce bursts (e.g. status + history insert in one action) into
          // a single refresh rather than one per row.
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => router.refresh(), 250);
        },
      );

    // The realtime socket must carry the CURRENT (AAL2) access token: the
    // RLS policy on realtime_events admits only active AAL2 staff, and
    // supabase-js does not re-push a token to the socket after an MFA
    // step-up. Push it explicitly, then subscribe.
    void client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session?.access_token) void client.realtime.setAuth(data.session.access_token);
        channel.subscribe((status: string) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") setConnectionState("connected");
          else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnectionState("disconnected");
          }
        });
      })
      .catch(() => {
        if (!cancelled) setConnectionState("disconnected");
      });

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void client.removeChannel(channel);
    };
  }, [entityTypesKey, router]);

  return { connectionState, lastUpdatedAt };
}
