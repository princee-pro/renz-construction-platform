import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Deterministic source tracing, including the actual lettering; no replacement font.
// See docs/RENZ_ORANGE_BRAND.md. The original is read only.
const source = await readFile(
  new URL("../references/client/originals/04-renz-orange-reference.png", import.meta.url),
);
if (
  createHash("sha256").update(source).digest("hex") !==
  "c5a349fc21651758795081d364408a5b17694117b5e17022b898fdaae142f5b2"
)
  throw new Error("Approved orange reference hash mismatch.");
const { data, info } = await sharp(source)
  .removeAlpha()
  .blur(0.7)
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;
const mask = new Uint8Array(width * height);
for (let i = 0; i < mask.length; i++) {
  const [r, g, b] = data.subarray(i * 3, i * 3 + 3);
  mask[i] = Number(r > 170 && g > 60 && g < 190 && b < 100 && r - g > 50);
}
const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x];
const key = (x, y) => y * (width + 1) + x;
const point = (id) => [id % (width + 1), Math.floor(id / (width + 1))];
const edges = new Map();
function edge(x1, y1, x2, y2) {
  const start = key(x1, y1);
  const ends = edges.get(start) ?? [];
  ends.push(key(x2, y2));
  edges.set(start, ends);
}
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (!filled(x, y)) continue;
    if (!filled(x, y - 1)) edge(x, y, x + 1, y);
    if (!filled(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!filled(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!filled(x - 1, y)) edge(x, y + 1, x, y);
  }
}
// Ramer–Douglas–Peucker removes raster stair steps within 0.8 source pixels.
function simplify(points) {
  const first = points[0];
  const last = points.at(-1);
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const length = dx * dx + dy * dy;
  let distance = 0.64;
  let split = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const t = length
      ? Math.max(0, Math.min(1, ((x - first[0]) * dx + (y - first[1]) * dy) / length))
      : 0;
    const d = (x - first[0] - t * dx) ** 2 + (y - first[1] - t * dy) ** 2;
    if (d > distance) {
      distance = d;
      split = i;
    }
  }
  return split
    ? [...simplify(points.slice(0, split + 1)).slice(0, -1), ...simplify(points.slice(split))]
    : [first, last];
}
const contours = [];
while (edges.size) {
  const start = edges.keys().next().value;
  const points = [];
  let current = start;
  do {
    points.push(point(current));
    const ends = edges.get(current);
    if (!ends?.length) throw new Error("Unclosed source contour.");
    const next = ends.pop();
    if (!ends.length) edges.delete(current);
    current = next;
  } while (current !== start);
  // Ignore isolated compression flecks, never letters or the symbol.
  if (points.length < 20) continue;
  points.push(points[0]);
  contours.push(simplify(points));
}
const symbol = contours.filter((points) => points.every(([x]) => x < 310));
const wordmark = contours.filter((points) => points.every(([x]) => x > 310));
if (symbol.length !== 2 || wordmark.length < 16)
  throw new Error(`Unexpected logo contours: ${symbol.length}, ${wordmark.length}.`);
// Short quadratic joins soften raster noise without rounding long letter stems.
const path = (points) => {
  const ring = points.slice(0, -1);
  const near = (a, b) => {
    const fraction = Math.min(0.5, 1 / Math.hypot(b[0] - a[0], b[1] - a[1]));
    return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction]
      .map((value) => Number(value.toFixed(2)))
      .join(" ");
  };
  return (
    "M" +
    near(ring[0], ring.at(-1)) +
    ring
      .map((p, i) => {
        const previous = ring[(i + ring.length - 1) % ring.length];
        const next = ring[(i + 1) % ring.length];
        return "L" + near(p, previous) + "Q" + p.join(" ") + " " + near(p, next);
      })
      .join("") +
    "Z"
  );
};
function svg(viewBox, shapes) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><title>Renz Construction</title><path fill="#e7731e" fill-rule="evenodd" d="${shapes.map(path).join("")}"/></svg>\n`;
}
const assets = {
  "renz-construction.svg": svg("-8 368 1183 306", contours),
  "renz-construction-icon.svg": svg("-4 372 303 298", symbol),
  "renz-construction-wordmark.svg": svg("329 405 842 237", wordmark),
};
for (const [name, value] of Object.entries(assets)) {
  await writeFile(new URL(`../public/media/brand/${name}`, import.meta.url), value);
}
console.log("Generated three transparent orange SVGs from the approved reference contours.");
