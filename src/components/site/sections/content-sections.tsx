import { LineDraw, Parallax, Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import type { FieldVariant } from "@/components/site/fields";
import type { FilmFrame } from "@/components/site/landing/film-strip";
import { Landing } from "@/components/site/landing/landing";
import {
  isLandingConcept,
  isLandingHeight,
  type LandingConcept,
} from "@/components/site/landing/landing-concepts";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import {
  CtaButton,
  DatumLink,
  InlineText,
  RichBlocksView,
  SectionHead,
  SectionShell,
  WebsiteImage,
  bool,
  cta,
  indexMark,
  list,
  provenanceLabel,
  resolveCta,
  siteCta,
  text,
  toneSpec,
  websiteMediaSrc,
} from "@/components/site/sections/shared";
import type { RenderContext, SectionRenderProps } from "@/components/site/sections/types";
import { richBlocksSchema } from "@/features/website/section-registry";
import { compactFacts } from "@/features/website/tokens";
import { mailtoHref } from "@/lib/site/contact-details";
import { whatsappLink } from "@/lib/site/whatsapp";
import { interpolate } from "@/features/website/tokens";

const fieldVariants = new Set<FieldVariant>([
  "survey",
  "plan",
  "structure",
  "datum",
  "material",
  "quiet",
]);

/** Legacy masthead field names map onto the D1 field family. */
function mastheadField(value: string | null): FieldVariant {
  if (value === "drawing") return "plan";
  if (value === "mass") return "material";
  if (value === "structural") return "structure";
  if (value === "detail") return "quiet";
  if (value === "hero") return "datum";
  return value && fieldVariants.has(value as FieldVariant) ? (value as FieldVariant) : "structure";
}

/** The automatic landing concept for a system page (brief §55–68). */
const pageConcepts: Readonly<Record<string, LandingConcept>> = {
  home: "land",
  services: "stages",
  projects: "film-archive",
  about: "how-we-work",
  insights: "drawing-board",
  contact: "direct-line",
  "start-a-project": "first-brief",
  "start-a-project-success": "calm",
  "enquire-service": "service-cue",
  "enquire-materials": "material-register",
};

function blocksOf(config: Record<string, unknown>, key: string) {
  const parsed = richBlocksSchema.safeParse(config[key] ?? []);
  return parsed.success ? parsed.data : [];
}

/**
 * Keep the client-preview shell visually complete before the owner assigns
 * page-specific website media. The fallback can only use already-published,
 * rights-cleared project media and retains its evidence label; live mode still
 * requires the explicit CMS media choice.
 */
function previewProjectMedia(context: RenderContext, offset = 0) {
  if (!context.previewEnabled) return null;
  const candidates = context.projects.filter((project) => project.media !== null);
  if (candidates.length === 0) return null;
  const project = candidates[offset % candidates.length];
  const media = project?.media;
  if (!project || !media) return null;
  return {
    src: `/api/media/project/${media.projectMediaId}`,
    alt: media.alt,
    focalX: media.focalX,
    focalY: media.focalY,
    provenance:
      provenanceLabel(media.provenanceClass) ??
      (project.evidenceClass === "real_project" ? null : "Concept visual / not project evidence"),
  };
}

/** CMS poster (website media) or, in client preview, a labelled study image. */
function landingPoster(config: Record<string, unknown>, context: RenderContext, offset = 0) {
  const mediaId = text(config, "media_id");
  const media = mediaId ? (context.media.get(mediaId) ?? null) : null;
  if (media && !(media.mimeType ?? "").startsWith("video/")) {
    return {
      poster: {
        src: websiteMediaSrc(media.id),
        alt: media.altText ?? "",
        focalX: media.focalX,
        focalY: media.focalY,
        width: media.width,
        height: media.height,
      },
      provenance: provenanceLabel(media.provenanceClass),
    };
  }
  const preview = previewProjectMedia(context, offset);
  if (!preview) return { poster: null, provenance: null };
  return {
    poster: { src: preview.src, alt: preview.alt, focalX: preview.focalX, focalY: preview.focalY },
    provenance: preview.provenance,
  };
}

/** CMS hero video: a website media asset with a video MIME type. */
function landingVideo(config: Record<string, unknown>, context: RenderContext) {
  const id = text(config, "video_media_id");
  const media = id ? (context.media.get(id) ?? null) : null;
  const mime = media?.mimeType;
  if (!media || (mime !== "video/webm" && mime !== "video/mp4")) return null;
  return { sources: [{ src: websiteMediaSrc(media.id), type: mime }] } as const;
}

function landingFrames(context: RenderContext): readonly FilmFrame[] {
  return context.projects
    .filter((project) => project.media !== null)
    .map((project) => {
      const media = project.media;
      if (!media) return null;
      return {
        id: project.id,
        href: `/projects/${project.slug}`,
        title: project.title,
        category: project.projectType,
        src: `/api/media/project/${media.projectMediaId}`,
        alt: media.alt,
        focalX: media.focalX,
        focalY: media.focalY,
        provenance:
          project.evidenceClass === "real_project"
            ? null
            : (provenanceLabel(media.provenanceClass) ?? "Concept study"),
      };
    })
    .filter((frame): frame is FilmFrame => frame !== null);
}

export function HeroSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const lines = list<string>(config, "headline_lines").filter(
    (line) => typeof line === "string" && line.trim(),
  );
  const headline =
    lines.length > 0 ? lines : [context.identity.tagline ?? "From land", "to landmark"];
  const primary = resolveCta(cta(config, "primary_cta"), context) ?? siteCta(context);
  const secondary = resolveCta(cta(config, "secondary_cta"), context) ?? {
    label: "See our services",
    href: "/services",
    external: false,
    whatsapp: false,
    analytics: null,
  };
  const { poster, provenance } = landingPoster(config, context);
  const register = compactFacts(
    list<{ label: string; value: string }>(config, "register").map((fact) => ({
      label: interpolate(String(fact.label ?? ""), context.tokens),
      value: interpolate(String(fact.value ?? ""), context.tokens),
    })),
  );
  return (
    <Landing
      concept="land"
      eyebrow={text(config, "kicker") ?? undefined}
      facts={register}
      headingId="home-heading"
      poster={poster}
      primary={{ href: primary.href, label: primary.label, analytics: primary.analytics }}
      provenance={provenance}
      secondary={{ href: secondary.href, label: secondary.label }}
      summary={text(config, "summary") ?? context.identity.description ?? ""}
      title={headline.join(" ")}
      titleLines={headline}
      video={landingVideo(config, context)}
    />
  );
}

export function MastheadSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const datumIndex = text(config, "datum_index") ?? "";
  const previewOffset = Math.max(0, (Number.parseInt(datumIndex, 10) || 1) - 1);
  const pageKey = context.pageKey ?? "";
  const chosen = text(config, "landing");
  const concept: LandingConcept = isLandingConcept(chosen)
    ? chosen
    : (pageConcepts[pageKey] ?? "calm");
  const chosenHeight = text(config, "height");
  const height = isLandingHeight(chosenHeight)
    ? chosenHeight
    : bool(config, "compact")
      ? "compact"
      : undefined;
  const facts = compactFacts(
    list<{ label: string; value: string }>(config, "facts").map((fact) => ({
      label: String(fact.label ?? ""),
      value: String(fact.value ?? ""),
    })),
  );
  const summary =
    context.service && text(config, "preselected_summary")
      ? text(config, "preselected_summary")
      : text(config, "summary");
  const { poster, provenance } = landingPoster(config, context, previewOffset);
  const primary = resolveCta(cta(config, "primary_cta"), context);
  const secondary = resolveCta(cta(config, "secondary_cta"), context);
  return (
    <Landing
      concept={concept}
      eyebrow={text(config, "eyebrow") ?? section.label ?? undefined}
      facts={facts.length > 0 ? facts : undefined}
      field={mastheadField(text(config, "field_variant"))}
      frames={concept === "film-archive" ? landingFrames(context) : undefined}
      height={height}
      poster={poster}
      primary={
        primary
          ? {
              href: primary.href,
              label: primary.label,
              analytics: primary.analytics,
              whatsapp: primary.whatsapp,
            }
          : null
      }
      provenance={provenance}
      secondary={secondary ? { href: secondary.href, label: secondary.label } : null}
      summary={summary ?? ""}
      title={text(config, "title") ?? ""}
      video={landingVideo(config, context)}
    />
  );
}

export function EditorialIntroSection({ section }: SectionRenderProps) {
  const config = section.config;
  const items = list<{ title: string; body: string }>(config, "items");
  const id = `section-${section.id}-title`;
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="about-story"
    >
      <div className="container grid-12">
        <Reveal as="div" className="about-story-copy" variant="rise">
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "lede") ? (
            <p className="lede">
              <InlineText text={text(config, "lede") ?? ""} />
            </p>
          ) : null}
          {text(config, "body") ? (
            <p>
              <InlineText text={text(config, "body") ?? ""} />
            </p>
          ) : null}
        </Reveal>
        {items.length > 0 && section.variant !== "quiet" ? (
          <Stagger as="ol" className="about-principles" gap={0.1}>
            {items.map((item, index) => (
              <StaggerItem as="li" key={`${item.title}-${index}`}>
                <span className="index-mark">{indexMark(index)}</span>
                <LineDraw delay={index * 0.08} />
                <h3>{item.title}</h3>
                <p>
                  <InlineText text={String(item.body ?? "")} />
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        ) : null}
      </div>
    </SectionShell>
  );
}

export function RichTextSection({ section }: SectionRenderProps) {
  const config = section.config;
  const id = `section-${section.id}-title`;
  const blocks = blocksOf(config, "blocks");
  return (
    <SectionShell
      labelledBy={text(config, "heading") ? id : undefined}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
    >
      <div
        className={`container ${section.variant === "wide" ? "rich-text-wide" : "rich-text-measure"}`}
      >
        <Reveal variant="rise">
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          {text(config, "heading") ? (
            <h2 id={id}>
              <InlineText text={text(config, "heading") ?? ""} />
            </h2>
          ) : null}
          <RichBlocksView blocks={blocks} />
        </Reveal>
      </div>
    </SectionShell>
  );
}

export function TextMediaSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const id = `section-${section.id}-title`;
  const mediaId = text(config, "media_id");
  const media = mediaId ? (context.media.get(mediaId) ?? null) : null;
  const link = resolveCta(cta(config, "link"), context);
  const dark = toneSpec(section.tone).dark;
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
    >
      <div
        className={`container text-media${section.variant === "media_left" ? " text-media-left" : ""}${media ? "" : " text-media-no-media"}`}
      >
        <Reveal as="div" className="text-media-copy" variant="rise">
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          <RichBlocksView blocks={blocksOf(config, "blocks")} />
          <DatumLink cta={link} dark={dark} />
        </Reveal>
        {media ? (
          <Reveal as="figure" className="text-media-figure" variant="resolve">
            <div className="text-media-media">
              <WebsiteImage media={media} sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
            {media.caption || provenanceLabel(media.provenanceClass) ? (
              <figcaption className="datum-label">
                {media.caption ?? provenanceLabel(media.provenanceClass)}
              </figcaption>
            ) : null}
          </Reveal>
        ) : null}
      </div>
    </SectionShell>
  );
}

export function FullMediaSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const mediaId = text(config, "media_id");
  const media = mediaId ? (context.media.get(mediaId) ?? null) : null;
  // No image → nothing to show (no placeholder), per CR1 §84.
  if (!media) return null;
  const id = `section-${section.id}-title`;
  const badge = text(config, "badge") ?? provenanceLabel(media.provenanceClass);
  return (
    <section
      aria-labelledby={id}
      className="home-material tone-charcoal"
      data-section={section.type}
      data-motion={section.motion === "standard" ? undefined : section.motion}
    >
      <Parallax className="home-material-media" distance={section.motion === "none" ? 0 : 60}>
        <WebsiteImage media={media} quality={88} sizes="100vw" />
      </Parallax>
      <span className="media-wash" />
      <div className="container home-material-copy">
        <Reveal variant="rise">
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "body") ? (
            <p>
              <InlineText text={text(config, "body") ?? ""} />
            </p>
          ) : null}
          {badge ? <span className="concept-badge">{badge}</span> : null}
        </Reveal>
      </div>
    </section>
  );
}

export const MaterialDetailSection = FullMediaSection;

export function FeatureGridSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const id = `section-${section.id}-title`;
  const layout = text(config, "layout") ?? "columns";
  const items = list<{ index_label?: string | null; title: string; body: string; link?: unknown }>(
    config,
    "items",
  );
  const dark = toneSpec(section.tone).dark;
  const className =
    layout === "principles" ? "home-why" : layout === "numbered" ? "services-fits" : "home-clarity";
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className={className}
    >
      <div className="container grid-12">
        <Reveal
          as="div"
          className={
            layout === "principles"
              ? "home-why-intro"
              : layout === "numbered"
                ? "services-fits-intro"
                : "home-clarity-intro"
          }
          variant="rise"
        >
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "intro") ? (
            <p className="lede">
              <InlineText text={text(config, "intro") ?? ""} />
            </p>
          ) : null}
        </Reveal>
        {layout === "principles" ? (
          <Stagger as="ol" className="home-why-list" gap={0.1}>
            {items.map((item, index) => (
              <StaggerItem as="li" key={`${item.title}-${index}`}>
                <span className="index-mark">{item.index_label || indexMark(index)}</span>
                <LineDraw delay={index * 0.1} />
                <h3>{item.title}</h3>
                <p>
                  <InlineText text={String(item.body ?? "")} />
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        ) : layout === "numbered" ? (
          <Stagger as="ol" className="services-fits-list" gap={0.08}>
            {items.map((item, index) => (
              <StaggerItem as="li" key={`${item.title}-${index}`}>
                <span className="index-mark">{item.index_label || indexMark(index)}</span>
                <strong>{item.title}</strong>
                <span>
                  <InlineText text={String(item.body ?? "")} />
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Stagger as="div" className="home-clarity-columns" gap={0.1}>
            {items.map((item, index) => {
              const link = resolveCta(cta(item, "link"), context);
              return (
                <StaggerItem
                  as="article"
                  className="home-clarity-column"
                  key={`${item.title}-${index}`}
                >
                  <span className="index-mark">
                    {item.index_label || String.fromCharCode(65 + (index % 26))}
                  </span>
                  <h3>{item.title}</h3>
                  <p>
                    <InlineText text={String(item.body ?? "")} />
                  </p>
                  <DatumLink cta={link} dark={dark} />
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </SectionShell>
  );
}

export function MarqueeSection({ section }: SectionRenderProps) {
  const words = list<string>(section.config, "words").filter(
    (word) => typeof word === "string" && word.trim(),
  );
  if (words.length === 0) return null;
  const spec = toneSpec(section.tone);
  return (
    <div
      aria-hidden="true"
      className={`marquee ${spec.className}`}
      data-section={section.type}
      data-motion={section.motion === "standard" ? undefined : section.motion}
    >
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <span key={copy}>
            {words.map((word, index) => (
              <span key={`${copy}-${index}`}>{word}</span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GallerySection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const items = list<{ media_id?: string | null; caption?: string | null }>(config, "items")
    .map((item) => ({
      media: item.media_id ? (context.media.get(item.media_id) ?? null) : null,
      caption: item.caption ?? null,
    }))
    .filter((item) => item.media !== null);
  if (items.length === 0) return null;
  const id = `section-${section.id}-title`;
  return (
    <SectionShell
      labelledBy={text(config, "heading") ? id : undefined}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
    >
      {text(config, "heading") || text(config, "kicker") ? (
        <SectionHead heading={text(config, "heading")} id={id} kicker={text(config, "kicker")} />
      ) : null}
      <Stagger
        as="ol"
        className={`container website-gallery website-gallery-${section.variant} website-gallery-count-${Math.min(items.length, 6)}`}
        gap={0.06}
      >
        {items.map((item, index) => (
          <StaggerItem as="li" className="website-gallery-item" key={`${item.media?.id}-${index}`}>
            <figure>
              <div className="website-gallery-media">
                <WebsiteImage media={item.media} sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              {item.caption ||
              item.media?.caption ||
              provenanceLabel(item.media?.provenanceClass) ? (
                <figcaption className="datum-label">
                  {item.caption ??
                    item.media?.caption ??
                    provenanceLabel(item.media?.provenanceClass)}
                </figcaption>
              ) : null}
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

export function FaqSection({ section }: SectionRenderProps) {
  const config = section.config;
  const items = list<{ question: string; answer: string }>(config, "items").filter(
    (item) => item.question && item.answer,
  );
  if (items.length === 0) return null;
  const id = `section-${section.id}-title`;
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="service-faq"
    >
      <div className="container grid-12">
        <Reveal as="div" className="service-faq-intro" variant="rise">
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "intro") ? (
            <p>
              <InlineText text={text(config, "intro") ?? ""} />
            </p>
          ) : null}
        </Reveal>
        <div className="service-faq-list">
          {items.map((item, index) => (
            <details className="faq" key={`${item.question}-${index}`}>
              <summary>
                <span>{item.question}</span>
                <span aria-hidden="true" className="faq-mark" />
              </summary>
              <p>
                <InlineText text={item.answer} />
              </p>
            </details>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function CtaSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const id = `section-${section.id}-title`;
  const primary = resolveCta(cta(config, "primary_cta"), context) ?? siteCta(context);
  const secondary = resolveCta(cta(config, "secondary_cta"), context);
  const steps = list<{ title: string; body: string }>(config, "steps");
  const dark = toneSpec(section.tone).dark;
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="home-cta"
    >
      <div className="container home-cta-grid">
        <Reveal variant="rise">
          {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "body") ? (
            <p className="lede">
              <InlineText text={text(config, "body") ?? ""} />
            </p>
          ) : null}
          <div className="hero-actions">
            <CtaButton cta={primary} />
            <CtaButton cta={secondary} dark={dark} tone="secondary" />
          </div>
        </Reveal>
        {steps.length > 0 ? (
          <Stagger as="ol" className="home-cta-steps" gap={0.1}>
            {steps.map((step, index) => (
              <StaggerItem as="li" key={`${step.title}-${index}`}>
                <span className="index-mark">{indexMark(index)}</span>
                <strong>{step.title}</strong>
                <span>
                  <InlineText text={String(step.body ?? "")} />
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        ) : null}
      </div>
    </SectionShell>
  );
}

export function ContactStripSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const id = `section-${section.id}-title`;
  const showEmail = bool(config, "show_email", true);
  const showWhatsApp = bool(config, "show_whatsapp", true);
  const dark = toneSpec(section.tone).dark;
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="contact-strip"
    >
      <div className="container contact-strip-inner">
        <Reveal variant="rise">
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "body") ? (
            <p className="lede">
              <InlineText text={text(config, "body") ?? ""} />
            </p>
          ) : null}
        </Reveal>
        <div className="contact-strip-channels">
          {showWhatsApp ? (
            <a
              className="btn btn-whatsapp"
              data-analytics-cta="whatsapp"
              href={whatsappLink(
                context.identity.whatsappDigits,
                interpolate(context.globals.copy.whatsapp_message, context.tokens),
              )}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppGlyph />
              <span>{context.globals.copy.whatsapp_cta_label}</span>
            </a>
          ) : null}
          {showEmail ? (
            <a
              className={`btn btn-secondary${dark ? " on-dark" : ""}`}
              data-analytics-cta="email"
              href={mailtoHref(context.identity.email)}
            >
              <span>{context.identity.email}</span>
            </a>
          ) : null}
        </div>
      </div>
    </SectionShell>
  );
}

export function WhatsAppCtaSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const id = `section-${section.id}-title`;
  const message = interpolate(
    text(config, "message") ?? context.globals.copy.whatsapp_message,
    context.tokens,
  );
  return (
    <SectionShell
      labelledBy={id}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="whatsapp-cta"
    >
      <div className="container whatsapp-cta-inner">
        <Reveal variant="rise">
          <h2 id={id}>
            <InlineText text={text(config, "heading") ?? ""} />
          </h2>
          {text(config, "body") ? (
            <p className="lede">
              <InlineText text={text(config, "body") ?? ""} />
            </p>
          ) : null}
          <a
            className="btn btn-whatsapp"
            data-analytics-cta="whatsapp"
            href={whatsappLink(context.identity.whatsappDigits, message)}
            rel="noreferrer"
            target="_blank"
          >
            <WhatsAppGlyph />
            <span>{text(config, "button_label") ?? context.globals.copy.whatsapp_cta_label}</span>
          </a>
          <p className="whatsapp-note datum-label">{context.globals.copy.whatsapp_note}</p>
        </Reveal>
      </div>
    </SectionShell>
  );
}

export function QuoteSection({ section }: SectionRenderProps) {
  const config = section.config;
  const quote = text(config, "text");
  if (!quote) return null;
  return (
    <SectionShell
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="pull-quote"
    >
      <div className="container rich-text-measure">
        <Reveal as="blockquote" className="pull-quote-body" variant="rise">
          <p>
            <InlineText text={quote} />
          </p>
          {text(config, "attribution") ? <cite>{text(config, "attribution")}</cite> : null}
        </Reveal>
      </div>
    </SectionShell>
  );
}

export function TestimonialSection({ section, context }: SectionRenderProps) {
  // Approved testimonials only (CR1 §17): no published testimonial, no section.
  if (context.testimonials.length === 0) return null;
  const config = section.config;
  const id = `section-${section.id}-title`;
  return (
    <SectionShell
      labelledBy={text(config, "heading") ? id : undefined}
      motion={section.motion}
      spacing={section.spacing}
      tone={section.tone}
      type={section.type}
      className="testimonials"
    >
      {text(config, "heading") || text(config, "kicker") ? (
        <SectionHead heading={text(config, "heading")} id={id} kicker={text(config, "kicker")} />
      ) : null}
      <Stagger as="ol" className="container testimonial-list" gap={0.08}>
        {context.testimonials.map((testimonial) => (
          <StaggerItem as="li" key={testimonial.id}>
            <blockquote>
              <p>{testimonial.quote}</p>
              {testimonial.attribution ? <cite>{testimonial.attribution}</cite> : null}
            </blockquote>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}

export function DividerSection({ section }: SectionRenderProps) {
  return (
    <div
      aria-hidden="true"
      className={`section-divider section-divider-${section.variant} ${toneSpec(section.tone).className}`}
      data-section={section.type}
    />
  );
}
