import Link from "next/link";

/**
 * Root 404 for URLs outside every route group (C10 §128–130): the same calm
 * system-state surface as the public error page, plain words, useful ways
 * forward. The public group renders its own richer 404 for content routes.
 */
export default function NotFound() {
  return (
    <main className="public-system-state" id="main-content">
      <section aria-labelledby="not-found-title">
        <p className="section-kicker">Page not found</p>
        <h1 id="not-found-title">That page could not be found.</h1>
        <p>
          The link may be old, or the page may have moved. You can go back to the home page, look at
          our services, or start a project.
        </p>
        <p>
          <Link className="system-state-action" href="/">
            Go to the home page
          </Link>
        </p>
        <p>
          <Link href="/services">See our services</Link> ·{" "}
          <Link href="/contact">Send us a message</Link>
        </p>
      </section>
    </main>
  );
}
