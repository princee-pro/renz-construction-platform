/* global window */
// D1.6 hero loop renderer. Renders a "living still" (slow camera drift, a
// passing light sweep and drifting haze over a concept image) frame by frame
// with Chromium and encodes it as a short muted WebM (VP8) with the ffmpeg
// bundled by Playwright. Used while no generative video tool is connected;
// the output is a CONCEPT VISUAL derived from an already-labelled concept
// image and must be registered as such.
//
//   node scripts/d16-render-loop.mjs <image> <out.webm> [seconds] [width] [height]
//
// Also writes a poster (<out>.poster.webp) from the first frame.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { chromium } from "@playwright/test";
import sharp from "sharp";

const [, , imageArg, outArg, secondsArg = "7", widthArg = "1280", heightArg = "720"] = process.argv;
if (!imageArg || !outArg) {
  console.error("usage: node scripts/d16-render-loop.mjs <image> <out.webm> [seconds] [w] [h]");
  process.exit(1);
}
const seconds = Number(secondsArg);
const width = Number(widthArg);
const height = Number(heightArg);
const fps = 24;
const frames = Math.round(seconds * fps);
const out = resolve(outArg);
const tmp = join(dirname(out), `.frames-${basename(out, ".webm")}`);
mkdirSync(tmp, { recursive: true });

const image = readFileSync(resolve(imageArg));
const dataUri = `data:image/webp;base64,${image.toString("base64")}`;

// The scene: a loop-safe drift (sine-based so the last frame meets the first),
// a soft light sweep and a haze layer. Everything is a function of t ∈ [0,1).
const html = `<!doctype html><html><head><style>
  html,body{margin:0;background:#071523;width:${width}px;height:${height}px;overflow:hidden}
  .stage{position:relative;width:${width}px;height:${height}px;overflow:hidden}
  .img{position:absolute;inset:-6%;background:url(${dataUri}) center/cover no-repeat;will-change:transform}
  .light{position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,236,190,.16) 50%,transparent 70%);mix-blend-mode:screen}
  .haze{position:absolute;inset:0;background:radial-gradient(60% 40% at 30% 70%,rgba(233,229,220,.16),transparent 70%)}
  .grade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,21,35,.18),rgba(7,21,35,0) 40%,rgba(7,21,35,.32))}
</style></head><body><div class="stage"><div class="img" id="img"></div><div class="light" id="light"></div><div class="haze" id="haze"></div><div class="grade"></div></div>
<script>
  window.setFrame = (t) => {
    const s = 1.04 + 0.03 * (1 - Math.cos(t * 2 * Math.PI)) / 2;
    const x = -1.2 * Math.sin(t * 2 * Math.PI);
    const y = 0.8 * (1 - Math.cos(t * 2 * Math.PI)) / 2;
    document.getElementById('img').style.transform = 'scale(' + s + ') translate(' + x + '%,' + y + '%)';
    document.getElementById('light').style.transform = 'translateX(' + ((t * 160) - 80) + '%)';
    document.getElementById('haze').style.transform = 'translateX(' + (6 * Math.sin(t * 2 * Math.PI)) + '%)';
  };
</script></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.waitForTimeout(300);
for (let i = 0; i < frames; i += 1) {
  await page.evaluate((t) => window.setFrame(t), i / frames);
  await page.screenshot({
    type: "jpeg",
    quality: 92,
    path: join(tmp, `f${String(i).padStart(4, "0")}.jpg`),
  });
}
await browser.close();

const ffmpeg = join(
  homedir(),
  "AppData",
  "Local",
  "ms-playwright",
  "ffmpeg-1011",
  "ffmpeg-win64.exe",
);
// The bundled ffmpeg only carries the image2pipe demuxer and the MJPEG
// decoder, so the JPEG frames are concatenated on stdin.
const stream = Buffer.concat(
  Array.from({ length: frames }, (_, i) =>
    readFileSync(join(tmp, `f${String(i).padStart(4, "0")}.jpg`)),
  ),
);
const encoded = spawnSync(
  ffmpeg,
  [
    "-y",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-framerate",
    String(fps),
    "-i",
    "pipe:0",
    "-c:v",
    "libvpx",
    "-b:v",
    "1400k",
    "-crf",
    "12",
    "-quality",
    "good",
    "-cpu-used",
    "1",
    "-pix_fmt",
    "yuv420p",
    "-an",
    out,
  ],
  { input: stream, maxBuffer: 1024 * 1024 * 512 },
);
if (encoded.status !== 0) {
  console.error(encoded.stderr.toString().slice(-2000));
  process.exit(1);
}
await sharp(join(tmp, "f0000.jpg"))
  .webp({ quality: 82 })
  .toFile(out.replace(/\.webm$/u, ".poster.webp"));
writeFileSync(
  out.replace(/\.webm$/u, ".json"),
  JSON.stringify(
    {
      source: basename(imageArg),
      seconds,
      fps,
      width,
      height,
      codec: "vp8/webm",
      provenance: "generated_reference (concept visual)",
    },
    null,
    2,
  ),
);
rmSync(tmp, { recursive: true, force: true });
console.log("rendered", out);
