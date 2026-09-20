/**
 * Technical drawing interpretation of a concept study (D1 §34). A generated
 * elevation/section in RENZ linework — walls, roof planes, columns, ground
 * line, dimension strings and a datum — used as the "drawing" layer of the
 * Drawing ↔ Built comparison and as a decorative plane. It is an
 * interpretation, not a survey; the caption always says so.
 */

type Profile = Readonly<{
  masses: readonly Readonly<{ x: number; y: number; w: number; h: number }>[];
  roof: string;
  columns: readonly number[];
  openings: readonly Readonly<{ x: number; y: number; w: number; h: number }>[];
  ground: string;
}>;

const profiles: Readonly<Record<string, Profile>> = {
  "ridge-residence": {
    masses: [
      { x: 120, y: 300, w: 360, h: 200 },
      { x: 480, y: 360, w: 300, h: 140 },
      { x: 780, y: 420, w: 260, h: 80 },
    ],
    roof: "M100 300h400l-20-40H120zM470 360h330l-14-30H484z",
    columns: [180, 300, 420, 560, 700],
    openings: [
      { x: 200, y: 340, w: 90, h: 120 },
      { x: 330, y: 340, w: 90, h: 120 },
      { x: 520, y: 390, w: 110, h: 90 },
      { x: 660, y: 390, w: 90, h: 90 },
    ],
    ground: "M60 500h1080M60 560q120-30 300-20t300 30 360-10",
  },
  "courtyard-house": {
    masses: [
      { x: 140, y: 340, w: 300, h: 160 },
      { x: 700, y: 340, w: 320, h: 160 },
      { x: 440, y: 420, w: 260, h: 80 },
    ],
    roof: "M120 340h340l40-40H160zM680 340h360l-40-40H720z",
    columns: [470, 560, 650],
    openings: [
      { x: 200, y: 380, w: 100, h: 100 },
      { x: 760, y: 380, w: 100, h: 100 },
      { x: 900, y: 380, w: 80, h: 100 },
    ],
    ground: "M60 500h1080",
  },
  "urban-workspace": {
    masses: [{ x: 200, y: 160, w: 760, h: 340 }],
    roof: "M180 160h800",
    columns: [260, 380, 500, 620, 740, 860],
    openings: [
      { x: 280, y: 200, w: 80, h: 90 },
      { x: 400, y: 200, w: 80, h: 90 },
      { x: 520, y: 200, w: 80, h: 90 },
      { x: 640, y: 200, w: 80, h: 90 },
      { x: 760, y: 200, w: 80, h: 90 },
      { x: 280, y: 330, w: 80, h: 90 },
      { x: 400, y: 330, w: 80, h: 90 },
      { x: 520, y: 330, w: 80, h: 90 },
      { x: 640, y: 330, w: 80, h: 90 },
      { x: 760, y: 330, w: 80, h: 90 },
    ],
    ground: "M60 500h1080",
  },
  "lake-retreat": {
    masses: [
      { x: 160, y: 380, w: 420, h: 120 },
      { x: 620, y: 330, w: 320, h: 170 },
    ],
    roof: "M140 380h460l-30-60H190zM600 330h360l-40-50H640z",
    columns: [220, 360, 500, 680, 860],
    openings: [
      { x: 240, y: 410, w: 120, h: 70 },
      { x: 400, y: 410, w: 120, h: 70 },
      { x: 660, y: 370, w: 240, h: 110 },
    ],
    ground: "M60 500h1080M60 540h1080",
  },
  "community-pavilion": {
    masses: [{ x: 160, y: 380, w: 860, h: 120 }],
    roof: "M120 380l480-120 480 120M160 380l440-90 420 90",
    columns: [220, 360, 500, 640, 780, 920],
    openings: [],
    ground: "M60 500h1080",
  },
  "industrial-campus": {
    masses: [
      { x: 120, y: 260, w: 400, h: 240 },
      { x: 560, y: 320, w: 500, h: 180 },
    ],
    roof: "M100 260h440l-40-50H140zM540 320h540",
    columns: [200, 320, 440, 640, 760, 880, 1000],
    openings: [
      { x: 160, y: 300, w: 320, h: 60 },
      { x: 600, y: 360, w: 140, h: 120 },
      { x: 820, y: 360, w: 200, h: 60 },
    ],
    ground: "M60 500h1080",
  },
};

const fallback: Profile = profiles["ridge-residence"] as Profile;

export function StudyDrawing({
  slug,
  className,
  animate = true,
}: Readonly<{ slug: string; className?: string; animate?: boolean }>) {
  const profile = profiles[slug] ?? fallback;
  return (
    <svg
      aria-hidden="true"
      className={`study-drawing${animate ? " study-drawing-animate" : ""}${className ? ` ${className}` : ""}`}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 1200 640"
    >
      <g className="study-drawing-grid">
        {Array.from({ length: 13 }, (_, index) => (
          <line key={`v${index}`} x1={60 + index * 90} x2={60 + index * 90} y1={80} y2={600} />
        ))}
        {Array.from({ length: 7 }, (_, index) => (
          <line key={`h${index}`} x1={60} x2={1140} y1={80 + index * 90} y2={80 + index * 90} />
        ))}
      </g>
      <g className="study-drawing-lines">
        {profile.masses.map((mass, index) => (
          <rect height={mass.h} key={index} width={mass.w} x={mass.x} y={mass.y} />
        ))}
        <path d={profile.roof} />
        {profile.columns.map((x) => (
          <line key={x} x1={x} x2={x} y1={profile.masses[0]?.y ?? 300} y2={500} />
        ))}
        {profile.openings.map((opening, index) => (
          <rect
            className="study-drawing-opening"
            height={opening.h}
            key={index}
            width={opening.w}
            x={opening.x}
            y={opening.y}
          />
        ))}
        <path className="study-drawing-ground" d={profile.ground} />
      </g>
      <g className="study-drawing-dims">
        <path d="M120 580h920M120 570v20M1040 570v20" />
        <path d="M1090 160v340M1080 160h20M1080 500h20" />
        <text x="580" y="610">
          overall length
        </text>
        <text transform="rotate(-90 1120 330)" x="1120" y="330">
          height to ridge
        </text>
      </g>
      <line className="study-drawing-datum" x1="0" x2="1200" y1="500" y2="500" />
      <text className="study-drawing-datum-label" x="70" y="492">
        datum 0.00
      </text>
    </svg>
  );
}
