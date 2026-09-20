// D1.7 §77 — original diagram media for every project study, drawn locally
// (no photography, nothing downloaded): site diagram, plan abstraction,
// section, material palette and construction sequence. Each is an SVG in
// the Datum & Mass language rendered to WebP under
// public/media/renz-preview/projects/<slug>/diagram-<kind>.webp.
//   node scripts/d17-diagrams.mjs [slug,slug]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const W = 1600;
const H = 1200;
const INK = "#0b1a2b";
const GOLD = "#c69a3a";
const PAPER = "#f4f1e9";
const LIME = "#e8e2d6";
const RULE = "#cfc7b8";
const MONO = "Consolas, 'Courier New', monospace";
const SANS = "Segoe UI, Arial, sans-serif";

/**
 * One study geometry per project. Nothing here is site data: the shapes are
 * the study's own diagrammatic idea (slope, courtyard, halls, terraces).
 */
const studies = {
  "ridge-residence": {
    location: "Hillside study",
    site: "ridge",
    blocks: [
      [18, 44, 26, 16],
      [44, 40, 30, 20],
      [74, 46, 12, 12],
    ],
    court: null,
    levels: 2,
    roof: "flat",
    profile: [78, 72, 62, 50, 44, 42],
    materials: [
      ["Board-marked concrete", "#8f8a80"],
      ["Dark timber", "#4a3728"],
      ["Rough stone", "#6d6a63"],
      ["Bronze metal", "#7d5a2a"],
    ],
    sequence: ["Stone base", "Ground slab", "Concrete frame", "Roof", "Timber screens"],
  },
  "courtyard-house": {
    location: "Private residential study",
    site: "flat",
    blocks: [
      [22, 26, 56, 12],
      [22, 38, 14, 34],
      [64, 38, 14, 34],
      [22, 72, 56, 10],
    ],
    court: [36, 38, 28, 34],
    levels: 1,
    roof: "flat",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Warm plaster", "#d8c7ac"],
      ["Stone", "#8a857b"],
      ["Timber", "#8b5e3c"],
      ["Garden", "#5f7a4a"],
    ],
    sequence: ["Set out courtyard", "Foundations", "Walls", "Roof", "Garden"],
  },
  "urban-workspace": {
    location: "Workplace study",
    site: "urban",
    blocks: [
      [26, 20, 48, 60],
      [26, 20, 10, 60],
    ],
    court: null,
    levels: 4,
    roof: "flat",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Concrete frame", "#9a968e"],
      ["Timber fins", "#8b5e3c"],
      ["Glass", "#9fb3c0"],
      ["Planting", "#5f7a4a"],
    ],
    sequence: ["Basement", "Frame", "Floors", "Facade fins", "Fit-out"],
  },
  "lake-retreat": {
    location: "Hospitality study",
    site: "lake",
    blocks: [
      [14, 30, 16, 12],
      [34, 36, 16, 12],
      [54, 42, 16, 12],
      [74, 48, 14, 12],
    ],
    court: null,
    levels: 1,
    roof: "pitched",
    profile: [70, 66, 60, 54, 48, 40],
    materials: [
      ["Timber", "#8b5e3c"],
      ["Stone", "#8a857b"],
      ["Thatch / roof", "#a88d5c"],
      ["Water edge", "#7fa1b5"],
    ],
    sequence: ["Terraces", "Stone plinths", "Timber frames", "Roofs", "Decks"],
  },
  "community-pavilion": {
    location: "Community study",
    site: "flat",
    blocks: [[20, 30, 60, 40]],
    court: [34, 40, 32, 20],
    levels: 1,
    roof: "butterfly",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Brick", "#a5573a"],
      ["Timber roof", "#8b5e3c"],
      ["Concrete floor", "#9a968e"],
      ["Shade planting", "#5f7a4a"],
    ],
    sequence: ["Slab", "Brick piers", "Timber roof", "Screens", "Landscape"],
  },
  "industrial-campus": {
    location: "Industrial study",
    site: "flat",
    blocks: [
      [12, 24, 40, 22],
      [12, 52, 40, 22],
      [58, 24, 30, 50],
    ],
    court: null,
    levels: 1,
    roof: "sawtooth",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Steel", "#7d838a"],
      ["Precast concrete", "#a6a29a"],
      ["Roof sheeting", "#c2c6c9"],
      ["Yard", "#8a8378"],
    ],
    sequence: ["Yard levels", "Slabs", "Steel frames", "Envelope", "Services"],
  },
  "kigali-infill-apartments": {
    location: "Kigali context study",
    site: "urban",
    blocks: [[30, 18, 40, 64]],
    court: null,
    levels: 5,
    roof: "flat",
    profile: [52, 56, 60, 64, 68, 72],
    materials: [
      ["Clay brick", "#a5573a"],
      ["Warm concrete", "#a6a29a"],
      ["Steel screens", "#4c5259"],
      ["Balcony planting", "#5f7a4a"],
    ],
    sequence: ["Excavation", "Foundations", "Frame floors", "Brick infill", "Balcony screens"],
  },
  "musanze-highlands-lodge": {
    location: "Musanze context study",
    site: "highland",
    blocks: [
      [12, 40, 20, 16],
      [36, 30, 22, 18],
      [62, 40, 20, 16],
      [36, 60, 22, 14],
    ],
    court: [36, 48, 22, 12],
    levels: 1,
    roof: "pitched",
    profile: [64, 60, 58, 60, 62, 66],
    materials: [
      ["Volcanic stone", "#3f3f3f"],
      ["Timber", "#8b5e3c"],
      ["Slate roof", "#5b5f66"],
      ["Highland planting", "#4f6b3f"],
    ],
    sequence: ["Stone bases", "Timber frames", "Roofs", "Courtyards", "Walkways"],
  },
  "bugesera-logistics-hub": {
    location: "Bugesera context study",
    site: "flat",
    blocks: [
      [10, 22, 56, 24],
      [10, 52, 56, 24],
      [72, 22, 18, 12],
    ],
    court: null,
    levels: 1,
    roof: "flat",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Steel portal frame", "#7d838a"],
      ["Precast panels", "#b5b1a8"],
      ["Canopy", "#c2c6c9"],
      ["Landscape buffer", "#7a8a4f"],
    ],
    sequence: ["Yard grading", "Slabs", "Portal frames", "Precast panels", "Canopies"],
  },
  "huye-learning-courtyard": {
    location: "Huye context study",
    site: "flat",
    blocks: [
      [18, 22, 64, 12],
      [18, 34, 12, 40],
      [70, 34, 12, 40],
      [18, 74, 64, 10],
    ],
    court: [30, 34, 40, 40],
    levels: 2,
    roof: "pitched",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Clay brick", "#a5573a"],
      ["Timber roof", "#8b5e3c"],
      ["Concrete lintels", "#a6a29a"],
      ["Courtyard tree", "#5f7a4a"],
    ],
    sequence: ["Slabs", "Brick walls", "Timber roofs", "Arcades", "Courtyard garden"],
  },
  "rubavu-lakeside-residences": {
    location: "Rubavu context study",
    site: "lake",
    blocks: [
      [12, 22, 20, 12],
      [30, 34, 20, 12],
      [48, 46, 20, 12],
      [66, 58, 20, 12],
    ],
    court: null,
    levels: 2,
    roof: "flat",
    profile: [76, 70, 62, 54, 46, 38],
    materials: [
      ["Lime plaster", "#e2d8c3"],
      ["Grey stone", "#8a857b"],
      ["Timber screens", "#8b5e3c"],
      ["Lake planting", "#5f7a4a"],
    ],
    sequence: ["Terrace walls", "Slabs", "Walls", "Pergolas", "Planting"],
  },
  "rwamagana-production-yard": {
    location: "Rwamagana context study",
    site: "flat",
    blocks: [
      [10, 40, 18, 36],
      [30, 40, 18, 36],
      [50, 40, 18, 36],
      [70, 40, 18, 36],
      [10, 18, 20, 14],
    ],
    court: null,
    levels: 1,
    roof: "sawtooth",
    profile: [60, 60, 60, 60, 60, 60],
    materials: [
      ["Steel frame", "#7d838a"],
      ["Brick admin block", "#a5573a"],
      ["Roof sheeting", "#c2c6c9"],
      ["Banana buffer", "#5f7a4a"],
    ],
    sequence: ["Yard drainage", "Slabs", "Hall frames", "Sawtooth roofs", "Admin block"],
  },
};

const px = (v) => (v / 100) * 1200 + 200; // plan units → x px (200..1400)
const py = (v) => (v / 100) * 800 + 200; // plan units → y px (200..1000)

function frame(title, kind, location) {
  return `
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g stroke="${RULE}" stroke-width="1">
    ${[200, 500, 800, 1100, 1400].map((x) => `<line x1="${x}" y1="140" x2="${x}" y2="1060"/>`).join("")}
    ${[200, 400, 600, 800, 1000].map((y) => `<line x1="140" y1="${y}" x2="1460" y2="${y}"/>`).join("")}
  </g>
  <line x1="120" y1="1080" x2="1480" y2="1080" stroke="${GOLD}" stroke-width="2"/>
  <text x="120" y="112" font-family="${MONO}" font-size="22" letter-spacing="4" fill="${GOLD}">${kind.toUpperCase()}</text>
  <text x="1480" y="112" font-family="${MONO}" font-size="22" letter-spacing="4" fill="${INK}" text-anchor="end">${location.toUpperCase()}</text>
  <text x="120" y="1130" font-family="${SANS}" font-size="30" font-weight="700" fill="${INK}">${title}</text>
  <text x="1480" y="1130" font-family="${MONO}" font-size="20" letter-spacing="3" fill="#6b6f76" text-anchor="end">GENERATED CONCEPT DIAGRAM · NOT PROJECT EVIDENCE</text>`;
}

function hatch(id, color) {
  return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="${color}" stroke-width="1.2"/></pattern>`;
}

function siteDiagram(study, title) {
  let ground;
  if (study.site === "ridge" || study.site === "lake" || study.site === "highland") {
    const lines = [];
    for (let i = 0; i < 9; i++) {
      const y0 = 240 + i * 90;
      const bend = study.site === "highland" ? 60 : 30;
      lines.push(
        `<path d="M200 ${y0} C 500 ${y0 - bend} 900 ${y0 + bend} 1400 ${y0 - bend / 2}" fill="none" stroke="#a89f8d" stroke-width="1.2" stroke-dasharray="${i % 3 === 0 ? "" : "6 6"}"/>`,
      );
    }
    ground = lines.join("");
    if (study.site === "lake") {
      ground += `<path d="M900 1000 C 1000 900 1200 860 1400 880 L1400 1000 Z" fill="#c9d6dd" opacity="0.8"/><text x="1240" y="960" font-family="${MONO}" font-size="20" letter-spacing="3" fill="#4e6f82">LAKE EDGE</text>`;
    }
  } else if (study.site === "urban") {
    ground = `
      <rect x="200" y="200" width="1200" height="800" fill="none"/>
      <rect x="200" y="200" width="1200" height="90" fill="${LIME}"/>
      <rect x="200" y="910" width="1200" height="90" fill="${LIME}"/>
      <text x="220" y="255" font-family="${MONO}" font-size="20" letter-spacing="3" fill="#6b6f76">STREET</text>
      <rect x="200" y="290" width="180" height="620" fill="none" stroke="#a89f8d" stroke-width="1.5" stroke-dasharray="8 6"/>
      <rect x="1220" y="290" width="180" height="620" fill="none" stroke="#a89f8d" stroke-width="1.5" stroke-dasharray="8 6"/>
      <text x="230" y="600" font-family="${MONO}" font-size="18" fill="#6b6f76" transform="rotate(-90 230 600)">NEIGHBOUR</text>`;
  } else {
    ground = `<rect x="240" y="240" width="1120" height="720" fill="none" stroke="#a89f8d" stroke-width="1.5" stroke-dasharray="10 8"/>
      <text x="260" y="280" font-family="${MONO}" font-size="18" letter-spacing="3" fill="#6b6f76">SITE BOUNDARY</text>`;
  }
  const blocks = study.blocks
    .map(
      ([x, y, w, h]) =>
        `<rect x="${px(x)}" y="${py(y)}" width="${(w / 100) * 1200}" height="${(h / 100) * 800}" fill="${INK}" opacity="0.88"/>`,
    )
    .join("");
  const court = study.court
    ? `<rect x="${px(study.court[0])}" y="${py(study.court[1])}" width="${(study.court[2] / 100) * 1200}" height="${(study.court[3] / 100) * 800}" fill="${PAPER}"/>`
    : "";
  return `${frame(title, "01 · Site diagram", study.location)}
  ${ground}${blocks}${court}
  <g stroke="${GOLD}" stroke-width="2.5" fill="none"><path d="M120 640 L200 640"/><path d="M186 630 L200 640 L186 650"/></g>
  <text x="120" y="620" font-family="${MONO}" font-size="18" letter-spacing="3" fill="${GOLD}">ACCESS</text>
  <g transform="translate(1420 300)"><circle r="34" fill="none" stroke="${INK}" stroke-width="1.5"/><path d="M0 -30 L10 8 L0 0 L-10 8 Z" fill="${INK}"/><text y="60" font-family="${MONO}" font-size="18" fill="${INK}" text-anchor="middle">N</text></g>`;
}

function planDiagram(study, title) {
  const cols = ["A", "B", "C", "D", "E", "F"];
  const grid = cols
    .map(
      (c, i) =>
        `<line x1="${200 + i * 240}" y1="180" x2="${200 + i * 240}" y2="1020" stroke="${RULE}" stroke-width="1"/><circle cx="${200 + i * 240}" cy="160" r="16" fill="none" stroke="${INK}"/><text x="${200 + i * 240}" y="166" font-family="${MONO}" font-size="16" fill="${INK}" text-anchor="middle">${c}</text>`,
    )
    .join("");
  const blocks = study.blocks
    .map(
      ([x, y, w, h]) =>
        `<rect x="${px(x)}" y="${py(y)}" width="${(w / 100) * 1200}" height="${(h / 100) * 800}" fill="url(#plan-hatch)" stroke="${INK}" stroke-width="3"/>`,
    )
    .join("");
  const court = study.court
    ? `<rect x="${px(study.court[0])}" y="${py(study.court[1])}" width="${(study.court[2] / 100) * 1200}" height="${(study.court[3] / 100) * 800}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><text x="${px(study.court[0]) + (study.court[2] / 100) * 600}" y="${py(study.court[1]) + (study.court[3] / 100) * 400}" font-family="${MONO}" font-size="20" letter-spacing="3" fill="${INK}" text-anchor="middle">COURTYARD</text>`
    : "";
  const first = study.blocks[0];
  const dim = `<g stroke="${GOLD}" stroke-width="2"><line x1="${px(first[0])}" y1="1050" x2="${px(first[0] + first[2])}" y2="1050"/><line x1="${px(first[0])}" y1="1040" x2="${px(first[0])}" y2="1060"/><line x1="${px(first[0] + first[2])}" y1="1040" x2="${px(first[0] + first[2])}" y2="1060"/></g>
    <text x="${px(first[0] + first[2] / 2)}" y="1040" font-family="${MONO}" font-size="18" fill="${GOLD}" text-anchor="middle">${(first[2] * 0.6).toFixed(1)} m</text>`;
  return `<defs>${hatch("plan-hatch", INK)}</defs>${frame(title, "02 · Plan abstraction", study.location)}${grid}${blocks}${court}${dim}
  <g stroke="${GOLD}" stroke-width="2.5" fill="none"><path d="M120 ${py(first[1] + first[3] / 2)} L${px(first[0]) - 10} ${py(first[1] + first[3] / 2)}"/></g>
  <text x="120" y="${py(first[1] + first[3] / 2) - 14}" font-family="${MONO}" font-size="18" letter-spacing="3" fill="${GOLD}">ENTRANCE</text>`;
}

function sectionDiagram(study, title) {
  const xs = [200, 440, 680, 920, 1160, 1400];
  const ground = study.profile.map((v, i) => `${xs[i]} ${200 + (v / 100) * 800}`);
  const groundPath = `M${ground.join(" L")} L1400 1000 L200 1000 Z`;
  const base = 200 + (Math.min(...study.profile) / 100) * 800;
  const levelH = study.levels > 3 ? 70 : 90;
  const bx = 520;
  const bw = 560;
  const levels = Array.from({ length: study.levels })
    .map((_, i) => {
      const y = base - (i + 1) * levelH;
      return `<rect x="${bx}" y="${y}" width="${bw}" height="${levelH}" fill="none" stroke="${INK}" stroke-width="3"/><text x="${bx - 16}" y="${y + levelH / 2 + 6}" font-family="${MONO}" font-size="16" fill="${INK}" text-anchor="end">${String(i).padStart(2, "0")}</text>`;
    })
    .join("");
  const top = base - study.levels * levelH;
  let roof;
  if (study.roof === "pitched")
    roof = `<path d="M${bx - 30} ${top} L${bx + bw / 2} ${top - 120} L${bx + bw + 30} ${top}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  else if (study.roof === "sawtooth") {
    const n = 4;
    const seg = bw / n;
    roof = `<path d="${Array.from({ length: n })
      .map(
        (_, i) =>
          `M${bx + i * seg} ${top} L${bx + i * seg + seg * 0.7} ${top - 90} L${bx + (i + 1) * seg} ${top}`,
      )
      .join(" ")}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  } else if (study.roof === "butterfly")
    roof = `<path d="M${bx - 20} ${top - 80} L${bx + bw / 2} ${top} L${bx + bw + 20} ${top - 80}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  else
    roof = `<line x1="${bx - 40}" y1="${top}" x2="${bx + bw + 40}" y2="${top}" stroke="${INK}" stroke-width="4"/>`;
  return `<defs>${hatch("ground-hatch", "#9a8f79")}</defs>${frame(title, "03 · Section", study.location)}
  <path d="${groundPath}" fill="url(#ground-hatch)" stroke="#7d7466" stroke-width="2"/>
  ${levels}${roof}
  <line x1="200" y1="${base}" x2="1400" y2="${base}" stroke="${GOLD}" stroke-width="2"/>
  <text x="1400" y="${base - 12}" font-family="${MONO}" font-size="18" letter-spacing="3" fill="${GOLD}" text-anchor="end">DATUM ±0.00</text>
  <text x="200" y="176" font-family="${MONO}" font-size="18" letter-spacing="3" fill="${INK}">${study.roof.toUpperCase()} ROOF · ${study.levels} LEVEL${study.levels > 1 ? "S" : ""}</text>`;
}

function materialDiagram(study, title) {
  const rows = study.materials
    .map(([name, color], i) => {
      const y = 240 + i * 190;
      const share = [46, 26, 18, 10][i] ?? 10;
      return `<rect x="200" y="${y}" width="150" height="150" fill="${color}"/><rect x="200" y="${y}" width="150" height="150" fill="none" stroke="${INK}" stroke-width="2"/>
      <text x="400" y="${y + 58}" font-family="${SANS}" font-size="36" font-weight="700" fill="${INK}">${name}</text>
      <text x="400" y="${y + 96}" font-family="${MONO}" font-size="18" letter-spacing="3" fill="#6b6f76">0${i + 1} · ${share}% OF VISIBLE SURFACE (STUDY)</text>
      <rect x="400" y="${y + 116}" width="${share * 10}" height="10" fill="${GOLD}"/><rect x="400" y="${y + 116}" width="1000" height="10" fill="none" stroke="${RULE}"/>`;
    })
    .join("");
  return `${frame(title, "04 · Material palette", study.location)}${rows}`;
}

function sequenceDiagram(study, title) {
  const n = study.sequence.length;
  const cellW = 1200 / n;
  const cells = study.sequence
    .map((label, i) => {
      const x = 200 + i * cellW;
      const fills = Array.from({ length: n })
        .map((_, j) => {
          const y = 760 - j * 90;
          const done = j <= i;
          return `<rect x="${x + 28}" y="${y}" width="${cellW - 56}" height="80" fill="${done ? INK : "none"}" stroke="${INK}" stroke-width="${done ? 0 : 1.5}" stroke-dasharray="${done ? "" : "6 6"}" opacity="${done ? 0.9 : 0.5}"/>`;
        })
        .join("");
      return `${fills}<line x1="${x + 20}" y1="850" x2="${x + cellW - 20}" y2="850" stroke="${GOLD}" stroke-width="2"/>
      <text x="${x + 28}" y="900" font-family="${MONO}" font-size="20" letter-spacing="3" fill="${GOLD}">0${i + 1}</text>
      <text x="${x + 28}" y="936" font-family="${SANS}" font-size="24" font-weight="700" fill="${INK}">${label}</text>`;
    })
    .join("");
  return `${frame(title, "05 · Construction sequence study", study.location)}${cells}`;
}

const kinds = {
  site: siteDiagram,
  plan: planDiagram,
  section: sectionDiagram,
  materials: materialDiagram,
  sequence: sequenceDiagram,
};

const only = process.argv[2]?.split(",");
for (const [slug, study] of Object.entries(studies)) {
  if (only && !only.includes(slug)) continue;
  const title = slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  const dir = join("public", "media", "renz-preview", "projects", slug);
  mkdirSync(dir, { recursive: true });
  for (const [kind, draw] of Object.entries(kinds)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${draw(study, title)}</svg>`;
    const out = join(dir, `diagram-${kind}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(out);
  }
  console.log("drawn", slug);
}
