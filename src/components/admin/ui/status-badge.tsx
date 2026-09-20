import type { ReactNode } from "react";

type StatusTone = "neutral" | "draft" | "published" | "archived" | "ready" | "blocked" | "review";

export function StatusBadge({
  children,
  tone = "neutral",
}: Readonly<{ children: ReactNode; tone?: StatusTone }>) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
