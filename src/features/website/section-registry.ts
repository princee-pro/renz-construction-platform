import { z } from "zod";

import {
  landingConceptOptions,
  landingHeightOptions,
} from "@/components/site/landing/landing-concepts";

import { isSafeStructuredValue } from "@/lib/content/schemas";
import { isRenderableHref } from "@/lib/content/rich-text";

/**
 * CR1 section registry — the ONE source for what the owner can compose.
 *
 * Each section type declares its editor fields; the zod schema is derived
 * from the same declaration, so the editor, the server action and the
 * renderer agree. The renderer map (components/site/sections) is static:
 * the database never names a component.
 *
 * No field accepts CSS, HTML, scripts or coordinates. Layout, spacing and
 * tone are enumerated presets the design system interprets.
 */

export const sectionTones = [
  "paper",
  "limestone",
  "ink",
  "concrete",
  "charcoal",
  "material",
  "survey_field",
  "plan_field",
  "structure_field",
  "datum_field",
  "quiet_field",
] as const;
export type SectionTone = (typeof sectionTones)[number];
export const sectionToneLabels: Readonly<Record<SectionTone, string>> = {
  paper: "Paper (light)",
  limestone: "Limestone",
  ink: "Ink (dark)",
  concrete: "Concrete",
  charcoal: "Charcoal (dark)",
  material: "Material",
  survey_field: "Survey field",
  plan_field: "Plan field",
  structure_field: "Structure field",
  datum_field: "Datum field",
  quiet_field: "Quiet field",
};

export const sectionSpacings = ["compact", "standard", "generous"] as const;
export type SectionSpacing = (typeof sectionSpacings)[number];
export const sectionMotions = ["standard", "quiet", "none"] as const;
export type SectionMotion = (typeof sectionMotions)[number];

export const ctaDestinationTypes = [
  "internal",
  "start_project",
  "service_enquiry",
  "material_enquiry",
  "contact",
  "whatsapp",
  "email",
  "external",
] as const;
export type CtaDestinationType = (typeof ctaDestinationTypes)[number];
export const ctaDestinationLabels: Readonly<Record<CtaDestinationType, string>> = {
  internal: "Page on this website",
  start_project: "Start a Project",
  service_enquiry: "Service enquiry",
  material_enquiry: "Material enquiry",
  contact: "Contact page",
  whatsapp: "WhatsApp (messages only)",
  email: "Email",
  external: "External website (https)",
};

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/[<>]/u.test(value), "Markup is not accepted.")
    .refine(
      (value) => !/(?:javascript\s*:|data\s*:|vbscript\s*:)/iu.test(value),
      "Executable protocols are not accepted.",
    );

const optionalText = (max: number) =>
  safeText(max)
    .nullish()
    .transform((value) => (value === undefined || value === null || value === "" ? null : value));

const uuid = z.string().uuid();

export const ctaSchema = z
  .object({
    label: safeText(80).min(1, "Give the button a label."),
    destination_type: z.enum(ctaDestinationTypes),
    destination: optionalText(2000),
  })
  .strict()
  .superRefine((cta, context) => {
    if (cta.destination_type === "internal") {
      if (
        !cta.destination ||
        !cta.destination.startsWith("/") ||
        !isRenderableHref(cta.destination)
      ) {
        context.addIssue({
          code: "custom",
          path: ["destination"],
          message: "Choose a page address on this website (for example /about).",
        });
      }
    }
    if (cta.destination_type === "external") {
      if (
        !cta.destination ||
        !/^https:\/\//iu.test(cta.destination) ||
        !isRenderableHref(cta.destination)
      ) {
        context.addIssue({
          code: "custom",
          path: ["destination"],
          message: "External links must start with https://.",
        });
      }
    }
  });
export type Cta = z.infer<typeof ctaSchema>;

export const richBlockSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("heading"),
      level: z.union([z.literal(2), z.literal(3)]),
      text: safeText(400).min(1),
    })
    .strict(),
  z.object({ type: z.literal("paragraph"), text: safeText(4000).min(1) }).strict(),
  z
    .object({ type: z.literal("list"), items: z.array(safeText(600).min(1)).min(1).max(32) })
    .strict(),
  z
    .object({
      type: z.literal("link"),
      label: safeText(200).min(1),
      href: safeText(2000).refine(
        isRenderableHref,
        "Links must be a page on this site, https, or mailto.",
      ),
    })
    .strict(),
  z
    .object({
      type: z.literal("quote"),
      text: safeText(1000).min(1),
      attribution: optionalText(200).optional(),
    })
    .strict(),
]);
export const richBlocksSchema = z.array(richBlockSchema).max(128);
export type RichBlocksValue = z.infer<typeof richBlocksSchema>;

// ---------------------------------------------------------------------
// Field declarations
// ---------------------------------------------------------------------

export type FieldSpec =
  | Readonly<{
      kind: "text";
      key: string;
      label: string;
      help?: string;
      max?: number;
      required?: boolean;
    }>
  | Readonly<{
      kind: "textarea";
      key: string;
      label: string;
      help?: string;
      max?: number;
      required?: boolean;
    }>
  | Readonly<{ kind: "rich"; key: string; label: string; help?: string }>
  | Readonly<{
      kind: "lines";
      key: string;
      label: string;
      help?: string;
      max?: number;
      itemMax?: number;
    }>
  | Readonly<{ kind: "boolean"; key: string; label: string; help?: string }>
  | Readonly<{
      kind: "number";
      key: string;
      label: string;
      help?: string;
      min: number;
      max: number;
    }>
  | Readonly<{
      kind: "select";
      key: string;
      label: string;
      help?: string;
      options: readonly Readonly<{ value: string; label: string }>[];
    }>
  | Readonly<{ kind: "cta"; key: string; label: string; help?: string; optional?: boolean }>
  | Readonly<{ kind: "media"; key: string; label: string; help?: string }>
  | Readonly<{
      kind: "items";
      key: string;
      label: string;
      help?: string;
      max: number;
      itemLabel: string;
      fields: readonly FieldSpec[];
    }>;

function fieldSchema(field: FieldSpec): z.ZodTypeAny {
  switch (field.kind) {
    case "text":
      return field.required
        ? safeText(field.max ?? 300).min(1, "Enter a value.")
        : optionalText(field.max ?? 300);
    case "textarea":
      return field.required
        ? safeText(field.max ?? 2000).min(1, "Enter a value.")
        : optionalText(field.max ?? 2000);
    case "rich":
      return richBlocksSchema.default([]);
    case "lines":
      return z
        .array(safeText(field.itemMax ?? 600).min(1))
        .max(field.max ?? 24)
        .default([]);
    case "boolean":
      return z.boolean().default(false);
    case "number":
      return z.number().int().min(field.min).max(field.max);
    case "select": {
      const values = field.options.map((option) => option.value) as [string, ...string[]];
      // A missing select (a field added after the section was saved) reads as its first option.
      return z.enum(values).default(values[0]);
    }
    case "cta":
      return field.optional ? ctaSchema.nullish().transform((value) => value ?? null) : ctaSchema;
    case "media":
      return uuid.nullish().transform((value) => value ?? null);
    case "items":
      return z
        .array(
          z
            .object(
              Object.fromEntries(field.fields.map((inner) => [inner.key, fieldSchema(inner)])),
            )
            .strict(),
        )
        .max(field.max)
        .default([]);
  }
}

export function schemaFromFields(fields: readonly FieldSpec[]): z.ZodTypeAny {
  return z
    .object(Object.fromEntries(fields.map((field) => [field.key, fieldSchema(field)])))
    .strict()
    .superRefine((value, context) => {
      if (!isSafeStructuredValue(value)) {
        context.addIssue({ code: "custom", message: "Content contains unsafe data." });
      }
    });
}

export function defaultsFromFields(fields: readonly FieldSpec[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.kind) {
      case "text":
      case "textarea":
        result[field.key] = field.required ? "" : null;
        break;
      case "rich":
      case "lines":
      case "items":
        result[field.key] = [];
        break;
      case "boolean":
        result[field.key] = false;
        break;
      case "number":
        result[field.key] = field.min;
        break;
      case "select":
        result[field.key] = field.options[0]?.value ?? "";
        break;
      case "cta":
        result[field.key] = field.optional
          ? null
          : { label: "", destination_type: "internal", destination: "/" };
        break;
      case "media":
        result[field.key] = null;
        break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------

export type SectionScope = "any" | "system" | "global";

export type SectionTypeDefinition = Readonly<{
  key: string;
  label: string;
  description: string;
  scope: SectionScope;
  /** System modules ship with their page; the owner edits surrounding copy only. */
  systemModule: boolean;
  variants: readonly Readonly<{ value: string; label: string }>[];
  fields: readonly FieldSpec[];
}>;

const kicker: FieldSpec = {
  kind: "text",
  key: "kicker",
  label: "Small label above the title",
  max: 80,
};
const heading = (required = true): FieldSpec => ({
  kind: "text",
  key: "heading",
  label: "Heading",
  max: 200,
  required,
});
const intro: FieldSpec = { kind: "textarea", key: "intro", label: "Short introduction", max: 800 };
const body: FieldSpec = { kind: "textarea", key: "body", label: "Main text", max: 2000 };
const linkLabel: FieldSpec = { kind: "text", key: "link_label", label: "Link label", max: 60 };
const factsField: FieldSpec = {
  kind: "items",
  key: "facts",
  label: "Key facts",
  help: "Short label / value pairs. Values may use {{services.count}}, {{projects.count}}, {{business.region}} and similar tokens.",
  max: 6,
  itemLabel: "Fact",
  fields: [
    { kind: "text", key: "label", label: "Label", max: 40, required: true },
    { kind: "text", key: "value", label: "Value", max: 160, required: true },
  ],
};
const nextSteps: FieldSpec = {
  kind: "lines",
  key: "next_steps",
  label: "What happens next",
  help: "One step per line.",
  max: 5,
  itemMax: 300,
};
const fieldVariant: FieldSpec = {
  kind: "select",
  key: "field_variant",
  label: "Background drawing",
  options: [
    { value: "structural", label: "Structural" },
    { value: "mass", label: "Mass" },
    { value: "survey", label: "Survey" },
    { value: "plan", label: "Plan" },
    { value: "datum", label: "Datum" },
    { value: "detail", label: "Detail" },
    { value: "drawing", label: "Drawing" },
    { value: "material", label: "Material" },
    { value: "quiet", label: "Quiet" },
  ],
};

export const sectionTypes: readonly SectionTypeDefinition[] = [
  {
    key: "hero",
    label: "Hero",
    description:
      "The opening statement of a page: eyebrow, headline, summary, calls to action and an optional image.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Signature (datum field)" },
      { value: "editorial", label: "Editorial" },
      { value: "monument", label: "Monument (image-led)" },
    ],
    fields: [
      { ...kicker, label: "Small label above the title", max: 80 },
      {
        kind: "lines",
        key: "headline_lines",
        label: "Headline (one line per row)",
        help: "One line per row; two rows read as the signature two-line headline.",
        max: 3,
        itemMax: 80,
      },
      { kind: "textarea", key: "summary", label: "Summary", max: 600 },
      {
        kind: "cta",
        key: "primary_cta",
        label: "Primary button",
        help: "Leave empty to use the site-wide primary call to action from Settings → Website.",
        optional: true,
      },
      { kind: "cta", key: "secondary_cta", label: "Secondary button", optional: true },
      { kind: "media", key: "media_id", label: "Hero image (also the video poster)" },
      {
        kind: "media",
        key: "video_media_id",
        label: "Hero video (optional)",
        help: "A short muted loop (WebM or MP4, 5–8 s). The image above shows first and on slow connections.",
      },
      {
        kind: "items",
        key: "register",
        label: "Key facts",
        max: 4,
        itemLabel: "Fact",
        fields: [
          { kind: "text", key: "label", label: "Label", max: 40, required: true },
          { kind: "text", key: "value", label: "Value", max: 160, required: true },
        ],
      },
    ],
  },
  {
    key: "masthead",
    label: "Page masthead",
    description: "Title, summary and register facts at the top of an inner page.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "text",
        key: "eyebrow",
        label: "Small label above the title",
        max: 60,
        required: true,
      },
      { kind: "text", key: "title", label: "Page title", max: 200, required: true },
      { kind: "textarea", key: "summary", label: "Short description", max: 600 },
      {
        kind: "select",
        key: "landing",
        label: "Landing concept",
        help: "The visual idea that opens this page. Each concept has its own motion and layout.",
        options: [{ value: "auto", label: "Automatic (by page)" }, ...landingConceptOptions],
      },
      {
        kind: "select",
        key: "height",
        label: "Landing height",
        options: [{ value: "auto", label: "Automatic (by concept)" }, ...landingHeightOptions],
      },
      { kind: "media", key: "media_id", label: "Hero image (also the video poster)" },
      {
        kind: "media",
        key: "video_media_id",
        label: "Hero video (optional)",
        help: "A short muted loop (WebM or MP4, 5–8 s). The image shows first and on slow connections.",
      },
      { kind: "cta", key: "primary_cta", label: "Primary button", optional: true },
      { kind: "cta", key: "secondary_cta", label: "Secondary button", optional: true },
      {
        kind: "text",
        key: "datum_index",
        label: "Section number",
        help: "Two-digit index shown on the masthead (for example 03).",
        max: 4,
      },
      { kind: "boolean", key: "compact", label: "Compact masthead" },
      fieldVariant,
      factsField,
    ],
  },
  {
    key: "editorial_intro",
    label: "Editorial intro",
    description:
      "A kicker, a heading, a lede and body copy with optional principle items alongside.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Copy + principles" },
      { value: "quiet", label: "Copy only" },
    ],
    fields: [
      kicker,
      heading(),
      { kind: "textarea", key: "lede", label: "Lede", max: 800 },
      body,
      {
        kind: "items",
        key: "items",
        label: "Principles",
        max: 8,
        itemLabel: "Principle",
        fields: [
          { kind: "text", key: "title", label: "Title", max: 120, required: true },
          { kind: "textarea", key: "body", label: "Main text", max: 400, required: true },
        ],
      },
    ],
  },
  {
    key: "rich_text",
    label: "Rich text",
    description: "Headings, paragraphs, lists, quotes and links.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Standard measure" },
      { value: "wide", label: "Wide" },
    ],
    fields: [
      kicker,
      heading(false),
      {
        kind: "rich",
        key: "blocks",
        label: "Text",
        help: "Paragraphs separated by a blank line. ## Heading, - list item, > quote, **bold**, *italic*, [label](/page).",
      },
    ],
  },
  {
    key: "text_media",
    label: "Text + media",
    description: "Copy beside an image; choose which side the image sits on.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Image right" },
      { value: "media_left", label: "Image left" },
    ],
    fields: [
      kicker,
      heading(),
      { kind: "rich", key: "blocks", label: "Text" },
      { kind: "media", key: "media_id", label: "Image" },
      { kind: "cta", key: "link", label: "Link", optional: true },
    ],
  },
  {
    key: "full_media",
    label: "Full-width media",
    description:
      "A full-bleed image with a short statement over it. Hidden automatically until an image is chosen.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Statement over image" }],
    fields: [
      kicker,
      heading(),
      body,
      { kind: "media", key: "media_id", label: "Image" },
      {
        kind: "text",
        key: "badge",
        label: "Badge",
        help: "A short provenance label such as “Concept material study”.",
        max: 60,
      },
    ],
  },
  {
    key: "feature_grid",
    label: "Feature grid",
    description: "Titled items in columns, numbered rows or principles.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      heading(),
      intro,
      {
        kind: "select",
        key: "layout",
        label: "Layout",
        options: [
          { value: "columns", label: "Columns (A / B / C)" },
          { value: "numbered", label: "Numbered list" },
          { value: "principles", label: "Principles" },
        ],
      },
      {
        kind: "items",
        key: "items",
        label: "Items",
        max: 12,
        itemLabel: "Item",
        fields: [
          { kind: "text", key: "index_label", label: "Index label", max: 4 },
          { kind: "text", key: "title", label: "Title", max: 160, required: true },
          { kind: "textarea", key: "body", label: "Main text", max: 600, required: true },
          { kind: "cta", key: "link", label: "Link", optional: true },
        ],
      },
    ],
  },
  {
    key: "service_showcase",
    label: "Service showcase",
    description:
      "The published services, in the chosen layout. The count and the list come from the Services register.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      {
        kind: "text",
        key: "heading",
        label: "Heading",
        help: "{{services.count_words}} becomes the live count (Five, Six …).",
        max: 200,
        required: true,
      },
      intro,
      linkLabel,
      {
        kind: "select",
        key: "mode",
        label: "Layout",
        options: [
          { value: "compact", label: "Compact grid" },
          { value: "list", label: "One line each" },
          { value: "signature", label: "Signature navigator" },
        ],
      },
    ],
  },
  {
    key: "project_showcase",
    label: "Project showcase",
    description:
      "Published projects, placed automatically. Use Feature on Home and Display order in the Projects register to influence prominence.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Editorial (monument + grid)" },
      { value: "grid", label: "Grid" },
    ],
    fields: [
      kicker,
      heading(),
      intro,
      linkLabel,
      {
        kind: "select",
        key: "mode",
        label: "Selection",
        options: [
          { value: "home", label: "Featured on Home (fallback: newest published)" },
          { value: "selected", label: "Selected (featured first, then display order)" },
          { value: "recent", label: "Most recent" },
        ],
      },
      { kind: "number", key: "limit", label: "How many", min: 1, max: 12 },
    ],
  },
  {
    key: "process",
    label: "Process / steps",
    description:
      "The RENZ process from Website → Globals, as the horizontal story or the compact navigator.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "text",
        key: "kicker",
        label: "Small label above the title",
        help: "{{process.count_words_lower}} becomes the live step count.",
        max: 120,
      },
      heading(false),
      intro,
      {
        kind: "text",
        key: "closing",
        label: "Closing line",
        help: "Shown as the last panel’s “Then”.",
        max: 120,
      },
      linkLabel,
      {
        kind: "select",
        key: "mode",
        label: "Layout",
        options: [
          { value: "story", label: "Horizontal story" },
          { value: "compact", label: "Compact story" },
          { value: "navigator", label: "Navigator (timeline)" },
        ],
      },
    ],
  },
  {
    key: "material_detail",
    label: "Material detail",
    description: "A material statement with an image and a badge.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      heading(),
      body,
      { kind: "media", key: "media_id", label: "Image" },
      { kind: "text", key: "badge", label: "Badge", max: 60 },
    ],
  },
  {
    key: "gallery",
    label: "Gallery",
    description: "A set of images with optional captions; the grid adapts to the count.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Editorial grid" },
      { value: "strip", label: "Strip" },
    ],
    fields: [
      kicker,
      heading(false),
      {
        kind: "items",
        key: "items",
        label: "Images",
        max: 24,
        itemLabel: "Image",
        fields: [
          { kind: "media", key: "media_id", label: "Image" },
          { kind: "text", key: "caption", label: "Caption", max: 300 },
        ],
      },
    ],
  },
  {
    key: "faq",
    label: "FAQ",
    description: "Questions and answers.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      heading(),
      intro,
      {
        kind: "items",
        key: "items",
        label: "Questions",
        max: 24,
        itemLabel: "Question",
        fields: [
          { kind: "text", key: "question", label: "Question", max: 300, required: true },
          { kind: "textarea", key: "answer", label: "Answer", max: 2000, required: true },
        ],
      },
    ],
  },
  {
    key: "insight_feed",
    label: "Insight feed",
    description: "The latest published insights (featured and pinned first).",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      heading(),
      linkLabel,
      { kind: "number", key: "limit", label: "How many", min: 1, max: 6 },
    ],
  },
  {
    key: "cta",
    label: "Call to action",
    description: "A closing statement with buttons and optional numbered steps.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      heading(),
      body,
      {
        kind: "cta",
        key: "primary_cta",
        label: "Primary button",
        help: "Leave empty to use the site-wide primary call to action.",
        optional: true,
      },
      { kind: "cta", key: "secondary_cta", label: "Secondary button", optional: true },
      {
        kind: "items",
        key: "steps",
        label: "Steps",
        max: 5,
        itemLabel: "Step",
        fields: [
          { kind: "text", key: "title", label: "Title", max: 120, required: true },
          { kind: "textarea", key: "body", label: "Main text", max: 300, required: true },
        ],
      },
    ],
  },
  {
    key: "contact_strip",
    label: "Contact strip",
    description:
      "A short strip with the public email and WhatsApp (values come from Business settings).",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      heading(),
      body,
      { kind: "boolean", key: "show_email", label: "Show email" },
      { kind: "boolean", key: "show_whatsapp", label: "Show WhatsApp" },
    ],
  },
  {
    key: "whatsapp_cta",
    label: "WhatsApp call to action",
    description:
      "A green WhatsApp messaging prompt. The number comes from Business settings and is messaging-only.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      heading(),
      body,
      { kind: "text", key: "button_label", label: "Button label", max: 60, required: true },
      { kind: "text", key: "message", label: "Prefilled message", max: 300 },
    ],
  },
  {
    key: "quote",
    label: "Quote",
    description: "A pull quote with an optional attribution.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "textarea", key: "text", label: "Quote", max: 600, required: true },
      { kind: "text", key: "attribution", label: "Attribution", max: 200 },
    ],
  },
  {
    key: "testimonial",
    label: "Testimonial",
    description:
      "Approved client testimonials only. Renders nothing until a testimonial is published.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [kicker, heading(false)],
  },
  {
    key: "marquee",
    label: "Marquee",
    description: "A slow line of words.",
    scope: "any",
    systemModule: false,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "lines",
        key: "words",
        label: "Words",
        help: "One word or short phrase per line.",
        max: 12,
        itemMax: 40,
      },
    ],
  },
  {
    key: "divider",
    label: "Divider / transition",
    description: "Breathing space between sections.",
    scope: "any",
    systemModule: false,
    variants: [
      { value: "default", label: "Line" },
      { value: "space", label: "Space" },
      { value: "datum", label: "Gold line mark" },
    ],
    fields: [],
  },
  // System modules — provisioned with their page; owner edits surrounding copy.
  {
    key: "services_navigator",
    label: "Services navigator",
    description:
      "The signature service navigator and the one-line list. Services come from the register.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "all_kicker", label: "List eyebrow", max: 60 },
      { kind: "text", key: "all_heading", label: "List heading", max: 200 },
      {
        kind: "text",
        key: "empty_title",
        label: "Message when there is nothing to show (title)",
        max: 160,
      },
      {
        kind: "textarea",
        key: "empty_description",
        label: "Message when there is nothing to show (text)",
        max: 400,
      },
    ],
  },
  {
    key: "projects_index",
    label: "Projects index",
    description:
      "The projects index with automatic placement and filters derived from project types.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "published_kicker", label: "Published eyebrow", max: 60 },
      { kind: "text", key: "published_heading", label: "Published heading", max: 200 },
      { kind: "text", key: "studies_kicker", label: "Studies eyebrow", max: 60 },
      {
        kind: "text",
        key: "studies_heading",
        label: "Studies heading",
        help: "{{projects.concept_count_words}} becomes the live count.",
        max: 200,
      },
      { kind: "textarea", key: "studies_intro", label: "Studies intro", max: 600 },
      { kind: "text", key: "filters_label", label: "Filters label", max: 60 },
      {
        kind: "text",
        key: "empty_title",
        label: "Message when there is nothing to show (title)",
        max: 160,
      },
      {
        kind: "textarea",
        key: "empty_description",
        label: "Message when there is nothing to show (text)",
        max: 400,
      },
    ],
  },
  {
    key: "insights_index",
    label: "Insights index",
    description: "Featured and supporting articles, placed automatically.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "featured_label", label: "Featured label", max: 40 },
      { kind: "text", key: "read_label", label: "Read button label", max: 60 },
      { kind: "text", key: "figure_caption", label: "Figure caption", max: 120 },
      { kind: "text", key: "all_kicker", label: "List eyebrow", max: 60 },
      { kind: "text", key: "all_heading", label: "List heading", max: 200 },
      { kind: "textarea", key: "all_note", label: "List note", max: 400 },
      {
        kind: "text",
        key: "empty_title",
        label: "Message when there is nothing to show (title)",
        max: 160,
      },
      {
        kind: "textarea",
        key: "empty_description",
        label: "Message when there is nothing to show (text)",
        max: 400,
      },
    ],
  },
  {
    key: "contact_channels",
    label: "Contact channels",
    description: "WhatsApp, email and Start-a-Project cards. Values come from Business settings.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "whatsapp_title", label: "WhatsApp card title", max: 120 },
      { kind: "textarea", key: "whatsapp_body", label: "WhatsApp card copy", max: 300 },
      { kind: "textarea", key: "email_body", label: "Email card copy", max: 300 },
      { kind: "text", key: "start_label", label: "Start card label", max: 60 },
      { kind: "text", key: "start_title", label: "Start card title", max: 120 },
      { kind: "textarea", key: "start_body", label: "Start card copy", max: 300 },
      {
        kind: "text",
        key: "phone_title",
        label: "Phone card title (only when calling is enabled)",
        max: 120,
      },
    ],
  },
  {
    key: "contact_form",
    label: "Contact form",
    description:
      "The real contact form with its surrounding copy. Fields, validation and anti-abuse are system-controlled.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      kicker,
      heading(),
      { kind: "textarea", key: "intro", label: "Short introduction", max: 600 },
      { kind: "text", key: "reply_label", label: "Reply steps label", max: 60 },
      { kind: "lines", key: "reply_steps", label: "How RENZ replies", max: 5, itemMax: 300 },
      { kind: "text", key: "channels_label", label: "Channels label", max: 60 },
      { kind: "text", key: "whatsapp_note", label: "WhatsApp note", max: 120 },
      { kind: "text", key: "email_note", label: "Email note", max: 120 },
      { kind: "text", key: "hours_label", label: "Hours label", max: 60 },
      { kind: "text", key: "area_label", label: "Service area label", max: 60 },
      { kind: "text", key: "follow_label", label: "Social label", max: 60 },
      { kind: "textarea", key: "paused_text", label: "Intake paused text", max: 300 },
      { kind: "text", key: "aside_prefix", label: "Aside: before service link", max: 120 },
      { kind: "text", key: "aside_service_label", label: "Aside: service link label", max: 80 },
      { kind: "text", key: "aside_middle", label: "Aside: before material link", max: 120 },
      { kind: "text", key: "aside_material_label", label: "Aside: material link label", max: 80 },
    ],
  },
  {
    key: "start_project_wizard",
    label: "Start a Project wizard",
    description:
      "The seven-step intake. Steps, required inputs, tokens, uploads and lead mapping are system-controlled.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      nextSteps,
      { kind: "textarea", key: "paused_text", label: "Intake paused text", max: 300 },
    ],
  },
  {
    key: "intake_success",
    label: "Intake confirmation",
    description: "The confirmation after a brief is sent.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "heading", label: "Heading", max: 200, required: true },
      { kind: "textarea", key: "next_steps", label: "Next steps", max: 600 },
      { kind: "text", key: "invalid_text", label: "Invalid reference text", max: 200 },
      { kind: "text", key: "restart_label", label: "Restart link label", max: 60 },
    ],
  },
  {
    key: "service_enquiry_form",
    label: "Service enquiry form",
    description: "The service enquiry form with its surrounding copy.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "text",
        key: "preselected_summary",
        label: "Summary when a service is preselected",
        help: "{{service.name}} becomes the service name.",
        max: 300,
      },
      nextSteps,
    ],
  },
  {
    key: "material_enquiry_form",
    label: "Material enquiry form",
    description: "The material enquiry form with its surrounding copy.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [nextSteps],
  },
  {
    key: "team_credentials",
    label: "Team and credentials",
    description:
      "Published team members and verified credentials; hidden while none are published.",
    scope: "system",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "team_kicker", label: "Team eyebrow", max: 60 },
      { kind: "text", key: "team_heading", label: "Team heading", max: 120 },
      { kind: "text", key: "credentials_kicker", label: "Credentials eyebrow", max: 60 },
      { kind: "text", key: "credentials_heading", label: "Credentials heading", max: 120 },
    ],
  },
  // Global pages
  {
    key: "global_copy",
    label: "Global copy",
    description: "Wording reused across the site.",
    scope: "global",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "text",
        key: "whatsapp_cta_label",
        label: "WhatsApp button label",
        max: 60,
        required: true,
      },
      {
        kind: "text",
        key: "whatsapp_continue_label",
        label: "WhatsApp continue label (after a brief)",
        max: 60,
        required: true,
      },
      {
        kind: "text",
        key: "whatsapp_message",
        label: "WhatsApp prefilled message",
        max: 300,
        required: true,
      },
      { kind: "text", key: "whatsapp_note", label: "WhatsApp note", max: 160 },
      {
        kind: "text",
        key: "floating_whatsapp_label",
        label: "Floating WhatsApp label",
        max: 60,
        required: true,
      },
      { kind: "textarea", key: "insight_note", label: "Insight article note", max: 600 },
      {
        kind: "text",
        key: "staff_signin_label",
        label: "Staff sign-in label",
        max: 40,
        required: true,
      },
      {
        kind: "text",
        key: "back_to_top_label",
        label: "Back to top label",
        max: 40,
        required: true,
      },
      { kind: "text", key: "menu_tagline", label: "Menu tagline", max: 80 },
      { kind: "text", key: "all_services_label", label: "“See all services” link label", max: 60 },
      { kind: "text", key: "prefer_to_talk_label", label: "“Prefer to talk” label", max: 60 },
      { kind: "text", key: "what_happens_next_label", label: "“What happens next” label", max: 60 },
    ],
  },
  {
    key: "process_steps",
    label: "Process steps",
    description:
      "The RENZ engagement sequence. Add, remove and reorder steps; every process section adapts.",
    scope: "global",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "items",
        key: "steps",
        label: "Steps",
        max: 12,
        itemLabel: "Step",
        fields: [
          {
            kind: "text",
            key: "key",
            label: "Key",
            help: "Lowercase identifier, unique per step (for example survey).",
            max: 40,
            required: true,
          },
          { kind: "text", key: "title", label: "Title", max: 80, required: true },
          { kind: "text", key: "verb", label: "Verb", max: 40, required: true },
          { kind: "textarea", key: "summary", label: "What happens", max: 600, required: true },
          {
            kind: "textarea",
            key: "receives",
            label: "What you receive",
            max: 300,
            required: true,
          },
          { kind: "textarea", key: "decision", label: "Decision", max: 300, required: true },
          {
            kind: "select",
            key: "field",
            label: "Background drawing",
            options: [
              { value: "quiet", label: "Quiet" },
              { value: "survey", label: "Survey" },
              { value: "plan", label: "Plan" },
              { value: "datum", label: "Datum" },
              { value: "structure", label: "Structure" },
              { value: "material", label: "Material" },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "footer_options",
    label: "Footer options",
    description: "The footer statement, column labels and what the footer shows.",
    scope: "global",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      { kind: "text", key: "kicker", label: "Small label above the title", max: 80 },
      {
        kind: "text",
        key: "headline",
        label: "Headline (one line per row)",
        max: 200,
        required: true,
      },
      {
        kind: "textarea",
        key: "statement",
        label: "Statement",
        help: "Shown under the footer headline. Leave empty to fall back to Settings → Website → Footer statement.",
        max: 400,
      },
      { kind: "text", key: "services_label", label: "Services column label", max: 40 },
      { kind: "text", key: "company_label", label: "Company column label", max: 40 },
      { kind: "text", key: "contact_label", label: "Contact column label", max: 40 },
      { kind: "boolean", key: "show_services", label: "Show services column" },
      { kind: "boolean", key: "show_company", label: "Show company column" },
      { kind: "boolean", key: "show_contact", label: "Show contact column" },
      { kind: "boolean", key: "show_location", label: "Show location" },
      { kind: "boolean", key: "show_hours", label: "Show hours" },
      { kind: "boolean", key: "show_social", label: "Show social links" },
      { kind: "boolean", key: "show_legal", label: "Show legal links" },
      { kind: "boolean", key: "show_staff_signin", label: "Show staff sign-in" },
      { kind: "boolean", key: "show_back_to_top", label: "Show back to top" },
      {
        kind: "cta",
        key: "cta",
        label: "Footer button",
        help: "Leave empty to use the site-wide primary call to action.",
        optional: true,
      },
    ],
  },
  {
    key: "footer_groups",
    label: "Footer link groups",
    description: "Extra footer columns, for example custom pages.",
    scope: "global",
    systemModule: true,
    variants: [{ value: "default", label: "Standard" }],
    fields: [
      {
        kind: "items",
        key: "groups",
        label: "Groups",
        max: 3,
        itemLabel: "Group",
        fields: [
          { kind: "text", key: "title", label: "Column label", max: 40, required: true },
          {
            kind: "items",
            key: "links",
            label: "Links",
            max: 8,
            itemLabel: "Link",
            fields: [
              { kind: "text", key: "label", label: "Label", max: 60, required: true },
              {
                kind: "text",
                key: "href",
                label: "Address",
                help: "A page on this site (/careers) or https://…",
                max: 2000,
                required: true,
              },
            ],
          },
        ],
      },
    ],
  },
];

const byKey = new Map(sectionTypes.map((definition) => [definition.key, definition]));
const schemaCache = new Map<string, z.ZodTypeAny>();

export function getSectionType(key: string): SectionTypeDefinition | null {
  return byKey.get(key) ?? null;
}

export function sectionSchema(key: string): z.ZodTypeAny | null {
  const definition = byKey.get(key);
  if (!definition) return null;
  let schema = schemaCache.get(key);
  if (!schema) {
    schema = schemaFromFields(definition.fields);
    schemaCache.set(key, schema);
  }
  return schema;
}

export function defaultSectionConfig(key: string): Record<string, unknown> {
  const definition = byKey.get(key);
  return definition ? defaultsFromFields(definition.fields) : {};
}

/** Section types the owner may add to a page (never system modules). */
export function addableSectionTypes(
  pageType: "system" | "content" | "custom" | "global",
): readonly SectionTypeDefinition[] {
  if (pageType === "global") return [];
  return sectionTypes.filter(
    (definition) => definition.scope === "any" && !definition.systemModule,
  );
}

export function validateSectionConfig(
  key: string,
  config: unknown,
): Readonly<
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; errors: Readonly<Record<string, string>> }
> {
  const schema = sectionSchema(key);
  if (!schema)
    return { ok: false, errors: { section_type: "This section type is not available." } };
  const parsed = schema.safeParse(config);
  if (parsed.success) return { ok: true, config: parsed.data as Record<string, unknown> };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.map(String).join(".") || "form";
    errors[path] ??= issue.message;
  }
  return { ok: false, errors };
}
