"use client";

import { useEffect } from "react";

import {
  recordRecentlyViewed,
  type RecentlyViewedEntry,
} from "@/features/admin-shared/recently-viewed";

export function useRecordRecentlyViewed(entry: Omit<RecentlyViewedEntry, "viewedAt">): void {
  useEffect(() => {
    recordRecentlyViewed(entry);
    // Re-record only when the identity of the viewed record changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.kind, entry.id, entry.label, entry.href]);
}
