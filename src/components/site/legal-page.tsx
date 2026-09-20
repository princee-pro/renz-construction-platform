import { IntentionalEmptyState } from "@/components/site/intentional-empty-state";
import { Landing } from "@/components/site/landing/landing";
import { StructuredContent } from "@/components/site/structured-content";
import type { PublicPage } from "@/features/public-content/contracts";
import type { PublishedLegalPage } from "@/lib/site/legal-pages";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(value),
  );
}

/** Minimal, safe rendering of a legal body: `## Heading` lines, `- item` lists, paragraphs. */
function LegalBody({ body }: Readonly<{ body: string }>) {
  const blocks = body
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <div className="structured-content legal-body">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) return <h2 key={index}>{block.slice(3)}</h2>;
        if (block.startsWith("# ")) return <h2 key={index}>{block.slice(2)}</h2>;
        if (block.split("\n").every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {block.split("\n").map((line, itemIndex) => (
                <li key={itemIndex}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block}</p>;
      })}
    </div>
  );
}

/**
 * Legal route: the C7 published revision wins; the S4 published page remains
 * the fallback; otherwise an honest empty state. Drafts never render here.
 */
export function LegalPageView({
  legal,
  page,
  eyebrow,
  fallbackTitle,
  fallbackSummary,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  legal: PublishedLegalPage | null;
  page: PublicPage | null;
  eyebrow: string;
  fallbackTitle: string;
  fallbackSummary: string;
  emptyTitle: string;
  emptyDescription: string;
}>) {
  return (
    <main id="main-content" className="public-main">
      <Landing
        concept="calm"
        eyebrow={eyebrow}
        field="quiet"
        summary={
          legal
            ? `Version ${legal.revision} · published ${formatDate(legal.published_at)}`
            : (page?.summary ?? fallbackSummary)
        }
        title={legal?.title ?? page?.title ?? fallbackTitle}
      />
      <section className="public-section public-section-white">
        <div className="public-container public-article-layout">
          {legal ? (
            <LegalBody body={legal.body} />
          ) : page ? (
            <StructuredContent blocks={page.bodyBlocks} />
          ) : (
            <IntentionalEmptyState
              eyebrow="Published content"
              title={emptyTitle}
              description={emptyDescription}
            />
          )}
        </div>
      </section>
    </main>
  );
}
