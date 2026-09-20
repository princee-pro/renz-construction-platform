import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  ConceptCaseStudy,
  type ConceptStudyNext,
  type ConceptStudyView,
} from "@/components/site/concept-case-study";
import {
  RealProjectCaseStudy,
  type RealProjectMediaView,
} from "@/components/site/real-project-case-study";
import type { GalleryMedia } from "@/components/site/project-gallery";
import type { PublicProjectMedia } from "@/features/public-content/contracts";
import {
  getPublishedProjectBySlug,
  getPublishedProjectCards,
  getPublishedProjectClaims,
  getPublishedProjectMedia,
  getPublishedProjectServiceLinks,
  getAllPublishedProjectServiceLinks,
} from "@/features/public-content/data";
import { getPublicServiceCategories } from "@/features/services/service-source";
import { resolveRouteAlias } from "@/features/website/data";
import { createPublicMetadata } from "@/lib/seo/public-metadata";
import { getSiteIdentity } from "@/lib/site/public-configuration";

export const dynamic = "force-dynamic";

const chapterOrder: readonly [string, string][] = [
  ["Scope", "projectScope"],
  ["Challenge", "challenge"],
  ["Approach", "approach"],
  ["Solution", "solution"],
  ["Outcomes", "outcomes"],
];

function studyBadge(evidenceClass: string): string {
  if (evidenceClass === "experience_study") return "Experience study";
  if (evidenceClass === "context_study") return "Rwanda context concept study";
  return "Concept study";
}

/** Evidence wording for a media item (D1.7 §31): generated concept, client photo or RENZ record. */
function mediaEvidence(provenanceClass: string | null): string {
  switch (provenanceClass) {
    case "client_original":
    case "client_derivative":
      return "Client supplied";
    case "production":
      return "RENZ project record";
    default:
      return "Generated concept visual / not RENZ project evidence";
  }
}

const galleryRoleOrder = [
  "hero",
  "context",
  "exterior",
  "interior",
  "detail",
  "process",
  "drawing",
  "dusk",
  "video",
];

/** The published media as gallery pieces (D1.7 §19–20): role order, then the owner's order. */
function galleryItems(media: readonly PublicProjectMedia[]): readonly GalleryMedia[] {
  const posters = new Map(
    media.filter((item) => item.role === "video_poster").map((item) => [item.projectId, item.id]),
  );
  return media
    .filter((item) => item.role !== "video_poster")
    .map((item) => ({
      id: item.id,
      role: item.role,
      kind: item.mimeType?.startsWith("video/") ? ("video" as const) : ("image" as const),
      alt: item.decorative ? "" : (item.altText ?? ""),
      caption: item.caption,
      evidence: mediaEvidence(item.provenanceClass),
      width: item.width,
      height: item.height,
      focalX: item.focalX,
      focalY: item.focalY,
      posterId: item.mimeType?.startsWith("video/") ? (posters.get(item.projectId) ?? null) : null,
    }))
    .sort((a, b) => {
      const ra = galleryRoleOrder.indexOf(a.role);
      const rb = galleryRoleOrder.indexOf(b.role);
      return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb);
    });
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return createPublicMetadata({ title: "Project not found", description: "" });
  const study = project.evidenceClass !== "real_project";
  return createPublicMetadata({
    title:
      project.seoTitle ??
      (study ? `${project.title} — ${studyBadge(project.evidenceClass)}` : project.title),
    description: project.seoDescription ?? project.summary,
  });
}

/**
 * Project detail (CR1): one route for every published project. Concept and
 * experience studies render the cinematic study template with the
 * provenance line repeated; real RENZ projects render the evidence-led case
 * study. A renamed project keeps its old address (route alias → redirect).
 */
export default async function ProjectDetailPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) {
    const alias = await resolveRouteAlias(`/projects/${slug}`);
    if (alias) permanentRedirect(alias);
    notFound();
  }

  const [claims, media, serviceLinks, allServices, cards, identity, allLinks] = await Promise.all([
    getPublishedProjectClaims(project.id),
    getPublishedProjectMedia(project.id),
    getPublishedProjectServiceLinks(project.id),
    getPublicServiceCategories(),
    getPublishedProjectCards(),
    getSiteIdentity(),
    getAllPublishedProjectServiceLinks(),
  ]);
  const serviceById = new Map(allServices.map((service) => [service.id, service]));
  const relatedServices = serviceLinks
    .map((link) => serviceById.get(link.serviceId))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  if (project.evidenceClass !== "real_project") {
    const hero = media.find((item) => item.role === "hero") ?? media[0] ?? null;
    if (!hero) notFound();
    const position = cards.findIndex((card) => card.id === project.id);
    const siblings = cards.filter((card) => card.evidenceClass !== "real_project");
    const siblingIndex = siblings.findIndex((card) => card.id === project.id);
    const nextCard = siblings.length > 1 ? siblings[(siblingIndex + 1) % siblings.length] : null;
    const chapters =
      project.stages.length > 0
        ? project.stages.map((stage) => ({ title: stage.title, copy: stage.description ?? "" }))
        : chapterOrder
            .map(([title, key]) => ({
              title,
              copy: (project as unknown as Record<string, string | null>)[key] ?? "",
            }))
            .filter((chapter) => chapter.copy);
    // Related studies (D1.7 §22): same category first, then studies sharing a
    // service, in display order; never the study itself.
    const sharedServiceIds = new Set(serviceLinks.map((link) => link.serviceId));
    const related = [
      ...siblings.filter(
        (card) => card.id !== project.id && card.projectType === project.projectType,
      ),
      ...siblings.filter(
        (card) =>
          card.id !== project.id &&
          card.projectType !== project.projectType &&
          allLinks.some(
            (link) => link.projectId === card.id && sharedServiceIds.has(link.serviceId),
          ),
      ),
    ].slice(0, 3);
    const view: ConceptStudyView = {
      index: String((position >= 0 ? position : 0) + 1).padStart(2, "0"),
      slug: project.slug,
      title: project.title,
      category: project.projectType ?? studyBadge(project.evidenceClass),
      materials: project.materials,
      atmosphere: project.summary,
      image: `/api/media/project/${hero.id}`,
      alt: hero.decorative ? "" : (hero.altText ?? project.title),
      composition: project.layoutHint === "auto" ? "monument" : project.layoutHint,
      badge: studyBadge(project.evidenceClass),
      chapters,
      services: relatedServices.map((service) => ({
        index: service.index,
        slug: service.slug,
        name: service.name,
        positioning: service.positioning,
      })),
      ctaLabel: identity.cta.label,
      gallery: galleryItems(media),
      related,
      evidence: mediaEvidence(hero.provenanceClass),
    };
    const next: ConceptStudyNext | null = nextCard
      ? {
          index: String(cards.findIndex((card) => card.id === nextCard.id) + 1).padStart(2, "0"),
          slug: nextCard.slug,
          title: nextCard.title,
          category: nextCard.projectType ?? studyBadge(nextCard.evidenceClass),
          image: nextCard.media ? `/api/media/project/${nextCard.media.projectMediaId}` : null,
          alt: nextCard.media?.alt ?? "",
          badge: studyBadge(nextCard.evidenceClass),
        }
      : null;
    return <ConceptCaseStudy nextProject={next} project={view} />;
  }

  const values: Readonly<Record<string, string | null>> = {
    projectScope: project.projectScope,
    challenge: project.challenge,
    approach: project.approach,
    solution: project.solution,
    outcomes: project.outcomes,
  };
  const chapters = chapterOrder
    .map(([title, key]) => ({ title, body: values[key] }))
    .filter((chapter): chapter is { title: string; body: string } => Boolean(chapter.body));

  const projectMedia: readonly RealProjectMediaView[] = media.map((item) => ({
    id: item.id,
    role: item.role,
    altText: item.altText,
    caption: item.caption,
    decorative: item.decorative,
  }));

  return (
    <RealProjectCaseStudy
      view={{
        slug,
        title: project.title,
        summary: project.summary,
        publicLocation: project.publicLocation,
        projectType: project.projectType,
        deliveryStatus: project.deliveryStatus,
        startYear: project.startYear,
        completionYear: project.completionYear,
        renzRole: project.renzRole,
        chapters,
        notes: claims.map((claim) => claim.wording),
        services: serviceLinks.map((link) => {
          const service = serviceById.get(link.serviceId);
          return {
            serviceId: link.serviceId,
            slug: service?.slug ?? null,
            name: service?.name ?? "Related service",
          };
        }),
        media: projectMedia,
        mediaSrc: (item) => `/api/media/project/${item.id}`,
      }}
    />
  );
}
