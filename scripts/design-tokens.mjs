import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const designCli = join(root, "node_modules", "@google", "design.md", "dist", "index.js");
const target = join(root, "src", "styles", "design-tokens.generated.css");
const mode = process.argv[2] ?? "check";

if (mode !== "check" && mode !== "write") {
  throw new Error("Design-token mode must be either check or write.");
}

const normalize = (value) => `${value.replaceAll("\r\n", "\n").trim()}\n`;
const generated = normalize(
  execFileSync(process.execPath, [designCli, "export", "--format", "css-tailwind", "DESIGN.md"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  }),
);

if (mode === "write") {
  writeFileSync(target, generated, "utf8");
  process.stdout.write("Runtime design tokens regenerated from DESIGN.md.\n");
} else {
  const current = normalize(readFileSync(target, "utf8"));
  if (current !== generated) {
    throw new Error(
      "Runtime design tokens differ from DESIGN.md. Run `pnpm design:tokens` and review the change.",
    );
  }
  process.stdout.write("Runtime design tokens match DESIGN.md.\n");
}
