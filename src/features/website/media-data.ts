import "server-only";

import {
  mediaDetailSchema,
  mediaListSchema,
  type MediaDetail,
  type MediaFilter,
  type MediaList,
} from "@/features/website/media-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type {
  MediaDetail,
  MediaFilter,
  MediaItem,
  MediaList,
  MediaUsage,
} from "@/features/website/media-contract";
export { mediaFilters } from "@/features/website/media-contract";

export async function loadMediaList(
  query: string,
  filter: MediaFilter,
  limit = 60,
): Promise<MediaList> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_media", {
    ...(query ? { search_query: query } : {}),
    filter,
    limit_count: limit,
  });
  if (error) throw new Error("The media library could not be loaded.");
  const parsed = mediaListSchema.safeParse(data);
  return parsed.success ? parsed.data : { counts: {}, items: [] };
}

export async function loadMedia(mediaId: string): Promise<MediaDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_media", { target_id: mediaId });
  if (error) throw new Error("The media asset could not be loaded.");
  if (data === null) return null;
  const parsed = mediaDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
