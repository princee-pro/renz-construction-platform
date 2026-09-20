import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import {
  ChapterNarrative,
  type NarrativeChapter,
  type NarrativePlane,
} from "@/components/site/chapter-narrative";
import { DrawingReality } from "@/components/site/drawing-reality";
import { ProjectGallery, type GalleryMedia } from "@/components/site/project-gallery";
import { ProjectTile } from "@/components/site/project-cards";
import { StudyDrawing } from "@/components/site/study-drawing";
import type { ProjectCardData } from "@/features/public-content/data";
import { isApiMediaSrc, projectMediaSrc } from "@/lib/media/public-src";

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
  /** D1.7: the whole gallery in display order (hero first). */
  gallery: readonly GalleryMedia[];
  /** D1.7: up to three related studies (same category or service). */
  related: readonly ProjectCardData[];
  /** Evidence wording for this study's visuals. */
  evidence: string;
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
  const gallery = project.gallery;
  const byRole = (...roles: string[]) =>
    gallery.filter((item) => roles.includes(item.role) && item.role !== "hero");
  const spaces = byRole("context", "exterior", "interior", "dusk", "video");
  const drawings = byRole("drawing");
  const details = byRole("detail", "process");
  const plane = (item: GalleryMedia | undefined): NarrativePlane | null =>
    item && item.kind === "image"
      ? {
          src: projectMediaSrc(item.id, "thumb"),
          alt: item.alt,
          caption: item.caption,
          fit: item.role === "drawing" || item.role === "process" ? "contain" : "cover",
        }
      : null;
  // Which gallery image the sticky plane shows while each chapter is read:
  // brief → hero · site → context/exterior · challenge → hero · approach →
  // interior · design → interior/exterior · structure → section/plan ·
  // construction → sequence · materials → detail · final idea → hero.
  const planes: readonly (NarrativePlane | null)[] = [
    null,
    plane(spaces[0]),
    null,
    plane(spaces[1] ?? spaces[0]),
    plane(spaces[1] ?? spaces[0]),
    plane(drawings.find((item) => /section|plan/iu.test(item.caption ?? "")) ?? drawings[0]),
    plane(details.find((item) => item.role === "process") ?? drawings[1]),
    plane(details.find((item) => item.role === "detail") ?? details[0]),
    null,
  ];
  const chapters: readonly NarrativeChapter[] = project.chapters.map((chapter, index) => ({
    index: String(index + 1).padStart(2, "0"),
    key: chapter.title.toLowerCase().replace(/[^a-z0-9]+/gu, "-"),
    title: chapter.title,
    copy: chapter.copy,
    moment:
      index === 1 && spaces.length > 0 ? (
        <ProjectGallery
          items={spaces.slice(0, 2)}
          label="Context and spaces"
          sequence
          title={project.title}
        />
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
      ) : index === 7 && details.length > 0 ? (
        <ProjectGallery
          items={details.slice(0, 3)}
          label="Details and process"
          sequence
          title={project.title}
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
          <p className="concept-badge study-hero-provenance">{project.evidence}</p>
        </div>
      </header>

      <section aria-label="Concept study narrative" className="sec tone-paper study-narrative">
        <div className="container">
          <ChapterNarrative
            chapters={chapters}
            framing={framing}
            image={project.image}
            imageAlt={project.alt}
            planes={planes}
            provenance={project.evidence}
          />
        </div>
      </section>

      {gallery.length > 0 ? (
        <section
          aria-labelledby="study-gallery-title"
          className="sec tone-limestone study-gallery"
          id="gallery"
        >
          <div className="container section-head">
            <div>
              <p className="kicker">Gallery</p>
              <h2 id="study-gallery-title">
                {String(gallery.length).padStart(2, "0")} pieces of one study.
              </h2>
            </div>
            <p>
              Concept visuals, drawings and a construction sequence for this study. Select any piece
              to see it large. {project.evidence}.
            </p>
          </div>
          <div className="container">
            <ProjectGallery items={gallery} title={project.title} />
          </div>
        </section>
      ) : null}

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

      {project.related.length > 0 ? (
        <section aria-labelledby="related-studies-title" className="sec tone-paper study-related">
          <div className="container section-head">
            <div>
              <p className="kicker">Related studies</p>
              <h2 id="related-studies-title">More studies like this one.</h2>
            </div>
          </div>
          <div className="container studies-grid studies-grid-related">
            {project.related.slice(0, 3).map((card, index) => (
              <ProjectTile index={index} key={card.id} project={card} shape="third" />
            ))}
          </div>
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
