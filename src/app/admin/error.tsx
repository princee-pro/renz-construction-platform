"use client";

type AdminErrorProps = Readonly<{
  reset: () => void;
}>;

export default function AdminError({ reset }: AdminErrorProps) {
  return (
    <main className="admin-page" id="main-content">
      <section aria-labelledby="admin-error-heading" className="admin-panel">
        <p className="eyebrow">Administration</p>
        <h1 id="admin-error-heading">The secure workspace is unavailable</h1>
        <p className="admin-intro">
          Try again. If the problem continues, use the approved recovery path.
        </p>
        <button className="admin-button admin-button-primary" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
