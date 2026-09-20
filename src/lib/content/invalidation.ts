import "server-only";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";

import {
  contentCollectionTag,
  contentItemTag,
  homepageTag,
  navigationTag,
  publicSettingsTag,
  type PublishedContentType,
} from "@/lib/content/cache-tags";

/**
 * S4's mutation boundary invalidates the collection, item, and composed
 * homepage scopes together. The optional path is supplied only by a later
 * route owner once a public route register exists.
 */
export function invalidatePublishedContent(
  contentType: PublishedContentType,
  targetId: string,
  path?: string,
): void {
  revalidateTag(contentCollectionTag(contentType), "max");
  revalidateTag(contentItemTag(contentType, targetId), "max");
  revalidateTag(homepageTag(), "max");
  if (path) {
    revalidatePath(path);
  }
}

export function invalidateNavigation(menuId?: string): void {
  revalidateTag(navigationTag(menuId), "max");
  revalidateTag(homepageTag(), "max");
}

export function invalidatePublicSettings(namespace?: string, key?: string): void {
  revalidateTag(publicSettingsTag(namespace, key), "max");
}

/**
 * Call this helper only from a Server Action that needs read-your-own-writes
 * semantics. Next.js intentionally rejects updateTag outside that context.
 */
export function expireContentAfterServerAction(
  contentType: PublishedContentType,
  targetId: string,
): void {
  updateTag(contentCollectionTag(contentType));
  updateTag(contentItemTag(contentType, targetId));
  updateTag(homepageTag());
}
