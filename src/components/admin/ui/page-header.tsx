import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  status?: ReactNode;
}>;

export function PageHeader({ eyebrow, title, description, actions, status }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">
          {eyebrow}
          {status ? <> {status}</> : null}
        </p>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
