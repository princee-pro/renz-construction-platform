import type { ContentBlock, ContentBlocks } from "@/lib/content/schemas";

/**
 * Owner rich text (CR1 §23–24). The owner writes plain text with a very
 * small, readable vocabulary; storage stays the structured block model the
 * S4 kernel validates (never HTML). Round-trips block ↔ text so the editor
 * can show what is stored.
 *
 *   ## Heading            → heading level 2
 *   ### Heading           → heading level 3
 *   - item / * item       → list (consecutive lines)
 *   > quote               → quote (website pages only)
 *   [label](/path)        → link block when alone on a paragraph, otherwise
 *                           an inline link
 *   **bold** and *italic* → inline marks, rendered by <InlineText>
 *
 * Executable protocols and raw markup are rejected by the block schema.
 */

export type RichBlock =
  ContentBlock | Readonly<{ type: "quote"; text: string; attribution?: string | null | undefined }>;
export type RichBlocks = readonly RichBlock[];

const headingPattern = /^(#{2,3})\s+(.+)$/u;
const listPattern = /^[-*]\s+(.+)$/u;
const quotePattern = /^>\s?(.*)$/u;
const soleLinkPattern = /^\[([^\]]{1,200})\]\(([^)\s]{1,2000})\)$/u;

export function parseRichText(
  source: string,
  options: Readonly<{ allowQuote?: boolean }> = {},
): RichBlock[] {
  const blocks: RichBlock[] = [];
  const paragraphs = source.replace(/\r\n?/gu, "\n").split(/\n{2,}/u);
  for (const raw of paragraphs) {
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) continue;
    const first = lines[0] ?? "";
    const heading = headingPattern.exec(first);
    if (heading && lines.length === 1) {
      blocks.push({
        type: "heading",
        level: heading[1]?.length === 2 ? 2 : 3,
        text: (heading[2] ?? "").trim(),
      });
      continue;
    }
    if (lines.every((line) => listPattern.test(line))) {
      blocks.push({
        type: "list",
        items: lines.map((line) => (listPattern.exec(line)?.[1] ?? "").trim()),
      });
      continue;
    }
    if (lines.every((line) => quotePattern.test(line))) {
      const text = lines
        .map((line) => quotePattern.exec(line)?.[1] ?? "")
        .join(" ")
        .trim();
      if (options.allowQuote) {
        blocks.push({ type: "quote", text });
      } else {
        blocks.push({ type: "paragraph", text });
      }
      continue;
    }
    const sole = soleLinkPattern.exec(lines.join(" "));
    if (sole && lines.length === 1) {
      blocks.push({ type: "link", label: sole[1] ?? "", href: sole[2] ?? "" });
      continue;
    }
    blocks.push({ type: "paragraph", text: lines.join(" ") });
  }
  return blocks;
}

export function serializeRichText(blocks: RichBlocks | ContentBlocks): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${block.level === 2 ? "##" : "###"} ${block.text}`;
        case "paragraph":
          return block.text;
        case "list":
          return block.items.map((item) => `- ${item}`).join("\n");
        case "link":
          return `[${block.label}](${block.href})`;
        case "quote":
          return `> ${block.text}`;
      }
    })
    .join("\n\n");
}

export type InlineNode =
  | Readonly<{ kind: "text"; text: string }>
  | Readonly<{ kind: "strong"; text: string }>
  | Readonly<{ kind: "em"; text: string }>
  | Readonly<{ kind: "link"; label: string; href: string }>;

const inlinePattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]{1,200})\]\(([^)\s]{1,2000})\)/gu;
const allowedHrefPattern = /^(?:\/(?!\/)[^\s<>]*|https?:\/\/[^\s<>]+|mailto:[^\s<>]+)$/iu;
const blockedInternalPattern = /^\/(?:admin|api|preview)(?:\/|$|\?|#)/iu;

/** A link the renderer may emit: internal paths (never admin/api), https, http, mailto, wa.me. */
export function isRenderableHref(href: string): boolean {
  if (!allowedHrefPattern.test(href)) return false;
  if (/javascript\s*:|data\s*:|vbscript\s*:/iu.test(href)) return false;
  if (href.startsWith("/") && blockedInternalPattern.test(href)) return false;
  return true;
}

/** Splits a paragraph into inline nodes. Unsafe links degrade to plain text. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ kind: "text", text: text.slice(cursor, index) });
    if (match[1] !== undefined) {
      nodes.push({ kind: "strong", text: match[1] });
    } else if (match[2] !== undefined) {
      nodes.push({ kind: "em", text: match[2] });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      if (isRenderableHref(match[4])) {
        nodes.push({ kind: "link", label: match[3], href: match[4] });
      } else {
        nodes.push({ kind: "text", text: match[3] });
      }
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push({ kind: "text", text: text.slice(cursor) });
  return nodes;
}

/** Plain text without inline marks (for metadata, reading time, previews). */
export function stripInline(text: string): string {
  return parseInline(text)
    .map((node) => (node.kind === "link" ? node.label : node.text))
    .join("");
}
