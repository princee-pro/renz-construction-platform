import Link from "next/link";

import { Reveal } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { InsightMedia } from "@/components/site/insight-media";
import { Landing } from "@/components/site/landing/landing";
import { readingMinutes } from "@/components/site/sections/domain-sections";
import { RichBlocksView } from "@/components/site/sections/shared";
import type { ContentBlocks } from "@/lib/content/schemas";
import { stripInline } from "@/lib/content/rich-text";

export type InsightArticleView = Readonly<{
  title: string;
  excerpt: string;
  bodyBlocks: ContentBlocks;
  topic: string | null;
  publicationDate: string | null;
  relatedService: Readonly<{ slug: string; name: string }> | null;
  note: string | null;
  next: Readonly<{ slug: string; title: string }> | null;
  draftPreview?: boolean;
}>;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

/**
 * Article (D1.5 §42 / CR1): the same component renders the published
 * insight and the staff draft preview, so preview never drifts from the site.
 */
export function InsightArticle({ view }: Readonly<{ view: InsightArticleView }>) {
  const minutes = readingMinutes(view.bodyBlocks);
  const headings = view.bodyBlocks.filter(
    (block): block is Extract<ContentBlocks[number], { type: "heading" }> =>
      block.type === "heading" && block.level === 2,
  );
  return (
    <main id="main-content" className="public-main article-page">
      <Landing
        aside={
          // D1.8 §11: an editorial plate — a paper-toned sheet carrying this
          // article's own drawn mark and its topic — instead of a bare
          // outline repeated on every guide.
          <InsightMedia className="article-plate" seed={`${view.topic ?? ""} ${view.title}`} />
        }
        breadcrumb={{ href: "/insights", label: "Insights" }}
        concept="drawing-board"
        eyebrow={view.topic ?? "Guide"}
        facts={[
          { label: "Reading time", value: `${minutes} min` },
          ...(view.publicationDate
            ? [{ label: "Published", value: formatDate(view.publicationDate) ?? "" }]
            : []),
          ...(view.relatedService
            ? [{ label: "Related service", value: view.relatedService.name }]
            : []),
        ]}
        field="quiet"
        headingId="article-heading"
        summary={view.excerpt}
        title={view.title}
      />

      <article className="sec tone-paper article-body">
        <div className="container article-layout">
          <aside className="article-rail" aria-label="In this article">
            {headings.length > 0 ? (
              <nav aria-label="Sections">
                <p className="datum-label">In this article</p>
                <ol>
                  {headings.map((heading, position) => (
                    <li key={`${position}-${heading.text}`}>
                      <span className="index-mark">{String(position + 1).padStart(2, "0")}</span>
                      {stripInline(heading.text)}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {view.relatedService ? (
              <Link className="article-service-cue" href={`/services/${view.relatedService.slug}`}>
                <span className="datum-label">Related service</span>
                <strong>{view.relatedService.name}</strong>
                <ArrowMark />
              </Link>
            ) : null}
          </aside>
          <Reveal as="div" className="article-column" variant="rise">
            <RichBlocksView blocks={view.bodyBlocks} />
            {view.note &&
            !view.bodyBlocks.some(
              (block) => block.type === "paragraph" && block.text === view.note,
            ) ? (
              <p className="article-note">{view.note}</p>
            ) : null}
          </Reveal>
        </div>
      </article>

      {view.next ? (
        <section className="sec sec-tight tone-limestone next-article">
          <div className="container">
            <Link className="next-article-link" href={`/insights/${view.next.slug}`}>
              <span className="datum-label">Next article</span>
              <strong>{view.next.title}</strong>
              <ArrowMark />
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
