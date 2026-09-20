import "server-only";

import { z } from "zod";

import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

const publishedLegalPageSchema = z.object({
  slug: z.enum(["privacy", "terms", "cookies"]),
  title: z.string(),
  body: z.string(),
  revision: z.number().int(),
  published_at: z.string(),
});
export type PublishedLegalPage = z.infer<typeof publishedLegalPageSchema>;

/** Published legal revision only (anon facade); null when unpublished or unavailable. */
export async function getPublishedLegalPage(
  slug: "privacy" | "terms" | "cookies",
): Promise<PublishedLegalPage | null> {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc("public_legal_page", { target_slug: slug });
  if (error || data === null) return null;
  const parsed = publishedLegalPageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
