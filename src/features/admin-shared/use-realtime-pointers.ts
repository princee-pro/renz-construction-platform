"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import type {
  RealtimeConnectionState,
  RealtimeEntityType,
} from "@/features/admin-shared/use-realtime-invalidation";

let channelSequence = 0;

export type RealtimePointer = Readonly<{ entityType: string; entityId: string; action: string }>;

/**
 * Generic pointer subscription (C9 §74): the same value-free
 * `realtime_events` stream as `useAdminRealtimeInvalidation`, but the caller
 * decides what to refetch (the notification bell calls a server action
 * rather than refreshing the whole route). The pointer payload is never
 * rendered — it only says "go and ask the server".
 */
export function useRealtimePointers(
  entityTypes: readonly RealtimeEntityType[],
  onPointer: (pointer: RealtimePointer) => void,
): RealtimeConnectionState {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("connecting");
  const handler = useRef(onPointer);
  const entityTypesKey = entityTypes.join(",");

  useEffect(() => {
    handler.current = onPointer;
  });

  useEffect(() => {
    const allowed = new Set(entityTypesKey.split(",").filter(Boolean));
    if (allowed.size === 0) return;
    const client = getBrowserSupabaseClient();
    let cancelled = false;
    const channel = client
      // Unique topic per subscriber: two bells (sidebar + mobile bar) must not
      // share one channel object.
      .channel(`admin-pointers-${entityTypesKey}-${(channelSequence += 1)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "realtime_events" },
        (payload: { new?: { entity_type?: string; entity_id?: string; action?: string } }) => {
          const entityType = payload.new?.entity_type;
          if (!entityType || !allowed.has(entityType)) return;
          handler.current({
            entityType,
            entityId: payload.new?.entity_id ?? "",
            action: payload.new?.action ?? "",
          });
        },
      );
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
      void client.removeChannel(channel);
    };
  }, [entityTypesKey]);

  return connectionState;
}
