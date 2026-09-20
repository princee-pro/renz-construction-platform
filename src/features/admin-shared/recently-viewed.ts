const STORAGE_KEY = "renz-admin-recently-viewed";
const MAX_ENTRIES = 8;

export type RecentlyViewedEntry = Readonly<{
  kind:
    | "lead"
    | "client"
    | "project"
    | "invoice"
    | "contractor"
    | "supplier"
    | "material"
    | "purchase_order";
  id: string;
  label: string;
  href: string;
  viewedAt: string;
}>;

/**
 * Per-viewer convenience only — lives in this browser's localStorage, never
 * sent to the server, never shared between staff. Safe because it stores
 * nothing the signed-in viewer did not already see rendered on the page
 * they just visited.
 */
export function recordRecentlyViewed(entry: Omit<RecentlyViewedEntry, "viewedAt">): void {
  try {
    const existing = readRecentlyViewed();
    const next = [
      { ...entry, viewedAt: new Date().toISOString() },
      ...existing.filter((item) => !(item.kind === entry.kind && item.id === entry.id)),
    ].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled: recently-viewed is a convenience, never required.
  }
}

export function readRecentlyViewed(): readonly RecentlyViewedEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentlyViewedEntry =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>)["id"] === "string" &&
        typeof (item as Record<string, unknown>)["label"] === "string" &&
        typeof (item as Record<string, unknown>)["href"] === "string",
    );
  } catch {
    return [];
  }
}
