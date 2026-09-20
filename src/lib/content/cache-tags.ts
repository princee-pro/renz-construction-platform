import type { PublicationCommand } from "@/lib/content/schemas";

export type PublishedContentType = PublicationCommand["contentType"];

const collectionTags: Record<PublishedContentType, string> = {
  service: "content:services",
  project: "content:projects",
  post: "content:posts",
  page: "content:pages",
  team_member: "content:team-members",
  testimonial: "content:testimonials",
  credential: "content:credentials",
};

export function contentCollectionTag(contentType: PublishedContentType): string {
  return collectionTags[contentType];
}

export function contentItemTag(contentType: PublishedContentType, targetId: string): string {
  return `content:${contentType}:${targetId}`;
}

export function navigationTag(menuId?: string): string {
  return menuId ? `navigation:${menuId}` : "navigation";
}

export function publicSettingsTag(namespace?: string, key?: string): string {
  if (namespace && key) {
    return `public-settings:${namespace}:${key}`;
  }
  return "public-settings";
}

export function homepageTag(): string {
  return "homepage";
}

export function tagsForContent(
  contentType: PublishedContentType,
  targetId: string,
): readonly string[] {
  return [contentCollectionTag(contentType), contentItemTag(contentType, targetId), homepageTag()];
}
