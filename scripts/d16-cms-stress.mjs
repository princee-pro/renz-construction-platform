// D1.6 CMS stress fixtures (brief §117–119): prove the navigation track, the
// Services surfaces and the Projects landing adapt when the owner adds
// content. Everything is created through the owner's RPCs with unmistakably
// synthetic wording and removed again with `down`.
//
//   node scripts/d16-cms-stress.mjs up     # 2 custom pages in the menu (8 links),
//                                          # a synthetic Service #6, 6 extra studies
//   node scripts/d16-cms-stress.mjs down   # unpublish / archive all of it
//
// Needs the local stack. Never run against production.
import { client, credentials, rpc, signInAndActivate, createActor } from "./c4-local.mjs";
import crypto from "node:crypto";

const mode = process.argv[2] ?? "up";
const admin = client(credentials.secretKey);

function ok(result, label) {
  if (result?.ok !== true) throw new Error(`${label} refused: ${JSON.stringify(result)}`);
  return result;
}

async function session() {
  const runId = crypto.randomBytes(2).toString("hex");
  const email = `synthetic-d16-stress-${runId}@example.test`;
  const password = ["SYNTHETIC", "Stress", "Local", "2026!"].join("-");
  await createActor(email, password, "super_admin");
  return signInAndActivate(email, password);
}

const customPages = [
  { slug: "synthetic-sustainability", title: "SYNTHETIC Sustainability" },
  { slug: "synthetic-careers", title: "SYNTHETIC Careers" },
];

async function up(staff) {
  // 1. custom pages → published → in the navigation
  for (const page of customPages) {
    const existing = await admin
      .from("website_pages")
      .select("id, status")
      .eq("page_key", page.slug)
      .maybeSingle();
    if (existing.data?.status === "published") continue;
    const created = existing.data
      ? { id: existing.data.id }
      : ok(
          await rpc(staff, "create_website_page", {
            target_slug: page.slug,
            target_title: page.title,
          }),
          `create ${page.slug}`,
        );
    const pageRow = await admin
      .from("website_pages")
      .select("id, version")
      .eq("id", created.id)
      .single();
    const hasSection = await admin
      .from("website_page_sections")
      .select("id")
      .eq("page_id", created.id)
      .limit(1);
    if ((hasSection.data ?? []).length === 0)
      ok(
        await rpc(staff, "create_website_section", {
          target_page_id: created.id,
          expected_page_version: pageRow.data.version,
          target_section_type: "masthead",
          target_config: {
            eyebrow: "Synthetic",
            title: `${page.title} (synthetic test page)`,
            summary: "A synthetic page used only to test the navigation. Not RENZ content.",
            facts: [],
          },
        }),
        `section ${page.slug}`,
      );
    const seoRow = await admin
      .from("website_pages")
      .select("version")
      .eq("id", created.id)
      .single();
    ok(
      await rpc(staff, "update_website_page", {
        target_id: created.id,
        expected_version: seoRow.data.version,
        target_title: page.title,
        target_slug: page.slug,
        target_seo_title: page.title,
        target_seo_description: "Synthetic test page for the navigation. Not RENZ content.",
        target_og_media_id: null,
        target_noindex: true,
      }),
      `seo ${page.slug}`,
    );
    const again = await admin.from("website_pages").select("version").eq("id", created.id).single();
    ok(
      await rpc(staff, "publish_website_page", {
        target_id: created.id,
        expected_version: again.data.version,
        summary: "synthetic stress",
      }),
      `publish ${page.slug}`,
    );
  }
  const nav = await admin
    .from("navigation_settings")
    .select("route_key, label_override, visible, sort_order")
    .order("sort_order");
  const navVersion = await admin
    .from("settings_domain_versions")
    .select("version")
    .eq("domain", "navigation")
    .single();
  const items = nav.data
    .filter((row) => !row.route_key.startsWith("page:synthetic-"))
    .map((row) => ({
      route_key: row.route_key,
      label: row.label_override,
      visible: row.visible,
      sort_order: row.sort_order,
    }));
  items.push({
    route_key: "page:synthetic-sustainability",
    label: "Sustainability",
    visible: true,
    sort_order: 45,
  });
  items.push({
    route_key: "page:synthetic-careers",
    label: "Careers",
    visible: true,
    sort_order: 46,
  });
  ok(
    await rpc(staff, "update_navigation_settings", {
      expected_version: navVersion.data.version,
      items,
    }),
    "navigation",
  );
  ok(
    await rpc(staff, "publish_public_configuration", { note: "synthetic stress" }),
    "publish configuration",
  );

  // 2. Service #6 (synthetic) → published
  const six = await admin
    .from("service_localizations")
    .select("service_id")
    .eq("slug", "synthetic-service-six")
    .maybeSingle();
  if (!six.data) {
    const created = ok(
      await rpc(staff, "create_admin_service_draft", {
        target_locale: "en",
        target_slug: "synthetic-service-six",
        target_name: "Synthetic Service Six",
      }),
      "create service six",
    );
    const updated = ok(
      await rpc(staff, "update_admin_service_draft", {
        target_id: created.id,
        expected_version: 1,
        expected_localization_version: 1,
        target_locale: "en",
        target_slug: "synthetic-service-six",
        target_name: "Synthetic Service Six",
        target_summary:
          "A synthetic sixth service used only to test the website. Not a RENZ service.",
        target_body_blocks: [
          { type: "paragraph", text: "Synthetic test copy. This service does not exist." },
        ],
        target_seo_title: "Synthetic Service Six",
        target_seo_description: "Synthetic test service.",
        target_scope: "Synthetic scope.",
        target_deliverables: "Synthetic item A\nSynthetic item B",
        target_exclusions: "Synthetic.",
        target_client_inputs: "Synthetic.",
        target_delivery_wording: "Synthetic.",
        target_professional_terminology: "",
        target_sort_order: 60,
        target_featured: false,
      }),
      "update service six",
    );
    ok(
      await rpc(staff, "update_admin_service_details", {
        target_id: created.id,
        expected_localization_version: updated.localization_version,
        target_positioning: "A synthetic sixth service for testing.",
        target_sub_services: ["Synthetic A", "Synthetic B", "Synthetic C"],
        target_use_cases: ["You are testing the website."],
        target_process_steps: ["Step one — synthetic.", "Step two — synthetic."],
        target_coordination: "Synthetic.",
        target_faqs: [],
      }),
      "details six",
    );
    const evidence = ok(
      await rpc(staff, "create_service_evidence", {
        target_service_id: created.id,
        fact_claim: "Synthetic test evidence.",
        source_type: "internal_record",
        source_reference: "scripts/d16-cms-stress.mjs",
        sensitivity: "private",
        consent_required: false,
        required: true,
        purpose: "Synthetic stress test",
      }),
      "evidence six",
    );
    ok(
      await rpc(staff, "submit_service_evidence_for_review", {
        target_service_id: created.id,
        target_evidence_id: evidence.id,
        expected_version: evidence.version ?? 1,
      }),
      "submit six",
    );
    ok(
      await rpc(staff, "review_service_evidence", {
        target_service_id: created.id,
        target_evidence_id: evidence.id,
        expected_version: (evidence.version ?? 1) + 1,
        next_state: "verified",
      }),
      "review six",
    );
    const current = await admin.from("services").select("version").eq("id", created.id).single();
    ok(
      await rpc(staff, "publish_content", {
        content_type: "service",
        target_id: created.id,
        expected_version: current.data.version,
      }),
      "publish six",
    );
  }

  // 3. Extra studies: copies of the six published studies (same media, "B" slugs)
  const projects = await admin
    .from("project_localizations")
    .select("project_id, slug, title")
    .eq("locale", "en")
    .not("slug", "like", "synthetic-%");
  for (const source of projects.data ?? []) {
    const slug = `synthetic-${source.slug}-b`;
    const exists = await admin
      .from("project_localizations")
      .select("project_id")
      .eq("slug", slug)
      .maybeSingle();
    if (exists.data) continue;
    const created = ok(
      await rpc(staff, "create_admin_project_draft", {
        target_locale: "en",
        target_slug: slug,
        target_title: `${source.title} B (synthetic)`,
      }),
      `create ${slug}`,
    );
    const src = await admin
      .from("projects")
      .select("project_type, sort_order")
      .eq("id", source.project_id)
      .single();
    const updated = ok(
      await rpc(staff, "update_admin_project_draft", {
        target_id: created.id,
        expected_version: created.version ?? 1,
        expected_localization_version: 1,
        target_locale: "en",
        target_slug: slug,
        target_title: `${source.title} B (synthetic)`,
        target_summary: "A synthetic copy used only to test the projects landing.",
        target_challenge: "Synthetic.",
        target_approach: "Synthetic.",
        target_solution: "Synthetic.",
        target_outcomes: "Synthetic.",
        target_seo_title: `${source.title} B (synthetic)`,
        target_seo_description: "Synthetic test study.",
        target_public_location: null,
        target_public_location_granularity: null,
        target_project_type: src.data.project_type,
        target_project_scope: null,
        target_renz_role: null,
        target_delivery_status: null,
        target_start_year: null,
        target_completion_year: null,
        target_sort_order: (src.data.sort_order ?? 0) + 100,
        target_featured: false,
        target_hero_asset_id: null,
      }),
      `update ${slug}`,
    );
    let version = updated.version;
    const presentation = ok(
      await rpc(staff, "update_admin_project_presentation", {
        target_id: created.id,
        expected_version: version,
        target_evidence_class: "concept_study",
        target_layout_hint: "auto",
        target_home_featured: false,
        target_materials: "Synthetic",
        target_tags: [],
      }),
      `presentation ${slug}`,
    );
    version = presentation.version;
    const stage = ok(
      await rpc(staff, "create_admin_project_stage", {
        target_project_id: created.id,
        expected_version: version,
        target_title: "The brief",
        target_description: "Synthetic.",
        target_sort_order: 0,
      }),
      `stage ${slug}`,
    );
    version = stage.project_version ?? version;
    // same related services as the source study (publication needs one)
    const links = await admin
      .from("project_services")
      .select("service_id, sort_order")
      .eq("project_id", source.project_id);
    if ((links.data ?? []).length > 0) {
      const linked = ok(
        await rpc(staff, "set_admin_project_services", {
          target_project_id: created.id,
          expected_version: version,
          target_services: links.data.map((link) => ({
            service_id: link.service_id,
            sort_order: link.sort_order,
          })),
        }),
        `services ${slug}`,
      );
      version = linked.project_version ?? linked.version ?? version;
    }
    // reuse the source hero media (already rights-cleared generated reference)
    const media = await admin
      .from("project_media")
      .select("media_asset_id, alt_text")
      .eq("project_id", source.project_id)
      .eq("role", "hero")
      .maybeSingle();
    if (media.data) {
      const attached = ok(
        await rpc(staff, "admin_attach_project_media", {
          target_project_id: created.id,
          expected_version: version,
          target_media_asset_id: media.data.media_asset_id,
          target_role: "hero",
          target_decorative: false,
          target_alt_text: media.data.alt_text ?? "Synthetic",
          target_caption: null,
        }),
        `media ${slug}`,
      );
      const usage = await admin
        .from("project_media")
        .select("version")
        .eq("id", attached.id)
        .single();
      ok(
        await rpc(staff, "admin_clear_and_promote_project_media", {
          target_project_media_id: attached.id,
          expected_version: usage.data.version,
          target_rights_holder: "RENZ Construction Services Ltd (generated concept visual)",
          target_rights_source: "synthetic stress",
        }),
        `promote ${slug}`,
      );
    }
    const projectRow = await admin.from("projects").select("version").eq("id", created.id).single();
    const reviewed = ok(
      await rpc(staff, "mark_project_factually_reviewed", {
        target_id: created.id,
        expected_version: projectRow.data.version,
      }),
      `review ${slug}`,
    );
    ok(
      await rpc(staff, "publish_content", {
        content_type: "project",
        target_id: created.id,
        expected_version: reviewed.version,
      }),
      `publish ${slug}`,
    );
  }
  console.log(JSON.stringify({ ok: true, mode: "up" }));
}

async function down(staff) {
  const nav = await admin
    .from("navigation_settings")
    .select("route_key, label_override, visible, sort_order")
    .order("sort_order");
  const navVersion = await admin
    .from("settings_domain_versions")
    .select("version")
    .eq("domain", "navigation")
    .single();
  const items = nav.data
    .filter((row) => !row.route_key.startsWith("page:synthetic-"))
    .map((row) => ({
      route_key: row.route_key,
      label: row.label_override,
      visible: row.visible,
      sort_order: row.sort_order,
    }));
  ok(
    await rpc(staff, "update_navigation_settings", {
      expected_version: navVersion.data.version,
      items,
    }),
    "navigation",
  );
  ok(
    await rpc(staff, "publish_public_configuration", { note: "synthetic stress removed" }),
    "publish configuration",
  );
  for (const page of customPages) {
    const row = await admin
      .from("website_pages")
      .select("id, version, status")
      .eq("page_key", page.slug)
      .maybeSingle();
    if (!row.data) continue;
    if (row.data.status === "published")
      ok(
        await rpc(staff, "unpublish_website_page", {
          target_id: row.data.id,
          expected_version: row.data.version,
        }),
        `unpublish ${page.slug}`,
      );
    const again = await admin
      .from("website_pages")
      .select("version")
      .eq("id", row.data.id)
      .single();
    ok(
      await rpc(staff, "archive_website_page", {
        target_id: row.data.id,
        expected_version: again.data.version,
      }),
      `archive ${page.slug}`,
    );
  }
  const six = await admin
    .from("service_localizations")
    .select("service_id")
    .eq("slug", "synthetic-service-six")
    .maybeSingle();
  if (six.data) {
    const row = await admin
      .from("services")
      .select("version, publication_status")
      .eq("id", six.data.service_id)
      .single();
    if (row.data.publication_status === "published")
      ok(
        await rpc(staff, "unpublish_content", {
          content_type: "service",
          target_id: six.data.service_id,
          expected_version: row.data.version,
        }),
        "unpublish six",
      );
    const again = await admin
      .from("services")
      .select("version")
      .eq("id", six.data.service_id)
      .single();
    ok(
      await rpc(staff, "archive_content", {
        content_type: "service",
        target_id: six.data.service_id,
        expected_version: again.data.version,
      }),
      "archive six",
    );
  }
  const projects = await admin
    .from("project_localizations")
    .select("project_id, slug")
    .like("slug", "synthetic-%");
  for (const project of projects.data ?? []) {
    const row = await admin
      .from("projects")
      .select("version, publication_status")
      .eq("id", project.project_id)
      .single();
    if (row.data.publication_status === "published")
      ok(
        await rpc(staff, "unpublish_content", {
          content_type: "project",
          target_id: project.project_id,
          expected_version: row.data.version,
        }),
        `unpublish ${project.slug}`,
      );
    const again = await admin
      .from("projects")
      .select("version")
      .eq("id", project.project_id)
      .single();
    ok(
      await rpc(staff, "archive_content", {
        content_type: "project",
        target_id: project.project_id,
        expected_version: again.data.version,
      }),
      `archive ${project.slug}`,
    );
  }
  console.log(JSON.stringify({ ok: true, mode: "down" }));
}

const staff = await session();
if (mode === "down") await down(staff);
else await up(staff);
