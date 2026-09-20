"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ImageReveal, Reveal } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { StudyDrawing } from "@/components/site/study-drawing";
import type { ProjectCardData } from "@/features/public-content/data";
import {
  deriveProjectFilters,
  placeProjects,
  type ProjectComposition,
} from "@/features/website/project-layout";

import { isApiMediaSrc } from "@/lib/media/public-src";

/**
 * One card family for every published project (CR1 §39–41). Real RENZ
 * projects, concept studies and experience studies share the D1 editorial
 * compositions; the provenance badge is derived from the evidence class
 * (never owner-entered), and a project without media takes the typographic
 * composition so nothing is ever a broken image.
 */
export function projectBadge(project: ProjectCardData): string | null {
  if (project.evidenceClass === "concept_study") return "Concept study";
  if (project.evidenceClass === "experience_study") return "Experience study";
  return null;
}

function mediaSrc(project: ProjectCardData): string | null {
  return project.media ? `/api/media/project/${project.media.projectMediaId}` : null;
}

function focal(project: ProjectCardData): React.CSSProperties {
  return project.media
    ? {
        objectPosition: `${Math.round(project.media.focalX * 100)}% ${Math.round(project.media.focalY * 100)}%`,
      }
    : {};
}

export function ProjectStudyCard({
  project,
  composition,
  index,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  delay = 0,
}: Readonly<{
  project: ProjectCardData;
  composition: ProjectComposition;
  index: number;
  sizes?: string;
  priority?: boolean;
  delay?: number;
}>) {
  const href = `/projects/${project.slug}`;
  const badge = projectBadge(project);
  const label = `Open ${project.title}${badge ? ` ${badge.toLowerCase()}` : ""}`;
  const indexMark = String(index + 1).padStart(2, "0");
  const src = mediaSrc(project);
  const alt = project.media?.alt ?? "";

  if (!src || composition === "technical") {
    return (
      <Reveal
        as="article"
        className={`study-card study-card-${src ? "technical" : "real"}`}
        delay={delay}
        variant="assemble"
      >
        <Link aria-label={label} className="study-card-link" href={href}>
          {src ? (
            <>
              <div aria-hidden="true" className="study-card-drawing">
                <StudyDrawing animate={false} slug={project.slug} />
              </div>
              <div className="study-card-media card-hover-media">
                <Image
                  alt={alt}
                  fill
                  loading={priority ? "eager" : "lazy"}
                  quality={86}
                  sizes={sizes}
                  src={src}
                  unoptimized={isApiMediaSrc(src)}
                  style={focal(project)}
                />
                {badge ? <span className="media-tag">{badge}</span> : null}
              </div>
            </>
          ) : null}
          <div className="study-card-copy">
            <span className="index-mark">{indexMark}</span>
            <h3>{project.title}</h3>
            <p>{src ? (project.projectType ?? project.summary) : project.summary}</p>
            <span className="study-card-meta">
              {project.projectType && !src ? <span>{project.projectType}</span> : null}
              {project.materials ? <span>{project.materials}</span> : null}
              {project.publicLocation ? <span>{project.publicLocation}</span> : null}
              {project.completionYear ? <span>{project.completionYear}</span> : null}
            </span>
            <ArrowMark />
          </div>
        </Link>
      </Reveal>
    );
  }

  if (composition === "monument" || composition === "wide") {
    return (
      <Reveal
        as="article"
        className={`study-card study-card-${composition}`}
        delay={delay}
        variant="resolve"
      >
        <Link aria-label={label} className="study-card-link" href={href}>
          <div className="study-card-media card-hover-media">
            <Image
              alt={alt}
              fill
              loading={priority ? "eager" : "lazy"}
              quality={88}
              sizes="100vw"
              src={src}
              unoptimized={isApiMediaSrc(src)}
              style={focal(project)}
            />
            <span className="media-wash" />
          </div>
          <div className="container study-card-copy">
            {badge ? (
              <span className="concept-badge">
                {badge} {indexMark}
              </span>
            ) : (
              <span className="concept-badge concept-badge-real">Project {indexMark}</span>
            )}
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <span className="study-card-meta">
              {project.projectType ? <span>{project.projectType}</span> : null}
              {project.materials ? <span>{project.materials}</span> : null}
              {project.publicLocation ? <span>{project.publicLocation}</span> : null}
            </span>
            <span className="datum-link on-dark">
              {badge ? "Read the study" : "Read the case study"}
              <ArrowMark />
            </span>
          </div>
        </Link>
      </Reveal>
    );
  }

  if (composition === "strip") {
    return (
      <Reveal as="article" className="study-card study-card-strip" delay={delay} variant="assemble">
        <Link aria-label={label} className="study-card-link" href={href}>
          <div className="study-card-media card-hover-media">
            <Image
              alt={alt}
              fill
              loading={priority ? "eager" : "lazy"}
              quality={86}
              sizes="100vw"
              src={src}
              unoptimized={isApiMediaSrc(src)}
              style={focal(project)}
            />
            {badge ? <span className="media-tag">{badge}</span> : null}
          </div>
          <div className="study-card-copy">
            <span className="index-mark">{indexMark}</span>
            <h3>{project.title}</h3>
            <p>{project.projectType ?? project.summary}</p>
            <ArrowMark />
          </div>
        </Link>
      </Reveal>
    );
  }

  return (
    <Reveal
      as="article"
      className={`study-card study-card-${composition}`}
      delay={delay}
      variant="assemble"
    >
      <Link aria-label={label} className="study-card-link" href={href}>
        <ImageReveal className="study-card-media card-hover-media study-card-media-drawn">
          <Image
            alt={alt}
            fill
            loading={priority ? "eager" : "lazy"}
            quality={86}
            sizes={sizes}
            src={src}
            unoptimized={isApiMediaSrc(src)}
            style={focal(project)}
          />
          <span aria-hidden="true" className="study-card-hover-drawing">
            <StudyDrawing animate={false} slug={project.slug} />
          </span>
          {badge ? <span className="media-tag">{badge}</span> : null}
        </ImageReveal>
        <div className="study-card-copy">
          <span className="index-mark">{indexMark}</span>
          <h3>{project.title}</h3>
          <p>{project.projectType ?? project.summary}</p>
          <ArrowMark />
        </div>
      </Link>
    </Reveal>
  );
}

/** The projects index: filters derived from published project types; placement is automatic. */
export function ProjectsIndex({
  projects,
  filtersLabel = "Filter projects",
  countLabel,
  label = "Projects",
}: Readonly<{
  projects: readonly ProjectCardData[];
  filtersLabel?: string;
  countLabel?: (visible: number, total: number) => string;
  /** Accessible name of the index region. */
  label?: string;
}>) {
  const [filter, setFilter] = useState("all");
  const filters = deriveProjectFilters(projects);
  const visible = projects.filter(
    (project) =>
      filter === "all" ||
      (project.projectType ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "-") === filter,
  );
  const placed = placeProjects(visible);
  const conceptOnly = projects.every((project) => project.evidenceClass !== "real_project");

  return (
    <section aria-label={label} className="studies-index">
      {filters.length > 2 ? (
        <div aria-label={filtersLabel} className="container studies-filters" role="group">
          {filters.map((entry) => (
            <button
              aria-pressed={entry.key === filter}
              className="studies-filter"
              key={entry.key}
              onClick={() => setFilter(entry.key)}
              type="button"
            >
              {entry.label}
              <span>{entry.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <p className="container studies-count" role="status">
        {countLabel
          ? countLabel(visible.length, projects.length)
          : `${visible.length} of ${projects.length} ${conceptOnly ? "concept studies · none is a completed RENZ project" : "projects"}`}
      </p>
      <div className="studies-compositions">
        {placed.map(({ project, composition, index }) => {
          const full = composition === "monument" || composition === "wide";
          return (
            <div className={`studies-slot studies-slot-${composition}`} key={project.id}>
              {full ? (
                <ProjectStudyCard
                  composition={composition}
                  index={index}
                  priority={index === 0}
                  project={project}
                />
              ) : (
                <div className="container">
                  <ProjectStudyCard
                    composition={composition}
                    delay={0.05}
                    index={index}
                    priority={index === 0}
                    project={project}
                    sizes={
                      composition === "portrait"
                        ? "(max-width: 768px) 100vw, 40vw"
                        : "(max-width: 768px) 100vw, 60vw"
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
