"use client";

import { useEffect, useState } from "react";

import {
  useAdminRealtimeInvalidation,
  type RealtimeEntityType,
} from "@/features/admin-shared/use-realtime-invalidation";

const recentWindowMs = 6_000;

/**
 * Mountable Control Room live-refresh indicator for Server Component pages
 * (registers, Overview) that have no client-side state of their own.
 *
 * It owns nothing but the subscription: on a matching change pointer the
 * hook re-fetches the route through `router.refresh()`, and this component
 * only says so ("Updated just now"). While the channel is down it says that
 * too — ordinary navigation keeps working regardless (C4 §60).
 */
export function RealtimeRefresh({
  entityTypes,
}: Readonly<{ entityTypes: readonly RealtimeEntityType[] }>) {
  const { connectionState, lastUpdatedAt } = useAdminRealtimeInvalidation(entityTypes);
  const [seenUpdatedAt, setSeenUpdatedAt] = useState<number | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);

  // A new change pointer opens the "just now" window (state adjusted during
  // render); the timer below closes it again.
  if (lastUpdatedAt !== seenUpdatedAt) {
    setSeenUpdatedAt(lastUpdatedAt);
    if (lastUpdatedAt !== null) setRecentlyUpdated(true);
  }

  useEffect(() => {
    if (!recentlyUpdated) return;
    const timer = setTimeout(() => setRecentlyUpdated(false), recentWindowMs);
    return () => clearTimeout(timer);
  }, [recentlyUpdated, lastUpdatedAt]);

  if (connectionState === "connecting") return null;

  return (
    <span aria-live="polite" className="realtime-status" data-state={connectionState} role="status">
      {connectionState === "connected" ? (
        <>
          <span aria-hidden="true" className="realtime-dot" />
          {recentlyUpdated ? "Updated just now" : "Live"}
        </>
      ) : (
        "Live updates paused"
      )}
    </span>
  );
}
