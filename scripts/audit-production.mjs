#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const packageManagerPath = process.env.npm_execpath;

if (!packageManagerPath) {
  console.error("Production audit requires execution through the pinned package manager.");
  process.exitCode = 2;
} else {
  const audit = spawnSync(
    process.execPath,
    [packageManagerPath, "audit", "--prod", "--audit-level", "high"],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (audit.error) {
    console.error(`Production audit could not start: ${audit.error.message}`);
    process.exitCode = 2;
  } else {
    process.exitCode = audit.status ?? 1;
  }
}
