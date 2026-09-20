import type { ReactNode } from "react";

type AlertProps = Readonly<{
  children: ReactNode;
  title?: string;
  tone?: "info" | "success" | "warning" | "danger";
  live?: boolean;
}>;

export function Alert({ children, title, tone = "info", live = false }: AlertProps) {
  return (
    <div
      aria-live={live ? "polite" : undefined}
      className={`alert alert-${tone}`}
      role={tone === "danger" ? "alert" : undefined}
    >
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
