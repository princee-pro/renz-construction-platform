#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());

// Local-only environment files are git-ignored by design (`.env.*` except the
// example) and are where a developer keeps the local stack credential.
const excludedFiles = new Set([".env.local", ".env.development.local", ".env.test.local"]);

const excludedDirectories = new Set([
  ".cache",
  ".git",
  ".next",
  ".output",
  ".pnpm-store",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "temp",
  "test-results",
  "tmp",
]);

const excludedExtensions = new Set([
  ".7z",
  ".ai",
  ".avi",
  ".avif",
  ".bin",
  ".bmp",
  ".bz2",
  ".db",
  ".dll",
  ".doc",
  ".docx",
  ".dylib",
  ".eot",
  ".eps",
  ".exe",
  ".flac",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".ogg",
  ".otf",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".psd",
  ".rar",
  ".so",
  ".sqlite",
  ".tar",
  ".tgz",
  ".tif",
  ".tiff",
  ".ttf",
  ".wav",
  ".wasm",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".xz",
  ".zip",
]);

const directRules = [
  {
    name: "private key",
    pattern: /-----BEGIN(?: [A-Z0-9][A-Z0-9 ]*)? PRIVATE KEY-----/g,
  },
  {
    name: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: "GitHub token",
    pattern: /\b(?:gh[oprsu]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{70,255})\b/g,
  },
  {
    name: "Slack token",
    pattern: /\bxox[aboprs]-[A-Za-z0-9-]{24,}\b/g,
  },
  {
    name: "OpenAI-style key",
    pattern: /\bsk-(?:(?:proj|svcacct)-)?[A-Za-z0-9_-]{40,}\b/g,
  },
  {
    name: "Supabase sensitive key",
    pattern: /\b(?:sb_secret_[A-Za-z0-9_-]{20,}|sbp_[A-Za-z0-9]{40,})\b/g,
  },
  {
    name: "JWT-like credential",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
];

const credentialName = String.raw`[A-Za-z_][A-Za-z0-9_.-]*(?:api[_-]?key|apikey|access[_-]?token|accesstoken|auth[_-]?token|authtoken|client[_-]?secret|clientsecret|private[_-]?key|privatekey|password|passwd|secret(?:[_-]?key)?)`;

const quotedAssignmentPattern = new RegExp(
  String.raw`(?:^|[\s,{;])["']?(?<name>${credentialName})["']?\s*[:=]\s*(?<quote>["'])(?<candidate>[^\s"'\r\n]{16,})\k<quote>`,
  "gi",
);

const bareAssignmentPattern = new RegExp(
  String.raw`(?:^|[\s,{;])["']?(?<name>${credentialName})["']?\s*[:=]\s*(?<candidate>[A-Za-z0-9+/_=.\-]{16,})`,
  "gi",
);

const placeholderIndicators = [
  /^\*+$/,
  /^x+$/i,
  /^<.+>$/,
  /^\$\{.+}$/,
  /(?:change-?me|dummy|example|fake|placeholder|redacted|sample|test|your[-_])/i,
  /(?:process\.env|import\.meta\.env)/i,
];

function normalizePath(filePath) {
  return relative(repositoryRoot, filePath).replaceAll("\\", "/");
}

function redact(candidate) {
  if (candidate.length < 24) {
    return `[redacted; ${candidate.length} chars]`;
  }

  return `${candidate.slice(0, 3)}\u2026${candidate.slice(-2)} [${candidate.length} chars]`;
}

function isPlausibleAssignedCredential(candidate) {
  const value = candidate.trim();

  if (value.length < 12 || placeholderIndicators.some((pattern) => pattern.test(value))) {
    return false;
  }

  // Require more than one character class so ordinary prose and repeated filler
  // cannot satisfy the broad credential-assignment fallback.
  const classes = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  return classes.filter(Boolean).length >= 2 && new Set(value).size >= 6;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...(await collectFiles(entryPath)));
      }
      continue;
    }

    if (
      entry.isFile() &&
      !excludedFiles.has(entry.name) &&
      !excludedExtensions.has(extname(entry.name).toLowerCase())
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function decodeText(buffer) {
  if (
    buffer.includes(0) &&
    !(buffer[0] === 0xff && buffer[1] === 0xfe) &&
    !(buffer[0] === 0xfe && buffer[1] === 0xff)
  ) {
    return null;
  }

  try {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return new TextDecoder("utf-16le", { fatal: true }).decode(buffer);
    }

    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return new TextDecoder("utf-16be", { fatal: true }).decode(buffer);
    }

    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

function inspectLine(line, lineNumber, filePath, findings) {
  for (const rule of directRules) {
    rule.pattern.lastIndex = 0;

    for (const match of line.matchAll(rule.pattern)) {
      findings.push({
        candidate: match[0],
        column: (match.index ?? 0) + 1,
        filePath,
        lineNumber,
        rule: rule.name,
      });
    }
  }

  for (const pattern of [quotedAssignmentPattern, bareAssignmentPattern]) {
    pattern.lastIndex = 0;

    for (const match of line.matchAll(pattern)) {
      const candidate = match.groups?.candidate;
      if (!candidate || !isPlausibleAssignedCredential(candidate)) {
        continue;
      }

      const candidateOffset = match[0].lastIndexOf(candidate);
      findings.push({
        candidate,
        column: (match.index ?? 0) + candidateOffset + 1,
        filePath,
        lineNumber,
        rule: "credential assignment",
      });
    }
  }
}

/**
 * C10: the scan covers what a commit could carry — tracked files plus
 * untracked files that are not git-ignored (`git ls-files --cached --others
 * --exclude-standard`). Git-ignored local artefacts (Playwright fixtures,
 * `.env.local`, build output) never reach a commit; a machine without git
 * falls back to the full directory walk. Pass `--all` to force the walk.
 */
function committableFiles() {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    return output
      .split("\u0000")
      .filter((entry) => entry.length > 0)
      .map((entry) => resolve(repositoryRoot, entry))
      .filter(
        (file) =>
          !excludedFiles.has(basename(file)) &&
          !excludedExtensions.has(extname(file).toLowerCase()) &&
          existsSync(file),
      );
  } catch {
    return null;
  }
}

async function main() {
  const files =
    (process.argv.includes("--all") ? null : committableFiles()) ??
    (await collectFiles(repositoryRoot));
  const findings = [];

  for (const filePath of files) {
    const content = decodeText(await readFile(filePath));
    if (content === null) {
      continue;
    }

    const lines = content.split(/\r?\n/u);
    lines.forEach((line, index) => inspectLine(line, index + 1, filePath, findings));
  }

  const uniqueFindings = findings.filter(
    (finding, index, allFindings) =>
      allFindings.findIndex(
        (candidate) =>
          candidate.filePath === finding.filePath &&
          candidate.lineNumber === finding.lineNumber &&
          candidate.column === finding.column &&
          candidate.candidate === finding.candidate,
      ) === index,
  );

  if (uniqueFindings.length > 0) {
    console.error(`Secret scan failed: ${uniqueFindings.length} high-confidence finding(s).`);
    for (const finding of uniqueFindings) {
      const safePath = normalizePath(finding.filePath).replaceAll(finding.candidate, "[redacted]");
      console.error(
        `${safePath}:${finding.lineNumber}:${finding.column} ` +
          `[${finding.rule}] ${redact(finding.candidate)}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Secret scan passed: ${files.length} text-capable repository file(s) inspected.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown scanner error";
  console.error(`Secret scan could not complete: ${message}`);
  process.exitCode = 2;
});
