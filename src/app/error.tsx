"use client";

/**
 * Root error boundary (C10 §128–130): reached only when a route-group
 * boundary is not available. Plain words, a retry, no internals.
 */
export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="public-system-state" id="main-content">
      <section aria-labelledby="error-title">
        <p className="section-kicker">Something went wrong</p>
        <h1 id="error-title">This page could not load.</h1>
        <p>
          Please try again. If it keeps happening, you can still reach RENZ by WhatsApp or email.
        </p>
        <button className="system-state-action" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
