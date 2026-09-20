import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import sharp from "sharp";

const [inputArgument, outputArgument] = process.argv.slice(2);

if (!inputArgument || !outputArgument) {
  throw new Error("Usage: node scripts/optimize-preview-asset.mjs <input-image> <output.webp>");
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);

await mkdir(dirname(outputPath), { recursive: true });
await sharp(inputPath)
  .rotate()
  .resize({ width: 2400, withoutEnlargement: true })
  .webp({ quality: 84, effort: 6, smartSubsample: true })
  .toFile(outputPath);

const metadata = await sharp(outputPath).metadata();
console.log(
  JSON.stringify({
    output: outputPath,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    size: metadata.size,
  }),
);
