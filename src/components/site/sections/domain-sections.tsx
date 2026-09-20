import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { Field } from "@/components/site/fields";
import { IntentionalEmptyState } from "@/components/site/intentional-empty-state";
import { ProcessNavigator } from "@/components/site/process-navigator";
import { ProcessStory } from "@/components/site/process-story";
import { ProjectStudyCard, ProjectsIndex } from "@/components/site/project-cards";
import {
  InlineText,
  SectionHead,
  SectionShell,
  indexMark,
  num,
  text,
  toneSpec,
} from "@/components/site/sections/shared";
import type { RenderContext, SectionRenderProps } from "@/components/site/sections/types";
import { ServicesIndex, type RelatedProjectFigure } from "@/components/site/services-index";
import { StudyDrawing } from "@/components/site/study-drawing";
import { placeProjects, selectShowcase } from "@/features/website/project-layout";
import { stripInline } from "@/lib/content/rich-text";
import type { ContentBlocks } from "@/lib/content/schemas";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function readingMinutes(blocks: ContentBlocks): number {
  const words = blocks
    .flatMap((block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
          return [stripInline(block.text)];
        case "list":
          return block.items.map(stripInline);
        default:
          return [];
      }
    })
    .join(" ")
    .split(/\s+/u)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** First related published project per service id (auto-placed related media for the navigator). */
export function relatedProjectFigures(
  context: RenderContext,
): Readonly<Record<string, RelatedProjectFigure>> {
  const byProject = new Map(context.projects.map((project) => [project.id, project]));
  const figures: Record<string, RelatedProjectFigure> = {};
  for (const link of context.projectServiceLinks) {
    if (figures[link.serviceId]) continue;
    const project = byProject.get(link.projectId);
    if (!project?.media) continue;
    figures[link.serviceId] = {
      slug: project.slug,
      title: project.title,
      src: `/api/media/project/${project.media.projectMediaId}`,
      alt: project.media.alt,
      provenanceLabel:
        project.evidenceClass === "real_project" ? "Related project" : "Related concept study",
    };
  }
  return figures;
}

export function ServiceShowcaseSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const services = context.services;
  if (services.length === 0) return null;
  const id = `section-${section.id}-title`;
  const mode = text(config, "mode") ?? "compact";
  const dark = toneSpec(section.tone).dark;
  const link = text(config, "link_label");
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="home-services"
    >
      {section.tone === "ink" ? (
        <Field className="home-services-field" tone="dark" variant="datum" />
      ) : null}
      <div className="container">
        <SectionHead
          aside={
            link ? (
              <Link className={`datum-link${dark ? " on-dark" : ""}`} href="/services">
                {link}
                <ArrowMark />
              </Link>
            ) : null
          }
          dark={dark}
          heading={text(config, "heading")}
          id={id}
          intro={text(config, "intro")}
          kicker={text(config, "kicker")}
        />
        {mode === "list" ? (
          <ol className="service-related-list">
            {services.map((service) => (
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
        ) : (
          <ServicesIndex
            mode={mode === "signature" ? "signature" : "compact"}
            relatedProjects={relatedProjectFigures(context)}
            services={services}
          />
        )}
      </div>
    </SectionShell>
  );
}

export function ProjectShowcaseSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const mode = (text(config, "mode") ?? "home") as "home" | "selected" | "recent";
  const selected = selectShowcase(context.projects, mode, num(config, "limit", 4));
  if (selected.length === 0) return null;
  const id = `section-${section.id}-title`;
  const dark = toneSpec(section.tone).dark;
  const link = text(config, "link_label");
  const placed = placeProjects(selected);
  const [lead, ...rest] = placed;
  const editorial = section.variant !== "grid" && lead?.composition === "monument";
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="home-studies"
    >
      <SectionHead
        aside={
          link ? (
            <Link className={`datum-link${dark ? " on-dark" : ""}`} href="/projects">
              {link}
              <ArrowMark />
            </Link>
          ) : null
        }
        dark={dark}
        heading={text(config, "heading")}
        id={id}
        intro={text(config, "intro")}
        kicker={text(config, "kicker")}
      />
      {editorial && lead ? (
        <>
          <ProjectStudyCard
            composition="monument"
            index={0}
            priority={false}
            project={lead.project}
          />
          {rest.length > 0 ? (
            <div className="container home-studies-grid">
              {rest.map(({ project, composition }, index) => (
                <ProjectStudyCard
                  composition={
                    // a single follower reads as a wide landscape, never a lone portrait (D1.7 §52)
                    rest.length === 1 || composition === "monument" || composition === "wide"
                      ? "landscape"
                      : composition
                  }
                  delay={0.05 * (index + 1)}
                  index={index + 1}
                  key={project.id}
                  project={project}
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="container home-projects-grid">
          {placed.map(({ project, composition }, index) => (
            <ProjectStudyCard
              composition={
                composition === "monument" || composition === "wide" ? "landscape" : composition
              }
              delay={0.05 * index}
              index={index}
              key={project.id}
              project={project}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

export function ProcessSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const steps = context.globals.processSteps;
  if (steps.length === 0) return null;
  const mode = text(config, "mode") ?? "story";
  const id = `section-${section.id}-title`;
  const dark = toneSpec(section.tone).dark;
  if (mode === "navigator") {
    return (
      <SectionShell
        labelledBy={id}
        motion={section.motion}
        spacing={section.spacing}
        tone={section.tone}
        type={section.type}
        className="about-process"
      >
        <SectionHead
          aside={
            text(config, "link_label") ? (
              <Link
                className={`datum-link${dark ? " on-dark" : ""}`}
                href="/services#process-heading"
              >
                {text(config, "link_label")}
                <ArrowMark />
              </Link>
            ) : null
          }
          dark={dark}
          heading={text(config, "heading")}
          id={id}
          intro={text(config, "intro")}
          kicker={text(config, "kicker")}
        />
        <div className="container">
          <ProcessNavigator steps={steps} />
        </div>
      </SectionShell>
    );
  }
  return (
    <SectionShell
      flushTop
      labelledBy="process-heading"
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="home-process"
    >
      <ProcessStory
        closing={text(config, "closing")}
        compact={mode === "compact"}
        heading={text(config, "heading") ?? "From the first conversation to handover."}
        intro={text(config, "intro")}
        kicker={text(config, "kicker")}
        steps={steps}
      />
    </SectionShell>
  );
}

export function InsightFeedSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const posts = context.posts.slice(0, num(config, "limit", 3));
  if (posts.length === 0) return null;
  const id = `section-${section.id}-title`;
  const dark = toneSpec(section.tone).dark;
  const link = text(config, "link_label");
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="home-insights"
    >
      <SectionHead
        aside={
          link ? (
            <Link className={`datum-link${dark ? " on-dark" : ""}`} href="/insights">
              {link}
              <ArrowMark />
            </Link>
          ) : null
        }
        dark={dark}
        heading={text(config, "heading")}
        id={id}
        kicker={text(config, "kicker")}
      />
      <Stagger as="ol" className="container insight-grid" gap={0.08}>
        {posts.map((post, index) => (
          <StaggerItem as="li" className="insight-card" key={post.id}>
            <Link href={`/insights/${post.slug}`}>
              <span className="index-mark">{indexMark(index)}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              {post.publicationDate ? (
                <time className="datum-label" dateTime={post.publicationDate}>
                  {formatDate(post.publicationDate)}
                </time>
              ) : null}
              <ArrowMark />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------
// System modules for the index pages
// ---------------------------------------------------------------------

export function ServicesNavigatorSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const services = context.services;
  if (services.length === 0) {
    return (
      <section className="sec tone-paper" data-section={section.type}>
        <div className="container">
          <IntentionalEmptyState
            description={
              text(config, "empty_description") ??
              "A service appears here once it is drafted, evidence-reviewed, and published."
            }
            eyebrow="Published services"
            linkHref="/contact"
            linkLabel="Talk to RENZ"
            title={text(config, "empty_title") ?? "No service is public yet."}
          />
        </div>
      </section>
    );
  }
  const listId = `section-${section.id}-list`;
  return (
    <>
      <section
        aria-label="Service navigator"
        className="sec tone-ink services-navigator-section"
        data-section={section.type}
      >
        <div className="container">
          <ServicesIndex
            mode="signature"
            relatedProjects={relatedProjectFigures(context)}
            services={services}
          />
        </div>
      </section>
      <section aria-labelledby={listId} className="sec tone-concrete">
        <div className="container section-head">
          <div>
            {text(config, "all_kicker") ? (
              <p className="kicker">{text(config, "all_kicker")}</p>
            ) : null}
            <h2 id={listId}>{text(config, "all_heading") ?? "Every service, one line each."}</h2>
          </div>
        </div>
        <Stagger as="ol" className="container service-lines" gap={0.06}>
          {services.map((service) => (
            <StaggerItem as="li" key={service.slug} variant="shift">
              <Link href={`/services/${service.slug}`}>
                <span className="index-mark">{service.index}</span>
                <span className="service-lines-title">
                  <strong>{service.name}</strong>
                  <small>{service.positioning}</small>
                </span>
                <span className="service-lines-includes">
                  {service.subServices.slice(0, 3).join(" · ")}
                </span>
                <ArrowMark />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}

export function ProjectsIndexSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const projects = context.projects;
  if (projects.length === 0) {
    return (
      <section className="sec tone-paper" data-section={section.type}>
        <div className="container">
          <IntentionalEmptyState
            description={
              text(config, "empty_description") ??
              "A project appears only after its role, facts, evidence, permissions, and media rights are ready for public use."
            }
            eyebrow="Published projects"
            title={text(config, "empty_title") ?? "No project case study is public yet."}
          />
        </div>
      </section>
    );
  }
  const real = projects.filter((project) => project.evidenceClass === "real_project");
  const studies = projects.filter((project) => project.evidenceClass !== "real_project");
  const headId = `section-${section.id}-title`;
  return (
    <>
      {real.length > 0 ? (
        <section
          aria-labelledby={`${headId}-real`}
          className="sec tone-paper"
          data-section={section.type}
        >
          <div className="container section-head">
            <div>
              {text(config, "published_kicker") ? (
                <p className="kicker">{text(config, "published_kicker")}</p>
              ) : null}
              <h2 id={`${headId}-real`}>
                {text(config, "published_heading") ?? "Evidence-backed RENZ work."}
              </h2>
            </div>
          </div>
          <ProjectsIndex
            countLabel={(visible, total) => `${visible} of ${total} projects`}
            filtersLabel={text(config, "filters_label") ?? "Filter projects"}
            label="Published projects"
            projects={real}
          />
        </section>
      ) : null}
      {studies.length > 0 ? (
        <>
          <section aria-labelledby={headId} className="sec sec-tight tone-concrete">
            <div className="container section-head">
              <div>
                {text(config, "studies_kicker") ? (
                  <p className="kicker">{text(config, "studies_kicker")}</p>
                ) : null}
                <h2 id={headId}>
                  <InlineText text={text(config, "studies_heading") ?? "Studies in approach."} />
                </h2>
              </div>
              {text(config, "studies_intro") ? <p>{text(config, "studies_intro")}</p> : null}
            </div>
          </section>
          <ProjectsIndex
            filtersLabel={text(config, "filters_label") ?? "Filter studies"}
            label="Concept project studies"
            projects={studies}
          />
        </>
      ) : null}
    </>
  );
}

export function InsightsIndexSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const posts = context.posts;
  if (posts.length === 0) {
    return (
      <section className="sec tone-paper" data-section={section.type}>
        <div className="container">
          <IntentionalEmptyState
            description={
              text(config, "empty_description") ??
              "Articles appear here once they are written, reviewed and published."
            }
            eyebrow="Insights"
            title={text(config, "empty_title") ?? "No insight is published yet."}
          />
        </div>
      </section>
    );
  }
  const serviceById = new Map(context.services.map((service) => [service.id, service]));
  const [featured, ...rest] = posts;
  const featuredService = featured?.relatedServiceId
    ? serviceById.get(featured.relatedServiceId)
    : null;
  const projectSlugs = context.projects.map((project) => project.slug);
  return (
    <>
      {featured ? (
        <section
          aria-labelledby="featured-insight-title"
          className="sec tone-paper insights-featured"
          data-section={section.type}
        >
          <div className="container insights-featured-grid">
            <Reveal as="article" className="insights-featured-card" variant="rise">
              <p className="kicker">
                {text(config, "featured_label") ?? "Featured"} · {featured.topic ?? "Insight"} ·{" "}
                {readingMinutes(featured.bodyBlocks)} min read
              </p>
              <h2 id="featured-insight-title">
                <Link href={`/insights/${featured.slug}`}>{featured.title}</Link>
              </h2>
              <p className="lede">{featured.excerpt}</p>
              <div className="insights-meta">
                {featured.publicationDate ? (
                  <time className="datum-label" dateTime={featured.publicationDate}>
                    {formatDate(featured.publicationDate)}
                  </time>
                ) : null}
                {featuredService ? (
                  <Link
                    className="datum-label insights-service"
                    href={`/services/${featuredService.slug}`}
                  >
                    Related: {featuredService.name}
                  </Link>
                ) : null}
              </div>
              <Link className="btn btn-primary" href={`/insights/${featured.slug}`}>
                <span>{text(config, "read_label") ?? "Read the article"}</span>
                <ArrowMark />
              </Link>
            </Reveal>
            <Reveal as="figure" className="insights-featured-figure" variant="resolve">
              <Field tone="light" variant="plan" />
              <StudyDrawing
                slug={
                  projectSlugs[posts.indexOf(featured) % Math.max(projectSlugs.length, 1)] ??
                  "ridge-residence"
                }
              />
              <figcaption className="datum-label">
                {text(config, "figure_caption") ?? "Drawing before building"}
              </figcaption>
            </Reveal>
          </div>
        </section>
      ) : null}
      {rest.length > 0 ? (
        <section aria-labelledby="insights-index-title" className="sec tone-concrete">
          <div className="container section-head">
            <div>
              {text(config, "all_kicker") ? (
                <p className="kicker">{text(config, "all_kicker")}</p>
              ) : null}
              <h2 id="insights-index-title">{text(config, "all_heading") ?? "All articles"}</h2>
            </div>
            {text(config, "all_note") ? (
              <p className="section-head-note">{text(config, "all_note")}</p>
            ) : null}
          </div>
          <div className="container">
            <Stagger as="ol" className="insight-grid" gap={0.08}>
              {rest.map((post, index) => (
                <StaggerItem as="li" className="insight-card" key={post.id}>
                  <Link href={`/insights/${post.slug}`}>
                    <span className="insight-card-head">
                      <span className="index-mark">{indexMark(index + 1)}</span>
                      <span className="datum-label">
                        {post.topic ?? "Insight"} · {readingMinutes(post.bodyBlocks)} min
                      </span>
                    </span>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <span className="insight-card-foot">
                      {post.publicationDate ? (
                        <time className="datum-label" dateTime={post.publicationDate}>
                          {formatDate(post.publicationDate)}
                        </time>
                      ) : null}
                      <ArrowMark />
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function TeamCredentialsSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const { team, credentials, identity } = context;
  const showCredentials = credentials.length > 0 || Boolean(identity.credentialsText);
  if (team.length === 0 && !showCredentials) return null;
  return (
    <>
      {team.length > 0 ? (
        <section
          aria-labelledby="team-heading"
          className="sec tone-paper"
          data-section={section.type}
        >
          <div className="container section-head">
            <div>
              {text(config, "team_kicker") ? (
                <p className="kicker">{text(config, "team_kicker")}</p>
              ) : null}
              <h2 id="team-heading">{text(config, "team_heading") ?? "Team"}</h2>
            </div>
          </div>
          <ol className="container people-register">
            {team.map((member, index) => (
              <li key={member.id}>
                <span className="index-mark">{indexMark(index)}</span>
                <div>
                  <h3>{member.name}</h3>
                  <p className="datum-label">{member.roleLabel}</p>
                  <p>{member.biography}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {showCredentials ? (
        <section aria-labelledby="credentials-heading" className="sec tone-concrete">
          <div className="container section-head">
            <div>
              {text(config, "credentials_kicker") ? (
                <p className="kicker">{text(config, "credentials_kicker")}</p>
              ) : null}
              <h2 id="credentials-heading">
                {text(config, "credentials_heading") ?? "Credentials"}
              </h2>
            </div>
          </div>
          <div className="container">
            {identity.credentialsText ? <p className="lede">{identity.credentialsText}</p> : null}
            {credentials.length > 0 ? (
              <ul className="credential-register">
                {credentials.map((credential) => (
                  <li key={credential.id}>
                    <strong>{credential.name}</strong>
                    <p>{credential.approvedPublicWording}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
