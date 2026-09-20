// Creates Higgsfield image jobs for the D1.7 prompts (skipping downloaded
// ones), waits for them and downloads the PNG results into .playwright/d17-gen.
//   HIGGSFIELD_CLI=<path to higgsfield.js> node scripts/d17-generate.mjs <prompts.json> [slug,slug]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const prompts = JSON.parse(readFileSync(process.argv[2], "utf8"));
const only = process.argv[3]?.split(",");
const dir = ".playwright/d17-gen";
mkdirSync(dir, { recursive: true });
const manifestPath = `${dir}/manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

function hf(args) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [process.env.HIGGSFIELD_CLI ?? "higgsfield.js", ...args, "--json"],
      { encoding: "utf8", maxBuffer: 1 << 24 },
    ),
  );
}

for (const entry of prompts) {
  const key = `${entry.slug}-${entry.role}`;
  if (only && !only.includes(entry.slug)) continue;
  if (existsSync(`${dir}/${key}.png`)) {
    console.log("have", key);
    continue;
  }
  const model = entry.model ?? "seedream_v5_lite";
  const args = [
    "generate",
    "create",
    model,
    "--prompt",
    entry.prompt,
    "--aspect_ratio",
    entry.aspect ?? "16:9",
  ];
  if (model === "seedream_v5_lite") args.push("--quality", "high");
  if (entry.reference) args.push("--image-references", entry.reference);
  const [id] = hf(args);
  console.log("created", key, id);
  const result = hf(["generate", "wait", id, "--timeout", "10m", "--interval", "5s"]);
  if (result.status !== "completed" || !result.result_url) {
    console.log("FAILED", key, result.status);
    continue;
  }
  execFileSync("curl", ["-sL", "-o", `${dir}/${key}.png`, result.result_url]);
  manifest[key] = {
    id,
    model: result.job_type,
    seed: result.params?.seed,
    width: result.params?.width,
    height: result.params?.height,
    prompt: entry.prompt,
    generated_at: result.created_at,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("downloaded", key);
}
