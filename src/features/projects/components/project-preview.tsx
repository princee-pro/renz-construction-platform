import {
  RealProjectCaseStudy,
  type RealProjectMediaView,
} from "@/components/site/real-project-case-study";
import type { ProjectDetail } from "@/features/projects/project-contract";

const chapterOrder: readonly [string, string][] = [
  ["Scope", "project_scope"],
  ["Challenge", "challenge"],
  ["Approach", "approach"],
  ["Solution", "solution"],
  ["Outcomes", "outcomes"],
];

export function ProjectPreview({
  detail,
}: Readonly<{
  detail: ProjectDetail & { localization: NonNullable<ProjectDetail["localization"]> };
}>) {
  const localization = detail.localization;
  const values: Readonly<Record<string, string | null>> = {
    project_scope: detail.project.project_scope,
    challenge: localization.challenge,
    approach: localization.approach,
    solution: localization.solution,
    outcomes: localization.outcomes,
  };

  const chapters = chapterOrder
    .map(([title, key]) => ({ title, body: values[key] }))
    .filter((chapter): chapter is { title: string; body: string } => Boolean(chapter.body));

  const media: readonly RealProjectMediaView[] = detail.media.map((item) => ({
    id: item.id,
    role: item.role,
    altText: item.alt_text,
    caption: item.caption,
    decorative: item.decorative,
  }));

  return (
    <RealProjectCaseStudy
      view={{
        title: localization.title,
        summary: localization.summary ?? "",
        publicLocation: detail.project.public_location,
        projectType: detail.project.project_type,
        deliveryStatus: detail.project.delivery_status,
        startYear: detail.project.start_year,
        completionYear: detail.project.completion_year,
        renzRole: detail.project.renz_role,
        chapters,
        services: detail.services.map((service) => ({
          serviceId: service.service_id,
          slug: null,
          name: service.name ?? service.service_id,
        })),
        media,
        mediaSrc: (item) => `/api/media/project/${item.id}`,
        draftPreview: true,
      }}
    />
  );
}
