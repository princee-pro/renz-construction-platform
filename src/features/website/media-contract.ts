import { z } from "zod";

const nullableString = z.string().nullable().catch(null);

export const mediaItemSchema = z
  .object({
    id: z.string().uuid(),
    filename: nullableString,
    mime_type: z.string(),
    width: z.number().int().nullable().catch(null),
    height: z.number().int().nullable().catch(null),
    byte_size: z.number().int().catch(0),
    provenance_class: z.string(),
    classification: z
      .enum(["renz_provided", "licensed", "generated_concept", "review_required"])
      .catch("review_required"),
    rights_status: z.string(),
    storage_state: z.string(),
    alt_text: nullableString,
    caption: nullableString,
    credit: nullableString,
    focal_x: z.number().catch(0.5),
    focal_y: z.number().catch(0.5),
    created_at: z.string(),
    version: z.number().int(),
    ready: z.boolean().catch(false),
    usage_count: z.number().int().catch(0),
  })
  .passthrough();
export type MediaItem = z.infer<typeof mediaItemSchema>;

export const mediaListSchema = z.object({
  counts: z.record(z.string(), z.number().int().nullable().catch(null)).catch({}),
  items: z.array(mediaItemSchema).catch([]),
});
export type MediaList = z.infer<typeof mediaListSchema>;

export const mediaUsageSchema = z.array(
  z
    .object({
      kind: z.string(),
      id: z.string().nullable().catch(null),
      label: z.string(),
      role: nullableString,
      href: z.string(),
    })
    .passthrough(),
);
export type MediaUsage = z.infer<typeof mediaUsageSchema>;

export const mediaDetailSchema = mediaItemSchema.extend({
  rights_holder: nullableString,
  rights_source: nullableString,
  public_use_permission: z.string().catch("not_granted"),
  updated_at: z.string(),
  evidence_eligible: z.boolean().catch(false),
  usage: mediaUsageSchema.catch([]),
  source_asset_id: nullableString,
});
export type MediaDetail = z.infer<typeof mediaDetailSchema>;

export const mediaFilters = [
  "all",
  "ready",
  "needs_rights",
  "needs_alt",
  "unused",
  "archived",
] as const;
export type MediaFilter = (typeof mediaFilters)[number];
