/* global document, window */
// D1.6 typography audition (brief §25): renders the live public pages with
// each candidate family injected over --font-display/--font-body, at 1440
// and 390, and writes a labelled contact sheet per family.
//   node scripts/d16-font-audition.mjs
// Fonts are served from public/audition-fonts — a temporary folder that was
// removed after the decision (Manrope won). To rerun, fetch the latin woff2
// files from Google Fonts (OFL) into public/audition-fonts as
// poppins-{400,500,600,700}.woff2, manrope.woff2, plusjakarta.woff2.
// Output: .playwright/screenshots/d1-6/typography/*.png
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const dir = ".playwright/screenshots/d1-6/typography";
mkdirSync(dir, { recursive: true });

const families = {
  current: null,
  poppins: `
    @font-face{font-family:"Aud";src:url(/audition-fonts/poppins-400.woff2) format("woff2");font-weight:400}
    @font-face{font-family:"Aud";src:url(/audition-fonts/poppins-500.woff2) format("woff2");font-weight:500}
    @font-face{font-family:"Aud";src:url(/audition-fonts/poppins-600.woff2) format("woff2");font-weight:600}
    @font-face{font-family:"Aud";src:url(/audition-fonts/poppins-700.woff2) format("woff2");font-weight:700}
    :root{--font-display:"Aud",sans-serif;--font-body:"Aud",sans-serif}
    h1,h2,h3,.hero-headline{letter-spacing:-0.03em}`,
  manrope: `
    @font-face{font-family:"Aud";src:url(/audition-fonts/manrope.woff2) format("woff2");font-weight:200 800}
    :root{--font-display:"Aud",sans-serif;--font-body:"Aud",sans-serif}
    h1,h2,h3,.hero-headline{letter-spacing:-0.035em;font-weight:700}`,
  jakarta: `
    @font-face{font-family:"Aud";src:url(/audition-fonts/plusjakarta.woff2) format("woff2");font-weight:200 800}
    :root{--font-display:"Aud",sans-serif;--font-body:"Aud",sans-serif}
    h1,h2,h3,.hero-headline{letter-spacing:-0.03em;font-weight:700}`,
};

const captures = [
  { route: "/", width: 1440, name: "hero", scroll: 0 },
  { route: "/", width: 1440, name: "services", scroll: 1300 },
  { route: "/services/design", width: 1440, name: "body", scroll: 1500 },
  { route: "/contact", width: 1440, name: "form", scroll: 1000 },
  { route: "/", width: 390, name: "mobile-hero", scroll: 0 },
  { route: "/services", width: 390, name: "mobile-body", scroll: 1400 },
];

const browser = await chromium.launch();
for (const [family, css] of Object.entries(families)) {
  const tiles = [];
  for (const capture of captures) {
    const height = capture.width < 768 ? 844 : 900;
    const context = await browser.newContext({ viewport: { width: capture.width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));
    await page.goto(base + capture.route, { waitUntil: "load", timeout: 120000 });
    if (css) await page.addStyleTag({ content: css });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.evaluate((top) => window.scrollTo(0, top), capture.scroll);
    await page.waitForTimeout(900);
    const buffer = await page.screenshot({ type: "png" });
    tiles.push({ buffer, width: capture.width, height, name: capture.name });
    await context.close();
  }
  // Contact sheet: desktop tiles scaled to 720 wide, mobile tiles at 390.
  const scaled = [];
  let x = 0;
  const rowHeight = 480;
  for (const tile of tiles) {
    const w = tile.width < 768 ? 220 : 720;
    const h = Math.round((tile.height / tile.width) * w);
    const img = await sharp(tile.buffer).resize(w, h).png().toBuffer();
    scaled.push({ input: img, left: x, top: 40 });
    x += w + 16;
  }
  const label = Buffer.from(
    `<svg width="${x}" height="36"><text x="8" y="26" font-family="Arial" font-size="22" fill="#071523">${family.toUpperCase()}</text></svg>`,
  );
  await sharp({ create: { width: x, height: rowHeight + 40, channels: 3, background: "#e9e5dc" } })
    .composite([{ input: label, left: 0, top: 0 }, ...scaled])
    .png()
    .toFile(`${dir}/${family}.png`);
  // Full-size hero and mobile hero per family for close inspection.
  await sharp(tiles[0].buffer).png().toFile(`${dir}/${family}-hero-1440.png`);
  await sharp(tiles[2].buffer).png().toFile(`${dir}/${family}-body-1440.png`);
  await sharp(tiles[4].buffer).png().toFile(`${dir}/${family}-hero-390.png`);
  console.log("audition", family);
}
await browser.close();
