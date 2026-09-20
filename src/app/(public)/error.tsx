"use client";

export default function PublicError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main id="main-content" className="public-system-state">
      <section aria-labelledby="public-error-title">
        <p className="section-kicker">Something went wrong</p>
        <h1 id="public-error-title">This page could not load.</h1>
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
