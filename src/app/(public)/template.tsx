import type { ReactNode } from "react";

/**
 * The public template remounts for each route, so the CSS-only entry
 * transition restarts without introducing a client boundary around Next's
 * loading/Suspense hierarchy. Reduced motion disables it in final-base.css.
 */
export default function PublicTemplate({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="page-transition">{children}</div>;
}
