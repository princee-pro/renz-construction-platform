import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { LineDraw, Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { DrawingReality } from "@/components/site/drawing-reality";
import { Field, type FieldVariant } from "@/components/site/fields";
import { Landing } from "@/components/site/landing/landing";
import { serviceLandingConcept } from "@/components/site/landing/landing-concepts";
import { ProjectStudyCard } from "@/components/site/project-cards";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import { StudyDrawing } from "@/components/site/study-drawing";
import {
  getAllPublishedProjectServiceLinks,
  getPublishedProjectCards,
} from "@/features/public-content/data";
import {
  getPublicServiceCategories,
  getPublicServiceCategoryBySlug,
} from "@/features/services/service-source";
import { getPublicWebsiteMedia, resolveRouteAlias } from "@/features/website/data";
import { getWebsiteGlobals } from "@/features/website/data";
import { isApiMediaSrc } from "@/lib/media/public-src";
import { createPublicMetadata } from "@/lib/seo/public-metadata";
import { getSiteIdentity, whatsappLink } from "@/lib/site/public-configuration";

export const dynamic = "force-dynamic";

/**
 * Service register (D1 §27): one family, deliberately different pages.
 * DESIGN is drawing-led, EXECUTIONS construction/process-led, HYBRID moves
 * from drawing to built form, SUPERVISION is checkpoint-led, CONSULTATIONS
 * decision-led. Services the owner adds later cycle through the same
 * registers by position, so Service #6 gets a coherent page without code.
 * Content is the published Services register (CR1); related projects are
 * placed automatically from the owner's Project ↔ Service relationships.
 */
type ServiceRegister = Readonly<{
  field: FieldVariant;
  lead: "drawing" | "process" | "comparison" | "checkpoints" | "decisions";
  tone: "paper" | "limestone" | "concrete";
}>;

const REGISTERS: readonly ServiceRegister[] = [
  { field: "plan", lead: "drawing", tone: "paper" },
  { field: "structure", lead: "process", tone: "concrete" },
  { field: "datum", lead: "comparison", tone: "limestone" },
  { field: "survey", lead: "checkpoints", tone: "paper" },
  { field: "quiet", lead: "decisions", tone: "limestone" },
];

const SERVICE_REGISTER: Readonly<Record<string, ServiceRegister>> = {
  design: REGISTERS[0]!,
  executions: REGISTERS[1]!,
  "hybrid-service": REGISTERS[2]!,
  supervision: REGISTERS[3]!,
  consultations: REGISTERS[4]!,
};

function registerFor(slug: string, index: number): ServiceRegister {
  return SERVICE_REGISTER[slug] ?? REGISTERS[index % REGISTERS.length]!;
}

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceCategoryBySlug(slug);
  if (!service) return createPublicMetadata({ title: "Service not found", description: "" });
  return createPublicMetadata({
    title: service.seoTitle ?? service.name,
    description: service.seoDescription ?? service.positioning,
  });
}

export default async function ServiceDetailPage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const [service, allServices, identity, projects, links, globals] = await Promise.all([
    getPublicServiceCategoryBySlug(slug),
    getPublicServiceCategories(),
    getSiteIdentity(),
    getPublishedProjectCards(),
    getAllPublishedProjectServiceLinks(),
    getWebsiteGlobals(),
  ]);
  if (!service) {
    // A renamed service keeps its old address working (CR1 §49).
    const alias = await resolveRouteAlias(`/services/${slug}`);
    if (alias) permanentRedirect(alias);
    notFound();
  }
  const register = registerFor(slug, Number(service.index) - 1);
  const related = allServices.filter((candidate) => candidate.slug !== slug);
  const relatedProjectIds = new Set(
    links.filter((link) => link.serviceId === service.id).map((link) => link.projectId),
  );
  const studies = projects.filter((project) => relatedProjectIds.has(project.id));
  const leadStudy = studies.find((project) => project.media) ?? null;
  const leadStudyMediaSrc = leadStudy?.media
    ? `/api/media/project/${leadStudy.media.projectMediaId}`
    : null;
  const conceptOnly = studies.every((project) => project.evidenceClass !== "real_project");
  // Landing poster: the owner's hero image for this service, else the lead study.
  const heroMedia = service.heroAssetId
    ? ((await getPublicWebsiteMedia([service.heroAssetId])).get(service.heroAssetId) ?? null)
    : null;
  const landingPoster = heroMedia
    ? {
        src: `/api/media/website/${heroMedia.id}`,
        alt: heroMedia.altText ?? "",
        focalX: heroMedia.focalX,
        focalY: heroMedia.focalY,
      }
    : leadStudy?.media && leadStudyMediaSrc
      ? {
          src: leadStudyMediaSrc,
          alt: leadStudy.media.alt,
          focalX: leadStudy.media.focalX,
          focalY: leadStudy.media.focalY,
        }
      : null;
  const landingProvenance = heroMedia
    ? heroMedia.provenanceClass && heroMedia.provenanceClass !== "production"
      ? "Concept visual"
      : null
    : leadStudy && leadStudy.evidenceClass !== "real_project"
      ? "Concept study / not project evidence"
      : null;
  const whatsapp = whatsappLink(
    identity.whatsappDigits,
    `Hello ${identity.shortName}, I would like to ask about ${service.name}.`,
  );

  const leadVisual =
    register.lead === "drawing" ? (
      <Reveal as="figure" className="service-lead-drawing" variant="measure">
        <StudyDrawing slug={leadStudy?.slug ?? "ridge-residence"} />
        <figcaption>
          <span className="datum-label">Example drawing</span> A technical drawing of a concept
          study — the kind of clear, coordinated drawing this service produces.
        </figcaption>
      </Reveal>
    ) : register.lead === "comparison" && leadStudy?.media && leadStudyMediaSrc ? (
      <DrawingReality
        drawing={<StudyDrawing slug={leadStudy.slug} />}
        reality={
          <Image
            alt={leadStudy.media.alt}
            fill
            quality={86}
            sizes="(max-width: 1024px) 100vw, 80vw"
            src={leadStudyMediaSrc}
            unoptimized={isApiMediaSrc(leadStudyMediaSrc)}
          />
        }
      />
    ) : register.lead === "process" ||
      (register.lead === "comparison" && service.process.length > 0) ? (
      <Stagger as="ol" className="service-lead-process" gap={0.08}>
        {service.process.map((step, index) => (
          <StaggerItem as="li" key={step} variant="shift">
            <span className="process-panel-index">{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
            <LineDraw delay={index * 0.08} />
          </StaggerItem>
        ))}
      </Stagger>
    ) : register.lead === "checkpoints" ? (
      <Stagger as="ol" className="service-lead-checkpoints" gap={0.08}>
        {service.subServices.map((item) => (
          <StaggerItem as="li" key={item}>
            <span aria-hidden="true" className="checkpoint-mark" />
            <span>{item}</span>
          </StaggerItem>
        ))}
      </Stagger>
    ) : (
      <Stagger as="ul" className="service-lead-decisions" gap={0.08}>
        {service.useCases.map((useCase, index) => (
          <StaggerItem as="li" key={useCase}>
            <span className="index-mark">Q{index + 1}</span>
            <span>{useCase}</span>
          </StaggerItem>
        ))}
      </Stagger>
    );

  return (
    <main id="main-content" className="public-main service-page" data-service={slug}>
      <Landing
        breadcrumb={{ href: "/services", label: "Services" }}
        concept={serviceLandingConcept(slug, Number(service.index) - 1)}
        eyebrow={service.name}
        facts={[
          { label: "Service", value: `${service.index} of ${allServices.length}` },
          ...(service.subServices.length > 0
            ? [{ label: "Includes", value: `${service.subServices.length} areas of work` }]
            : []),
          { label: "How it works", value: "On its own or with other services" },
        ]}
        field={register.field}
        headingId="service-heading"
        poster={landingPoster}
        primary={{
          href: `/enquire/service?service=${service.slug}`,
          label: "Ask about this service",
          analytics: "service_enquiry",
        }}
        provenance={landingProvenance}
        secondary={{ href: "/start-a-project", label: "Start a Project" }}
        summary={service.positioning}
        title={service.name}
      />

      <section
        aria-labelledby="service-overview-title"
        className={`sec tone-${register.tone} service-overview`}
      >
        <div className="container grid-12">
          <Reveal as="div" className="service-overview-copy" variant="rise">
            <p className="kicker">Overview</p>
            <h2 id="service-overview-title">What this service is.</h2>
            {service.overview.map((paragraph) => (
              <p className="lede" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </Reveal>
          <aside aria-label="Service summary" className="service-register-card">
            {service.subServices.length > 0 ? (
              <>
                <p className="datum-label">Includes</p>
                <ul className="service-includes">
                  {service.subServices.map((sub) => (
                    <li key={sub}>{sub}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {service.exclusions ? (
              <>
                <p className="datum-label">Not included</p>
                <p className="service-excludes">{service.exclusions}</p>
              </>
            ) : null}
            <div className="service-detail-cta">
              <Link
                className="btn btn-primary"
                data-analytics-cta="service_enquiry"
                href={`/enquire/service?service=${service.slug}`}
              >
                <span>Enquire about this service</span>
                <ArrowMark />
              </Link>
              <Link
                className="btn btn-secondary"
                data-analytics-cta="start_project"
                href={`/start-a-project?service=${service.slug}&source=service/${service.slug}`}
              >
                <span>{identity.cta.label}</span>
              </Link>
              <a
                className="datum-link datum-link-whatsapp"
                data-analytics-cta="whatsapp"
                href={whatsapp}
                rel="noreferrer"
                target="_blank"
              >
                <WhatsAppGlyph />
                <span>{globals.copy.whatsapp_cta_label}</span>
                <ArrowMark />
              </a>
            </div>
          </aside>
        </div>
      </section>

      {service.process.length > 0 ||
      service.useCases.length > 0 ||
      service.subServices.length > 0 ? (
        <section aria-labelledby="service-lead-title" className="sec tone-paper service-lead">
          <Field tone="light" variant={register.field} className="service-lead-field" />
          <div className="container">
            <div className="section-head">
              <div>
                <p className="kicker">
                  {register.lead === "drawing"
                    ? "What RENZ does"
                    : register.lead === "process"
                      ? "How the build runs"
                      : register.lead === "comparison"
                        ? "From drawing to building"
                        : register.lead === "checkpoints"
                          ? "What we check"
                          : "What you will know"}
                </p>
                <h2 id="service-lead-title">
                  {register.lead === "drawing"
                    ? "Drawings a builder can price and build."
                    : register.lead === "process"
                      ? "How a RENZ build runs, step by step."
                      : register.lead === "comparison"
                        ? "One team, from the drawing to the building."
                        : register.lead === "checkpoints"
                          ? "What gets checked, and when."
                          : "What you will know before you commit."}
                </h2>
              </div>
              {service.coordination ? <p>{service.coordination}</p> : null}
            </div>
            {leadVisual}
          </div>
        </section>
      ) : null}

      {service.useCases.length > 0 ? (
        <section
          aria-labelledby="service-usecases-title"
          className="sec tone-concrete service-usecases"
        >
          <div className="container grid-12">
            <Reveal as="div" className="service-usecases-intro" variant="rise">
              <p className="kicker">When you need it</p>
              <h2 id="service-usecases-title">This service fits when…</h2>
            </Reveal>
            <Stagger as="ul" className="service-usecase-grid" gap={0.08}>
              {service.useCases.map((useCase, index) => (
                <StaggerItem as="li" key={useCase}>
                  <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
                  <LineDraw delay={index * 0.06} />
                  <p>{useCase}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {register.lead !== "process" && service.process.length > 0 ? (
        <section aria-labelledby="service-process-title" className="sec tone-paper">
          <div className="container section-head">
            <div>
              <p className="kicker">What happens next</p>
              <h2 id="service-process-title">How it works, step by step.</h2>
            </div>
          </div>
          <Stagger as="ol" className="container service-sequence" gap={0.08}>
            {service.process.map((step, index) => (
              <StaggerItem as="li" key={step} variant="shift">
                <span className="process-panel-index">{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}

      {studies.length > 0 ? (
        <section
          aria-labelledby="service-studies-title"
          className="sec tone-limestone service-studies"
        >
          <div className="container section-head">
            <div>
              <p className="kicker">
                {conceptOnly ? "Related concept studies" : "Related projects"}
              </p>
              <h2 id="service-studies-title">
                {conceptOnly
                  ? "How this service looks in a study."
                  : "Where RENZ delivered this service."}
              </h2>
            </div>
            <div className="section-head-aside">
              {conceptOnly ? (
                <p>Concept studies, clearly labelled. They are not completed RENZ projects.</p>
              ) : null}
              <Link className="datum-link" href="/projects">
                {conceptOnly ? "See all studies" : "See all projects"}
                <ArrowMark />
              </Link>
            </div>
          </div>
          <div className="container service-studies-grid">
            {studies.slice(0, 3).map((project, index) => (
              <ProjectStudyCard
                composition={project.media ? (index === 0 ? "landscape" : "portrait") : "technical"}
                delay={index * 0.06}
                index={index}
                key={project.id}
                project={project}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ))}
          </div>
        </section>
      ) : null}

      {service.faqs.length > 0 ? (
        <section aria-labelledby="service-faq-title" className="sec tone-paper service-faq">
          <div className="container grid-12">
            <Reveal as="div" className="service-faq-intro" variant="rise">
              <p className="kicker">Common questions</p>
              <h2 id="service-faq-title">Questions people ask us.</h2>
            </Reveal>
            <div className="service-faq-list">
              {service.faqs.map((faq) => (
                <details className="faq" key={faq.question}>
                  <summary>
                    <span>{faq.question}</span>
                    <span aria-hidden="true" className="faq-mark" />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="service-related-title" className="sec tone-ink service-related">
          <div className="container section-head">
            <div>
              <p className="kicker">Other services</p>
              <h2 id="service-related-title">Services that work well with {service.name}.</h2>
            </div>
          </div>
          <ol className="container service-related-list">
            {related.map((relatedService) => (
              <li key={relatedService.slug}>
                <Link href={`/services/${relatedService.slug}`}>
                  <span className="index-mark">{relatedService.index}</span>
                  <strong>{relatedService.name}</strong>
                  <small>{relatedService.positioning}</small>
                  <ArrowMark />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
