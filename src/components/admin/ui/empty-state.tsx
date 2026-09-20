import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
  action,
}: Readonly<{ title: string; children: ReactNode; action?: ReactNode }>) {
  return (
    <section className="empty-state">
      <p className="eyebrow">No records</p>
      <h2>{title}</h2>
      <div className="empty-state-copy">{children}</div>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </section>
  );
}
