"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  readRecentlyViewed,
  type RecentlyViewedEntry,
} from "@/features/admin-shared/recently-viewed";

const kindLabel: Readonly<Record<RecentlyViewedEntry["kind"], string>> = {
  lead: "Lead",
  client: "Client",
  project: "Project",
  invoice: "Invoice",
  contractor: "Contractor",
  supplier: "Supplier",
  material: "Material",
  purchase_order: "Purchase order",
};

export function RecentlyViewedPanel() {
  const [entries, setEntries] = useState<readonly RecentlyViewedEntry[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntries(readRecentlyViewed()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="admin-panel">
      <div className="section-heading-row section-heading-compact">
        <h2 id="recently-viewed-heading">Recently viewed</h2>
      </div>
      <ul className="recently-viewed-list">
        {entries.map((entry) => (
          <li key={`${entry.kind}-${entry.id}`}>
            <Link href={entry.href}>
              <span className="recently-viewed-kind">{kindLabel[entry.kind]}</span>
              <span>{entry.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
