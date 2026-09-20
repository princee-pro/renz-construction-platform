import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(script, label, timeout) {
  const result = spawnSync(process.execPath, [join(root, "scripts", script)], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DO_NOT_TRACK: "1" },
    maxBuffer: 30 * 1024 * 1024,
    timeout,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status ?? "unknown"}.`);
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function verifyVisualEvidence() {
  const screenshotRoot = join(root, ".playwright", "screenshots");
  const requiredScreenshots = [
    "s9ap-1440-opener-resolving.png",
    "s9ap-1440-home-initial.png",
    "s9ap-1440-home-scroll.png",
    "s9ap-1440-menu.png",
    "s9ap-1440-projects.png",
    "s9ap-1440-project-experience.png",
    "s9ap-1440-project-story.png",
    "s9ap-1440-about.png",
    "s9ap-1440-contact.png",
    "s9ap-1440-insights.png",
    "s9ap-1440-brand-study.png",
    "s9ap-390-home.png",
    "s9ap-390-menu.png",
    "s9ap-390-projects.png",
    "s9ap-390-project-story.png",
    "s9ap-390-about.png",
    "s9ap-390-contact.png",
    "s9ap-768-home.png",
    "s9ap-768-project-story.png",
    "s9ap-1728-home.png",
    "s9ap-1728-projects.png",
    "s9ap-reduced-hero.png",
    "s9ap-opener-resolved.png",
  ];

  for (const filename of requiredScreenshots) {
    const path = join(screenshotRoot, filename);
    if (statSync(path).size < 10_000) {
      throw new Error(`S9A-P screenshot is unexpectedly small: ${filename}.`);
    }
  }

  const resolving = sha256(join(screenshotRoot, "s9ap-1440-opener-resolving.png"));
  const resolved = sha256(join(screenshotRoot, "s9ap-1440-home-initial.png"));
  if (resolving === resolved) {
    throw new Error("The opener-resolving and resolved-home screenshots are byte-identical.");
  }

  const assets = new Map([
    [
      join(root, "references", "client", "originals", "01-renz-brand-board.png"),
      "FE6B0AE0E742EF012A0273F70F676ED838B8F50262FA4D530C941D47361ECDAB",
    ],
    [
      join(root, "design", "concepts", "01-homepage-hero.png"),
      "80A2527510A24A4BA8E815D382D641447FEA5DF0E8EA3A0F905B90C3CF0E5280",
    ],
    [
      join(root, "design", "concepts", "03-homepage-selected-projects.png"),
      "22C07B7F19E2CDD0EAB9221590F3D53F28175A4ED456624D30E82A4D96F20634",
    ],
    [
      join(root, "design", "concepts", "06-project-detail.png"),
      "B93AA8685CAC85A579E787612A80DC41D81633F09E6CD3F997C2AA46B4F14E39",
    ],
  ]);

  for (const [path, expected] of assets) {
    if (sha256(path) !== expected) throw new Error(`S9A-P asset integrity failed: ${path}.`);
  }

  process.stdout.write(
    `S9A-P visual evidence passed: ${requiredScreenshots.length} required captures, distinct opener state, and four source hashes verified.\n`,
  );
}

run("verify-s6a.mjs", "S9A-P public, S6A, and S5A regression verification", 1_800_000);
verifyVisualEvidence();
run("verify-s9ap-preview-off.mjs", "S9A-P preview-off boundary verification", 180_000);
process.stdout.write("S9A-P signature experience verification passed.\n");
