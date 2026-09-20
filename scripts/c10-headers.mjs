// C10 §79: prints the security headers a route answers with, and fails when
// a required header is missing.
//   node scripts/c10-headers.mjs [base]
const base = process.argv[2] ?? "http://127.0.0.1:3100";
const required = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
];
let failed = false;
for (const route of ["/", "/projects", "/admin/sign-in", "/api/health"]) {
  const response = await fetch(base + route, { redirect: "manual" });
  console.log(`\n${route} → ${response.status}`);
  for (const name of required) {
    const value = response.headers.get(name);
    console.log(`  ${name}: ${value ? value.slice(0, 140) : "MISSING"}`);
    if (!value) failed = true;
  }
  const powered = response.headers.get("x-powered-by");
  if (powered) {
    console.log("  x-powered-by leaks:", powered);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
