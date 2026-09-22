import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { Reveal } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { Field, type FieldVariant } from "@/components/site/fields";
import {
  CinematicMedia,
  type CinematicPoster,
  type CinematicVideo,
} from "@/components/site/landing/cinematic-media";
import { FilmStrip, type FilmFrame } from "@/components/site/landing/film-strip";
import { isApiMediaSrc } from "@/lib/media/public-src";
import {
  landingSpecs,
  type LandingConcept,
  type LandingHeight,
} from "@/components/site/landing/landing-concepts";
import { LandingScene } from "@/components/site/landing/scenes";

export type LandingAction = Readonly<{
  href: string;
  label: string;
  analytics?: string | null;
  whatsapp?: boolean;
}>;

export type LandingFact = Readonly<{ label: string; value: string }>;

export type LandingProps = Readonly<{
  concept: LandingConcept;
  /** Overrides the concept's default height (owner choice on the masthead). */
  height?: LandingHeight | undefined;
  eyebrow?: string | undefined;
  breadcrumb?: Readonly<{ href: string; label: string }> | undefined;
  title: string;
  /** Home only: the two-line signature headline. */
  titleLines?: readonly string[] | undefined;
  summary?: string | null | undefined;
  primary?: LandingAction | null | undefined;
  secondary?: LandingAction | null | undefined;
  facts?: readonly LandingFact[] | undefined;
  poster?: CinematicPoster | null | undefined;
  video?: CinematicVideo | null | undefined;
  provenance?: string | null | undefined;
  /** Technical field drawn when a concept has no media plane of its own. */
  field?: FieldVariant | undefined;
  /** Projects index: the published studies for the film archive. */
  frames?: readonly FilmFrame[] | undefined;
  /** A right-hand plane supplied by the page (e.g. the service opener drawing). */
  aside?: ReactNode;
  headingId?: string;
  className?: string;
}>;

/**
 * Landing (D1.6 brief §41–42, §74–75): the first meaningful experience of
 * a route. One composition, many concepts: cinematic media with a scene over
 * it, or a split plane where the scene draws beside the copy, or a film
 * strip, or a calm header. Heights vary by concept so routes do not feel
 * like the same hero with different words. The copy, media, facts and
 * actions are content (CMS or domain); the concept decides motion and layout.
 */
export function Landing({
  concept,
  height,
  eyebrow,
  breadcrumb,
  title,
  titleLines,
  summary,
  primary,
  secondary,
  facts,
  poster,
  video,
  provenance,
  field,
  frames,
  aside,
  headingId = "landing-heading",
  className,
}: LandingProps) {
  const spec = landingSpecs[concept];
  const resolvedHeight = height ?? spec.height;
  const hasMedia = Boolean(poster) && spec.overlay;
  const lines = titleLines && titleLines.length > 0 ? titleLines : [title];
  const layout =
    concept === "film-archive" && (!frames || frames.length === 0) ? "left" : spec.layout;

  return (
    <header
      aria-labelledby={headingId}
      className={`landing landing-${concept} tone-ink${className ? ` ${className}` : ""}`}
      data-height={resolvedHeight}
      data-layout={layout}
      data-media={hasMedia ? "true" : "false"}
    >
      {/* Media plane: cinematic poster/video under overlay concepts; a technical field otherwise. */}
      {hasMedia && poster ? (
        <CinematicMedia
          className="landing-media"
          kenBurns={concept !== "project"}
          parallax
          poster={poster}
          video={video ?? null}
          wash={concept === "direct-line" || concept === "service-cue" ? "soft" : "strong"}
        />
      ) : layout !== "strip" ? (
        <Field className="landing-field" tone="dark" variant={field ?? "quiet"} />
      ) : null}

      {/* Scene over the media (overlay concepts). */}
      {spec.overlay ? (
        <div className="landing-scene-plane">
          <LandingScene concept={concept} />
        </div>
      ) : null}

      {layout === "strip" && frames && frames.length > 0 ? (
        <FilmStrip frames={frames} label={`${title} — studies`} />
      ) : null}

      <div className="container landing-grid">
        <Reveal as="div" className="landing-copy" variant="rise">
          {breadcrumb ? (
            <nav aria-label="Breadcrumb" className="masthead-breadcrumbs">
              <ol>
                <li>
                  <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                </li>
                <li aria-current="page">{eyebrow ?? title}</li>
              </ol>
            </nav>
          ) : eyebrow ? (
            <p className="kicker landing-kicker">{eyebrow}</p>
          ) : null}
          <h1 id={headingId}>
            {lines.map((line, index) => (
              <Fragment key={`${line}-${index}`}>
                {index > 0 ? " " : null}
                <span className="landing-line">
                  <span>
                    {line}
                    {index === lines.length - 1 && concept === "land" ? (
                      <span aria-hidden="true" className="landing-full-stop">
                        .
                      </span>
                    ) : null}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>
          <span aria-hidden="true" className="landing-datum" />
          {summary ? <p className="landing-summary">{summary}</p> : null}
          {primary || secondary ? (
            <div className="hero-actions landing-actions">
              {primary ? (
                <Link
                  className={`btn ${primary.whatsapp ? "btn-whatsapp" : "btn-primary"}`}
                  data-analytics-cta={primary.analytics ?? undefined}
                  href={primary.href}
                >
                  <span>{primary.label}</span>
                  <ArrowMark />
                </Link>
              ) : null}
              {secondary ? (
                <Link
                  className="btn btn-secondary on-dark"
                  data-analytics-cta={secondary.analytics ?? undefined}
                  href={secondary.href}
                >
                  <span>{secondary.label}</span>
                </Link>
              ) : null}
            </div>
          ) : null}
        </Reveal>

        {/* Split concepts: the scene sits in its own plane beside the copy. With a
            poster (D1.7 §63–64) the photograph sits muted under the drawing. */}
        {!spec.overlay && layout === "split" ? (
          <div
            aria-hidden="true"
            className={`landing-plane${poster ? " landing-plane-photo" : ""}`}
          >
            {poster ? (
              <Image
                alt=""
                className="landing-plane-image"
                fill
                priority
                quality={80}
                sizes="(max-width: 64rem) 100vw, 50vw"
                src={poster.src}
                style={{
                  objectPosition: `${Math.round((poster.focalX ?? 0.5) * 100)}% ${Math.round((poster.focalY ?? 0.5) * 100)}%`,
                }}
                unoptimized={isApiMediaSrc(poster.src)}
              />
            ) : null}
            {aside ?? <LandingScene concept={concept} />}
          </div>
        ) : null}
        {!spec.overlay && layout === "editorial" ? (
          <div aria-hidden="true" className="landing-plane landing-plane-editorial">
            {/* D1.8 §11: an editorial opener may supply its own mark (per-article
                field notes) instead of the shared concept scene. */}
            {aside ?? <LandingScene concept={concept} />}
          </div>
        ) : null}

        {facts && facts.length > 0 ? (
          <dl aria-label="Page facts" className="landing-facts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {provenance && (hasMedia || (layout === "split" && poster)) ? (
          <p className="landing-provenance concept-badge">{provenance}</p>
        ) : null}
      </div>
      <span aria-hidden="true" className="landing-handover" />
    </header>
  );
}
