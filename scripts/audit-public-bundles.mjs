#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * CR1 §110: no CMS editor JavaScript may reach a public route. Reads the
 * production build (`next build` first): every static chunk containing the
 * admin website editor is listed, then every public route's client
 * reference manifest is checked against that list.
 */
const root = process.cwd();
const chunkDir = join(root, ".next", "static", "chunks");
const publicDir = join(root, ".next", "server", "app", "(public)");
const markers = /page-editor|SectionEditor|media-picker|website-cms|saveWebsiteSectionAction/u;

const cmsChunks = new Set(
  readdirSync(chunkDir)
    .filter((name) => name.endsWith(".js"))
    .filter((name) => markers.test(readFileSync(join(chunkDir, name), "utf8")))
    .map((name) => `/_next/static/chunks/${name}`),
);

function manifests(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...manifests(full));
    else if (entry.endsWith("client-reference-manifest.js")) found.push(full);
  }
  return found;
}

const offenders = [];
for (const manifest of manifests(publicDir)) {
  const source = readFileSync(manifest, "utf8");
  const referenced = new Set(source.match(/\/_next\/static\/chunks\/[^"']+\.js/gu) ?? []);
  const hits = [...referenced].filter((chunk) => cmsChunks.has(chunk));
  if (hits.length > 0) offenders.push({ route: manifest.slice(publicDir.length), hits });
}

if (offenders.length > 0) {
  console.error("CMS editor chunks are reachable from public routes:");
  for (const offender of offenders)
    console.error(` ${offender.route}: ${offender.hits.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Public bundle audit passed: ${cmsChunks.size} CMS chunk(s) (${[...cmsChunks].map((c) => basename(c)).join(", ")}) are referenced by no public route.`,
  );
}
