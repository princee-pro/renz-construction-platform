import Link from "next/link";

import { ArrowMark } from "@/components/site/arrow-mark";
import { Landing } from "@/components/site/landing/landing";

/** 404 (D1.6 brief §70): plain words and three useful ways forward. */
export default function PublicNotFound() {
  return (
    <main className="public-main not-found-page" id="main-content">
      <Landing
        concept="calm"
        eyebrow="Page not found"
        field="survey"
        headingId="public-not-found-title"
        primary={{ href: "/", label: "Go to the home page" }}
        secondary={{ href: "/services", label: "See our services" }}
        summary="The link may be old, or the page may have moved. You can go back to the home page, look at our services, or start a project."
        title="That page could not be found."
      />
      <section aria-label="Ways forward" className="sec tone-paper not-found-actions">
        <div className="container">
          <ul className="not-found-list">
            <li>
              <Link className="datum-link" href="/projects">
                See project studies
                <ArrowMark />
              </Link>
            </li>
            <li>
              <Link
                className="datum-link"
                data-analytics-cta="start_project"
                href="/start-a-project"
              >
                Start a project
                <ArrowMark />
              </Link>
            </li>
            <li>
              <Link className="datum-link" href="/contact">
                Send us a message
                <ArrowMark />
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
