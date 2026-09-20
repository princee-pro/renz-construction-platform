import { IntentionalEmptyState } from "@/components/site/intentional-empty-state";
import { WebsitePage } from "@/components/site/sections/render-page";
import type { WebsitePageRender } from "@/features/website/render";

/**
 * The public route body for an owner-managed page. When the published
 * snapshot cannot be loaded (configuration outage) the route degrades to an
 * honest empty state instead of crashing — nothing is fabricated.
 */
export function WebsiteRoute({
  render,
  fallback,
}: Readonly<{
  render: WebsitePageRender | null;
  fallback: Readonly<{ eyebrow: string; title: string; description: string }>;
}>) {
  if (!render) {
    return (
      <main className="public-main" id="main-content">
        <section className="sec tone-paper">
          <div className="container">
            <IntentionalEmptyState
              description={fallback.description}
              eyebrow={fallback.eyebrow}
              title={fallback.title}
            />
          </div>
        </section>
      </main>
    );
  }
  return <WebsitePage context={render.context} snapshot={render.snapshot} />;
}
