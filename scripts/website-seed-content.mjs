// CR1 — migrates the approved, previously code-owned public content into the
// Admin registers so the owner can run the website without a developer:
//
//   * the five client-approved service categories (src/features/services/
//     seed-categories.ts) → Services register, published;
//   * the six generated concept studies (src/features/client-preview/
//     projects.ts + public/media/renz-preview) → Projects register as
//     CONCEPT STUDY class with rights-cleared generated media, published;
//   * the three owner-authorized editorial insights (src/features/public-
//     content/editorial-insights.ts) → Insights register, published.
//
// Everything goes through the same RPC commands Admin uses (drafts, evidence,
// review, media rights, publish) so readiness checks and the audit trail
// apply exactly as they would for the owner. Idempotent by slug.
//
//   node scripts/website-seed-content.mjs --rewrite-copy
//
// (D1.6) republishes the current wording of the seed sources as a new
// content revision of each existing service / study / insight — the same
// "Publish changes" the owner has, so Revision History keeps the old text. Needs the
// local stack (`pnpm db:start`, `pnpm storage:provision`) or, in production,
// SUPABASE_URL + SUPABASE_SECRET_KEY and the owner's RENZ_PUBLISH_* session
// credentials (see scripts/content-publish-insights.mjs).
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

import {
  client,
  createActor,
  credentials as localCredentials,
  rpc,
  signInAndActivate,
} from "./c4-local.mjs";
import { root } from "./s4-local.mjs";

const ORIGINALS_BUCKET = "editorial-originals";
const DERIVATIVES_BUCKET = "editorial-derivatives";

function ok(result, label) {
  if (result?.ok !== true) {
    throw new Error(`${label} refused: ${JSON.stringify(result)}`);
  }
  return result;
}

async function loadModule(relative) {
  return import(pathToFileURL(join(root, relative)).href);
}

async function staffSession() {
  const email = process.env.RENZ_PUBLISH_EMAIL;
  const password = process.env.RENZ_PUBLISH_PASSWORD;
  const code = process.env.RENZ_PUBLISH_TOTP;
  if (email && password && code) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishable) throw new Error("SUPABASE URL / publishable key are required.");
    const session = createClient(url, publishable, { auth: { persistSession: false } });
    const signedIn = await session.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw new Error("Sign-in failed.");
    const factors = await session.auth.mfa.listFactors();
    const factor = factors.data?.totp.find((entry) => entry.status === "verified");
    if (!factor) throw new Error("A verified authenticator is required.");
    const verified = await session.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verified.error) throw new Error("Authenticator code was rejected.");
    return { session, userId: signedIn.data.user.id };
  }
  const runId = crypto.randomBytes(2).toString("hex");
  const localEmail = `synthetic-website-seed-${runId}@example.test`;
  const localPassword = ["SYNTHETIC", "Website", "Seed", "Local", "2026!"].join("-");
  const userId = await createActor(localEmail, localPassword, "super_admin");
  const session = await signInAndActivate(localEmail, localPassword);
  return { session, userId };
}

// ---------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------

/** Plain-English "not included" wording for each service. */
const exclusions = {
  design:
    "Design does not include building the project. Construction management, buying materials and independent site supervision are separate services (Executions, Supervision).",
  executions:
    "Executions is not a design service — the drawings are finished or being finished elsewhere. Independent supervision of the build is a separate service.",
  "hybrid-service":
    "Independent supervision from outside the team is not part of Hybrid Service. You can add it separately.",
  supervision:
    "Supervision does not design, build or buy materials. It checks the work of whoever is building.",
  consultations:
    "A consultation is written advice. It is not a design, construction or supervision service, and it is not a quote for a project.",
};

/** What we need from you, in plain English. */
const clientInputs = {
  design:
    "The land title or site address, any survey or boundary information you have, a simple description of how you want to use the space, and roughly what you want to spend.",
  executions:
    "Approved drawings (from RENZ or another architect), your working budget, and the timeline you are aiming for.",
  "hybrid-service":
    "The site, a description of what you want to build, your budget range, and how closely you want to be involved in decisions.",
  supervision:
    "The drawings, specification and contract for the build, the builder's programme, and how often you want written reports.",
  consultations:
    "The question you want answered, the land or building it is about, and any documents you already have about it.",
};

async function seedServices(session, admin) {
  const { SERVICE_CATEGORIES } = await loadModule("src/features/services/seed-categories.ts");
  const ids = new Map();
  let index = 0;
  for (const category of SERVICE_CATEGORIES) {
    index += 1;
    const existing = await admin
      .from("service_localizations")
      .select("service_id")
      .eq("locale", "en")
      .eq("slug", category.slug)
      .maybeSingle();
    if (existing.data) {
      ids.set(category.slug, existing.data.service_id);
      continue;
    }
    const created = ok(
      await rpc(session, "create_admin_service_draft", {
        target_locale: "en",
        target_slug: category.slug,
        target_name: category.name,
      }),
      `create service ${category.slug}`,
    );
    const serviceId = created.id;
    const updated = ok(
      await rpc(session, "update_admin_service_draft", {
        target_id: serviceId,
        expected_version: 1,
        expected_localization_version: 1,
        target_locale: "en",
        target_slug: category.slug,
        target_name: category.name,
        target_summary: category.positioning,
        target_body_blocks: category.overview.map((text) => ({ type: "paragraph", text })),
        target_seo_title: `${category.name} | RENZ Construction Services`,
        target_seo_description: category.positioning,
        target_scope: category.overview.join(" "),
        target_deliverables: category.subServices.join("\n"),
        target_exclusions:
          exclusions[category.slug] ?? "Scope beyond this service is agreed separately.",
        target_client_inputs: clientInputs[category.slug] ?? "",
        target_delivery_wording: category.coordination,
        target_professional_terminology: "",
        target_sort_order: index * 10,
        target_featured: false,
      }),
      `update service ${category.slug}`,
    );
    const details = ok(
      await rpc(session, "update_admin_service_details", {
        target_id: serviceId,
        expected_localization_version: updated.localization_version,
        target_positioning: category.positioning,
        target_sub_services: category.subServices,
        target_use_cases: category.useCases,
        target_process_steps: category.process,
        target_coordination: category.coordination,
        target_faqs: category.faqs,
      }),
      `update service details ${category.slug}`,
    );
    void details;
    // Evidence: the client-approved category architecture is the internal record.
    const evidence = ok(
      await rpc(session, "create_service_evidence", {
        target_service_id: serviceId,
        fact_claim: `${category.name} is one of the client-approved RENZ service categories (docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md).`,
        source_type: "internal_record",
        source_reference: "docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md",
        sensitivity: "private",
        consent_required: false,
        required: true,
        purpose: "Client-approved service taxonomy",
      }),
      `service evidence ${category.slug}`,
    );
    ok(
      await rpc(session, "submit_service_evidence_for_review", {
        target_service_id: serviceId,
        target_evidence_id: evidence.id,
        expected_version: evidence.version ?? 1,
      }),
      `submit evidence ${category.slug}`,
    );
    ok(
      await rpc(session, "review_service_evidence", {
        target_service_id: serviceId,
        target_evidence_id: evidence.id,
        expected_version: (evidence.version ?? 1) + 1,
        next_state: "verified",
      }),
      `review evidence ${category.slug}`,
    );
    const current = await admin.from("services").select("version").eq("id", serviceId).single();
    ok(
      await rpc(session, "publish_content", {
        content_type: "service",
        target_id: serviceId,
        expected_version: current.data.version,
      }),
      `publish service ${category.slug}`,
    );
    ids.set(category.slug, serviceId);
  }
  return ids;
}

// ---------------------------------------------------------------------
// Media upload (mirrors src/app/api/admin/projects/media/route.ts)
// ---------------------------------------------------------------------

async function uploadImage(session, filePath, provenance) {
  const bytes = await readFile(filePath);
  const image = sharp(bytes);
  const metadata = await image.metadata();
  const resized = await image
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const filename = filePath.split(/[\\/]/u).pop() ?? "upload.webp";
  const mime =
    metadata.format === "webp"
      ? "image/webp"
      : metadata.format === "png"
        ? "image/png"
        : "image/jpeg";
  const originalId = crypto.randomUUID();
  const derivativeId = crypto.randomUUID();
  const originalPath = `${originalId}/${filename}`;
  const derivativePath = `${derivativeId}/${filename}`;
  const originalUpload = await session.storage
    .from(ORIGINALS_BUCKET)
    .upload(originalPath, bytes, { contentType: mime, upsert: false });
  if (originalUpload.error)
    throw new Error(`Original upload failed: ${originalUpload.error.message}`);
  ok(
    await rpc(session, "register_media_asset", {
      target_id: originalId,
      target_bucket_id: ORIGINALS_BUCKET,
      target_object_path: originalPath,
      target_mime_type: mime,
      target_byte_size: bytes.byteLength,
      target_checksum_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      target_media_kind: "image",
      target_provenance_class: provenance,
      target_original_filename: filename,
      target_width: metadata.width ?? null,
      target_height: metadata.height ?? null,
    }),
    "register original",
  );
  const derivativeUpload = await session.storage
    .from(DERIVATIVES_BUCKET)
    .upload(derivativePath, resized.data, { contentType: mime, upsert: false });
  if (derivativeUpload.error)
    throw new Error(`Derivative upload failed: ${derivativeUpload.error.message}`);
  ok(
    await rpc(session, "register_media_asset", {
      target_id: derivativeId,
      target_bucket_id: DERIVATIVES_BUCKET,
      target_object_path: derivativePath,
      target_mime_type: mime,
      target_byte_size: resized.data.byteLength,
      target_checksum_sha256: crypto.createHash("sha256").update(resized.data).digest("hex"),
      target_media_kind: "image",
      target_provenance_class: provenance,
      target_original_filename: filename,
      target_source_asset_id: originalId,
      target_width: resized.info.width ?? null,
      target_height: resized.info.height ?? null,
    }),
    "register derivative",
  );
  ok(
    await rpc(session, "finalize_media_upload", { target_id: originalId, expected_version: 1 }),
    "finalize original",
  );
  ok(
    await rpc(session, "finalize_media_upload", { target_id: derivativeId, expected_version: 1 }),
    "finalize derivative",
  );
  return derivativeId;
}

// ---------------------------------------------------------------------
// Concept studies → Projects register
// ---------------------------------------------------------------------

async function seedConceptStudies(session, admin, serviceIds) {
  const { previewProjects } = await loadModule("src/features/client-preview/projects.ts");
  const { serviceStudyMap } = await loadModule("src/features/client-preview/service-studies.ts");
  const results = [];
  let index = 0;
  for (const study of previewProjects) {
    index += 1;
    const existing = await admin
      .from("project_localizations")
      .select("project_id, projects!inner(publication_status)")
      .eq("locale", "en")
      .eq("slug", study.slug)
      .maybeSingle();
    if (existing.data) {
      const status = existing.data.projects?.publication_status;
      if (status === "published" || process.env.RENZ_PUBLISH_EMAIL) {
        results.push({ slug: study.slug, status: "exists" });
        continue;
      }
      // A half-seeded local draft from an interrupted run: remove and redo.
      await admin.from("projects").delete().eq("id", existing.data.project_id);
    }
    const created = ok(
      await rpc(session, "create_admin_project_draft", {
        target_locale: "en",
        target_slug: study.slug,
        target_title: study.title,
      }),
      `create project ${study.slug}`,
    );
    const projectId = created.id;
    let version = created.version ?? 1;
    const updated = ok(
      await rpc(session, "update_admin_project_draft", {
        target_id: projectId,
        expected_version: version,
        expected_localization_version: 1,
        target_locale: "en",
        target_slug: study.slug,
        target_title: study.title,
        target_summary: study.atmosphere,
        target_challenge: study.chapters[2]?.copy ?? "",
        target_approach: study.chapters[3]?.copy ?? "",
        target_solution: study.chapters[4]?.copy ?? "",
        target_outcomes: study.chapters[8]?.copy ?? "",
        target_seo_title: `${study.title} — Concept Study | RENZ`,
        target_seo_description: `${study.category}. A concept study of approach, not RENZ project evidence.`,
        target_public_location: null,
        target_public_location_granularity: null,
        target_project_type: study.category,
        target_project_scope: null,
        target_renz_role: null,
        target_delivery_status: null,
        target_start_year: null,
        target_completion_year: null,
        target_sort_order: index * 10,
        target_featured: index <= 4,
        target_hero_asset_id: null,
      }),
      `update project ${study.slug}`,
    );
    version = updated.version;
    const presentation = ok(
      await rpc(session, "update_admin_project_presentation", {
        target_id: projectId,
        expected_version: version,
        target_evidence_class: "concept_study",
        target_layout_hint: "auto",
        target_home_featured: index <= 4,
        target_materials: study.materials,
        target_tags: [],
      }),
      `presentation ${study.slug}`,
    );
    version = presentation.version;
    const relatedSlugs = Object.entries(serviceStudyMap)
      .filter(([, slugs]) => slugs.includes(study.slug))
      .map(([serviceSlug]) => serviceSlug);
    const services = relatedSlugs
      .map((slug, order) => ({ service_id: serviceIds.get(slug), sort_order: order }))
      .filter((entry) => Boolean(entry.service_id));
    if (services.length > 0) {
      const linked = ok(
        await rpc(session, "set_admin_project_services", {
          target_project_id: projectId,
          expected_version: version,
          target_services: services,
        }),
        `services ${study.slug}`,
      );
      version = linked.project_version ?? linked.version ?? version;
    }
    let order = 0;
    for (const chapter of study.chapters) {
      const stage = ok(
        await rpc(session, "create_admin_project_stage", {
          target_project_id: projectId,
          expected_version: version,
          target_title: chapter.title,
          target_description: chapter.copy,
          target_sort_order: order,
        }),
        `stage ${study.slug}/${chapter.title}`,
      );
      version = stage.project_version ?? stage.version ?? version;
      order += 1;
    }
    const heroPath = join(root, "public", study.image.replace(/^\//u, ""));
    const mediaAssetId = await uploadImage(session, heroPath, "generated_reference");
    const attached = ok(
      await rpc(session, "admin_attach_project_media", {
        target_project_id: projectId,
        expected_version: version,
        target_media_asset_id: mediaAssetId,
        target_role: "hero",
        target_decorative: false,
        target_alt_text: study.alt,
        target_caption: null,
      }),
      `attach hero ${study.slug}`,
    );
    const usage = await admin
      .from("project_media")
      .select("version")
      .eq("id", attached.id)
      .single();
    ok(
      await rpc(session, "admin_clear_and_promote_project_media", {
        target_project_media_id: attached.id,
        expected_media_version: usage.data.version,
        target_rights_holder: "RENZ Construction Services Ltd (generated concept visual)",
        target_rights_source:
          "Generated concept study produced for the RENZ preview; not project evidence.",
        target_credit: null,
      }),
      `promote hero ${study.slug}`,
    );
    ok(
      await rpc(session, "admin_update_media_metadata", {
        target_id: mediaAssetId,
        expected_version: (
          await admin.from("media_assets").select("version").eq("id", mediaAssetId).single()
        ).data.version,
        target_alt_text: study.alt,
        target_caption: null,
        target_focal_x: 0.5,
        target_focal_y: 0.5,
      }),
      `media metadata ${study.slug}`,
    );
    const currentVersion = (
      await admin.from("projects").select("version").eq("id", projectId).single()
    ).data.version;
    const reviewed = ok(
      await rpc(session, "mark_project_factually_reviewed", {
        target_id: projectId,
        expected_version: currentVersion,
      }),
      `review ${study.slug}`,
    );
    ok(
      await rpc(session, "publish_content", {
        content_type: "project",
        target_id: projectId,
        expected_version: reviewed.version,
      }),
      `publish project ${study.slug}`,
    );
    results.push({ slug: study.slug, status: "published", id: projectId });
  }
  return results;
}

// ---------------------------------------------------------------------
// Editorial insights → Insights register
// ---------------------------------------------------------------------

async function seedInsights(session, admin, serviceIds) {
  const { editorialInsights } = await loadModule(
    "src/features/public-content/editorial-insights.ts",
  );
  const results = [];
  for (const insight of editorialInsights) {
    const existing = await admin
      .from("post_localizations")
      .select("post_id")
      .eq("locale", "en")
      .eq("slug", insight.slug)
      .maybeSingle();
    if (existing.data) {
      results.push({ slug: insight.slug, status: "exists" });
      continue;
    }
    const created = ok(
      await rpc(session, "create_admin_post_draft", {
        target_slug: insight.slug,
        target_title: insight.title,
      }),
      `create insight ${insight.slug}`,
    );
    const updated = ok(
      await rpc(session, "update_admin_post_draft", {
        target_id: created.id,
        expected_version: 1,
        expected_localization_version: 1,
        target_slug: insight.slug,
        target_title: insight.title,
        target_excerpt: insight.excerpt,
        target_body_blocks: insight.bodyBlocks,
        target_seo_title: insight.seoTitle,
        target_seo_description: insight.seoDescription,
        target_publication_date: insight.publicationDate,
        target_topic: insight.topic,
        target_related_service_id: serviceIds.get(insight.relatedService.slug) ?? null,
        target_featured: false,
        target_pinned: false,
        target_sort_priority: 0,
        target_hero_asset_id: null,
      }),
      `update insight ${insight.slug}`,
    );
    const reviewed = ok(
      await rpc(session, "mark_post_reviewed", {
        target_id: created.id,
        expected_version: updated.version,
      }),
      `review insight ${insight.slug}`,
    );
    ok(
      await rpc(session, "publish_content", {
        content_type: "post",
        target_id: created.id,
        expected_version: reviewed.version,
      }),
      `publish insight ${insight.slug}`,
    );
    results.push({ slug: insight.slug, status: "published", id: created.id });
  }
  return results;
}

// ---------------------------------------------------------------------
// D1.6 --rewrite-copy: republish the plain-English wording as new content
// revisions, through the same editor RPCs the owner uses (optimistic
// versions, evidence untouched), then "Publish changes" (republish_content).
// ---------------------------------------------------------------------

async function rewriteServices(session, admin) {
  const { SERVICE_CATEGORIES } = await loadModule("src/features/services/seed-categories.ts");
  const results = [];
  let index = 0;
  for (const category of SERVICE_CATEGORIES) {
    index += 1;
    const row = await admin
      .from("service_localizations")
      .select("service_id, version, services!inner(version, sort_order, featured)")
      .eq("locale", "en")
      .eq("slug", category.slug)
      .maybeSingle();
    if (!row.data) {
      results.push({ slug: category.slug, status: "missing" });
      continue;
    }
    const serviceId = row.data.service_id;
    const updated = ok(
      await rpc(session, "update_admin_service_draft", {
        target_id: serviceId,
        expected_version: row.data.services.version,
        expected_localization_version: row.data.version,
        target_locale: "en",
        target_slug: category.slug,
        target_name: category.name,
        target_summary: category.positioning,
        target_body_blocks: category.overview.map((text) => ({ type: "paragraph", text })),
        target_seo_title: `${category.name} | RENZ Construction Services`,
        target_seo_description: category.overview[0] ?? category.positioning,
        target_scope: category.overview.join(" "),
        target_deliverables: category.subServices.join("\n"),
        target_exclusions:
          exclusions[category.slug] ?? "Anything outside this service is agreed separately.",
        target_client_inputs: clientInputs[category.slug] ?? "",
        target_delivery_wording: category.coordination,
        target_professional_terminology: "",
        target_sort_order: row.data.services.sort_order ?? index * 10,
        target_featured: row.data.services.featured ?? false,
      }),
      `rewrite service ${category.slug}`,
    );
    ok(
      await rpc(session, "update_admin_service_details", {
        target_id: serviceId,
        expected_localization_version: updated.localization_version,
        target_positioning: category.positioning,
        target_sub_services: category.subServices,
        target_use_cases: category.useCases,
        target_process_steps: category.process,
        target_coordination: category.coordination,
        target_faqs: category.faqs,
      }),
      `rewrite service details ${category.slug}`,
    );
    const current = await admin.from("services").select("version").eq("id", serviceId).single();
    ok(
      await rpc(session, "republish_content", {
        content_type: "service",
        target_id: serviceId,
        expected_version: current.data.version,
        summary: "D1.6 plain-English wording",
      }),
      `republish service ${category.slug}`,
    );
    results.push({ slug: category.slug, status: "republished" });
  }
  return results;
}

async function rewriteStudies(session, admin) {
  const { previewProjects } = await loadModule("src/features/client-preview/projects.ts");
  const results = [];
  for (const study of previewProjects) {
    const row = await admin
      .from("project_localizations")
      .select(
        "project_id, version, projects!inner(version, sort_order, featured, hero_asset_id, public_location, public_location_granularity, project_type, project_scope, renz_role, delivery_status, start_year, completion_year)",
      )
      .eq("locale", "en")
      .eq("slug", study.slug)
      .maybeSingle();
    if (!row.data) {
      results.push({ slug: study.slug, status: "missing" });
      continue;
    }
    const projectId = row.data.project_id;
    const project = row.data.projects;
    const updated = ok(
      await rpc(session, "update_admin_project_draft", {
        target_id: projectId,
        expected_version: project.version,
        expected_localization_version: row.data.version,
        target_locale: "en",
        target_slug: study.slug,
        target_title: study.title,
        target_summary: study.atmosphere,
        target_challenge: study.chapters[2]?.copy ?? "",
        target_approach: study.chapters[3]?.copy ?? "",
        target_solution: study.chapters[4]?.copy ?? "",
        target_outcomes: study.chapters[8]?.copy ?? "",
        target_seo_title: `${study.title} — Concept Study | RENZ`,
        target_seo_description: `${study.category}. A concept study, not a completed RENZ project.`,
        target_public_location: project.public_location,
        target_public_location_granularity: project.public_location_granularity,
        target_project_type: study.category,
        target_project_scope: project.project_scope,
        target_renz_role: project.renz_role,
        target_delivery_status: project.delivery_status,
        target_start_year: project.start_year,
        target_completion_year: project.completion_year,
        target_sort_order: project.sort_order,
        target_featured: project.featured,
        target_hero_asset_id: project.hero_asset_id,
      }),
      `rewrite project ${study.slug}`,
    );
    let version = updated.version;
    const stages = await admin
      .from("project_stages")
      .select("id, version, sort_order")
      .eq("project_id", projectId)
      .order("sort_order");
    for (const stage of stages.data ?? []) {
      const chapter = study.chapters[stage.sort_order];
      if (!chapter) continue;
      const changed = ok(
        await rpc(session, "update_admin_project_stage", {
          target_id: stage.id,
          target_project_id: projectId,
          expected_stage_version: stage.version,
          target_title: chapter.title,
          target_description: chapter.copy,
          target_sort_order: stage.sort_order,
        }),
        `rewrite stage ${study.slug}/${stage.sort_order}`,
      );
      version = changed.project_version ?? version;
    }
    const current = await admin.from("projects").select("version").eq("id", projectId).single();
    ok(
      await rpc(session, "republish_content", {
        content_type: "project",
        target_id: projectId,
        expected_version: current.data.version,
        summary: "D1.6 plain-English wording",
      }),
      `republish project ${study.slug}`,
    );
    results.push({ slug: study.slug, status: "republished" });
  }
  return results;
}

async function rewriteInsights(session, admin, serviceIds) {
  const { editorialInsights } = await loadModule(
    "src/features/public-content/editorial-insights.ts",
  );
  const results = [];
  for (const insight of editorialInsights) {
    const row = await admin
      .from("post_localizations")
      .select(
        "post_id, version, posts!inner(version, featured, pinned, sort_priority, hero_asset_id)",
      )
      .eq("locale", "en")
      .eq("slug", insight.slug)
      .maybeSingle();
    if (!row.data) {
      results.push({ slug: insight.slug, status: "missing" });
      continue;
    }
    const post = row.data.posts;
    const updated = ok(
      await rpc(session, "update_admin_post_draft", {
        target_id: row.data.post_id,
        expected_version: post.version,
        expected_localization_version: row.data.version,
        target_slug: insight.slug,
        target_title: insight.title,
        target_excerpt: insight.excerpt,
        target_body_blocks: insight.bodyBlocks,
        target_seo_title: insight.seoTitle,
        target_seo_description: insight.seoDescription,
        target_publication_date: insight.publicationDate,
        target_topic: insight.topic,
        target_related_service_id: serviceIds.get(insight.relatedService.slug) ?? null,
        target_featured: post.featured,
        target_pinned: post.pinned,
        target_sort_priority: post.sort_priority,
        target_hero_asset_id: post.hero_asset_id,
      }),
      `rewrite insight ${insight.slug}`,
    );
    ok(
      await rpc(session, "republish_content", {
        content_type: "post",
        target_id: row.data.post_id,
        expected_version: updated.version,
        summary: "D1.6 plain-English wording",
      }),
      `republish insight ${insight.slug}`,
    );
    results.push({ slug: insight.slug, status: "republished" });
  }
  return results;
}

// ---------------------------------------------------------------------
// D1.6 --heroes: register the hero loop(s) under public/media/renz/heroes as
// generated concept VIDEO assets in the website media library, confirm the
// rights, attach each to its page's opening section and publish — exactly
// the path the owner uses in Website → Pages, so the file can be replaced.
// ---------------------------------------------------------------------

const heroLoops = [
  {
    page: "home",
    sectionType: "hero",
    file: "public/media/renz/heroes/home-land-to-landmark.webm",
    alt: "Concept visual: slow camera drift over a hillside residence study (not a RENZ project)",
  },
];

async function uploadVideo(session, filePath, provenance, alt) {
  const bytes = await readFile(filePath);
  const filename = filePath.split(/[\\/]/u).pop() ?? "loop.webm";
  const mime = filename.endsWith(".mp4") ? "video/mp4" : "video/webm";
  const originalId = crypto.randomUUID();
  const derivativeId = crypto.randomUUID();
  const originalPath = `${originalId}/${filename}`;
  const derivativePath = `${derivativeId}/${filename}`;
  for (const [bucket, path, id, source] of [
    [ORIGINALS_BUCKET, originalPath, originalId, null],
    [DERIVATIVES_BUCKET, derivativePath, derivativeId, originalId],
  ]) {
    const uploaded = await session.storage
      .from(bucket)
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (uploaded.error) throw new Error(`Video upload failed: ${uploaded.error.message}`);
    ok(
      await rpc(session, "register_media_asset", {
        target_id: id,
        target_bucket_id: bucket,
        target_object_path: path,
        target_mime_type: mime,
        target_byte_size: bytes.byteLength,
        target_checksum_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        target_media_kind: "video",
        target_provenance_class: provenance,
        target_original_filename: filename,
        ...(source ? { target_source_asset_id: source } : {}),
      }),
      `register video ${filename}`,
    );
    ok(
      await rpc(session, "finalize_media_upload", { target_id: id, expected_version: 1 }),
      `finalize video ${filename}`,
    );
  }
  ok(
    await rpc(session, "admin_update_media_metadata", {
      target_id: derivativeId,
      expected_version: 2,
      target_alt_text: alt,
      target_caption: null,
      target_focal_x: 0.5,
      target_focal_y: 0.5,
    }),
    "video metadata",
  );
  ok(
    await rpc(session, "admin_confirm_media_rights", {
      target_id: derivativeId,
      expected_version: 3,
      target_classification: "generated_concept",
      target_rights_holder: "RENZ Construction Services Ltd (generated concept visual)",
      target_rights_source: "scripts/d16-render-loop.mjs from the labelled concept study image",
    }),
    "video rights",
  );
  return derivativeId;
}

async function seedHeroLoops(session, admin) {
  const results = [];
  for (const loop of heroLoops) {
    const page = await admin
      .from("website_pages")
      .select("id, version")
      .eq("page_key", loop.page)
      .maybeSingle();
    if (!page.data) {
      results.push({ page: loop.page, status: "missing" });
      continue;
    }
    const section = await admin
      .from("website_page_sections")
      .select("id, version, config, variant, tone, spacing, motion, hidden, label")
      .eq("page_id", page.data.id)
      .eq("section_type", loop.sectionType)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (!section.data) {
      results.push({ page: loop.page, status: "no-section" });
      continue;
    }
    let videoId = section.data.config?.video_media_id ?? null;
    const published = await admin
      .from("website_page_revisions")
      .select("media_ids")
      .eq("page_id", page.data.id)
      .eq("kind", "published")
      .order("revision_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (videoId && (published.data?.media_ids ?? []).includes(videoId)) {
      results.push({ page: loop.page, status: "exists" });
      continue;
    }
    if (!videoId) {
      videoId = await uploadVideo(session, join(root, loop.file), "generated_reference", loop.alt);
      ok(
        await rpc(session, "update_website_section", {
          target_section_id: section.data.id,
          expected_section_version: section.data.version,
          target_config: { ...section.data.config, video_media_id: videoId },
          target_variant: section.data.variant,
          target_tone: section.data.tone,
          target_spacing: section.data.spacing,
          target_motion: section.data.motion,
          target_hidden: section.data.hidden,
          target_label: section.data.label,
        }),
        `attach loop ${loop.page}`,
      );
    }
    const current = await admin
      .from("website_pages")
      .select("version")
      .eq("id", page.data.id)
      .single();
    ok(
      await rpc(session, "publish_website_page", {
        target_id: page.data.id,
        expected_version: current.data.version,
        summary: "D1.6 hero loop attached",
      }),
      `publish ${loop.page}`,
    );
    results.push({ page: loop.page, status: "attached", videoId });
  }
  return results;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const admin =
    url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : client(localCredentials.secretKey);
  const { session } = await staffSession();
  const only = new Set(process.argv.slice(2));
  if (only.has("--heroes")) {
    const heroes = await seedHeroLoops(session, admin);
    console.log(JSON.stringify({ ok: true, mode: "heroes", heroes }, null, 2));
    return;
  }
  if (only.has("--rewrite-copy")) {
    const serviceIds = await seedServices(session, admin);
    const services = await rewriteServices(session, admin);
    const projects = await rewriteStudies(session, admin);
    const insights = await rewriteInsights(session, admin, serviceIds);
    console.log(
      JSON.stringify({ ok: true, mode: "rewrite-copy", services, projects, insights }, null, 2),
    );
    return;
  }
  const all = only.size === 0;
  const serviceIds = await seedServices(session, admin);
  const services = [...serviceIds.keys()];
  const projects =
    all || only.has("projects") ? await seedConceptStudies(session, admin, serviceIds) : [];
  const insights =
    all || only.has("insights") ? await seedInsights(session, admin, serviceIds) : [];
  console.log(JSON.stringify({ ok: true, services, projects, insights }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? error);
  process.exit(1);
});
