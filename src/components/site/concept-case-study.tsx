import Image from "next/image";
import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { ChapterNarrative, type NarrativeChapter } from "@/components/site/chapter-narrative";
import { DrawingReality } from "@/components/site/drawing-reality";
import { StudyDrawing } from "@/components/site/study-drawing";

import { isApiMediaSrc } from "@/lib/media/public-src";

/** Everything the concept case study renders, built from the published project (CR1). */
export type ConceptStudyView = Readonly<{
  index: string;
  slug: string;
  title: string;
  category: string;
  materials: string | null;
  atmosphere: string;
  image: string;
  alt: string;
  composition: string;
  badge: string;
  chapters: readonly Readonly<{ title: string; copy: string }>[];
  services: readonly Readonly<{ index: string; slug: string; name: string; positioning: string }>[];
  ctaLabel: string;
}>;

export type ConceptStudyNext = Readonly<{
  index: string;
  slug: string;
  title: string;
  category: string;
  image: string | null;
  alt: string;
  badge: string;
}>;

const provenance = "Generated visual / not RENZ project evidence";

/** Chapter → how the sticky media plane frames the single concept image. */
const framing = [
  "50% 50%",
  "20% 60%",
  "70% 40%",
  "50% 30%",
  "35% 55%",
  "80% 60%",
  "60% 75%",
  "25% 40%",
  "50% 50%",
];

/**
 * Concept case study (D1 §32–34): cinematic hero, facts, chapters with a
 * sticky media plane, detail crops, the Drawing ↔ Built comparison, related
 * services and the next study. It stays a CONCEPT STUDY throughout — the
 * provenance line is repeated, never hidden.
 */
export function ConceptCaseStudy({
  project,
  nextProject,
}: Readonly<{ project: ConceptStudyView; nextProject: ConceptStudyNext | null }>) {
  const relatedServices = project.services;
  const chapters: readonly NarrativeChapter[] = project.chapters.map((chapter, index) => ({
    index: String(index + 1).padStart(2, "0"),
    key: chapter.title.toLowerCase().replace(/[^a-z0-9]+/gu, "-"),
    title: chapter.title,
    copy: chapter.copy,
    moment:
      index === 2 ? (
        <figure
          className="study-detail-crop"
          style={{ "--crop": "78% 70%" } as React.CSSProperties}
        >
          <Image
            alt={project.alt}
            fill
            quality={85}
            sizes="(max-width: 1024px) 100vw, 50vw"
            src={project.image}
            unoptimized={isApiMediaSrc(project.image)}
          />
          <figcaption>
            <span className="concept-badge">Concept detail crop</span>
            <span>{project.materials}</span>
          </figcaption>
        </figure>
      ) : index === 5 ? (
        <DrawingReality
          drawing={<StudyDrawing slug={project.slug} />}
          reality={
            <Image
              alt={project.alt}
              fill
              quality={86}
              sizes="(max-width: 1024px) 100vw, 60vw"
              src={project.image}
              unoptimized={isApiMediaSrc(project.image)}
            />
          }
        />
      ) : undefined,
  }));

  return (
    <main
      className="public-main study-page"
      data-composition={project.composition}
      id="main-content"
    >
      <header className="study-hero tone-ink">
        <Reveal as="div" className="study-hero-media" variant="resolve" duration={1.2}>
          <Image
            alt={project.alt}
            fill
            loading="eager"
            quality={90}
            sizes="100vw"
            src={project.image}
            unoptimized={isApiMediaSrc(project.image)}
          />
          <span className="media-wash" />
        </Reveal>
        <div className="container study-hero-content">
          <nav aria-label="Breadcrumb" className="masthead-breadcrumbs">
            <ol>
              <li>
                <Link href="/projects">Projects</Link>
              </li>
              <li aria-current="page">
                {project.badge} {project.index}
              </li>
            </ol>
          </nav>
          <Reveal variant="rise">
            <h1>{project.title}</h1>
            <p className="study-hero-summary">{project.atmosphere}</p>
          </Reveal>
          <dl aria-label="Study facts" className="study-facts">
            <div>
              <dt>Type</dt>
              <dd>{project.category}</dd>
            </div>
            {project.materials ? (
              <div>
                <dt>Materials</dt>
                <dd>{project.materials}</dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>{project.badge}</dd>
            </div>
            {relatedServices.length > 0 ? (
              <div>
                <dt>Services</dt>
                <dd>{relatedServices.map((service) => service.name).join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
          <p className="concept-badge study-hero-provenance">{provenance}</p>
        </div>
      </header>

      <section aria-label="Concept study narrative" className="sec tone-paper study-narrative">
        <div className="container">
          <ChapterNarrative
            chapters={chapters}
            framing={framing}
            image={project.image}
            imageAlt={project.alt}
            provenance={provenance}
          />
        </div>
      </section>

      <section aria-labelledby="study-gallery-title" className="sec tone-limestone study-gallery">
        <div className="container section-head">
          <div>
            <p className="kicker">Close-up details</p>
            <h2 id="study-gallery-title">Three close-ups of one study.</h2>
          </div>
          <p>
            Three crops of the same concept image — the edge, the building and the landscape —
            looked at the way we would look at a site photo during supervision. This is a concept
            image, not a RENZ project.
          </p>
        </div>
        <Stagger as="ul" className="container study-gallery-grid" gap={0.1}>
          {[
            ["Edge", "10% 60%"],
            ["Building", "50% 45%"],
            ["Landscape", "88% 55%"],
          ].map(([label, position], index) => (
            <StaggerItem as="li" key={label} variant="resolve">
              <figure
                className="study-detail-crop study-detail-crop-small"
                style={{ "--crop": position } as React.CSSProperties}
              >
                <Image
                  alt={project.alt}
                  fill
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  src={project.image}
                  unoptimized={isApiMediaSrc(project.image)}
                />
                <figcaption>
                  <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
                  <span>{label}</span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {relatedServices.length > 0 ? (
        <section aria-labelledby="study-services-title" className="sec tone-paper study-services">
          <div className="container section-head">
            <div>
              <p className="kicker">Services in this study</p>
              <h2 id="study-services-title">How RENZ would build it.</h2>
            </div>
          </div>
          <ol className="container service-related-list on-light">
            {relatedServices.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`}>
                  <span className="index-mark">{service.index}</span>
                  <strong>{service.name}</strong>
                  <small>{service.positioning}</small>
                  <ArrowMark />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {nextProject ? (
        <section aria-labelledby="next-study-title" className="next-study tone-ink">
          <Link
            aria-label={`Open ${nextProject.title} ${nextProject.badge.toLowerCase()}`}
            href={`/projects/${nextProject.slug}`}
          >
            <div className="next-study-media">
              {nextProject.image ? (
                <Image
                  alt={nextProject.alt}
                  fill
                  quality={85}
                  sizes="100vw"
                  src={nextProject.image}
                  unoptimized={isApiMediaSrc(nextProject.image)}
                />
              ) : null}
              <span className="media-wash" />
            </div>
            <div className="container next-study-copy">
              <p className="kicker">
                Next {nextProject.badge.toLowerCase()} / {nextProject.index}
              </p>
              <h2 id="next-study-title">{nextProject.title}</h2>
              <p>{nextProject.category}</p>
              <span className="datum-link on-dark">
                Continue
                <ArrowMark />
              </span>
            </div>
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="study-cta-title" className="sec tone-paper">
        <div className="container home-cta-grid">
          <Reveal variant="rise">
            <p className="kicker">Your project</p>
            <h2 id="study-cta-title">Have a site and an idea? That is enough to start.</h2>
            <div className="hero-actions">
              <Link
                className="btn btn-primary"
                data-analytics-cta="start_project"
                href="/start-a-project"
              >
                <span>{project.ctaLabel}</span>
                <ArrowMark />
              </Link>
              <Link className="btn btn-secondary" href="/services">
                <span>See our services</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
