import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules", "supabase", "dist", "supabase.js");
const output = join(root, "src", "lib", "database", "database.types.ts");
const mode = process.argv[2];

if (mode !== "write" && mode !== "check") {
  console.error("Usage: node scripts/database-types.mjs <write|check>");
  process.exit(2);
}

let generated;
let generatedPayload = "";
for (let attempt = 1; attempt <= 5; attempt += 1) {
  generated = spawnSync(
    process.execPath,
    [cli, "gen", "types", "--local", "--lang", "typescript", "--schema", "public"],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DO_NOT_TRACK: "1" },
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    },
  );

  generatedPayload = generated.stdout ?? "";
  const schemaIsPopulated =
    generatedPayload.includes("profiles:") &&
    generatedPayload.includes("services:") &&
    generatedPayload.includes("published_services:");

  if (!generated.error && generated.status === 0 && schemaIsPopulated) break;
  if (attempt < 5) await new Promise((resolveSleep) => setTimeout(resolveSleep, 2_000));
}

if (generated.error || generated.status !== 0 || !generatedPayload.includes("profiles:")) {
  console.error(
    `Database type generation failed or returned an incomplete schema with exit code ${generated.status ?? "unknown"}. Confirm the local Supabase database is healthy and migrated.`,
  );
  process.exit(generated.status ?? 1);
}

const prettierConfig = (await resolveConfig(output)) ?? {};
const normalized = (
  await format(generatedPayload, {
    ...prettierConfig,
    filepath: output,
  })
)
  .replaceAll("\r\n", "\n")
  .trimEnd()
  .concat("\n");

if (
  !normalized.includes("export type Json") ||
  !normalized.includes("export type Database") ||
  !normalized.includes("profiles:") ||
  !normalized.includes("published_services:")
) {
  console.error("Supabase returned an unexpected type payload; no file was changed.");
  process.exit(1);
}

if (mode === "check") {
  if (!existsSync(output)) {
    console.error(
      "Generated database types are missing. Run pnpm db:types with the local stack running.",
    );
    process.exit(1);
  }

  const current = readFileSync(output, "utf8").replaceAll("\r\n", "\n");
  if (current !== normalized) {
    for (let retry = 1; retry <= 4; retry += 1) {
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 2_000));
      const retryGenerated = spawnSync(
        process.execPath,
        [cli, "gen", "types", "--local", "--lang", "typescript", "--schema", "public"],
        {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, DO_NOT_TRACK: "1" },
          maxBuffer: 20 * 1024 * 1024,
          timeout: 30_000,
          windowsHide: true,
        },
      );
      const retryPayload = retryGenerated.stdout ?? "";
      if (
        retryGenerated.error ||
        retryGenerated.status !== 0 ||
        !retryPayload.includes("profiles:") ||
        !retryPayload.includes("published_services:")
      ) {
        continue;
      }

      const retryNormalized = (
        await format(retryPayload, {
          ...prettierConfig,
          filepath: output,
        })
      )
        .replaceAll("\r\n", "\n")
        .trimEnd()
        .concat("\n");

      if (current === retryNormalized) {
        console.log("Generated database types match the local schema.");
        process.exit(0);
      }
    }

    console.error("Generated database types are stale. Run pnpm db:types and review the result.");
    process.exit(1);
  }

  console.log("Generated database types match the local schema.");
  process.exit(0);
}

mkdirSync(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
writeFileSync(temporary, normalized, { encoding: "utf8", flag: "w", mode: 0o600 });
renameSync(temporary, output);
console.log("Generated database types updated at src/lib/database/database.types.ts.");
