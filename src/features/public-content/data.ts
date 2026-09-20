import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
  mapPublicCredential,
  mapPublicPage,
  mapPublicPost,
  mapPublicProject,
  mapPublicProjectClaim,
  mapPublicProjectMedia,
  mapPublicProjectServiceLink,
  mapPublicService,
  mapPublicSetting,
  mapPublicTeamMember,
  mapPublicTestimonial,
  type PublicCredential,
  type PublicHomepageSnapshot,
  type PublicPage,
  type PublicPost,
  type PublicProject,
  type PublicProjectClaim,
  type PublicProjectMedia,
  type PublicProjectServiceLink,
  type PublicService,
  type PublicSetting,
  type PublicTeamMember,
  type PublicTestimonial,
} from "@/features/public-content/contracts";
import { contentCollectionTag, homepageTag, publicSettingsTag } from "@/lib/content/cache-tags";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

// Published content is tag-revalidated by every publish command; the window
// only bounds changes made outside the app (seeds, SQL). Tests shorten it.
const PUBLIC_REVALIDATE_SECONDS = (() => {
  const override = Number(process.env["RENZ_PUBLIC_CACHE_SECONDS"]);
  return Number.isFinite(override) && override > 0 ? override : 3600;
})();

function compact<T>(items: readonly (T | null)[]): readonly T[] {
  return items.filter((item): item is T => item !== null);
}

async function queryServices(): Promise<readonly PublicService[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_services")
    .select(
      "id,locale,slug,name,summary,body_blocks,scope,client_inputs,deliverables,exclusions,delivery_wording,seo_title,seo_description,featured,sort_order,positioning,sub_services,use_cases,process_steps,coordination,faqs,hero_asset_id",
    )
    .eq("locale", "en")
    .order("sort_order", { ascending: true })
    .limit(48);
  if (error) throw new Error("Published expertise could not be loaded.");
  return compact((data ?? []).map(mapPublicService));
}

async function queryServiceBySlug(slug: string): Promise<PublicService | null> {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("published_services")
    .select(
      "id,locale,slug,name,summary,body_blocks,scope,client_inputs,deliverables,exclusions,delivery_wording,seo_title,seo_description,featured,sort_order,positioning,sub_services,use_cases,process_steps,coordination,faqs,hero_asset_id",
    )
    .eq("locale", "en")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Published expertise could not be loaded.");
  return data ? mapPublicService(data) : null;
}

async function queryProjects(): Promise<readonly PublicProject[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_projects")
    .select(
      "id,locale,slug,title,summary,project_type,public_location,start_year,completion_year,delivery_status,project_scope,renz_role,challenge,approach,solution,outcomes,seo_title,seo_description,featured,sort_order,evidence_class,layout_hint,home_featured,materials,tags,hero_asset_id,stages",
    )
    .eq("locale", "en")
    .order("sort_order", { ascending: true })
    .limit(36);
  if (error) throw new Error("Published projects could not be loaded.");
  return compact((data ?? []).map(mapPublicProject));
}

async function queryProjectBySlug(slug: string): Promise<PublicProject | null> {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("published_projects")
    .select(
      "id,locale,slug,title,summary,project_type,public_location,start_year,completion_year,delivery_status,project_scope,renz_role,challenge,approach,solution,outcomes,seo_title,seo_description,featured,sort_order,evidence_class,layout_hint,home_featured,materials,tags,hero_asset_id,stages",
    )
    .eq("locale", "en")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Published project could not be loaded.");
  return data ? mapPublicProject(data) : null;
}

async function queryProjectClaims(projectId: string): Promise<readonly PublicProjectClaim[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_project_claims")
    .select("id,project_id,claim_type,approved_public_wording")
    .eq("project_id", projectId)
    .limit(24);
  if (error) throw new Error("Published project proof could not be loaded.");
  return compact((data ?? []).map(mapPublicProjectClaim));
}

async function queryProjectMedia(projectId: string): Promise<readonly PublicProjectMedia[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_project_media")
    .select(
      "id,project_id,role,mime_type,width,height,alt_text,caption,decorative,sort_order,media_asset_id,focal_x,focal_y,provenance_class",
    )
    .eq("project_id", projectId)
    .eq("locale", "en")
    .order("sort_order", { ascending: true })
    .limit(60);
  if (error) throw new Error("Published project media could not be loaded.");
  return compact((data ?? []).map(mapPublicProjectMedia));
}

/** Hero (or first) public media for every published project — one query. */
async function queryProjectHeroMedia(): Promise<readonly PublicProjectMedia[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_project_media")
    .select(
      "id,project_id,role,mime_type,width,height,alt_text,caption,decorative,sort_order,media_asset_id,focal_x,focal_y,provenance_class",
    )
    .eq("locale", "en")
    .order("sort_order", { ascending: true })
    .limit(400);
  if (error) throw new Error("Published project media could not be loaded.");
  const items = compact((data ?? []).map(mapPublicProjectMedia));
  const byProject = new Map<string, PublicProjectMedia>();
  for (const item of items) {
    const existing = byProject.get(item.projectId);
    if (!existing || (existing.role !== "hero" && item.role === "hero")) {
      byProject.set(item.projectId, item);
    }
  }
  return [...byProject.values()];
}

async function queryProjectServiceLinks(
  projectId: string,
): Promise<readonly PublicProjectServiceLink[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_project_services")
    .select("project_id,service_id,scope_label,sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .limit(24);
  if (error) throw new Error("Published project services could not be loaded.");
  return compact((data ?? []).map(mapPublicProjectServiceLink));
}

async function queryPosts(): Promise<readonly PublicPost[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_posts")
    .select(
      "id,locale,slug,title,excerpt,body_blocks,publication_date,seo_title,seo_description,topic,related_service_id,featured,pinned,sort_priority,hero_asset_id",
    )
    .eq("locale", "en")
    .order("pinned", { ascending: false })
    .order("featured", { ascending: false })
    .order("sort_priority", { ascending: false })
    .order("publication_date", { ascending: false })
    .limit(36);
  if (error) throw new Error("Published insights could not be loaded.");
  return compact((data ?? []).map(mapPublicPost));
}

async function queryPostBySlug(slug: string): Promise<PublicPost | null> {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("published_posts")
    .select(
      "id,locale,slug,title,excerpt,body_blocks,publication_date,seo_title,seo_description,topic,related_service_id,featured,pinned,sort_priority,hero_asset_id",
    )
    .eq("locale", "en")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Published insight could not be loaded.");
  return data ? mapPublicPost(data) : null;
}

async function queryPageByPath(path: string): Promise<PublicPage | null> {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("published_pages")
    .select(
      "id,locale,path,page_key,title,summary,body_blocks,seo_title,seo_description,canonical_override",
    )
    .eq("locale", "en")
    .eq("path", path)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Published page content could not be loaded.");
  return data ? mapPublicPage(data) : null;
}

async function queryTeam(): Promise<readonly PublicTeamMember[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_team_members")
    .select("id,locale,name,role_label,biography,sort_order")
    .eq("locale", "en")
    .order("sort_order", { ascending: true })
    .limit(36);
  if (error) throw new Error("Published team content could not be loaded.");
  return compact((data ?? []).map(mapPublicTeamMember));
}

async function queryCredentials(): Promise<readonly PublicCredential[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_credentials")
    .select("id,locale,name,approved_public_wording,description,issuer,valid_from,valid_to")
    .eq("locale", "en")
    .limit(36);
  if (error) throw new Error("Published credentials could not be loaded.");
  return compact((data ?? []).map(mapPublicCredential));
}

async function queryTestimonials(): Promise<readonly PublicTestimonial[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_testimonials")
    .select("id,locale,quote,attribution_presentation")
    .eq("locale", "en")
    .limit(12);
  if (error) throw new Error("Published testimonials could not be loaded.");
  return compact((data ?? []).map(mapPublicTestimonial));
}

async function querySettings(): Promise<readonly PublicSetting[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_site_settings")
    .select("namespace,key,value")
    .order("namespace", { ascending: true })
    .order("key", { ascending: true })
    .limit(48);
  if (error) throw new Error("Published site details could not be loaded.");
  return compact((data ?? []).map(mapPublicSetting));
}

const cachedServices = unstable_cache(queryServices, ["public-services-v1"], {
  tags: [contentCollectionTag("service"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedServiceBySlug = unstable_cache(queryServiceBySlug, ["public-service-v1"], {
  tags: [contentCollectionTag("service")],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedProjects = unstable_cache(queryProjects, ["public-projects-v1"], {
  tags: [contentCollectionTag("project"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedProjectBySlug = unstable_cache(queryProjectBySlug, ["public-project-v1"], {
  tags: [contentCollectionTag("project")],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedProjectClaims = unstable_cache(queryProjectClaims, ["public-project-claims-v1"], {
  tags: [contentCollectionTag("project")],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedProjectMedia = unstable_cache(queryProjectMedia, ["public-project-media-v1"], {
  tags: [contentCollectionTag("project")],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedProjectHeroMedia = unstable_cache(
  queryProjectHeroMedia,
  ["public-project-hero-media-v1"],
  {
    tags: [contentCollectionTag("project"), homepageTag()],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  },
);
const cachedProjectServiceLinks = unstable_cache(
  queryProjectServiceLinks,
  ["public-project-service-links-v1"],
  {
    tags: [contentCollectionTag("project"), contentCollectionTag("service")],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  },
);
const cachedPosts = unstable_cache(queryPosts, ["public-posts-v1"], {
  tags: [contentCollectionTag("post"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedPostBySlug = unstable_cache(queryPostBySlug, ["public-post-v1"], {
  tags: [contentCollectionTag("post")],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedPageByPath = unstable_cache(queryPageByPath, ["public-page-v1"], {
  tags: [contentCollectionTag("page"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedTeam = unstable_cache(queryTeam, ["public-team-v1"], {
  tags: [contentCollectionTag("team_member"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedCredentials = unstable_cache(queryCredentials, ["public-credentials-v1"], {
  tags: [contentCollectionTag("credential"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedTestimonials = unstable_cache(queryTestimonials, ["public-testimonials-v1"], {
  tags: [contentCollectionTag("testimonial"), homepageTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
const cachedSettings = unstable_cache(querySettings, ["public-settings-v1"], {
  tags: [publicSettingsTag()],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

export const getPublishedServices = cache(cachedServices);
export const getPublishedServiceBySlug = cache(cachedServiceBySlug);
export const getPublishedProjects = cache(cachedProjects);
export const getPublishedProjectBySlug = cache(cachedProjectBySlug);
export const getPublishedProjectClaims = cache(cachedProjectClaims);
export const getPublishedProjectMedia = cache(cachedProjectMedia);
export const getPublishedProjectServiceLinks = cache(cachedProjectServiceLinks);
export const getPublishedProjectHeroMedia = cache(cachedProjectHeroMedia);

/** Every published project → service relation (for related-project placement on service pages). */
async function queryAllProjectServiceLinks(): Promise<readonly PublicProjectServiceLink[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("published_project_services")
    .select("project_id,service_id,scope_label,sort_order")
    .order("sort_order", { ascending: true })
    .limit(600);
  if (error) throw new Error("Published project services could not be loaded.");
  return compact((data ?? []).map(mapPublicProjectServiceLink));
}
const cachedAllProjectServiceLinks = unstable_cache(
  queryAllProjectServiceLinks,
  ["public-all-project-service-links-v1"],
  {
    tags: [contentCollectionTag("project"), contentCollectionTag("service")],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  },
);
export const getAllPublishedProjectServiceLinks = cache(cachedAllProjectServiceLinks);
export const getPublishedPosts = cache(cachedPosts);
export const getPublishedPostBySlug = cache(cachedPostBySlug);
export const getPublishedPageByPath = cache(cachedPageByPath);
export const getPublishedTeam = cache(cachedTeam);
export const getPublishedCredentials = cache(cachedCredentials);
export const getPublishedTestimonials = cache(cachedTestimonials);
export const getPublishedSettings = cache(cachedSettings);

export const getPublicHomepageSnapshot = cache(async (): Promise<PublicHomepageSnapshot> => {
  const [services, projects, posts, testimonials] = await Promise.all([
    getPublishedServices(),
    getPublishedProjects(),
    getPublishedPosts(),
    getPublishedTestimonials(),
  ]);
  const homeFeatured = projects.filter((project) => project.homeFeatured);
  const featured = projects.filter((project) => project.featured);
  return {
    services: services.slice(0, 6),
    projects: (homeFeatured.length > 0
      ? homeFeatured
      : featured.length > 0
        ? featured
        : projects
    ).slice(0, 4),
    posts: posts.slice(0, 3),
    testimonials: testimonials.slice(0, 3),
  };
});

/** Public, published slugs for the sitemap (services, projects, insights). */
export async function getPublicSitemapEntries(): Promise<readonly string[]> {
  try {
    const [services, projects, posts] = await Promise.all([
      getPublishedServices(),
      getPublishedProjects(),
      getPublishedPosts(),
    ]);
    return [
      ...services.map((entry) => `/services/${entry.slug}`),
      ...projects.map((entry) => `/projects/${entry.slug}`),
      ...posts.map((entry) => `/insights/${entry.slug}`),
    ];
  } catch {
    return [];
  }
}

export type ProjectCardData = Readonly<{
  id: string;
  slug: string;
  title: string;
  summary: string;
  projectType: string | null;
  publicLocation: string | null;
  completionYear: number | null;
  evidenceClass: PublicProject["evidenceClass"];
  layoutHint: PublicProject["layoutHint"];
  homeFeatured: boolean;
  featured: boolean;
  sortOrder: number;
  materials: string | null;
  tags: readonly string[];
  media: Readonly<{
    projectMediaId: string;
    alt: string;
    focalX: number;
    focalY: number;
    provenanceClass: string | null;
    width: number | null;
    height: number | null;
  }> | null;
}>;

/** Published projects with their hero media, in display order — the input to auto-placement. */
export const getPublishedProjectCards = cache(async (): Promise<readonly ProjectCardData[]> => {
  const [projects, media] = await Promise.all([
    getPublishedProjects(),
    getPublishedProjectHeroMedia(),
  ]);
  const heroByProject = new Map(media.map((item) => [item.projectId, item]));
  return projects.map((project) => {
    const hero = heroByProject.get(project.id);
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      projectType: project.projectType,
      publicLocation: project.publicLocation,
      completionYear: project.completionYear,
      evidenceClass: project.evidenceClass,
      layoutHint: project.layoutHint,
      homeFeatured: project.homeFeatured,
      featured: project.featured,
      sortOrder: project.sortOrder,
      materials: project.materials,
      tags: project.tags,
      media: hero
        ? {
            projectMediaId: hero.id,
            alt: hero.decorative ? "" : (hero.altText ?? project.title),
            focalX: hero.focalX,
            focalY: hero.focalY,
            provenanceClass: hero.provenanceClass,
            width: hero.width,
            height: hero.height,
          }
        : null,
    };
  });
});
