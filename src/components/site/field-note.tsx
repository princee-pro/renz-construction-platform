/**
 * D1.8 §11 — "Field notes" marks for the Insights surfaces.
 *
 * Each published guide gets its own drawn mark instead of the one repeated
 * document outline: a measured sheet, a site section, a checked list, a
 * detail callout, a cost band or a hand-over stamp. They are inline SVG
 * (nothing downloaded), decorative (aria-hidden), and reduced-motion safe —
 * the drawing animation only runs when motion is allowed, and the settled
 * state is the full drawing.
 *
 * The variant is chosen from the article's own topic/slug, so the choice
 * follows the owner's content rather than a hard-coded per-article list.
 */

export const fieldNoteVariants = [
  "brief",
  "survey",
  "coordination",
  "detail",
  "cost",
  "handover",
] as const;

export type FieldNoteVariant = (typeof fieldNoteVariants)[number];

/** Stable, content-derived pick so two guides rarely share a mark. */
export function fieldNoteFor(seed: string, offset = 0): FieldNoteVariant {
  const topic = seed.toLowerCase();
  if (/brief|scope|start|idea/u.test(topic)) return "brief";
  if (/site|survey|visit|context|ground/u.test(topic)) return "survey";
  if (/drawing|coordination|design|plan/u.test(topic)) return "coordination";
  if (/detail|material|finish|quality/u.test(topic)) return "detail";
  if (/cost|price|budget|money|quote/u.test(topic)) return "cost";
  if (/handover|supervis|check|snag|complete/u.test(topic)) return "handover";
  let hash = offset;
  for (const character of topic) hash = (hash * 31 + character.charCodeAt(0)) % 997;
  return fieldNoteVariants[hash % fieldNoteVariants.length] ?? "brief";
}

export function FieldNote({
  variant,
  className,
}: Readonly<{ variant: FieldNoteVariant; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      className={`field-note field-note-${variant}${className ? ` ${className}` : ""}`}
    >
      <svg className="field-note-svg" focusable="false" viewBox="0 0 320 200">
        <g className="field-note-ground">
          <path d="M16 176h288" />
          <path d="M16 16v160" strokeDasharray="3 7" />
        </g>
        {variant === "brief" ? <Brief /> : null}
        {variant === "survey" ? <Survey /> : null}
        {variant === "coordination" ? <Coordination /> : null}
        {variant === "detail" ? <Detail /> : null}
        {variant === "cost" ? <Cost /> : null}
        {variant === "handover" ? <Handover /> : null}
      </svg>
    </span>
  );
}

/** BRIEF: a written sheet with a purpose line and a growing requirement list. */
function Brief() {
  return (
    <g className="field-note-mark">
      <rect className="field-note-sheet" height="128" width="104" x="40" y="32" />
      <path className="field-note-accent" d="M56 60h72" />
      <g className="field-note-rows">
        {[80, 96, 112, 128].map((y, index) => (
          <path d={`M56 ${y}h${index % 2 === 0 ? 72 : 52}`} key={y} />
        ))}
      </g>
      <g className="field-note-annotation">
        <path d="M168 60h96" />
        <path d="M168 60v88" strokeDasharray="4 6" />
        <rect height="26" width="72" x="180" y="96" />
        <path className="field-note-accent" d="M188 109h56" />
      </g>
    </g>
  );
}

/** SURVEY: a plot section with levels, access and a measured boundary. */
function Survey() {
  return (
    <g className="field-note-mark">
      <path className="field-note-terrain" d="M24 148c48-10 72-34 116-38s84 18 156 8" />
      <path
        className="field-note-terrain field-note-terrain-soft"
        d="M24 164c56-8 84-22 124-26s92 12 148 6"
      />
      <g className="field-note-levels">
        <path d="M56 120v40" />
        <path d="M152 100v60" />
        <path d="M248 116v44" />
      </g>
      <g className="field-note-annotation">
        <path className="field-note-accent" d="M56 108h192" />
        <path d="M56 102v12M248 102v12" />
        <rect height="22" width="60" x="120" y="48" />
        <path d="M150 70v30" strokeDasharray="4 5" />
      </g>
    </g>
  );
}

/** COORDINATION: three drawing layers registering onto one set. */
function Coordination() {
  return (
    <g className="field-note-mark">
      <g className="field-note-layer field-note-layer-a">
        <rect height="88" width="112" x="36" y="44" />
        <path d="M36 76h112M72 44v88" />
      </g>
      <g className="field-note-layer field-note-layer-b">
        <rect height="88" width="112" x="68" y="60" />
        <path d="M68 104h112" strokeDasharray="5 5" />
      </g>
      <g className="field-note-layer field-note-layer-c">
        <rect className="field-note-accent" height="88" width="112" x="100" y="76" />
        <circle cx="156" cy="120" r="6" />
      </g>
      <path className="field-note-annotation" d="M228 76h56M256 76v68" strokeDasharray="4 6" />
    </g>
  );
}

/** DETAIL: a wall build-up drawn as layers with a callout. */
function Detail() {
  return (
    <g className="field-note-mark">
      <g className="field-note-buildup">
        <rect height="112" width="26" x="56" y="40" />
        <rect height="112" width="14" x="82" y="40" />
        <rect className="field-note-accent" height="112" width="8" x="96" y="40" />
        <rect height="112" width="20" x="104" y="40" />
      </g>
      <g className="field-note-annotation">
        <circle cx="124" cy="96" r="34" />
        <path d="M158 96h86" />
        <path d="M188 78h56M188 96h72M188 114h44" className="field-note-rows" />
      </g>
    </g>
  );
}

/** COST: a measured band split into priced parts. */
function Cost() {
  return (
    <g className="field-note-mark">
      <g className="field-note-bars">
        <rect height="18" width="188" x="48" y="56" />
        <rect className="field-note-accent" height="18" width="118" x="48" y="90" />
        <rect height="18" width="152" x="48" y="124" />
      </g>
      <g className="field-note-annotation">
        <path d="M48 44v100M236 44v20" strokeDasharray="4 6" />
        <path d="M252 65h28M252 99h28M252 133h28" />
      </g>
    </g>
  );
}

/** HANDOVER: a checked list closing against a dated stamp. */
function Handover() {
  return (
    <g className="field-note-mark">
      <rect className="field-note-sheet" height="120" width="128" x="36" y="36" />
      <g className="field-note-checks">
        {[62, 86, 110, 134].map((y, index) => (
          <g key={y}>
            <rect height="12" width="12" x="52" y={y - 6} />
            {index < 3 ? <path className="field-note-accent" d={`M54 ${y}l4 4 7-9`} /> : null}
            <path d={`M76 ${y}h${index % 2 === 0 ? 68 : 48}`} />
          </g>
        ))}
      </g>
      <g className="field-note-annotation">
        <rect height="52" width="76" x="196" y="72" transform="rotate(-6 234 98)" />
        <path className="field-note-accent" d="M208 96h52" transform="rotate(-6 234 98)" />
      </g>
    </g>
  );
}
