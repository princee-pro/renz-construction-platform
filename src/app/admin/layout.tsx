import type { ReactNode } from "react";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <div className="admin-shell">{children}</div>;
}
