import Image from "next/image";
import Link from "next/link";

import { Landing } from "@/components/site/landing/landing";
import { PublicLink } from "@/components/site/public-link";

import { isApiMediaSrc } from "@/lib/media/public-src";

export type RealProjectMediaView = Readonly<{
  id: string;
  role: string;
  altText: string | null;
  caption: string | null;
  decorative: boolean;
}>;

export type RealProjectServiceView = Readonly<{
  serviceId: string;
  slug: string | null;
  name: string;
}>;

export type RealProjectView = Readonly<{
  /** Public slug, used only as safe source context for Start-a-Project. */
  slug?: string | null;
  title: string;
  summary: string;
  publicLocation: string | null;
  projectType: string | null;
  deliveryStatus: string | null;
  startYear: number | null;
  completionYear: number | null;
  renzRole: string | null;
  chapters: readonly { title: string; body: string }[];
  notes?: readonly string[];
  services: readonly RealProjectServiceView[];
  media: readonly RealProjectMediaView[];
  mediaSrc: (media: RealProjectMediaView) => string;
  draftPreview?: boolean;
}>;

function RoleMedia({
  media,
  role,
  view,
  className,
}: Readonly<{
  media: readonly RealProjectMediaView[];
  role: string;
  view: RealProjectView;
  className?: string;
}>) {
  const item = media.find((entry) => entry.role === role);
  if (!item) return null;
  return (
    <div className={className}>
      <Image
        alt={item.decorative ? "" : (item.altText ?? "")}
        fill
        sizes="(max-width: 768px) 100vw, 84vw"
        src={view.mediaSrc(item)}
        unoptimized={isApiMediaSrc(view.mediaSrc(item))}
      />
      {item.caption ? <span className="real-project-caption">{item.caption}</span> : null}
    </div>
  );
}

export function RealProjectCaseStudy({ view }: Readonly<{ view: RealProjectView }>) {
  const facts = [
    ["Location", view.publicLocation],
    ["Project type", view.projectType],
    ["Delivery status", view.deliveryStatus],
    ["RENZ role", view.renzRole],
    [
      "Timeline",
      view.startYear
        ? `${view.startYear}${view.completionYear ? `–${view.completionYear}` : ""}`
        : null,
    ],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const gallery = view.media.filter((item) => item.role === "gallery");
  // CMS-driven hero (brief §62): the hero image is the poster; a `video` role
  // media item, when present, plays over it with the poster-first rules.
  const heroMedia =
    view.media.find((item) => item.role === "video_poster") ??
    view.media.find((item) => item.role === "hero") ??
    null;
  const heroVideo = view.media.find((item) => item.role === "video") ?? null;

  return (
    <main className="public-main" id="main-content">
      {view.draftPreview ? (
        <div className="draft-preview-banner" role="note">
          DRAFT PREVIEW / NOT PUBLIC
        </div>
      ) : null}
      <Landing
        breadcrumb={{ href: "/projects", label: "Projects" }}
        concept="project"
        eyebrow="Project"
        field="quiet"
        headingId="project-heading"
        facts={facts.map(([label, value]) => ({ label, value }))}
        poster={heroMedia ? { src: view.mediaSrc(heroMedia), alt: heroMedia.altText ?? "" } : null}
        video={heroVideo ? { sources: [{ src: view.mediaSrc(heroVideo) }] } : null}
        summary={view.summary}
        title={view.title}
      />

      <article className="public-section public-section-white">
        <div className="public-container public-detail-grid service-detail-grid">
          <div className="public-detail-body">
            <RoleMedia
              className="real-project-hero-media"
              media={view.media}
              role="hero"
              view={view}
            />

            {view.chapters.map((chapter) => (
              <section aria-labelledby={`chapter-${chapter.title}`} key={chapter.title}>
                <p className="section-kicker">{chapter.title}</p>
                <h2 id={`chapter-${chapter.title}`}>{chapter.title}</h2>
                <p>{chapter.body}</p>
              </section>
            ))}

            {view.notes && view.notes.length > 0 ? (
              <section aria-labelledby="real-project-notes-title">
                <p className="section-kicker">Verified project notes</p>
                <h2 id="real-project-notes-title">Confirmed facts.</h2>
                <ul className="service-detail-list">
                  {view.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {gallery.length > 0 ? (
              <section aria-labelledby="real-project-gallery-title">
                <p className="section-kicker">Gallery</p>
                <h2 id="real-project-gallery-title">Project media.</h2>
                <div className="real-project-gallery">
                  {gallery.map((item) => (
                    <div className="real-project-gallery-item" key={item.id}>
                      <Image
                        alt={item.decorative ? "" : (item.altText ?? "")}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        src={view.mediaSrc(item)}
                        unoptimized={isApiMediaSrc(view.mediaSrc(item))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside
            aria-label="Project summary"
            className="public-detail-register service-detail-register"
          >
            {facts.length > 0 ? (
              <dl>
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {view.services.length > 0 ? (
              <div className="service-detail-cta">
                <p className="section-kicker">Related services</p>
                <ul className="service-detail-subservices">
                  {view.services.map((service) =>
                    service.slug ? (
                      <li key={service.serviceId}>
                        <Link href={`/services/${service.slug}`}>{service.name}</Link>
                      </li>
                    ) : (
                      <li key={service.serviceId}>{service.name}</li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
            <div className="service-detail-cta">
              <PublicLink
                href={
                  view.slug ? `/start-a-project?source=project/${view.slug}` : "/start-a-project"
                }
                tone="gold"
              >
                Discuss a similar project
              </PublicLink>
            </div>
          </aside>
        </div>

        <div className="public-container service-detail-related">
          <PublicLink href="/projects" tone="quiet">
            Back to Projects
          </PublicLink>
        </div>
      </article>
    </main>
  );
}
