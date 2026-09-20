import { z } from "zod";

const unsafeKeyPattern =
  /^(?:on[a-z]+|html|raw_html|script|javascript|css|style|srcdoc|innerhtml)$/iu;
const unsafeProtocolPattern =
  /(?:javascript\s*:|data\s*:\s*(?:text\/html|application\/javascript)|vbscript\s*:)/iu;
const unsafeAttributePattern = /on[a-z]+\s*=/iu;
const rawMarkupDelimiterPattern = /[<>]/u;
const privateInternalPathPattern = /^\/(?:admin|preview)(?:\/|$|\?|#)/iu;
const internalUrlBase = "https://public-route.invalid";

function hasUnsafeUrlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (character === "\\" || codePoint === undefined || codePoint <= 0x20 || codePoint === 0x7f) {
      return true;
    }
  }
  return false;
}

function safePublicText(value: string): boolean {
  return (
    !rawMarkupDelimiterPattern.test(value) &&
    !unsafeProtocolPattern.test(value) &&
    !unsafeAttributePattern.test(value)
  );
}

function safePublicHref(value: string): boolean {
  if (!safePublicText(value) || hasUnsafeUrlCharacter(value)) {
    return false;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    if (value.includes("%")) {
      return false;
    }
    try {
      const url = new URL(value, internalUrlBase);
      const decodedPath = decodeURIComponent(url.pathname);
      return url.origin === internalUrlBase && !privateInternalPathPattern.test(decodedPath);
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

/**
 * Recursively validates the deliberately small JSON vocabulary used by
 * editorial blocks and section configuration. HTML/CSS/JS are not a content
 * primitive in S4; a future renderer must interpret these values as data.
 */
export function isSafeStructuredValue(value: unknown): boolean {
  if (typeof value === "string") {
    return safePublicText(value);
  }

  if (Array.isArray(value)) {
    return value.every(isSafeStructuredValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).every(
      ([key, nestedValue]) => !unsafeKeyPattern.test(key) && isSafeStructuredValue(nestedValue),
    );
  }

  return value === null || typeof value === "number" || typeof value === "boolean";
}

const safeText = z
  .string()
  .trim()
  .min(1)
  .max(4_000)
  .refine(safePublicText, "Text contains markup or an executable protocol.");

const safeHref = z
  .string()
  .trim()
  .max(2_000)
  .refine(safePublicHref, "Links must be public internal paths or HTTPS URLs without user info.");

export const contentBlockSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("heading"),
      level: z.union([z.literal(2), z.literal(3)]),
      text: safeText,
    })
    .strict(),
  z.object({ type: z.literal("paragraph"), text: safeText }).strict(),
  z.object({ type: z.literal("list"), items: z.array(safeText).min(1).max(32) }).strict(),
  z.object({ type: z.literal("link"), label: safeText, href: safeHref }).strict(),
]);

export const contentBlocksSchema = z
  .array(contentBlockSchema)
  .max(128)
  .superRefine((blocks, context) => {
    if (!isSafeStructuredValue(blocks)) {
      context.addIssue({ code: "custom", message: "Structured content contains unsafe data." });
    }
  });

export const publicationContentTypeSchema = z.enum([
  "service",
  "project",
  "post",
  "page",
  "team_member",
  "testimonial",
  "credential",
]);

export const publicationCommandSchema = z
  .object({
    contentType: publicationContentTypeSchema,
    targetId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const mediaMetadataSchema = z
  .object({
    width: z.number().int().positive().max(100_000).optional(),
    height: z.number().int().positive().max(100_000).optional(),
    durationMs: z.number().int().positive().max(86_400_000).optional(),
    frameRate: z.number().positive().max(240).optional(),
  })
  .strict();

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ContentBlocks = z.infer<typeof contentBlocksSchema>;
export type PublicationCommand = z.infer<typeof publicationCommandSchema>;
export type MediaMetadata = z.infer<typeof mediaMetadataSchema>;

export function parsePublicationCommand(value: unknown): PublicationCommand {
  return publicationCommandSchema.parse(value);
}
