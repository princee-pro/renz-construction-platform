import { createLocalAdminClient, createLocalClient, assert } from "./s4-local.mjs";

const admin = createLocalAdminClient();
const anonymous = createLocalClient("anonymous");

const contentTables = [
  "services",
  "projects",
  "posts",
  "site_pages",
  "team_members",
  "testimonials",
  "credentials",
  "navigation_menus",
  "public_site_settings",
];

async function readRows(table) {
  const columns = table === "public_site_settings" ? "id,public_status" : "id,publication_status";
  const { data, error } = await admin.from(table).select(columns);
  if (error) throw new Error(`Content baseline query failed for ${table}.`);
  return data ?? [];
}

async function verify() {
  const expectedS2Ids = new Set([
    "10000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000001",
    "30000000-0000-4000-8000-000000000001",
    "40000000-0000-4000-8000-000000000001",
  ]);
  const counts = {};
  for (const table of contentTables) {
    const rows = await readRows(table);
    counts[table] = rows.length;
    for (const row of rows) {
      assert(
        expectedS2Ids.has(row.id),
        `S4 local content verification found an unknown row in ${table}.`,
      );
      if (table === "public_site_settings") {
        assert(row.public_status === "private", "S4 local settings must remain private.");
      } else {
        assert(
          row.publication_status === "draft",
          `S4 local content verification found non-draft content in ${table}.`,
        );
      }
    }
  }

  const anonymousBase = await anonymous.from("services").select("id").limit(1);
  assert(
    Boolean(anonymousBase.error),
    "Anonymous access to the services base table must be denied.",
  );

  const projection = await anonymous.from("published_services").select("id").limit(1);
  assert(
    !projection.error && Array.isArray(projection.data),
    "Anonymous published service projection is unavailable.",
  );
  assert(projection.data.length === 0, "The anonymous service projection must remain empty in S4.");

  const projectionTables = [
    "published_projects",
    "published_posts",
    "published_pages",
    "published_team_members",
    "published_testimonials",
    "published_credentials",
    "published_navigation_items",
    "published_site_settings",
  ];
  for (const table of projectionTables) {
    const result = await anonymous.from(table).select("*").limit(1);
    assert(
      !result.error && (result.data?.length ?? 0) === 0,
      `Anonymous projection ${table} is not empty and safe.`,
    );
  }

  console.log(
    JSON.stringify({
      ok: true,
      syntheticContentRows: counts,
      anonymousBaseTables: "denied",
      projections: "empty",
    }),
  );
}

try {
  await verify();
} catch (error) {
  console.error(error instanceof Error ? error.message : "S4 content verification failed.");
  process.exitCode = 1;
}
