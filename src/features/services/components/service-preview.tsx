import type { ContentBlock } from "@/lib/content/schemas";
import type { ServiceDetail } from "@/features/services/service-contract";

function PreviewBlock({ block }: Readonly<{ block: ContentBlock }>) {
  if (block.type === "heading") {
    return block.level === 2 ? <h2>{block.text}</h2> : <h3>{block.text}</h3>;
  }
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "list") {
    return (
      <ul>
        {block.items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    );
  }
  return <a href={block.href}>{block.label}</a>;
}

export function ServicePreview({
  detail,
}: Readonly<{
  detail: ServiceDetail & { localization: NonNullable<ServiceDetail["localization"]> };
}>) {
  const localization = detail.localization;
  const deliveryFields = [
    ["Scope", localization.scope],
    ["Deliverables", localization.deliverables],
    ["Exclusions", localization.exclusions],
    ["Client inputs", localization.client_inputs],
    ["Delivery", localization.delivery_wording],
    ["Terminology", localization.professional_terminology],
  ] as const;

  return (
    <article className="private-preview">
      <div className="preview-warning" role="status">
        <strong>DRAFT PREVIEW / NOT PUBLIC</strong>
        <span>
          Private staff rendering · {detail.service.publication_status} · {localization.locale}
        </span>
      </div>
      <header className="preview-header">
        <p className="eyebrow">Service preview</p>
        <h1>{localization.name}</h1>
        {localization.summary ? <p>{localization.summary}</p> : null}
      </header>
      {localization.body_blocks.length > 0 ? (
        <section aria-label="Structured service content" className="preview-content">
          {localization.body_blocks.map((block, index) => (
            <PreviewBlock block={block} key={`${block.type}-${index}`} />
          ))}
        </section>
      ) : (
        <p className="preview-empty">No structured public content has been drafted.</p>
      )}
      <dl className="preview-delivery-register">
        {deliveryFields.map(([label, value]) =>
          value ? (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </article>
  );
}
