export type PreviewMonogramOption = "structural" | "datum" | "mass";

type PreviewRenzIdentityProps = Readonly<{
  option?: PreviewMonogramOption;
  size?: number;
  wordmark?: boolean;
  decorative?: boolean;
  tone?: "light" | "dark" | "mono";
  className?: string;
}>;

export const selectedPreviewMonogram: PreviewMonogramOption = "datum";

function StructuralR() {
  return (
    <g className="preview-mark-option preview-mark-option--structural">
      <path d="M10 8h23c14 0 23 7 23 19 0 8-4 14-11 17l14 16H42L31 47h-7v13H10V8Zm14 12v15h8c6 0 10-3 10-8s-4-7-10-7h-8Z" />
      <path className="preview-mark-accent" d="M7 14h50M17 7v54" />
    </g>
  );
}

function DatumR() {
  return (
    <g className="preview-mark-option preview-mark-option--datum">
      <path d="M9 7h25c14 0 23 7 23 19 0 9-5 15-13 18l15 17H41L30 47h-7v14H9V7Zm14 13v15h10c6 0 10-3 10-8 0-4-4-7-10-7H23Z" />
      <path className="preview-mark-cut" d="m34 41 25 20H45L25 41Z" />
      <path className="preview-mark-accent" d="M3 40h58" />
    </g>
  );
}

function MassR() {
  return (
    <g className="preview-mark-option preview-mark-option--mass">
      <path d="M7 8h29c13 0 21 7 21 18 0 8-4 14-12 17l15 18H43L31 47H22v14H7V8Zm15 13v14h12c5 0 9-3 9-7s-4-7-9-7H22Z" />
      <path className="preview-mark-mass" d="M0 0h22v21H0zM43 0h21v21H43zM0 47h22v17H0z" />
      <path className="preview-mark-accent" d="m38 43 23 18" />
    </g>
  );
}

export function PreviewRenzIdentity({
  option = selectedPreviewMonogram,
  size = 48,
  wordmark = false,
  decorative = false,
  tone = "light",
  className,
}: PreviewRenzIdentityProps) {
  const classes = ["preview-renz-identity", `preview-renz-identity--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} data-mark-option={option} data-size={size}>
      <svg
        aria-hidden={decorative ? "true" : undefined}
        aria-label={decorative ? undefined : `Provisional RENZ ${option} monogram`}
        className="preview-renz-symbol"
        focusable="false"
        height={size}
        role={decorative ? undefined : "img"}
        viewBox="0 0 64 64"
        width={size}
      >
        {option === "structural" ? <StructuralR /> : null}
        {option === "datum" ? <DatumR /> : null}
        {option === "mass" ? <MassR /> : null}
      </svg>
      {wordmark ? (
        <span className="preview-renz-wordmark" aria-hidden={decorative ? "true" : undefined}>
          <strong>RENZ</strong>
          <small>Construction Services Ltd</small>
        </span>
      ) : null}
    </span>
  );
}
