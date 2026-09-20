import { PublicLink } from "@/components/site/public-link";

type IntentionalEmptyStateProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  linkHref?: string;
  linkLabel?: string;
}>;

export function IntentionalEmptyState({
  eyebrow,
  title,
  description,
  linkHref,
  linkLabel,
}: IntentionalEmptyStateProps) {
  const headingId = `empty-${eyebrow.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;

  return (
    <section className="intentional-empty" aria-labelledby={headingId}>
      <div className="intentional-empty-index" aria-hidden="true">
        00
      </div>
      <div className="intentional-empty-copy">
        <p className="section-kicker">{eyebrow}</p>
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
        {linkHref && linkLabel ? (
          <PublicLink href={linkHref} tone="quiet">
            {linkLabel}
          </PublicLink>
        ) : null}
      </div>
    </section>
  );
}
