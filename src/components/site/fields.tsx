/**
 * Animated background fields (brief §18). One reusable family, rendered as
 * inline SVG + CSS so nothing is downloaded and reduced motion simply shows
 * the final state. Each field explains something structural: survey marks,
 * plan fragments, beam/column relationships, a slow gold datum, a material
 * light transition, or a quiet editorial ground. They are decorative
 * (aria-hidden) and never carry information on their own.
 */

export type FieldVariant = "survey" | "plan" | "structure" | "datum" | "material" | "quiet";

export function Field({
  variant,
  tone = "dark",
  className,
}: Readonly<{ variant: FieldVariant; tone?: "dark" | "light"; className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={`field field-${variant} field-${tone}${className ? ` ${className}` : ""}`}
    >
      {variant === "survey" ? <SurveyField /> : null}
      {variant === "plan" ? <PlanField /> : null}
      {variant === "structure" ? <StructureField /> : null}
      {variant === "datum" ? <DatumField /> : null}
      {variant === "material" ? <span className="field-material-light" /> : null}
    </div>
  );
}

/** SURVEY: registration grid with measurement ticks that slowly re-register. */
function SurveyField() {
  return (
    <svg className="field-svg" focusable="false" preserveAspectRatio="none" viewBox="0 0 1200 800">
      <defs>
        <pattern height="80" id="survey-grid" patternUnits="userSpaceOnUse" width="80">
          <path className="field-hair" d="M80 0H0V80" fill="none" />
        </pattern>
      </defs>
      <rect fill="url(#survey-grid)" height="800" width="1200" />
      <g className="field-marks">
        <path className="field-line" d="M60 120h40M80 100v40" />
        <path className="field-line" d="M1060 660h40M1080 640v40" />
        <path className="field-line" d="M600 40v760" strokeDasharray="6 10" />
        <path className="field-line" d="M40 400h1120" strokeDasharray="6 10" />
      </g>
      <g className="field-ticks">
        {Array.from({ length: 14 }, (_, index) => (
          <rect
            className="field-tick"
            height={index % 5 === 0 ? 14 : 7}
            key={index}
            width="1.5"
            x={40 + index * 80}
            y={786 - (index % 5 === 0 ? 14 : 7)}
          />
        ))}
      </g>
    </svg>
  );
}

/** PLAN: architectural drawing fragments — walls, an opening, a stair, a dimension. */
function PlanField() {
  return (
    <svg
      className="field-svg"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 800"
    >
      <g className="field-plan" fill="none">
        <path className="field-line field-line-strong" d="M180 160h520v120h180v360H180z" />
        <path className="field-line" d="M180 400h340M520 280v120M700 280v-120" />
        <path className="field-line" d="M700 640v-80M780 640v-80M860 640v-80M940 640v-80" />
        <path className="field-line" d="M240 640a80 80 0 0 1 160 0" />
        <path className="field-line field-dim" d="M180 700h520M180 690v20M700 690v20" />
        <path className="field-line field-dim" d="M920 160v360M910 160h20M910 520h20" />
        <circle className="field-line" cx="600" cy="400" r="3" />
        <path className="field-line" d="M600 390v20M590 400h20" />
      </g>
    </svg>
  );
}

/** STRUCTURE: beam / column relationships that assemble in sequence. */
function StructureField() {
  return (
    <svg
      className="field-svg"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 800"
    >
      <g className="field-structure" fill="none">
        {[220, 460, 700, 940].map((x, index) => (
          <path
            className="field-line field-line-strong field-column"
            d={`M${x} 720V180`}
            key={x}
            style={{ animationDelay: `${index * 0.35}s` }}
          />
        ))}
        <path className="field-line field-line-strong field-beam" d="M160 180h1040" />
        <path
          className="field-line field-beam"
          d="M160 450h1040"
          style={{ animationDelay: "0.8s" }}
        />
        <path
          className="field-line"
          d="M220 180l240 270M460 180l240 270M700 180l240 270"
          strokeDasharray="4 8"
        />
        <path className="field-line field-ground" d="M120 720h1000" />
      </g>
    </svg>
  );
}

/** DATUM: one slow gold reference line with registration marks. */
function DatumField() {
  return (
    <svg className="field-svg" focusable="false" preserveAspectRatio="none" viewBox="0 0 1200 800">
      <path className="field-datum" d="M0 520h1200" />
      <g className="field-datum-marks">
        <path className="field-datum" d="M300 508v24M600 504v32M900 508v24" />
      </g>
    </svg>
  );
}
