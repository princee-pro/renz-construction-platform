import { createHash, createHmac, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import {
  assert,
  createLocalAdminClient,
  getLocalSupabaseCredentials,
  runLocalSql,
} from "./s4-local.mjs";

// Bounded synthetic RPC/Storage-level end-to-end proof of the C3 Projects +
// Media Command Center lifecycle. This complements (does not duplicate):
//   - supabase/tests/database/010_s5c_projects_admin.sql (pgTAP: function-level
//     shape/permission/version-conflict assertions for the S5C facade)
//   - scripts/verify-publication-local.mjs (the generic S4 kernel's readiness/
//     rights/publication negative tests, already covering concept media,
//     unknown rights, missing alt text, AAL1/permission/disabled-actor
//     rejection, and anonymous-projection exposure at the kernel level)
// What this script proves that neither of those does: the full real-asset
// lifecycle through the NEW S5C facade — draft -> review -> service link ->
// upload (original+derivative, mirroring the Route Handler) -> hero set while
// unpromoted (blocked) -> rights cleared + promoted (eligible) -> publish ->
// visible on the real public projections -> permission-denied publish ->
// unpublish -> archive -> audit trail -> synthetic cleanup.

const credentials = getLocalSupabaseCredentials();
const admin = createLocalAdminClient();

const superEmail = "s5c-super-admin@example.test";
const limitedEmail = "s5c-limited-admin@example.test";
const operatorRoleKey = "s5c_test_operator";
const limitedRoleKey = "s5c_test_limited";

function synthPass(role) {
  return ["Local", "S5C", role, "Passphrase", "2026", "!"].join("-");
}
const superPassword = synthPass("Super");
const limitedPassword = synthPass("Limited");

const serviceId = "00000000-0000-4000-9000-000000005001";
const serviceSlug = "s5c-synthetic-service";
const serviceEvidenceId = "00000000-0000-4000-9000-000000005002";
const projectEvidenceId = "00000000-0000-4000-9000-000000005003";

function client(key) {
  return createClient(credentials.url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.replace(/=+$/u, "").toUpperCase();
  let buffer = 0;
  let bits = 0;
  const bytes = [];
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Synthetic local TOTP secret was invalid.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function currentTotp(secret) {
  const counter = Math.floor(Date.now() / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function removeUserByEmail(email) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const users = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = users.data.users.find((candidate) => candidate.email === email);
    if (!user) return;
    const removed = await admin.auth.admin.deleteUser(user.id);
    assert(!removed.error, "Synthetic user cleanup failed.");
    await sleep(500);
  }
  throw new Error("Synthetic user cleanup did not converge.");
}

async function ensureRole(roleKey, permissionKeys) {
  const existing = await admin.from("roles").select("id").eq("key", roleKey).maybeSingle();
  assert(!existing.error, `Role lookup failed for ${roleKey}.`);
  let roleId = existing.data?.id;
  if (!roleId) {
    const created = await admin
      .from("roles")
      .insert({ key: roleKey, display_name: `SYNTHETIC ${roleKey}`, is_system: false })
      .select("id")
      .single();
    assert(created.data && !created.error, `Role creation failed for ${roleKey}.`);
    roleId = created.data.id;
  }
  await admin.from("role_permissions").delete().eq("role_id", roleId);
  const permissions = await admin.from("permissions").select("id,key").in("key", permissionKeys);
  assert(
    !permissions.error && permissions.data?.length === permissionKeys.length,
    `Permission seed incomplete for ${roleKey}.`,
  );
  for (const permission of permissions.data) {
    const assignment = await admin
      .from("role_permissions")
      .upsert({ role_id: roleId, permission_id: permission.id });
    assert(!assignment.error, `Permission assignment failed for ${roleKey}.`);
  }
  return roleId;
}

async function createActor(email, password, roleKey) {
  await removeUserByEmail(email);
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { display_name: `SYNTHETIC ${roleKey} actor` },
  });
  assert(created.data?.user && !created.error, `Synthetic ${roleKey} user creation failed.`);
  const role = await admin.from("roles").select("id").eq("key", roleKey).single();
  assert(role.data && !role.error, `Synthetic role ${roleKey} is missing.`);
  const assignment = await admin
    .from("user_roles")
    .insert({ user_id: created.data.user.id, role_id: role.data.id });
  assert(!assignment.error, `Synthetic ${roleKey} role assignment failed.`);
  return created.data.user.id;
}

async function signInAndActivate(email, password, factorName) {
  const actorClient = client(credentials.publishableKey);
  const signIn = await actorClient.auth.signInWithPassword({ email, password });
  assert(!signIn.error, `Synthetic sign-in failed for ${email}.`);
  const enrolled = await actorClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: factorName,
  });
  assert(enrolled.data?.totp && !enrolled.error, "Synthetic MFA enrollment failed.");
  const verified = await actorClient.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: currentTotp(enrolled.data.totp.secret),
  });
  assert(!verified.error, "Synthetic MFA verification failed.");
  const activated = await actorClient.rpc("activate_current_profile");
  assert(activated.data === true && !activated.error, "Synthetic profile activation failed.");
  return actorClient;
}

async function rpc(actorClient, name, args) {
  const result = await actorClient.rpc(name, args);
  assert(!result.error, `${name} RPC transport failed: ${result.error?.message ?? ""}`);
  return result.data;
}

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}
function hasReason(result, code, field) {
  return reasons(result).some(
    (r) => r?.code === code && (field === undefined || r?.field === field),
  );
}

// Mirrors src/app/api/admin/projects/media/route.ts exactly (magic-byte
// detection, Sharp derivative generation, two-asset registration,
// finalization) so this script proves the same code path the Route Handler
// executes rather than a shortcut.
async function uploadProjectImage(actorClient, provenance) {
  const originalBytes = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 120, g: 90, b: 60 } },
  })
    .jpeg()
    .toBuffer();

  const image = sharp(originalBytes);
  const metadata = await image.metadata();
  const resized = await image
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const originalId = randomUUID();
  const originalPath = `${originalId}/synthetic-original.jpg`;
  const originalChecksum = createHash("sha256").update(originalBytes).digest("hex");
  const derivativeId = randomUUID();
  const derivativePath = `${derivativeId}/synthetic-derivative.jpg`;
  const derivativeChecksum = createHash("sha256").update(resized.data).digest("hex");

  const originalUpload = await actorClient.storage
    .from("editorial-originals")
    .upload(originalPath, originalBytes, { contentType: "image/jpeg", upsert: false });
  assert(
    !originalUpload.error,
    `Synthetic original upload failed: ${JSON.stringify(originalUpload.error)}`,
  );

  const originalRegister = await rpc(actorClient, "register_media_asset", {
    target_id: originalId,
    target_bucket_id: "editorial-originals",
    target_object_path: originalPath,
    target_mime_type: "image/jpeg",
    target_byte_size: originalBytes.byteLength,
    target_checksum_sha256: originalChecksum,
    target_media_kind: "image",
    target_provenance_class: provenance,
    target_original_filename: "synthetic-original.jpg",
    target_width: metadata.width,
    target_height: metadata.height,
  });
  assert(originalRegister?.ok === true, "Synthetic original registration failed.");

  const derivativeUpload = await actorClient.storage
    .from("editorial-derivatives")
    .upload(derivativePath, resized.data, { contentType: "image/jpeg", upsert: false });
  assert(!derivativeUpload.error, "Synthetic derivative upload failed.");

  const derivativeRegister = await rpc(actorClient, "register_media_asset", {
    target_id: derivativeId,
    target_bucket_id: "editorial-derivatives",
    target_object_path: derivativePath,
    target_mime_type: "image/jpeg",
    target_byte_size: resized.data.byteLength,
    target_checksum_sha256: derivativeChecksum,
    target_media_kind: "image",
    target_provenance_class: provenance,
    target_original_filename: "synthetic-derivative.jpg",
    target_source_asset_id: originalId,
    target_width: resized.info.width,
    target_height: resized.info.height,
  });
  assert(derivativeRegister?.ok === true, "Synthetic derivative registration failed.");

  const finalizeOriginal = await rpc(actorClient, "finalize_media_upload", {
    target_id: originalId,
    expected_version: 1,
  });
  assert(finalizeOriginal?.ok === true, "Synthetic original finalization failed.");
  const finalizeDerivative = await rpc(actorClient, "finalize_media_upload", {
    target_id: derivativeId,
    expected_version: 1,
  });
  assert(finalizeDerivative?.ok === true, "Synthetic derivative finalization failed.");

  return { originalId, derivativeId, originalPath, derivativePath };
}

async function seedPublishedService(reviewerId) {
  await admin.from("project_services").delete().eq("service_id", serviceId);
  await admin.from("service_evidence").delete().eq("service_id", serviceId);
  await admin.from("service_localizations").delete().eq("service_id", serviceId);
  await admin.from("services").delete().eq("id", serviceId);
  await admin.from("evidence_records").delete().eq("id", serviceEvidenceId);

  await admin.from("evidence_records").insert({
    id: serviceEvidenceId,
    fact_claim: "SYNTHETIC S5C service evidence claim.",
    source_type: "internal_record",
    source_reference: "SYNTHETIC:S5C:service",
    reviewer_id: reviewerId,
    verified_at: new Date().toISOString(),
    verification_state: "verified",
    sensitivity: "public",
    consent_required: false,
    consent_state: "not_required",
    created_by: reviewerId,
    updated_by: reviewerId,
  });

  runLocalSql(
    `begin;
     select set_config('renz.s4.publication_command', '1', true);
     insert into public.services (id, publication_status, published_at)
     values ('${serviceId}', 'published', now());
     commit;`,
    "Synthetic published-service fixture",
  );
  runLocalSql(
    `insert into public.service_localizations
       (service_id, locale, slug, name, summary, scope, deliverables, exclusions, delivery_wording,
        body_blocks, schema_version, seo_title, seo_description)
     values ('${serviceId}', 'en', '${serviceSlug}',
       'S5C synthetic service', 'Synthetic service summary for local S5C verification, long enough to pass the minimum length check.',
       'Synthetic scope.', 'Synthetic deliverables.', 'Synthetic exclusions.', 'Synthetic delivery wording.',
       '[{"type":"paragraph","text":"Synthetic body."}]'::jsonb, 1,
       'S5C synthetic service', 'Synthetic service description for local verification.');`,
    "Synthetic published-service localization fixture",
  );
  const link = await admin
    .from("service_evidence")
    .insert({ service_id: serviceId, evidence_id: serviceEvidenceId, required: true });
  assert(!link.error, "Synthetic service evidence link failed.");
}

async function seedProjectEvidence(projectIdValue, reviewerId) {
  await admin.from("project_evidence").delete().eq("project_id", projectIdValue);
  await admin.from("evidence_records").delete().eq("id", projectEvidenceId);
  await admin.from("evidence_records").insert({
    id: projectEvidenceId,
    fact_claim: "SYNTHETIC S5C project evidence claim.",
    source_type: "internal_record",
    source_reference: "SYNTHETIC:S5C:project",
    reviewer_id: reviewerId,
    verified_at: new Date().toISOString(),
    verification_state: "verified",
    sensitivity: "public",
    consent_required: false,
    consent_state: "not_required",
    created_by: reviewerId,
    updated_by: reviewerId,
  });
  const link = await admin
    .from("project_evidence")
    .insert({ project_id: projectIdValue, evidence_id: projectEvidenceId, required: true });
  assert(!link.error, "Synthetic project evidence link failed.");
}

async function cleanupService() {
  await admin.from("project_services").delete().eq("service_id", serviceId);
  await admin.from("service_evidence").delete().eq("service_id", serviceId);
  await admin.from("service_localizations").delete().eq("service_id", serviceId);
  await admin.from("services").delete().eq("id", serviceId);
  await admin.from("evidence_records").delete().in("id", [serviceEvidenceId, projectEvidenceId]);
}

async function cleanupMedia(assetIds) {
  if (assetIds.length === 0) return;
  // The owning project_media rows are already removed by the projectId-scoped
  // cleanup step above; this only removes the now-unreferenced asset rows.
  await admin.from("media_assets").delete().in("id", assetIds);
}

async function verifyS5C() {
  let operatorRoleId;
  let limitedRoleId;
  const assetIds = [];
  const storageObjects = [];
  let projectId;

  try {
    operatorRoleId = await ensureRole(operatorRoleKey, [
      "content.read",
      "content.write",
      "content.publish",
      "content.archive",
      "media.read",
      "media.upload",
      "media.manage",
      "claims.verify",
    ]);
    limitedRoleId = await ensureRole(limitedRoleKey, [
      "content.read",
      "content.write",
      "media.read",
      "media.upload",
      "media.manage",
      "claims.verify",
    ]);
    const superUserId = await createActor(superEmail, superPassword, operatorRoleKey);
    await createActor(limitedEmail, limitedPassword, limitedRoleKey);
    await seedPublishedService(superUserId);

    const operator = await signInAndActivate(superEmail, superPassword, "SYNTHETIC S5C operator");
    const limited = await signInAndActivate(
      limitedEmail,
      limitedPassword,
      "SYNTHETIC S5C limited admin",
    );

    // 1. Create draft.
    const draft = await rpc(operator, "create_admin_project_draft", {
      target_locale: "en",
      target_slug: "s5c-synthetic-project",
      target_title: "S5C synthetic project",
    });
    assert(draft?.ok === true, "Project draft creation failed.");
    projectId = draft.id;

    let detail = await rpc(operator, "admin_get_project", {
      target_id: projectId,
      target_locale: "en",
    });
    assert(detail?.project?.publication_status === "draft", "New project was not a draft.");

    // 2. Fill required editorial + factual fields.
    const updated = await rpc(operator, "update_admin_project_draft", {
      target_id: projectId,
      expected_version: detail.project.version,
      expected_localization_version: detail.localization.version,
      target_locale: "en",
      target_slug: "s5c-synthetic-project",
      target_title: "S5C synthetic project",
      target_summary: "Synthetic project summary for local S5C verification.",
      target_challenge: "Synthetic challenge narrative.",
      target_approach: "Synthetic approach narrative.",
      target_solution: "Synthetic solution narrative.",
      target_outcomes: "Synthetic outcomes narrative.",
      target_seo_title: "S5C synthetic project",
      target_seo_description: "Synthetic SEO description for local S5C verification.",
      target_public_location: "Synthetic locality",
      target_public_location_granularity: "city",
      target_project_type: "Synthetic project type",
      target_project_scope: "Synthetic project scope.",
      target_renz_role: "Synthetic RENZ role.",
      target_delivery_status: "completed",
      target_start_year: 2024,
      target_completion_year: 2025,
      target_sort_order: 0,
      target_featured: false,
      target_hero_asset_id: null,
    });
    assert(updated?.ok === true, "Project draft update failed.");

    // 3. Factual review.
    const reviewed = await rpc(operator, "mark_project_factually_reviewed", {
      target_id: projectId,
      expected_version: updated.version,
    });
    assert(reviewed?.ok === true, "Project factual review failed.");

    // 4. Link the published service.
    const servicesLinked = await rpc(operator, "set_admin_project_services", {
      target_project_id: projectId,
      expected_version: reviewed.version,
      target_services: [{ service_id: serviceId, scope_label: "Synthetic scope" }],
    });
    assert(servicesLinked?.ok === true, "Project service link failed.");

    // 5. Attach one required, verified evidence record (S4 readiness requires
    //    at least one on every content type) and confirm readiness with zero
    //    media (hero is optional, so this should already be ready).
    await seedProjectEvidence(projectId, superUserId);
    let readiness = await rpc(operator, "check_publication_readiness", {
      content_type: "project",
      target_id: projectId,
    });
    assert(
      readiness?.ok === true,
      `Project without media/hero unexpectedly failed readiness: ${JSON.stringify(readiness)}`,
    );

    // 6. Upload a synthetic production asset (original + derivative).
    const uploaded = await uploadProjectImage(operator, "production_asset");
    assetIds.push(uploaded.originalId, uploaded.derivativeId);
    storageObjects.push(
      { bucket: "editorial-originals", path: uploaded.originalPath },
      { bucket: "editorial-derivatives", path: uploaded.derivativePath },
    );

    // 7. Attach the derivative as the hero role with alt text.
    detail = await rpc(operator, "admin_get_project", {
      target_id: projectId,
      target_locale: "en",
    });
    const attached = await rpc(operator, "admin_attach_project_media", {
      target_project_id: projectId,
      expected_version: detail.project.version,
      target_media_asset_id: uploaded.derivativeId,
      target_role: "hero",
      target_phase: null,
      target_stage_id: null,
      target_decorative: false,
      target_credit: "Synthetic credit",
      target_alt_text: "Synthetic hero image of a S5C test structure.",
      target_caption: "Synthetic hero caption.",
    });
    assert(attached?.ok === true, "Hero media attach failed.");
    const projectMediaId = attached.id;

    // 8. Set the project hero_asset_id to the still-unpromoted derivative and
    //    prove readiness is now blocked on rights (this is the "readiness
    //    blocked" checkpoint of the synthetic workflow).
    const heroSet = await rpc(operator, "update_admin_project_draft", {
      target_id: projectId,
      expected_version: attached.project_version,
      expected_localization_version: detail.localization.version,
      target_locale: "en",
      target_slug: "s5c-synthetic-project",
      target_title: "S5C synthetic project",
      target_summary: "Synthetic project summary for local S5C verification.",
      target_challenge: "Synthetic challenge narrative.",
      target_approach: "Synthetic approach narrative.",
      target_solution: "Synthetic solution narrative.",
      target_outcomes: "Synthetic outcomes narrative.",
      target_seo_title: "S5C synthetic project",
      target_seo_description: "Synthetic SEO description for local S5C verification.",
      target_public_location: "Synthetic locality",
      target_public_location_granularity: "city",
      target_project_type: "Synthetic project type",
      target_project_scope: "Synthetic project scope.",
      target_renz_role: "Synthetic RENZ role.",
      target_delivery_status: "completed",
      target_start_year: 2024,
      target_completion_year: 2025,
      target_sort_order: 0,
      target_featured: false,
      target_hero_asset_id: uploaded.derivativeId,
    });
    assert(heroSet?.ok === true, "Hero asset assignment failed.");

    readiness = await rpc(operator, "check_publication_readiness", {
      content_type: "project",
      target_id: projectId,
    });
    assert(
      hasReason(readiness, "rights_unknown", "hero_asset_id"),
      "Unpromoted hero media did not block readiness.",
    );

    // 9. Private draft preview: an authorized staff reader can resolve the
    //    media path before publication; anonymous cannot.
    const draftPreviewPath = await rpc(operator, "resolve_project_media_path", {
      target_id: projectMediaId,
    });
    assert(
      draftPreviewPath?.bucket_id === "editorial-derivatives",
      "Draft preview path resolution failed.",
    );
    const anonymous = client(credentials.anonymousKey);
    const anonDraftPeek = await anonymous.rpc("resolve_project_media_path", {
      target_id: projectMediaId,
    });
    assert(anonDraftPeek.data === null, "Anonymous caller resolved a draft media path.");

    // 10. Clear rights and promote in one admin command.
    detail = await rpc(operator, "admin_get_project", {
      target_id: projectId,
      target_locale: "en",
    });
    const mediaEntry = detail.media.find((row) => row.id === projectMediaId);
    assert(mediaEntry, "Attached media was missing from the project detail payload.");
    const promoted = await rpc(operator, "admin_clear_and_promote_project_media", {
      target_project_media_id: projectMediaId,
      expected_media_version: mediaEntry.version,
      target_rights_holder: "RENZ Construction Services Ltd",
      target_rights_source: "Synthetic in-house capture",
      target_credit: "Synthetic credit",
    });
    assert(
      promoted?.ok === true,
      `Media rights clearance/promotion failed: ${JSON.stringify(promoted)}`,
    );

    readiness = await rpc(operator, "check_publication_readiness", {
      content_type: "project",
      target_id: projectId,
    });
    assert(
      readiness?.ok === true,
      `Project was not ready after rights clearance: ${JSON.stringify(readiness)}`,
    );

    // 11. A staff member without content.publish cannot publish.
    detail = await rpc(operator, "admin_get_project", {
      target_id: projectId,
      target_locale: "en",
    });
    const deniedPublish = await rpc(limited, "publish_content", {
      content_type: "project",
      target_id: projectId,
      expected_version: detail.project.version,
    });
    assert(
      hasReason(deniedPublish, "not_authorized"),
      "An admin without content.publish was allowed to publish.",
    );

    // 12. The authorized operator publishes.
    const published = await rpc(operator, "publish_content", {
      content_type: "project",
      target_id: projectId,
      expected_version: detail.project.version,
    });
    assert(published?.ok === true, "Project publish failed.");

    // 13. It appears on the real public projections.
    const publicProject = await anonymous
      .from("published_projects")
      .select("id,slug")
      .eq("id", projectId)
      .maybeSingle();
    assert(
      !publicProject.error && publicProject.data,
      "Published project did not appear in published_projects.",
    );
    const publicMedia = await anonymous
      .from("published_project_media")
      .select("id,role")
      .eq("id", projectMediaId)
      .maybeSingle();
    assert(
      !publicMedia.error && publicMedia.data,
      "Published project media did not appear publicly.",
    );
    const publicServiceLink = await anonymous
      .from("published_project_services")
      .select("project_id,service_id")
      .eq("project_id", projectId)
      .maybeSingle();
    assert(
      !publicServiceLink.error && publicServiceLink.data,
      "Published project service link was not public.",
    );
    const publicResolvedPath = await anonymous.rpc("resolve_project_media_path", {
      target_id: projectMediaId,
    });
    assert(
      publicResolvedPath.data?.bucket_id === "editorial-derivatives",
      "Published media path did not resolve anonymously.",
    );

    // 14. Unpublish hides it again.
    detail = await rpc(operator, "admin_get_project", {
      target_id: projectId,
      target_locale: "en",
    });
    const unpublished = await rpc(operator, "unpublish_content", {
      content_type: "project",
      target_id: projectId,
      expected_version: detail.project.version,
    });
    assert(unpublished?.ok === true, "Project unpublish failed.");
    const hiddenAfterUnpublish = await anonymous
      .from("published_projects")
      .select("id")
      .eq("id", projectId);
    assert(
      !hiddenAfterUnpublish.error && hiddenAfterUnpublish.data.length === 0,
      "Unpublished project remained public.",
    );

    // 15. Archive.
    detail = await rpc(operator, "admin_get_project", {
      target_id: projectId,
      target_locale: "en",
    });
    const archived = await rpc(operator, "archive_content", {
      content_type: "project",
      target_id: projectId,
      expected_version: detail.project.version,
    });
    assert(archived?.ok === true, "Project archive failed.");

    // 16. Audit trail exists for the key lifecycle actions.
    const auditRows = await admin
      .from("audit_logs")
      .select("action")
      .eq("entity_type", "project")
      .eq("entity_id", projectId);
    assert(!auditRows.error, "Audit log query failed.");
    const auditActions = new Set((auditRows.data ?? []).map((row) => row.action));
    for (const expected of [
      "project.media_attach",
      "content.publish",
      "content.unpublish",
      "content.archive",
    ]) {
      assert(auditActions.has(expected), `Audit trail is missing ${expected}.`);
    }

    console.log(
      JSON.stringify({
        ok: true,
        projectId,
        checkpoints: [
          "draft created",
          "editorial + factual fields saved",
          "factual review recorded",
          "published service linked",
          "readiness ready with zero media",
          "synthetic original+derivative uploaded and finalized",
          "hero media attached with alt text",
          "readiness blocked on unpromoted hero rights",
          "draft media path resolves for authorized staff only",
          "rights cleared and media promoted in one command",
          "readiness ready after promotion",
          "publish denied without content.publish",
          "publish succeeded for authorized operator",
          "published project/media/service link visible anonymously",
          "unpublish hides the project",
          "archive succeeds",
          "audit trail covers attach/publish/unpublish/archive",
        ],
      }),
    );
  } finally {
    const cleanupFailures = [];
    const steps = [
      async () => {
        for (const object of storageObjects) {
          await admin.storage.from(object.bucket).remove([object.path]);
        }
      },
      async () => {
        if (projectId) {
          await admin
            .from("project_media_localizations")
            .delete()
            .in(
              "project_media_id",
              (
                await admin.from("project_media").select("id").eq("project_id", projectId)
              ).data?.map((row) => row.id) ?? [],
            );
          await admin.from("project_media").delete().eq("project_id", projectId);
          await admin.from("project_services").delete().eq("project_id", projectId);
          await admin.from("project_evidence").delete().eq("project_id", projectId);
          await admin.from("project_localizations").delete().eq("project_id", projectId);
          await admin.from("projects").delete().eq("id", projectId);
        }
      },
      () => cleanupMedia(assetIds),
      () => cleanupService(),
      () => removeUserByEmail(superEmail),
      () => removeUserByEmail(limitedEmail),
      async () => {
        if (operatorRoleId) {
          await admin.from("role_permissions").delete().eq("role_id", operatorRoleId);
          await admin.from("roles").delete().eq("id", operatorRoleId);
        }
        if (limitedRoleId) {
          await admin.from("role_permissions").delete().eq("role_id", limitedRoleId);
          await admin.from("roles").delete().eq("id", limitedRoleId);
        }
      },
    ];
    for (const step of steps) {
      try {
        await step();
      } catch {
        cleanupFailures.push("cleanup step failed");
      }
    }
    if (cleanupFailures.length > 0) {
      console.error(
        "One or more synthetic S5C cleanup steps failed; no sensitive detail was logged.",
      );
      process.exitCode = 1;
    }
  }
}

try {
  await verifyS5C();
} catch (error) {
  console.error(error instanceof Error ? error.message : "S5C verification failed.");
  process.exitCode = 1;
}
