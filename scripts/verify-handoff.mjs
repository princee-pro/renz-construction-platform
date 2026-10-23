#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const requiredDocuments = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/HANDOFF_START_HERE.md",
  "docs/ARCHITECTURE_OVERVIEW.md",
  "docs/DATA_MODEL_AND_RELATIONSHIPS.md",
  "docs/ADMIN_USER_GUIDE.md",
  "docs/WEBSITE_CMS_GUIDE.md",
  "docs/SECURITY_MODEL.md",
  "docs/ENVIRONMENT_SETUP.md",
  "docs/TESTING_AND_QA_GUIDE.md",
  "docs/DEPLOYMENT_HANDOFF.md",
  "docs/CURRENT_STATUS_AND_OPEN_ITEMS.md",
  "docs/ASSET_AND_LICENSE_REGISTER.md",
];

const excludedSegments = new Set([
  ".git",
  ".local",
  ".next",
  ".playwright",
  ".supabase",
  ".netlify",
  ".vercel",
  ".cache",
  ".turbo",
  ".pnpm-store",
  ".nyc_output",
  "node_modules",
  "graphify-out",
  "tmp",
  "temp",
  "dist",
  "build",
  "out",
  "coverage",
  "test-results",
  "playwright-report",
  "blob-report",
]);
const largeFileBytes = 50 * 1024 * 1024;

/** Path checks only: never open environment files, archives or ignored data. */
export function unsafeCandidateReason(path) {
  const normalized = path.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => excludedSegments.has(segment))) return "local/generated directory";
  if (/^supabase\/\.(?:temp|branches)(?:\/|$)/u.test(normalized)) return "local Supabase state";
  const name = basename(normalized);
  if (/^\.env(?:\.|$)/iu.test(name) && name !== ".env.example") return "real environment-file path";
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/iu.test(name)) return "private credential-file path";
  if (
    /\.(?:zip|7z|rar|tar|tgz|gz|bz2|xz|dump|sqlite|sqlite3|db|log|bak|tmp|tsbuildinfo)$/iu.test(
      name,
    )
  ) {
    return "archive/database/log/cache artifact";
  }
  if (/^(?:credentials|storage[-_]?state|session|accounts|totp)(?:[._-].*)?\.json$/iu.test(name)) {
    return "local account/session fixture data";
  }
  if (/^(?:backup|dump)(?:[._-].*)?\.(?:sql|csv|json)$/iu.test(name)) return "backup/export data";
  return null;
}

/** Bounded Markdown link extraction, including balanced parentheses and references. */
export function markdownTargets(markdown) {
  const text = markdown.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gmu, "");
  const targets = [];
  const start = /!?\[[^\]\n]*\]\(/gu;
  for (const match of text.matchAll(start)) {
    const offset = match.index + match[0].length;
    let depth = 1;
    let inAngles = false;
    let target = "";
    for (let index = offset; index < text.length; index += 1) {
      const character = text[index];
      if (character === "\\" && index + 1 < text.length) {
        target += character + text[index + 1];
        index += 1;
        continue;
      }
      if (character === "<" && target.trim() === "") inAngles = true;
      if (character === ">") inAngles = false;
      if (!inAngles && character === "(") depth += 1;
      if (!inAngles && character === ")") depth -= 1;
      if (depth === 0) break;
      target += character;
    }
    if (depth === 0) targets.push(target.trim());
  }
  for (const match of text.matchAll(/^\s{0,3}\[[^\]\n]+\]:\s*(<[^>]+>|\S+)/gmu)) {
    targets.push(match[1]);
  }
  return targets.map((target) => {
    if (target.startsWith("<")) return target.slice(1, target.indexOf(">"));
    return target.replace(/\s+["'(].*$/u, "").replace(/\\([()[\] ])/gu, "$1");
  });
}

function safePath(path) {
  return path.replace(
    /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/gu,
    "[credential-like-name]",
  );
}

export async function verifyHandoff(root, includeInventory = false) {
  const candidatePaths = [
    ...new Set(
      execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      })
        .split("\0")
        .filter(Boolean),
    ),
  ].sort();
  const issues = [];
  const inventory = [];
  const candidates = new Set(candidatePaths);
  for (const path of candidatePaths) {
    const reason = unsafeCandidateReason(path);
    if (reason) {
      issues.push({ path: safePath(path), reason });
      continue;
    }
    const absolute = resolve(root, path);
    const local = relative(root, absolute);
    if (isAbsolute(local) || local === ".." || local.startsWith(`..${sep}`)) {
      issues.push({ path: safePath(path), reason: "candidate escapes repository" });
      continue;
    }
    try {
      const file = await lstat(absolute);
      if (!file.isFile()) {
        issues.push({
          path: safePath(path),
          reason: "not a regular file (symlinks are not followed)",
        });
        continue;
      }
      inventory.push({ path, bytes: file.size });
      if (file.size > largeFileBytes)
        issues.push({ path: safePath(path), reason: "file exceeds 50 MiB" });
    } catch {
      issues.push({
        path: safePath(path),
        reason: "tracked/candidate file is absent or unreadable",
      });
    }
  }

  let documentsPresent = 0;
  let localLinksChecked = 0;
  for (const path of requiredDocuments) {
    if (!candidates.has(path)) {
      issues.push({ path, reason: "required handoff document is not a committable candidate" });
      continue;
    }
    let text;
    try {
      const file = await lstat(resolve(root, path));
      if (!file.isFile() || file.isSymbolicLink()) throw new Error("not a file");
      text = await readFile(resolve(root, path), "utf8");
    } catch {
      issues.push({ path, reason: "required handoff document is absent/unreadable" });
      continue;
    }
    documentsPresent += 1;
    for (const target of markdownTargets(text)) {
      if (!target || target.startsWith("#")) continue;
      if (/^[A-Za-z]:[\\/]/u.test(target)) {
        issues.push({ path, reason: "machine-specific absolute link" });
        continue;
      }
      if (/^[A-Za-z][A-Za-z\d+.-]*:/u.test(target) || target.startsWith("//")) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(target.split(/[?#]/u, 1)[0]);
      } catch {
        issues.push({ path, reason: "malformed local link encoding" });
        continue;
      }
      const destination = decoded.startsWith("/")
        ? resolve(root, `.${decoded}`)
        : resolve(root, dirname(path), decoded);
      const local = relative(root, destination);
      localLinksChecked += 1;
      if (isAbsolute(local) || local === ".." || local.startsWith(`..${sep}`)) {
        issues.push({ path, target: safePath(target), reason: "local link escapes repository" });
        continue;
      }
      if (unsafeCandidateReason(local)) {
        issues.push({
          path,
          target: safePath(target),
          reason: "link depends on excluded local data",
        });
        continue;
      }
      try {
        const linked = await lstat(destination);
        if (linked.isSymbolicLink()) throw new Error("link is a symlink");
      } catch {
        issues.push({
          path,
          target: safePath(target),
          reason: "missing or symlink local link target",
        });
      }
    }
  }

  const migrations = (await readdir(resolve(root, "supabase/migrations")))
    .filter((path) => /^\d{14}_.+\.sql$/u.test(path))
    .sort();
  const migrationCandidates = candidatePaths.filter((path) =>
    /^supabase\/migrations\/\d{14}_.+\.sql$/u.test(path),
  );
  if (migrations.length === 0 || migrationCandidates.length !== migrations.length) {
    issues.push({ path: "supabase/migrations", reason: "missing or excluded migration files" });
  }
  const fingerprint = createHash("sha256")
    .update(inventory.map(({ path, bytes }) => `${path}\0${bytes}\0`).join(""))
    .digest("hex");
  return {
    status: issues.length === 0 ? "PASS" : "FAIL",
    readOnly: true,
    requiredDocuments: requiredDocuments.length,
    documentsPresent,
    localLinksChecked,
    migrations: migrations.length,
    latestMigration: migrations.at(-1) ?? null,
    candidateFiles: candidatePaths.length,
    inventoriedFiles: inventory.length,
    candidateBytes: inventory.reduce((total, file) => total + file.bytes, 0),
    inventoryPathSizeSha256: fingerprint,
    largeFileThresholdBytes: largeFileBytes,
    issues,
    ...(includeInventory
      ? { inventory: inventory.map((file) => ({ ...file, path: safePath(file.path) })) }
      : {}),
    limits: [
      "Path/size and local Markdown target checks only; this does not scan file contents or Git history.",
      "No ignored data is opened; no files, database, credentials or external systems are modified.",
      "Remote URLs, Markdown fragment anchors and actual environment/cloud setup are not verified.",
    ],
  };
}

async function main() {
  const options = process.argv.slice(2);
  if (options.includes("--help")) {
    console.log(
      "Usage: node scripts/verify-handoff.mjs [--inventory]\nRead-only: verify 14 handoff documents, local Markdown links, migration inclusion, committable file paths and a 50 MiB size gate. --inventory includes every safe candidate path and byte size. No contents or ignored data are scanned.",
    );
    return;
  }
  if (options.some((option) => option !== "--inventory"))
    throw new Error("Unsupported option; use --help.");
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const result = await verifyHandoff(root, options.includes("--inventory"));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "PASS" ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error(
      "Handoff verification could not complete. Run from the Git checkout with readable handoff documents and migrations; no file contents were printed.",
    );
    process.exitCode = 2;
  });
}
