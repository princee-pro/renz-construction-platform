// Seeds the synthetic admin actors (same routine as the E2E global setup)
// so the D1 admin screenshot round can sign in against the dev server.
import globalSetup from "../tests/e2e/global-setup.mjs";
await globalSetup();
console.log("actors seeded → .playwright/s5a-fixtures.json");
