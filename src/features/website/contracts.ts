import { z } from "zod";

import { sectionMotions, sectionSpacings, sectionTones } from "@/features/website/section-registry";

export const pageTypes = ["system", "content", "custom", "global"] as const;
export type WebsitePageType = (typeof pageTypes)[number];
export const pageStatuses = ["draft", "published", "archived"] as const;

const nullableString = z.string().nullable().catch(null);
const nullableNumber = z.number().int().nullable().catch(null);

const healthEntrySchema = z
  .object({
    code: z.string(),
    severity: z.enum(["info", "warning", "error"]).catch("info"),
    message: z.string(),
    media_id: z.string().uuid().optional(),
  })
  .passthrough();
export type PageHealthEntry = z.infer<typeof healthEntrySchema>;

export const snapshotSectionSchema = z
  .object({
    id: z.string().uuid(),
    type: z.string(),
    variant: z.string().catch("default"),
    tone: z.enum(sectionTones).catch("paper"),
    spacing: z.enum(sectionSpacings).catch("standard"),
    motion: z.enum(sectionMotions).catch("standard"),
    hidden: z.boolean().optional().catch(false),
    locked: z.boolean().optional().catch(false),
    label: nullableString.optional(),
    config: z.record(z.string(), z.unknown()).catch({}),
  })
  .passthrough();
export type SnapshotSection = z.infer<typeof snapshotSectionSchema>;

export const pageSnapshotSchema = z
  .object({
    page: z.object({
      id: z.string().uuid(),
      page_key: z.string(),
      page_type: z.enum(pageTypes),
      path: z.string(),
      title: z.string(),
      seo: z
        .object({
          title: nullableString,
          description: nullableString,
          og_media_id: z.string().uuid().nullable().catch(null),
          noindex: z.boolean().catch(false),
        })
        .partial()
        .catch({}),
    }),
    sections: z.array(snapshotSectionSchema).catch([]),
    revision: z
      .object({
        no: nullableNumber.optional(),
        published_at: nullableString.optional(),
        preview: z.boolean().catch(false),
      })
      .partial()
      .optional(),
    status: z.enum(pageStatuses).optional(),
  })
  .passthrough();
export type PageSnapshot = z.infer<typeof pageSnapshotSchema>;

export const pageListItemSchema = z
  .object({
    id: z.string().uuid(),
    page_key: z.string(),
    page_type: z.enum(pageTypes),
    path: z.string(),
    title: z.string(),
    status: z.enum(pageStatuses),
    noindex: z.boolean().catch(false),
    seo_complete: z.boolean().catch(false),
    has_draft_changes: z.boolean().catch(false),
    published_at: nullableString,
    published_by: nullableString,
    updated_at: z.string(),
    updated_by: nullableString,
    version: z.number().int(),
    section_count: z.number().int().catch(0),
    health: z.array(healthEntrySchema).catch([]),
  })
  .passthrough();
export type PageListItem = z.infer<typeof pageListItemSchema>;

export const revisionSummarySchema = z.object({
  id: z.string().uuid(),
  revision_no: z.number().int(),
  kind: z.enum(["published", "restore_point"]),
  summary: nullableString,
  created_at: z.string(),
  created_by: nullableString,
  is_current: z.boolean().catch(false),
});
export type RevisionSummary = z.infer<typeof revisionSummarySchema>;

export const editorSectionSchema = snapshotSectionSchema.extend({
  sort_order: z.number().int(),
  version: z.number().int(),
  updated_at: z.string().optional(),
});
export type EditorSection = z.infer<typeof editorSectionSchema>;

export const pageDetailSchema = z.object({
  page: z.object({
    id: z.string().uuid(),
    page_key: z.string(),
    page_type: z.enum(pageTypes),
    path: z.string(),
    title: z.string(),
    status: z.enum(pageStatuses),
    seo_title: nullableString,
    seo_description: nullableString,
    og_media_id: z.string().uuid().nullable().catch(null),
    noindex: z.boolean().catch(false),
    published_revision_id: z.string().uuid().nullable().catch(null),
    published_revision_no: nullableNumber,
    published_at: nullableString,
    published_by: nullableString,
    archived_at: nullableString,
    updated_at: z.string(),
    updated_by: nullableString,
    version: z.number().int(),
    has_draft_changes: z.boolean().catch(true),
  }),
  sections: z.array(editorSectionSchema).catch([]),
  revisions: z.array(revisionSummarySchema).catch([]),
  health: z.array(healthEntrySchema).catch([]),
  dependencies: z.array(z.object({ kind: z.string(), label: z.string() }).passthrough()).catch([]),
  permissions: z.object({
    can_write: z.boolean().catch(false),
    can_layout: z.boolean().catch(false),
    can_publish: z.boolean().catch(false),
    can_seo: z.boolean().catch(false),
  }),
});
export type PageDetail = z.infer<typeof pageDetailSchema>;

export const revisionDetailSchema = z.object({
  id: z.string().uuid(),
  page_id: z.string().uuid(),
  revision_no: z.number().int(),
  kind: z.enum(["published", "restore_point"]),
  summary: nullableString,
  created_at: z.string(),
  created_by: nullableString,
  snapshot: pageSnapshotSchema,
});
export type RevisionDetail = z.infer<typeof revisionDetailSchema>;

const countBlock = z.record(z.string(), z.number().int().nullable().catch(null)).catch({});

export const websiteOverviewSchema = z
  .object({
    pages: countBlock,
    services: countBlock.nullable().catch(null),
    projects: countBlock.nullable().catch(null),
    insights: countBlock.nullable().catch(null),
    media: countBlock.nullable().catch(null),
    services_without_projects: z.number().int().nullable().catch(null),
    navigation: countBlock,
    recent_activity: z
      .array(
        z.object({
          action: z.string(),
          entity_type: z.string(),
          entity_id: nullableString,
          at: z.string(),
          actor: nullableString,
        }),
      )
      .catch([]),
    permissions: z.object({
      content: z.boolean().catch(false),
      media: z.boolean().catch(false),
      publish: z.boolean().catch(false),
      navigation: z.boolean().catch(false),
    }),
  })
  .passthrough();
export type WebsiteOverview = z.infer<typeof websiteOverviewSchema>;

export const sitemapRowSchema = z
  .object({
    kind: z.enum(["page", "service", "project", "insight", "legal"]),
    id: z.string(),
    title: z.string(),
    route: z.string(),
    type: z.string(),
    status: z.string(),
    has_draft_changes: z.boolean().catch(false),
    updated_at: nullableString,
    updated_by: nullableString,
    seo_state: z.string().catch("system"),
    noindex: z.boolean().catch(false),
    health: z.array(healthEntrySchema).catch([]),
    href: z.string(),
  })
  .passthrough();
export type SitemapRow = z.infer<typeof sitemapRowSchema>;

export const publicPageListSchema = z.array(
  z.object({
    path: z.string(),
    title: z.string(),
    page_type: z.enum(pageTypes),
    noindex: z.boolean().catch(false),
    published_at: nullableString,
  }),
);

/** Global copy shape (from the `globals` page). Defaults keep the site coherent when a key is missing. */
export const globalCopyDefaults = {
  whatsapp_cta_label: "Message on WhatsApp",
  whatsapp_continue_label: "Continue on WhatsApp",
  whatsapp_message: "Hello {{business.short_name}}, I would like to discuss a project.",
  whatsapp_note: "Messages only — the number does not take calls.",
  floating_whatsapp_label: "Message on WhatsApp",
  insight_note: "",
  staff_signin_label: "Staff Login",
  staff_signin_note: "RENZ team access",
  back_to_top_label: "Back to top",
  menu_tagline: "Brick by Brick.",
  all_services_label: "See all services",
  prefer_to_talk_label: "Prefer to talk",
  what_happens_next_label: "What happens next",
} as const;
export type GlobalCopy = { -readonly [K in keyof typeof globalCopyDefaults]: string };

export const processStepSchema = z.object({
  key: z.string(),
  title: z.string(),
  verb: z.string(),
  summary: z.string(),
  receives: z.string(),
  decision: z.string(),
  field: z.enum(["quiet", "survey", "plan", "datum", "structure", "material"]).catch("quiet"),
});
export type ProcessStep = z.infer<typeof processStepSchema>;

export type FooterOptions = Readonly<{
  kicker: string | null;
  headline: string;
  statement: string | null;
  services_label: string;
  company_label: string;
  contact_label: string;
  show_services: boolean;
  show_company: boolean;
  show_contact: boolean;
  show_location: boolean;
  show_hours: boolean;
  show_social: boolean;
  show_legal: boolean;
  show_staff_signin: boolean;
  show_back_to_top: boolean;
  cta: Readonly<{ label: string; destination_type: string; destination: string | null }> | null;
}>;

export type FooterGroup = Readonly<{
  title: string;
  links: readonly Readonly<{ label: string; href: string }>[];
}>;

export type WebsiteGlobals = Readonly<{
  copy: GlobalCopy;
  processSteps: readonly ProcessStep[];
  footer: FooterOptions;
  footerGroups: readonly FooterGroup[];
}>;
