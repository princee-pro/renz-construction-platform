"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { ArrowMark } from "@/components/site/arrow-mark";
import { Field } from "@/components/site/fields";
import { serviceField } from "@/components/site/service-fields";
import type { ServiceCategory } from "@/features/services/content";

export type RelatedProjectFigure = Readonly<{
  slug: string;
  title: string;
  src: string;
  alt: string;
  provenanceLabel: string | null;
}>;

type ServicesIndexProps = Readonly<{
  services: readonly ServiceCategory[];
  /** "compact" for the home strip, "signature" for /services. */
  mode?: "compact" | "signature";
  /** First related published project per service id (auto-placed from the Projects register). */
  relatedProjects?: Readonly<Record<string, RelatedProjectFigure>>;
}>;

/**
 * Services navigator (D1 §26). Left: large indexed service titles. Centre:
 * the selected service's explanation, capabilities and CTA. Right: the
 * service's technical field and (in preview) a related concept study.
 * Selecting changes media, field, datum position and the supporting
 * capabilities. Keyboard: the titles are real links; arrow keys move the
 * selection; Enter follows the link.
 */
export function ServicesIndex({
  services,
  mode = "signature",
  relatedProjects = {},
}: ServicesIndexProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const active = services[activeIndex];
  if (!active) return null;
  const study = relatedProjects[active.id];

  return (
    <div
      className={`services-index services-index-${mode}`}
      data-service={active.slug}
      style={{ "--active-index": activeIndex } as React.CSSProperties}
    >
      <ol
        aria-label="Services"
        className="services-index-list"
        id={listId}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          const next =
            event.key === "ArrowDown"
              ? (activeIndex + 1) % services.length
              : (activeIndex - 1 + services.length) % services.length;
          setActiveIndex(next);
          const link = document.querySelectorAll<HTMLAnchorElement>(`#${CSS.escape(listId)} a`)[
            next
          ];
          link?.focus();
        }}
      >
        {services.map((service, index) => (
          <li key={service.slug} data-active={index === activeIndex ? "true" : undefined}>
            <Link
              aria-current={index === activeIndex ? "true" : undefined}
              href={`/services/${service.slug}`}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="index-mark">{service.index}</span>
              <strong>{service.name}</strong>
              <ArrowMark />
            </Link>
          </li>
        ))}
        <span aria-hidden="true" className="services-index-datum" />
        <li aria-hidden="true" className="services-index-hint">
          Hover, tap or use ↑ ↓ to compare services
        </li>
      </ol>

      <div className="services-index-detail" key={active.slug}>
        <p className="kicker">
          {active.index} / {active.name}
        </p>
        <h3>{active.positioning}</h3>
        {mode === "signature" ? (
          <p className="services-index-overview">{active.overview[0]}</p>
        ) : null}
        <ul className="services-index-capabilities" aria-label={`${active.name} includes`}>
          {active.subServices.slice(0, mode === "signature" ? 6 : 4).map((sub) => (
            <li key={sub}>{sub}</li>
          ))}
        </ul>
        <div className="services-index-actions">
          <Link className="btn btn-primary" href={`/services/${active.slug}`}>
            <span>See {active.name}</span>
            <ArrowMark />
          </Link>
          <Link
            className="datum-link on-dark"
            data-analytics-cta="service_enquiry"
            href={`/enquire/service?service=${active.slug}`}
          >
            Enquire
            <ArrowMark />
          </Link>
        </div>
      </div>

      <div className="services-index-visual" aria-hidden="true">
        <div className="services-index-field" key={`field-${active.slug}`}>
          <Field tone="dark" variant={serviceField(active.slug, activeIndex)} />
        </div>
        {study ? (
          <figure className="services-index-study" key={`study-${study.slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" loading="lazy" src={study.src} />
            <figcaption>
              <span className="datum-label">{study.provenanceLabel ?? "Related project"}</span>
              <strong>{study.title}</strong>
            </figcaption>
          </figure>
        ) : null}
        <span className="services-index-visual-label">
          Field {active.index} / {active.name}
        </span>
      </div>
    </div>
  );
}
