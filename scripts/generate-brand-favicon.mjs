import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

// Derive browser fallbacks from the canonical SVG; never draw a second logo.
const source = new URL("../public/media/brand/renz-construction-icon.svg", import.meta.url);
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map(async (size) => {
    const height = size - 2;
    const symbol = await sharp(fileURLToPath(source), { density: 384 })
      .resize(size - 2, height, { fit: "inside" })
      .png()
      .toBuffer();
    // A white tile preserves the approved orange identity in browser chrome.
    return sharp({
      create: { width: size, height: size, channels: 4, background: "#ffffff" },
    })
      .composite([{ input: symbol, gravity: "centre" }])
      .png()
      .toBuffer();
  }),
);

const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, image] of images.entries()) {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
}
await writeFile(
  new URL("../src/app/favicon.ico", import.meta.url),
  Buffer.concat([header, ...images]),
);
console.log("Generated favicon.ico from the approved SVG: 16, 32, 48 px.");
await sharp(fileURLToPath(source), { density: 384 })
  .resize(152, 152, { fit: "contain", background: "#ffffff" })
  .extend({ top: 14, bottom: 14, left: 14, right: 14, background: "#ffffff" })
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(fileURLToPath(new URL("../src/app/apple-icon.png", import.meta.url)));
