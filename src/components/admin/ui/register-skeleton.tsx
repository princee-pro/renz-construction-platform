/**
 * Route-level loading placeholder for Control Room registers and records
 * (C4 §58). Mirrors the page-header + rows silhouette so the real content
 * lands without a layout jump, and deliberately shows no numbers — a
 * placeholder must never read as a zero.
 */
export function RegisterSkeleton({
  eyebrow,
  title,
  rows = 6,
  metrics = 0,
}: Readonly<{ eyebrow: string; title: string; rows?: number; metrics?: number }>) {
  return (
    <main aria-busy="true" className="workspace-page" id="main-content">
      <header className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-description">Loading…</p>
        </div>
      </header>
      {metrics > 0 ? (
        <div aria-hidden="true" className="skeleton-metrics">
          {Array.from({ length: metrics }, (_, index) => (
            <span className="skeleton-block skeleton-metric" key={index} />
          ))}
        </div>
      ) : null}
      <ol aria-hidden="true" className="skeleton-rows">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index}>
            <span className="skeleton-block skeleton-line skeleton-line-wide" />
            <span className="skeleton-block skeleton-line" />
            <span className="skeleton-block skeleton-line skeleton-line-short" />
          </li>
        ))}
      </ol>
    </main>
  );
}
