import { createHash, createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import {
  assert,
  createLocalAdminClient,
  getLocalSupabaseCredentials,
  runLocalSql,
} from "./s4-local.mjs";

const credentials = getLocalSupabaseCredentials();
const admin = createLocalAdminClient();
const superEmail = "s4-super-admin@example.test";
const rivalEmail = "s4-rival-operator@example.test";
const editorEmail = "s4-editor@example.test";
const unassignedEmail = "s4-unassigned@example.test";

function synthPass(role) {
  return ["Local", "S4", role, "Passphrase", "2026", "!"].join("-");
}

const superPassword = synthPass("Super");
const rivalPassword = synthPass("Rival");
const editorPassword = synthPass("Editor");
const unassignedPassword = synthPass("Unassigned");
const operatorRoleKey = "s4_test_operator";
const syntheticNow = new Date().toISOString();
const syntheticDate = syntheticNow.slice(0, 10);

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

const ids = {
  service: "00000000-0000-4000-8000-000000001001",
  project: "00000000-0000-4000-8000-000000001002",
  post: "00000000-0000-4000-8000-000000001003",
  page: "00000000-0000-4000-8000-000000001004",
  teamMember: "00000000-0000-4000-8000-000000001005",
  testimonial: "00000000-0000-4000-8000-000000001006",
  credential: "00000000-0000-4000-8000-000000001007",
  serviceEvidence: "00000000-0000-4000-8000-000000002001",
  projectEvidence: "00000000-0000-4000-8000-000000002002",
  postEvidence: "00000000-0000-4000-8000-000000002003",
  pageEvidence: "00000000-0000-4000-8000-000000002004",
  teamEvidence: "00000000-0000-4000-8000-000000002005",
  testimonialEvidence: "00000000-0000-4000-8000-000000002006",
  credentialEvidence: "00000000-0000-4000-8000-000000002007",
  navigationEvidence: "00000000-0000-4000-8000-000000002008",
  media: "00000000-0000-4000-8000-000000003001",
  conceptMedia: "00000000-0000-4000-8000-000000003002",
  unknownRightsMedia: "00000000-0000-4000-8000-000000003003",
  projectMedia: "00000000-0000-4000-8000-000000004001",
  conceptProjectMedia: "00000000-0000-4000-8000-000000004002",
  unknownRightsProjectMedia: "00000000-0000-4000-8000-000000004003",
  missingAltProjectMedia: "00000000-0000-4000-8000-000000004004",
  menu: "00000000-0000-4000-8000-000000005001",
  navigationItem: "00000000-0000-4000-8000-000000005002",
  unsupportedSection: "00000000-0000-4000-8000-000000006001",
};

const syntheticMediaBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const storageFixtures = [
  {
    bucket: "editorial-derivatives",
    path: `${ids.media}/s4-derivative.jpg`,
  },
  {
    bucket: "editorial-originals",
    path: `${ids.conceptMedia}/concept.jpg`,
  },
];
const unauthorizedStorageFixture = {
  bucket: "editorial-derivatives",
  path: `${ids.unknownRightsMedia}/unauthorized.jpg`,
};

function client(key) {
  return createClient(credentials.url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
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
    if (!user) {
      if (attempt === 0) return;
      await sleep(500);
      const confirmed = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (!confirmed.data.users.some((candidate) => candidate.email === email)) return;
      continue;
    }
    const removed = await admin.auth.admin.deleteUser(user.id);
    assert(
      !removed.error,
      `Synthetic user cleanup failed (${removed.error?.code ?? "auth_error"}).`,
    );
    await sleep(1_000);
  }
  throw new Error("Synthetic user cleanup did not converge.");
}

async function createActor(email, password, roleKey) {
  await removeUserByEmail(email);
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { display_name: `SYNTHETIC ${roleKey ?? "unassigned"} actor` },
  });
  assert(
    created.data.user && !created.error,
    `Synthetic ${roleKey ?? "unassigned"} user could not be created${created.error?.code ? ` (${created.error.code})` : ""}: ${created.error?.message ?? "unknown authentication error"}.`,
  );
  if (roleKey) {
    const role = await admin.from("roles").select("id").eq("key", roleKey).single();
    assert(role.data && !role.error, `Synthetic ${roleKey} role is missing.`);
    const assignment = await admin
      .from("user_roles")
      .insert({ user_id: created.data.user.id, role_id: role.data.id });
    assert(!assignment.error, `Synthetic ${roleKey} role assignment failed.`);
  }
  const profile = await admin
    .from("profiles")
    .select("id,account_status")
    .eq("id", created.data.user.id)
    .single();
  assert(
    profile.data && profile.data.account_status === "pending_mfa",
    `Synthetic ${roleKey ?? "unassigned"} profile was not pending MFA.`,
  );
  return { id: created.data.user.id, profileId: profile.data.id };
}

async function ensureTestOperatorRole() {
  const existing = await admin.from("roles").select("id").eq("key", operatorRoleKey).maybeSingle();
  assert(!existing.error, "Synthetic operator role lookup failed.");
  let roleId = existing.data?.id;
  if (!roleId) {
    const created = await admin
      .from("roles")
      .insert({
        key: operatorRoleKey,
        display_name: "Synthetic S4 operator",
        is_system: false,
      })
      .select("id")
      .single();
    assert(created.data && !created.error, "Synthetic operator role could not be created.");
    roleId = created.data.id;
  }
  const permissions = await admin
    .from("permissions")
    .select("id,key")
    .in("key", [
      "content.read",
      "content.write",
      "content.publish",
      "content.archive",
      "media.read",
      "media.upload",
      "media.manage",
      "claims.verify",
      "website.manage",
    ]);
  assert(
    !permissions.error && permissions.data?.length === 9,
    "S4 operator permission seed is incomplete.",
  );
  for (const permission of permissions.data) {
    const assignment = await admin
      .from("role_permissions")
      .upsert({ role_id: roleId, permission_id: permission.id });
    assert(!assignment.error, "Synthetic operator permission assignment failed.");
  }
  return roleId;
}

async function rpc(actor, name, args) {
  const result = await actor.rpc(name, args);
  assert(!result.error, `${name} RPC transport failed.`);
  return result.data;
}

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}

function hasReason(result, code, field) {
  return reasons(result).some(
    (reason) => reason?.code === code && (field === undefined || reason?.field === field),
  );
}

async function expectReadinessReason(actor, contentType, targetId, code, field, message) {
  const result = await rpc(actor, "check_publication_readiness", {
    content_type: contentType,
    target_id: targetId,
  });
  assert(hasReason(result, code, field), message);
}

async function currentVersion(table, id) {
  if (!/^[a-z_]+$/u.test(table)) throw new Error("Synthetic version table name was not safe.");
  const version = await admin.from(table).select("version").eq("id", id).single();
  assert(
    !version.error && Number.isInteger(version.data?.version),
    `Version lookup failed for ${table}.`,
  );
  return version.data.version;
}

async function cleanupStorageFixtures() {
  for (const fixture of [...storageFixtures, unauthorizedStorageFixture]) {
    const removed = await admin.storage.from(fixture.bucket).remove([fixture.path]);
    assert(!removed.error, `Synthetic Storage cleanup failed for ${fixture.bucket}.`);
  }
}

async function uploadStorageFixtures(actor) {
  await cleanupStorageFixtures();

  for (const fixture of storageFixtures) {
    const upload = await actor.storage
      .from(fixture.bucket)
      .upload(fixture.path, syntheticMediaBytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
    assert(!upload.error, `Synthetic Storage upload failed for ${fixture.bucket}.`);
  }

  const downloaded = await actor.storage
    .from("editorial-derivatives")
    .download(storageFixtures[0].path);
  assert(!downloaded.error && downloaded.data, "Synthetic derivative download failed.");
  const downloadedBytes = Buffer.from(await downloaded.data.arrayBuffer());
  assert(
    createHash("sha256").update(downloadedBytes).digest("hex") ===
      createHash("sha256").update(syntheticMediaBytes).digest("hex"),
    "Synthetic derivative checksum did not match registered bytes.",
  );

  const anonymous = client(credentials.anonymousKey);
  for (const fixture of storageFixtures) {
    const rawRead = await anonymous.storage.from(fixture.bucket).download(fixture.path);
    assert(Boolean(rawRead.error), `Anonymous raw read succeeded for ${fixture.bucket}.`);
  }
}

async function insert(table, row) {
  if (!/^[a-z_]+$/u.test(table)) throw new Error("Synthetic fixture table name was not safe.");
  const columns = Object.keys(row);
  const jsonColumns = new Set(["body_blocks", "config", "value"]);
  const literal = (column, value) => {
    if (value === null) return "null";
    if (jsonColumns.has(column)) {
      return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
    }
    if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    throw new Error(`Synthetic fixture value for ${table}.${column} was not supported.`);
  };

  const unsafeColumn = columns.find((column) => !/^[a-z][a-z0-9_]*$/u.test(column));
  if (columns.length === 0 || unsafeColumn) {
    throw new Error(
      `Synthetic ${table} fixture columns were not safe: ${unsafeColumn ?? "none"} (${columns.join(",")}).`,
    );
  }

  runLocalSql(
    `insert into public.${table} (${columns.join(", ")}) values (${columns
      .map((column) => literal(column, row[column]))
      .join(", ")});`,
    `Synthetic ${table} fixture insert`,
  );
}

async function seedFixtures(superProfileId) {
  const evidence = (id, label) => ({
    id,
    fact_claim: `SYNTHETIC S4 evidence claim ${label}`,
    source_type: "internal_record",
    source_reference: `SYNTHETIC:S4:${label}`,
    reviewer_id: superProfileId,
    verified_at: syntheticNow,
    verification_state: "verified",
    sensitivity: "public",
    consent_required: false,
    consent_state: "not_required",
    created_by: superProfileId,
    updated_by: superProfileId,
  });

  for (const [id, label] of [
    [ids.serviceEvidence, "service"],
    [ids.projectEvidence, "project"],
    [ids.postEvidence, "post"],
    [ids.pageEvidence, "page"],
    [ids.teamEvidence, "team"],
    [ids.testimonialEvidence, "testimonial"],
    [ids.credentialEvidence, "credential"],
    [ids.navigationEvidence, "navigation"],
  ]) {
    await insert("evidence_records", evidence(id, label));
  }

  await insert("services", {
    id: ids.service,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("service_localizations", {
    service_id: ids.service,
    locale: "en",
    slug: "synthetic-service",
    name: "Synthetic service",
    summary: "Synthetic service summary used only by local integration tests.",
    body_blocks: [{ type: "paragraph", text: "Synthetic service body for local verification." }],
    schema_version: 1,
    seo_title: "Synthetic service",
    seo_description: "Synthetic service description for local verification.",
    scope: "Synthetic scope",
    deliverables: "Synthetic deliverables",
    exclusions: "Synthetic exclusions",
    client_inputs: "Synthetic client inputs",
    delivery_wording: "Synthetic delivery wording",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("service_evidence", {
    service_id: ids.service,
    evidence_id: ids.serviceEvidence,
    required: true,
  });

  await insert("projects", {
    id: ids.project,
    public_location: "Synthetic locality",
    public_location_granularity: "locality",
    project_type: "Synthetic project type",
    project_scope: "Synthetic project scope",
    renz_role: "Synthetic project role",
    reviewed_by: superProfileId,
    reviewed_at: syntheticNow,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("project_localizations", {
    project_id: ids.project,
    locale: "en",
    slug: "synthetic-project",
    title: "Synthetic project",
    summary: "Synthetic project summary used only by local integration tests.",
    seo_title: "Synthetic project",
    seo_description: "Synthetic project description for local verification.",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("project_services", { project_id: ids.project, service_id: ids.service });
  await insert("project_evidence", {
    project_id: ids.project,
    evidence_id: ids.projectEvidence,
    required: true,
  });

  await insert("posts", {
    id: ids.post,
    publication_date: syntheticDate,
    reviewed_by: superProfileId,
    reviewed_at: syntheticNow,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("post_localizations", {
    post_id: ids.post,
    locale: "en",
    slug: "synthetic-post",
    title: "Synthetic insight",
    excerpt: "Synthetic insight excerpt.",
    body_blocks: [{ type: "paragraph", text: "Synthetic insight body for local verification." }],
    schema_version: 1,
    seo_title: "Synthetic insight",
    seo_description: "Synthetic insight description for local verification.",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("post_evidence", {
    post_id: ids.post,
    evidence_id: ids.postEvidence,
    required: true,
  });

  await insert("site_pages", {
    id: ids.page,
    page_key: "s4-synthetic-page",
    template_key: "general",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("page_localizations", {
    page_id: ids.page,
    locale: "en",
    path: "/s4-synthetic-page",
    title: "Synthetic page",
    summary: "Synthetic page summary.",
    body_blocks: [{ type: "paragraph", text: "Synthetic page body for local verification." }],
    schema_version: 1,
    seo_title: "Synthetic page",
    seo_description: "Synthetic page description for local verification.",
    noindex: false,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("page_evidence", {
    page_id: ids.page,
    evidence_id: ids.pageEvidence,
    required: true,
  });

  await insert("team_members", {
    id: ids.teamMember,
    consent_state: "granted",
    reviewed_by: superProfileId,
    reviewed_at: syntheticNow,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("team_member_localizations", {
    team_member_id: ids.teamMember,
    locale: "en",
    name: "Synthetic team member",
    role_label: "Synthetic role",
    biography: "Synthetic biography for local verification.",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("team_member_evidence", {
    team_member_id: ids.teamMember,
    evidence_id: ids.teamEvidence,
    required: true,
  });

  await insert("testimonials", {
    id: ids.testimonial,
    attribution_mode: "named",
    attribution_name: "Synthetic reviewer",
    attribution_role: "Synthetic role",
    consent_state: "granted",
    attribution_approved: true,
    reviewed_by: superProfileId,
    reviewed_at: syntheticNow,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("testimonial_localizations", {
    testimonial_id: ids.testimonial,
    locale: "en",
    quote: "Synthetic testimonial quote for local verification.",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("testimonial_verifications", {
    testimonial_id: ids.testimonial,
    source_reference: "SYNTHETIC:S4:testimonial-verification",
    verification_state: "verified",
    verified_by: superProfileId,
    verified_at: syntheticNow,
    consent_required: false,
    consent_state: "not_required",
    approved_quote: "Synthetic testimonial quote for local verification.",
  });
  await insert("testimonial_evidence", {
    testimonial_id: ids.testimonial,
    evidence_id: ids.testimonialEvidence,
    required: true,
  });

  await insert("credentials", {
    id: ids.credential,
    issuer: "Synthetic issuer",
    reference: "SYNTHETIC-REFERENCE",
    reviewed_by: superProfileId,
    reviewed_at: syntheticNow,
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("credential_localizations", {
    credential_id: ids.credential,
    locale: "en",
    name: "Synthetic credential",
    description: "Synthetic credential description.",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("credential_verifications", {
    credential_id: ids.credential,
    source_reference: "SYNTHETIC:S4:credential-verification",
    verification_state: "verified",
    verified_by: superProfileId,
    verified_at: syntheticNow,
    approved_public_wording: "Synthetic credential wording.",
  });
  await insert("credential_evidence", {
    credential_id: ids.credential,
    evidence_id: ids.credentialEvidence,
    required: true,
  });

  await insert("media_assets", {
    id: ids.media,
    bucket_id: "editorial-derivatives",
    object_path: `${ids.media}/s4-derivative.jpg`,
    mime_type: "image/jpeg",
    byte_size: syntheticMediaBytes.length,
    checksum_sha256: createHash("sha256").update(syntheticMediaBytes).digest("hex"),
    media_kind: "image",
    provenance_class: "production_asset",
    storage_state: "ready_private",
    visibility: "private",
    rights_status: "cleared",
    public_use_permission: "granted",
    rights_reviewer_id: superProfileId,
    rights_verified_at: syntheticNow,
    consent_required: false,
    consent_state: "not_required",
    base_alt_text: "Synthetic derivative asset.",
    credit: "Synthetic credit",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("project_media", {
    id: ids.projectMedia,
    project_id: ids.project,
    media_asset_id: ids.media,
    role: "hero",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("project_media_localizations", {
    project_media_id: ids.projectMedia,
    locale: "en",
    alt_text: "Synthetic project media asset.",
    caption: "Synthetic caption.",
    created_by: superProfileId,
    updated_by: superProfileId,
  });

  await insert("navigation_menus", {
    id: ids.menu,
    key: "s4-synthetic",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("navigation_items", {
    id: ids.navigationItem,
    menu_id: ids.menu,
    link_type: "internal",
    internal_path: "/s4-synthetic-page",
    visibility: "visible",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("navigation_item_localizations", {
    navigation_item_id: ids.navigationItem,
    locale: "en",
    label: "Synthetic page",
    accessibility_text: "Open synthetic page",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("navigation_evidence", {
    navigation_menu_id: ids.menu,
    evidence_id: ids.navigationEvidence,
    required: true,
  });

  await insert("public_site_settings", {
    namespace: "website.public",
    key: "default_locale",
    value: "en",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
  await insert("public_site_settings", {
    namespace: "contact.public",
    key: "directions_url",
    value: "https://synthetic.example.test/directions",
    created_by: superProfileId,
    updated_by: superProfileId,
  });

  await insert("media_assets", {
    id: ids.conceptMedia,
    bucket_id: "editorial-originals",
    object_path: `${ids.conceptMedia}/concept.jpg`,
    mime_type: "image/jpeg",
    byte_size: syntheticMediaBytes.length,
    checksum_sha256: createHash("sha256").update(syntheticMediaBytes).digest("hex"),
    media_kind: "image",
    provenance_class: "concept_demo",
    storage_state: "ready_private",
    rights_status: "unknown",
    public_use_permission: "not_granted",
    consent_required: false,
    consent_state: "not_required",
    created_by: superProfileId,
    updated_by: superProfileId,
  });
}

async function cleanupFixtures() {
  await admin.from("content_section_registry").update({ enabled: true }).eq("key", "rich_text");
  await admin.from("page_sections").delete().eq("id", ids.unsupportedSection);
  await admin.from("navigation_evidence").delete().eq("navigation_menu_id", ids.menu);
  await admin
    .from("navigation_item_localizations")
    .delete()
    .eq("navigation_item_id", ids.navigationItem);
  await admin.from("navigation_items").delete().eq("id", ids.navigationItem);
  await admin.from("navigation_menus").delete().eq("id", ids.menu);
  await admin
    .from("public_site_settings")
    .delete()
    .eq("namespace", "website.public")
    .eq("key", "default_locale");
  await admin
    .from("public_site_settings")
    .delete()
    .eq("namespace", "contact.public")
    .eq("key", "directions_url");
  await admin
    .from("project_media_localizations")
    .delete()
    .in("project_media_id", [
      ids.projectMedia,
      ids.conceptProjectMedia,
      ids.unknownRightsProjectMedia,
      ids.missingAltProjectMedia,
    ]);
  await admin
    .from("project_media")
    .delete()
    .in("id", [
      ids.projectMedia,
      ids.conceptProjectMedia,
      ids.unknownRightsProjectMedia,
      ids.missingAltProjectMedia,
    ]);
  await admin
    .from("media_assets")
    .delete()
    .in("id", [ids.media, ids.conceptMedia, ids.unknownRightsMedia]);
  await admin.from("credential_evidence").delete().eq("credential_id", ids.credential);
  await admin.from("credential_verifications").delete().eq("credential_id", ids.credential);
  await admin.from("credential_localizations").delete().eq("credential_id", ids.credential);
  await admin.from("credentials").delete().eq("id", ids.credential);
  await admin.from("testimonial_evidence").delete().eq("testimonial_id", ids.testimonial);
  await admin.from("testimonial_verifications").delete().eq("testimonial_id", ids.testimonial);
  await admin.from("testimonial_localizations").delete().eq("testimonial_id", ids.testimonial);
  await admin.from("testimonials").delete().eq("id", ids.testimonial);
  await admin.from("team_member_evidence").delete().eq("team_member_id", ids.teamMember);
  await admin.from("team_member_localizations").delete().eq("team_member_id", ids.teamMember);
  await admin.from("team_members").delete().eq("id", ids.teamMember);
  await admin.from("page_evidence").delete().eq("page_id", ids.page);
  await admin.from("page_localizations").delete().eq("page_id", ids.page);
  await admin.from("site_pages").delete().eq("id", ids.page);
  await admin.from("post_evidence").delete().eq("post_id", ids.post);
  await admin.from("post_localizations").delete().eq("post_id", ids.post);
  await admin.from("posts").delete().eq("id", ids.post);
  await admin.from("project_evidence").delete().eq("project_id", ids.project);
  await admin.from("project_services").delete().eq("project_id", ids.project);
  await admin.from("project_localizations").delete().eq("project_id", ids.project);
  await admin.from("projects").delete().eq("id", ids.project);
  await admin.from("service_evidence").delete().eq("service_id", ids.service);
  await admin.from("service_localizations").delete().eq("service_id", ids.service);
  await admin.from("services").delete().eq("id", ids.service);
  await admin
    .from("evidence_records")
    .delete()
    .in("id", [
      ids.serviceEvidence,
      ids.projectEvidence,
      ids.postEvidence,
      ids.pageEvidence,
      ids.teamEvidence,
      ids.testimonialEvidence,
      ids.credentialEvidence,
      ids.navigationEvidence,
    ]);
}

async function signInActor(email, password) {
  const actorClient = client(credentials.publishableKey);
  const signIn = await actorClient.auth.signInWithPassword({
    email,
    password,
  });
  assert(
    !signIn.error,
    `Synthetic actor sign-in failed: ${signIn.error?.message ?? "unknown authentication error"}`,
  );
  return actorClient;
}

async function activateAal2(actorClient, factorName) {
  const enrolled = await actorClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: factorName,
  });
  assert(enrolled.data?.totp && !enrolled.error, "Synthetic actor MFA enrollment failed.");
  const verified = await actorClient.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: currentTotp(enrolled.data.totp.secret),
  });
  assert(!verified.error, "Synthetic actor MFA verification failed.");
  const activated = await actorClient.rpc("activate_current_profile");
  assert(activated.data === true && !activated.error, "Synthetic actor profile activation failed.");
}

async function verifyPublication() {
  let operatorRoleId;
  let superActor;
  let operatorClient;

  try {
    operatorRoleId = await ensureTestOperatorRole();
    superActor = await createActor(superEmail, superPassword, operatorRoleKey);
    await createActor(rivalEmail, rivalPassword, operatorRoleKey);
    await createActor(editorEmail, editorPassword, "admin");
    await createActor(unassignedEmail, unassignedPassword);
    await seedFixtures(superActor.profileId);

    operatorClient = await signInActor(superEmail, superPassword);
    const aal1Publish = await rpc(operatorClient, "publish_content", {
      content_type: "service",
      target_id: ids.service,
      expected_version: 1,
    });
    assert(
      hasReason(aal1Publish, "not_authorized"),
      "An AAL1 actor with publication capability was allowed to publish.",
    );
    await activateAal2(operatorClient, "SYNTHETIC S4 operator factor");
    await uploadStorageFixtures(operatorClient);

    const unassignedClient = await signInActor(unassignedEmail, unassignedPassword);
    const unauthorizedUpload = await unassignedClient.storage
      .from(unauthorizedStorageFixture.bucket)
      .upload(unauthorizedStorageFixture.path, syntheticMediaBytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
    assert(
      Boolean(unauthorizedUpload.error),
      "An authenticated actor without media.upload created a Storage object.",
    );

    const rivalClient = await signInActor(rivalEmail, rivalPassword);
    await activateAal2(rivalClient, "SYNTHETIC S4 rival operator factor");

    const editorClient = await signInActor(editorEmail, editorPassword);
    await activateAal2(editorClient, "SYNTHETIC S4 limited-admin factor");
    const editorPublish = await rpc(editorClient, "publish_content", {
      content_type: "service",
      target_id: ids.service,
      expected_version: 1,
    });
    assert(
      hasReason(editorPublish, "not_authorized"),
      "An AAL2 administrator without content.publish was allowed to publish.",
    );

    const missingEvidence = await admin
      .from("service_evidence")
      .delete()
      .eq("service_id", ids.service)
      .eq("evidence_id", ids.serviceEvidence);
    assert(!missingEvidence.error, "Synthetic negative fixture mutation failed.");
    await expectReadinessReason(
      operatorClient,
      "service",
      ids.service,
      "missing_verification",
      undefined,
      "Missing evidence did not block readiness.",
    );
    runLocalSql(
      `update public.service_localizations
          set professional_terminology = 'Engineering', version = version + 1
        where service_id = '${ids.service}' and locale = 'en';`,
      "Synthetic professional-wording mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "service",
      ids.service,
      "missing_verification",
      "professional_terminology",
      "Unverified professional-capacity wording did not block readiness.",
    );
    runLocalSql(
      `update public.service_localizations
          set professional_terminology = null, version = version + 1
        where service_id = '${ids.service}' and locale = 'en';`,
      "Synthetic professional-wording restoration",
    );
    await insert("service_evidence", {
      service_id: ids.service,
      evidence_id: ids.serviceEvidence,
      required: true,
    });

    runLocalSql(
      `update public.service_localizations
          set scope = null, version = version + 1
        where service_id = '${ids.service}' and locale = 'en';`,
      "Synthetic service-scope mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "service",
      ids.service,
      "missing_required_field",
      "scope",
      "A service without scope was publication-ready.",
    );
    runLocalSql(
      `update public.service_localizations
          set scope = 'Synthetic scope', version = version + 1
        where service_id = '${ids.service}' and locale = 'en';`,
      "Synthetic service-scope restoration",
    );

    const expiredEvidence = await rpc(operatorClient, "transition_evidence", {
      target_id: ids.serviceEvidence,
      expected_version: 1,
      next_state: "expired",
    });
    assert(expiredEvidence?.ok === true, "Synthetic evidence could not enter expired state.");
    await expectReadinessReason(
      operatorClient,
      "service",
      ids.service,
      "evidence_expired",
      "evidence",
      "Expired evidence did not block service readiness.",
    );
    const restoredEvidence = await rpc(operatorClient, "transition_evidence", {
      target_id: ids.serviceEvidence,
      expected_version: 2,
      next_state: "verified",
    });
    assert(restoredEvidence?.ok === true, "Synthetic evidence could not be reverified.");
    const rejectedEvidence = await rpc(operatorClient, "transition_evidence", {
      target_id: ids.serviceEvidence,
      expected_version: 3,
      next_state: "rejected",
    });
    assert(rejectedEvidence?.ok === true, "Synthetic evidence could not enter rejected state.");
    await expectReadinessReason(
      operatorClient,
      "service",
      ids.service,
      "evidence_rejected",
      "evidence",
      "Rejected evidence did not block service readiness.",
    );
    const reverifiedEvidence = await rpc(operatorClient, "transition_evidence", {
      target_id: ids.serviceEvidence,
      expected_version: 4,
      next_state: "verified",
    });
    assert(reverifiedEvidence?.ok === true, "Rejected synthetic evidence could not be reverified.");

    runLocalSql(
      `update public.service_localizations
          set summary = '<strong>SYNTHETIC raw public summary</strong>',
              version = version + 1
        where service_id = '${ids.service}' and locale = 'en';`,
      "Synthetic raw public-text mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "service",
      ids.service,
      "unsafe_content",
      "content",
      "Raw markup in a projected plain-text field did not block readiness.",
    );
    runLocalSql(
      `update public.service_localizations
          set summary = 'Synthetic service summary used only by local integration tests.',
              version = version + 1
        where service_id = '${ids.service}' and locale = 'en';`,
      "Synthetic public-text restoration",
    );

    const unsafe = await admin
      .from("service_localizations")
      .update({ body_blocks: [{ type: "paragraph", text: "<script>synthetic</script>" }] })
      .eq("service_id", ids.service)
      .eq("locale", "en");
    assert(Boolean(unsafe.error), "Unsafe structured content was accepted by the database guard.");

    runLocalSql(
      `update public.projects set renz_role = null, version = version + 1 where id = '${ids.project}';`,
      "Synthetic project-role mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "project",
      ids.project,
      "missing_required_field",
      "renz_role",
      "A project without a RENZ role was publication-ready.",
    );
    runLocalSql(
      `update public.projects
          set renz_role = 'Synthetic project role', version = version + 1
        where id = '${ids.project}';`,
      "Synthetic project-role restoration",
    );

    const removedServiceRelation = await admin
      .from("project_services")
      .delete()
      .eq("project_id", ids.project)
      .eq("service_id", ids.service);
    assert(!removedServiceRelation.error, "Synthetic project-service removal failed.");
    await expectReadinessReason(
      operatorClient,
      "project",
      ids.project,
      "missing_related_service",
      "project_services",
      "A project without a related service was publication-ready.",
    );
    await insert("project_services", { project_id: ids.project, service_id: ids.service });

    const staleRights = await rpc(operatorClient, "promote_media_asset", {
      target_id: ids.conceptMedia,
      expected_version: 1,
    });
    assert(
      hasReason(staleRights, "invalid_media_classification"),
      "Concept media promotion was not rejected.",
    );

    runLocalSql(
      `begin;
       select set_config('renz.s4.media_command', '1', true);
       insert into public.project_media (id, project_id, media_asset_id, role, public_status)
       values ('${ids.conceptProjectMedia}', '${ids.project}', '${ids.conceptMedia}', 'gallery', 'eligible');
       commit;`,
      "Synthetic concept-media relationship",
    );
    await expectReadinessReason(
      operatorClient,
      "project",
      ids.project,
      "invalid_media_classification",
      "project_media",
      "Concept media did not block completed-project readiness.",
    );
    runLocalSql(
      `delete from public.project_media where id = '${ids.conceptProjectMedia}';`,
      "Synthetic concept-media cleanup",
    );

    await insert("media_assets", {
      id: ids.unknownRightsMedia,
      bucket_id: "editorial-derivatives",
      object_path: `${ids.unknownRightsMedia}/rights-unknown.jpg`,
      mime_type: "image/jpeg",
      byte_size: syntheticMediaBytes.length,
      checksum_sha256: createHash("sha256").update(syntheticMediaBytes).digest("hex"),
      media_kind: "image",
      provenance_class: "production_asset",
      storage_state: "ready_private",
      rights_status: "unknown",
      public_use_permission: "not_granted",
      consent_required: false,
      consent_state: "not_required",
      created_by: superActor.profileId,
      updated_by: superActor.profileId,
    });
    const unknownRightsPromotion = await rpc(operatorClient, "promote_media_asset", {
      target_id: ids.unknownRightsMedia,
      expected_version: 1,
    });
    assert(
      hasReason(unknownRightsPromotion, "rights_unknown"),
      "Rights-unknown media was promotable.",
    );
    runLocalSql(
      `begin;
       select set_config('renz.s4.media_command', '1', true);
       insert into public.project_media (id, project_id, media_asset_id, role, public_status)
       values ('${ids.unknownRightsProjectMedia}', '${ids.project}', '${ids.unknownRightsMedia}', 'gallery', 'eligible');
       commit;`,
      "Synthetic rights-unknown media relationship",
    );
    await insert("project_media_localizations", {
      project_media_id: ids.unknownRightsProjectMedia,
      locale: "en",
      alt_text: "Synthetic rights-unknown media.",
    });
    await expectReadinessReason(
      operatorClient,
      "project",
      ids.project,
      "rights_unknown",
      "project_media",
      "Rights-unknown project media did not block readiness.",
    );
    await admin
      .from("project_media_localizations")
      .delete()
      .eq("project_media_id", ids.unknownRightsProjectMedia);
    await admin.from("project_media").delete().eq("id", ids.unknownRightsProjectMedia);
    await admin.from("media_assets").delete().eq("id", ids.unknownRightsMedia);

    runLocalSql(
      `begin;
       select set_config('renz.s4.media_command', '1', true);
       insert into public.project_media (id, project_id, media_asset_id, role, public_status)
       values ('${ids.missingAltProjectMedia}', '${ids.project}', '${ids.media}', 'gallery', 'eligible');
       commit;`,
      "Synthetic missing-alt media relationship",
    );
    await expectReadinessReason(
      operatorClient,
      "project",
      ids.project,
      "missing_alt_text",
      "project_media",
      "Non-decorative project media without alt text was publication-ready.",
    );
    await admin.from("project_media").delete().eq("id", ids.missingAltProjectMedia);

    runLocalSql(
      `update public.testimonial_verifications
          set verification_state = 'in_review', version = version + 1
        where testimonial_id = '${ids.testimonial}';`,
      "Synthetic testimonial-verification mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "testimonial",
      ids.testimonial,
      "missing_verification",
      "verification",
      "An unverified testimonial was publication-ready.",
    );
    runLocalSql(
      `update public.testimonial_verifications
          set verification_state = 'verified', version = version + 1
        where testimonial_id = '${ids.testimonial}';`,
      "Synthetic testimonial-verification restoration",
    );
    runLocalSql(
      `update public.testimonials
          set consent_state = 'revoked', version = version + 1
        where id = '${ids.testimonial}';`,
      "Synthetic testimonial-consent mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "testimonial",
      ids.testimonial,
      "consent_missing",
      "consent",
      "A testimonial without current consent was publication-ready.",
    );
    runLocalSql(
      `update public.testimonials
          set consent_state = 'granted', version = version + 1
        where id = '${ids.testimonial}';`,
      "Synthetic testimonial-consent restoration",
    );

    runLocalSql(
      `update public.credential_verifications
          set verification_state = 'in_review', version = version + 1
        where credential_id = '${ids.credential}';`,
      "Synthetic credential-verification mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "credential",
      ids.credential,
      "missing_verification",
      "verification",
      "A credential without verification was publication-ready.",
    );
    runLocalSql(
      `update public.credential_verifications
          set verification_state = 'verified', version = version + 1
        where credential_id = '${ids.credential}';`,
      "Synthetic credential-verification restoration",
    );
    runLocalSql(
      `update public.credentials
          set valid_to = current_date - 1, version = version + 1
        where id = '${ids.credential}';`,
      "Synthetic credential-expiry mutation",
    );
    await expectReadinessReason(
      operatorClient,
      "credential",
      ids.credential,
      "credential_expired",
      "valid_to",
      "An expired credential was publication-ready.",
    );
    runLocalSql(
      `update public.credentials
          set valid_to = null, version = version + 1
        where id = '${ids.credential}';`,
      "Synthetic credential-expiry restoration",
    );

    await insert("page_sections", {
      id: ids.unsupportedSection,
      page_id: ids.page,
      section_type: "rich_text",
      schema_version: 1,
      config: {},
      sort_order: 900,
      enabled: true,
    });
    const disableSection = await admin
      .from("content_section_registry")
      .update({ enabled: false })
      .eq("key", "rich_text");
    assert(!disableSection.error, "Synthetic section registry mutation failed.");
    await expectReadinessReason(
      operatorClient,
      "page",
      ids.page,
      "unsupported_block",
      "page_sections",
      "A page with a disabled/unapproved section was publication-ready.",
    );
    await admin.from("content_section_registry").update({ enabled: true }).eq("key", "rich_text");
    await admin.from("page_sections").delete().eq("id", ids.unsupportedSection);

    const unsafeNavigation = await admin
      .from("navigation_items")
      .update({
        link_type: "external",
        internal_path: null,
        external_url: "javascript:synthetic",
        version: 2,
      })
      .eq("id", ids.navigationItem);
    assert(Boolean(unsafeNavigation.error), "An unsafe navigation URL passed the database guard.");

    const unknownSetting = await rpc(operatorClient, "update_public_site_setting", {
      target_namespace: "unknown.public",
      target_key: "secret",
      target_value: "SYNTHETIC",
      expected_version: 1,
      next_public_status: "eligible",
    });
    assert(hasReason(unknownSetting, "unknown_setting"), "An unknown public setting was accepted.");

    const ambiguousSettingUrl = await rpc(operatorClient, "update_public_site_setting", {
      target_namespace: "contact.public",
      target_key: "directions_url",
      target_value: "https://synthetic.example.test\\@other.example.test",
      expected_version: 1,
      next_public_status: "private",
    });
    assert(
      hasReason(ambiguousSettingUrl, "invalid_url"),
      "An ambiguous public setting URL did not return invalid_url.",
    );

    const wrongVersion = await rpc(operatorClient, "publish_content", {
      content_type: "service",
      target_id: ids.service,
      expected_version: 999,
    });
    assert(
      hasReason(wrongVersion, "version_conflict"),
      "Optimistic publication version conflict was not returned.",
    );

    runLocalSql(
      `update public.profiles
          set account_status = 'disabled', version = version + 1
        where id = '${superActor.profileId}';`,
      "Synthetic disabled-actor mutation",
    );
    try {
      const disabledPublish = await rpc(operatorClient, "publish_content", {
        content_type: "service",
        target_id: ids.service,
        expected_version: 1,
      });
      assert(
        hasReason(disabledPublish, "not_authorized"),
        "A disabled actor was allowed to publish.",
      );
    } finally {
      runLocalSql(
        `update public.profiles
            set account_status = 'active', version = version + 1
          where id = '${superActor.profileId}';`,
        "Synthetic disabled-actor restoration",
      );
    }

    const anonymous = client(credentials.anonymousKey);
    const anonymousPublish = await anonymous.rpc("publish_content", {
      content_type: "service",
      target_id: ids.service,
      expected_version: 1,
    });
    assert(Boolean(anonymousPublish.error), "Anonymous publication RPC was unexpectedly callable.");

    const concurrentVersion = await currentVersion("services", ids.service);
    const concurrentPublications = await Promise.all([
      rpc(operatorClient, "publish_content", {
        content_type: "service",
        target_id: ids.service,
        expected_version: concurrentVersion,
      }),
      rpc(rivalClient, "publish_content", {
        content_type: "service",
        target_id: ids.service,
        expected_version: concurrentVersion,
      }),
    ]);
    assert(
      concurrentPublications.filter((result) => result?.ok === true).length === 1 &&
        concurrentPublications.filter((result) => hasReason(result, "version_conflict")).length ===
          1,
      "Concurrent publication did not resolve to exactly one success and one version conflict.",
    );

    const promotedAsset = await rpc(operatorClient, "promote_media_asset", {
      target_id: ids.media,
      expected_version: await currentVersion("media_assets", ids.media),
    });
    assert(promotedAsset?.ok === true, "Rights-cleared derivative promotion failed.");

    const projectMedia = await rpc(operatorClient, "promote_project_media", {
      target_id: ids.projectMedia,
      expected_version: await currentVersion("project_media", ids.projectMedia),
    });
    assert(projectMedia?.ok === true, "Positive project media promotion failed.");

    const mediaBeforeParent = await anonymous
      .from("published_project_media")
      .select("id")
      .eq("id", ids.projectMedia);
    assert(
      !mediaBeforeParent.error && mediaBeforeParent.data.length === 0,
      `Eligible project media was not safely hidden before its parent project was published (${mediaBeforeParent.error?.code ?? "no_error"}): ${mediaBeforeParent.error?.message ?? JSON.stringify(mediaBeforeParent.data)}.`,
    );

    const publishTargets = [
      ["project", "projects", ids.project],
      ["post", "posts", ids.post],
      ["page", "site_pages", ids.page],
      ["team_member", "team_members", ids.teamMember],
      ["testimonial", "testimonials", ids.testimonial],
      ["credential", "credentials", ids.credential],
    ];
    for (const [contentType, table, targetId] of publishTargets) {
      const result = await rpc(operatorClient, "publish_content", {
        content_type: contentType,
        target_id: targetId,
        expected_version: await currentVersion(table, targetId),
      });
      assert(result?.ok === true, `${contentType} positive publication failed.`);
    }

    const menu = await rpc(operatorClient, "publish_navigation_menu", {
      target_id: ids.menu,
      expected_version: 1,
    });
    assert(menu?.ok === true, "Positive navigation publication failed.");

    const setting = await rpc(operatorClient, "update_public_site_setting", {
      target_namespace: "website.public",
      target_key: "default_locale",
      target_value: "en",
      expected_version: 1,
      next_public_status: "eligible",
    });
    assert(setting?.ok === true, "Positive allow-listed public setting update failed.");

    const publicChecks = [
      ["published_services", "id", ids.service],
      ["published_projects", "id", ids.project],
      ["published_posts", "id", ids.post],
      ["published_pages", "id", ids.page],
      ["published_team_members", "id", ids.teamMember],
      ["published_testimonials", "id", ids.testimonial],
      ["published_credentials", "id", ids.credential],
      ["published_project_media", "id", ids.projectMedia],
      ["published_navigation_items", "id", ids.navigationItem],
    ];
    for (const [view, column, value] of publicChecks) {
      const result = await anonymous.from(view).select(column).eq(column, value).limit(1);
      if (
        view === "published_project_media" &&
        (result.error || (result.data?.length ?? 0) !== 1)
      ) {
        const usage = await admin
          .from("project_media")
          .select("id,project_id,media_asset_id,public_status")
          .eq("id", ids.projectMedia)
          .maybeSingle();
        const asset = await admin
          .from("media_assets")
          .select(
            "id,bucket_id,mime_type,storage_state,rights_status,public_use_permission,rights_reviewer_id,rights_verified_at,consent_required,consent_state",
          )
          .eq("id", ids.media)
          .maybeSingle();
        throw new Error(
          `Anonymous project media projection failed: ${result.error?.message ?? "row missing"}; usage=${JSON.stringify(usage.data)}; asset=${JSON.stringify(asset.data)}`,
        );
      }
      assert(
        !result.error && (result.data?.length ?? 0) === 1,
        `Anonymous projection ${view} did not expose the published row.`,
      );
    }
    const publicSetting = await anonymous
      .from("published_site_settings")
      .select("namespace,key,value")
      .eq("namespace", "website.public")
      .eq("key", "default_locale")
      .single();
    assert(
      !publicSetting.error && publicSetting.data?.value === "en",
      "Anonymous setting projection was not allow-listed correctly.",
    );

    const privateEvidence = await anonymous.from("evidence_records").select("id").limit(1);
    assert(Boolean(privateEvidence.error), "Anonymous evidence access was unexpectedly allowed.");

    const unpublished = await rpc(operatorClient, "unpublish_content", {
      content_type: "service",
      target_id: ids.service,
      expected_version: await currentVersion("services", ids.service),
    });
    assert(unpublished?.ok === true, "Unpublication command failed.");
    const hiddenService = await anonymous
      .from("published_services")
      .select("id")
      .eq("id", ids.service);
    assert(
      !hiddenService.error && hiddenService.data.length === 0,
      "Unpublished service remained in the projection.",
    );

    const archived = await rpc(operatorClient, "archive_content", {
      content_type: "post",
      target_id: ids.post,
      expected_version: await currentVersion("posts", ids.post),
    });
    assert(archived?.ok === true, "Archive command failed.");
    const hiddenPost = await anonymous.from("published_posts").select("id").eq("id", ids.post);
    assert(
      !hiddenPost.error && hiddenPost.data.length === 0,
      "Archived post remained in the projection.",
    );

    console.log(
      JSON.stringify({
        ok: true,
        negative: [
          "service missing scope",
          "unverified professional wording",
          "missing evidence",
          "expired evidence",
          "rejected evidence",
          "unsafe content",
          "project media before parent publication",
          "project missing RENZ role",
          "project missing related service",
          "project with concept media",
          "project with unknown media rights",
          "project media missing alt text",
          "unverified testimonial",
          "testimonial without consent",
          "credential without verification",
          "expired credential",
          "page with unsupported block",
          "unsafe external URL",
          "unknown public setting",
          "ambiguous public setting URL",
          "version conflict",
          "concurrent publication version conflict",
          "AAL1 actor",
          "actor missing permission",
          "disabled actor",
          "anonymous RPC",
        ],
        published: ["service", ...publishTargets.map(([contentType]) => contentType)],
        projections: publicChecks.map(([view]) => view).concat("published_site_settings"),
        privateEvidence: "denied",
        authorizedStorage: "upload/download passed",
        unauthorizedStorage: "mutation denied",
        unpublish: "hidden",
        archive: "hidden",
      }),
    );
  } finally {
    const cleanupFailures = [];
    const cleanupSteps = [
      () => cleanupStorageFixtures(),
      () => cleanupFixtures(),
      () => removeUserByEmail(superEmail),
      () => removeUserByEmail(rivalEmail),
      () => removeUserByEmail(editorEmail),
      () => removeUserByEmail(unassignedEmail),
      async () => {
        if (!operatorRoleId) return;
        await admin.from("role_permissions").delete().eq("role_id", operatorRoleId);
        await admin.from("roles").delete().eq("id", operatorRoleId);
      },
    ];
    for (const cleanup of cleanupSteps) {
      try {
        await cleanup();
      } catch {
        cleanupFailures.push("cleanup step failed");
      }
    }
    if (cleanupFailures.length > 0) {
      console.error(
        "One or more synthetic S4 cleanup steps failed; no sensitive detail was logged.",
      );
      process.exitCode = 1;
    }
  }
}

try {
  await verifyPublication();
} catch (error) {
  console.error(error instanceof Error ? error.message : "S4 publication verification failed.");
  process.exitCode = 1;
}
