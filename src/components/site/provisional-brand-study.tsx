import {
  PreviewRenzIdentity,
  selectedPreviewMonogram,
  type PreviewMonogramOption,
} from "@/components/site/preview-renz-identity";

const options: ReadonlyArray<
  Readonly<{
    id: PreviewMonogramOption;
    label: string;
    premise: string;
    score: string;
  }>
> = [
  {
    id: "structural",
    label: "Option A — Structural R",
    premise: "Column, beam, and roof-line discipline.",
    score: "Silhouette 4.5 / Readability 4.6 / Distinction 4.2",
  },
  {
    id: "datum",
    label: "Option B — Datum R",
    premise: "A readable R cut by one measured gold datum.",
    score: "Silhouette 4.8 / Readability 4.8 / Distinction 4.9",
  },
  {
    id: "mass",
    label: "Option C — Mass R",
    premise: "Architectural masses shaping an R in negative space.",
    score: "Silhouette 4.4 / Readability 4.1 / Distinction 4.7",
  },
];

const sizes = [24, 32, 40, 64, 128] as const;

export function ProvisionalBrandStudy() {
  return (
    <section className="brand-system-study" aria-labelledby="brand-system-study-title">
      <header>
        <p className="section-kicker">Code-native monogram study / preview only</p>
        <h2 id="brand-system-study-title">Three directions. Five measured sizes.</h2>
        <p>
          Archived exploration: all R directions, including the terracotta symbol adopted on 25
          September, were superseded on 28 September 2026 by the approved silver twin-tower RENZ
          Construction logo. These options are design history only.
        </p>
        <p>
          Later clarification on 28 September 2026: the user selected the supplied orange curved R
          with the two-line Renz Construction wordmark as the current website identity, superseding
          the silver logo. The studies below remain archived.
        </p>
      </header>

      <div className="brand-system-verdict" role="note">
        <span>Historical preview selection</span>
        <PreviewRenzIdentity option={selectedPreviewMonogram} size={64} wordmark decorative />
        <p>Datum R / strongest reading at 24px and strongest relationship to the site datum.</p>
      </div>

      <div className="brand-system-grid">
        {options.map((option) => (
          <article
            className={`brand-system-variant${
              option.id === selectedPreviewMonogram ? " is-selected" : ""
            }`}
            key={option.id}
          >
            <header>
              <p>{option.label}</p>
              <h3>{option.premise}</h3>
              <small>{option.score}</small>
            </header>
            <div className="brand-system-sizes">
              {sizes.map((size) => (
                <figure key={size}>
                  <PreviewRenzIdentity option={option.id} size={size} decorative />
                  <figcaption>{size}px</figcaption>
                </figure>
              ))}
            </div>
            <div className="brand-system-reverse">
              <PreviewRenzIdentity option={option.id} size={48} tone="dark" wordmark decorative />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
