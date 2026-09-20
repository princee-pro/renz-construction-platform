import { rmSync } from "node:fs";
import { join } from "node:path";

import { root, runSupabase } from "../../scripts/s4-local.mjs";

export default function globalTeardown() {
  const reset = runSupabase(["db", "reset", "--local"], { timeout: 180_000 });
  rmSync(join(root, ".playwright", "s5a-fixtures.json"), { force: true });
  if (reset.error || reset.status !== 0) {
    throw new Error("S5A synthetic fixture cleanup failed; database output was suppressed.");
  }
}
