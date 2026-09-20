import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ArrowMark } from "@/components/site/arrow-mark";
import { Field, type FieldVariant } from "@/components/site/fields";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import type { SectionTone } from "@/features/website/section-registry";
import type { Cta } from "@/features/website/section-registry";
import type { PublicPageContext } from "@/features/website/public-context";
import type { WebsiteMediaMeta } from "@/features/website/data";
import { interpolate } from "@/features/website/tokens";
import { isRenderableHref, parseInline, type RichBlocks } from "@/lib/content/rich-text";
import { mailtoHref } from "@/lib/site/contact-details";
import { whatsappLink } from "@/lib/site/whatsapp";

// ---------------------------------------------------------------------
// Inline text (bold / italic / safe links) and rich blocks
// ---------------------------------------------------------------------

export function InlineText({ text }: Readonly<{ text: string }>) {
  const nodes = parseInline(text);
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case "strong":
            return <strong key={index}>{node.text}</strong>;
          case "em":
            return <em key={index}>{node.text}</em>;
          case "link":
            return node.href.startsWith("/") ? (
              <Link href={node.href} key={index}>
                {node.label}
              </Link>
            ) : (
              <a href={node.href} key={index} rel="noreferrer" target="_blank">
                {node.label}
              </a>
            );
          default:
            return <span key={index}>{node.text}</span>;
        }
      })}
    </>
  );
}

export function RichBlocksView({
  blocks,
  className = "structured-content",
}: Readonly<{ blocks: RichBlocks; className?: string }>) {
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={key}>
                <InlineText text={block.text} />
              </h2>
            ) : (
              <h3 key={key}>
                <InlineText text={block.text} />
              </h3>
            );
          case "paragraph":
            return (
              <p key={key}>
                <InlineText text={block.text} />
              </p>
            );
          case "list":
            return (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={key}>
                <p>
                  <InlineText text={block.text} />
                </p>
                {block.attribution ? <cite>{block.attribution}</cite> : null}
              </blockquote>
            );
          case "link":
            if (!isRenderableHref(block.href)) return null;
            return block.href.startsWith("/") ? (
              <p key={key}>
                <Link href={block.href}>{block.label}</Link>
              </p>
            ) : (
              <p key={key}>
                <a href={block.href} rel="noreferrer">
                  {block.label}
                </a>
              </p>
            );
        }
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// Website media (owner-uploaded, rights-cleared)
// ---------------------------------------------------------------------

export function websiteMediaSrc(mediaId: string): string {
  return `/api/media/website/${mediaId}`;
}

export function provenanceLabel(provenanceClass: string | null | undefined): string | null {
  return provenanceClass === "concept_demo" || provenanceClass === "generated_reference"
    ? "Concept visual / not project evidence"
    : null;
}

export function focalStyle(focalX: number, focalY: number): CSSProperties {
  return { objectPosition: `${Math.round(focalX * 100)}% ${Math.round(focalY * 100)}%` };
}

/**
 * A responsive website image inside an aspect-ratio container (the CSS
 * owns the ratio; the focal point drives the crop). Renders nothing when the
 * asset is not public-eligible, so a page never shows a broken image.
 */
export function WebsiteImage({
  media,
  sizes = "100vw",
  priority = false,
  quality = 86,
  className,
}: Readonly<{
  media: WebsiteMediaMeta | null;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  className?: string;
}>) {
  if (!media) return null;
  return (
    <Image
      alt={media.altText ?? ""}
      className={className}
      fill
      loading={priority ? "eager" : "lazy"}
      quality={quality}
      sizes={sizes}
      src={websiteMediaSrc(media.id)}
      style={focalStyle(media.focalX, media.focalY)}
      unoptimized
    />
  );
}

// ---------------------------------------------------------------------
// Calls to action
// ---------------------------------------------------------------------

export type ResolvedCta = Readonly<{
  label: string;
  href: string;
  external: boolean;
  whatsapp: boolean;
  analytics: string | null;
}>;

export function resolveCta(
  cta: Cta | null | undefined,
  context: PublicPageContext,
): ResolvedCta | null {
  if (!cta) return null;
  const label = interpolate(cta.label, context.tokens);
  switch (cta.destination_type) {
    case "internal":
      return cta.destination && isRenderableHref(cta.destination)
        ? { label, href: cta.destination, external: false, whatsapp: false, analytics: null }
        : null;
    case "start_project":
      return {
        label,
        href: "/start-a-project",
        external: false,
        whatsapp: false,
        analytics: "start_project",
      };
    case "service_enquiry":
      return {
        label,
        href: "/enquire/service",
        external: false,
        whatsapp: false,
        analytics: "service_enquiry",
      };
    case "material_enquiry":
      return {
        label,
        href: "/enquire/materials",
        external: false,
        whatsapp: false,
        analytics: "material_enquiry",
      };
    case "contact":
      return { label, href: "/contact", external: false, whatsapp: false, analytics: "contact" };
    case "whatsapp":
      return {
        label,
        href: whatsappLink(
          context.identity.whatsappDigits,
          interpolate(cta.destination ?? context.globals.copy.whatsapp_message, context.tokens),
        ),
        external: true,
        whatsapp: true,
        analytics: "whatsapp",
      };
    case "email":
      return {
        label,
        href: mailtoHref(context.identity.email),
        external: false,
        whatsapp: false,
        analytics: "email",
      };
    case "external":
      return cta.destination && isRenderableHref(cta.destination)
        ? { label, href: cta.destination, external: true, whatsapp: false, analytics: null }
        : null;
  }
}

/** The site-wide primary call to action (Settings → Website). */
export function siteCta(context: PublicPageContext): ResolvedCta {
  return {
    label: context.identity.cta.label,
    href: context.identity.cta.href,
    external: false,
    whatsapp: false,
    analytics: "start_project",
  };
}

export function CtaButton({
  cta,
  tone = "primary",
  dark = false,
}: Readonly<{ cta: ResolvedCta | null; tone?: "primary" | "secondary"; dark?: boolean }>) {
  if (!cta) return null;
  const className = cta.whatsapp
    ? "btn btn-whatsapp"
    : `btn btn-${tone}${tone === "secondary" && dark ? " on-dark" : ""}`;
  if (cta.external) {
    return (
      <a
        className={className}
        data-analytics-cta={cta.analytics ?? undefined}
        href={cta.href}
        rel="noreferrer"
        target="_blank"
      >
        {cta.whatsapp ? <WhatsAppGlyph /> : null}
        <span>{cta.label}</span>
        {cta.whatsapp ? null : <ArrowMark />}
      </a>
    );
  }
  return (
    <Link className={className} data-analytics-cta={cta.analytics ?? undefined} href={cta.href}>
      <span>{cta.label}</span>
      {tone === "primary" ? <ArrowMark /> : null}
    </Link>
  );
}

export function DatumLink({
  cta,
  dark = false,
}: Readonly<{ cta: ResolvedCta | null; dark?: boolean }>) {
  if (!cta) return null;
  const className = `datum-link${dark ? " on-dark" : ""}`;
  return cta.external ? (
    <a className={className} href={cta.href} rel="noreferrer" target="_blank">
      {cta.label}
      <ArrowMark />
    </a>
  ) : (
    <Link className={className} href={cta.href}>
      {cta.label}
      <ArrowMark />
    </Link>
  );
}

// ---------------------------------------------------------------------
// Section shell: tone, spacing and motion presets → design-system classes
// ---------------------------------------------------------------------

type ToneSpec = Readonly<{ className: string; dark: boolean; field: FieldVariant | null }>;

const toneSpecs: Readonly<Record<SectionTone, ToneSpec>> = {
  paper: { className: "tone-paper", dark: false, field: null },
  limestone: { className: "tone-limestone", dark: false, field: null },
  ink: { className: "tone-ink", dark: true, field: null },
  concrete: { className: "tone-concrete", dark: false, field: null },
  charcoal: { className: "tone-charcoal", dark: true, field: null },
  material: { className: "tone-charcoal", dark: true, field: "material" },
  survey_field: { className: "tone-ink", dark: true, field: "survey" },
  plan_field: { className: "tone-paper", dark: false, field: "plan" },
  structure_field: { className: "tone-ink", dark: true, field: "structure" },
  datum_field: { className: "tone-ink", dark: true, field: "datum" },
  quiet_field: { className: "tone-limestone", dark: false, field: "quiet" },
};

export function toneSpec(tone: SectionTone): ToneSpec {
  return toneSpecs[tone] ?? toneSpecs.paper;
}

export function SectionShell({
  tone,
  spacing,
  motion,
  type,
  labelledBy,
  className,
  children,
  flushTop = false,
}: Readonly<{
  tone: SectionTone;
  spacing: "compact" | "standard" | "generous";
  motion: "standard" | "quiet" | "none";
  type: string;
  labelledBy?: string | undefined;
  className?: string | undefined;
  flushTop?: boolean | undefined;
  children: ReactNode;
}>) {
  const spec = toneSpec(tone);
  const classes = [
    "sec",
    spec.className,
    spacing === "compact" ? "sec-tight" : spacing === "generous" ? "sec-generous" : "",
    flushTop ? "sec-flush-top" : "",
    `section-${type.replace(/_/gu, "-")}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section
      aria-labelledby={labelledBy}
      className={classes}
      data-motion={motion === "standard" ? undefined : motion}
      data-section={type}
    >
      {spec.field ? (
        <Field className="section-field" tone={spec.dark ? "dark" : "light"} variant={spec.field} />
      ) : null}
      {children}
    </section>
  );
}

export function SectionHead({
  id,
  kicker,
  heading,
  intro,
  aside,
  dark = false,
}: Readonly<{
  id: string;
  kicker: string | null;
  heading: string | null;
  intro?: string | null;
  aside?: ReactNode;
  dark?: boolean;
}>) {
  return (
    <div className="container section-head">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        {heading ? (
          <h2 id={id}>
            <InlineText text={heading} />
          </h2>
        ) : null}
      </div>
      {intro || aside ? (
        <div className={`section-head-aside${dark ? " on-dark" : ""}`}>
          {intro ? (
            <p>
              <InlineText text={intro} />
            </p>
          ) : null}
          {aside}
        </div>
      ) : null}
    </div>
  );
}

export function text(config: Record<string, unknown>, key: string): string | null {
  const value = config[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function bool(config: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = config[key];
  return typeof value === "boolean" ? value : fallback;
}

export function num(config: Record<string, unknown>, key: string, fallback: number): number {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function list<T = unknown>(config: Record<string, unknown>, key: string): readonly T[] {
  const value = config[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function cta(config: Record<string, unknown>, key: string): Cta | null {
  const value = config[key];
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as { label?: unknown; destination_type?: unknown; destination?: unknown };
  if (typeof candidate.label !== "string" || typeof candidate.destination_type !== "string")
    return null;
  return {
    label: candidate.label,
    destination_type: candidate.destination_type as Cta["destination_type"],
    destination: typeof candidate.destination === "string" ? candidate.destination : null,
  };
}

export function indexMark(index: number): string {
  return String(index + 1).padStart(2, "0");
}
