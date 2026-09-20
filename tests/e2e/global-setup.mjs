import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { getLocalSupabaseCredentials, root, runSupabase } from "../../scripts/s4-local.mjs";
import { currentTotp } from "./support/totp.mjs";

const fixtureDirectory = join(root, ".playwright");
const fixturePath = join(fixtureDirectory, "s5a-fixtures.json");
const fixturePassphrase = ["SYNTHETIC", "S5A", "Local", "Only", "2026!"].join("-");
const actorDefinitions = [
  ["superA", "s5a-super-a@example.test", "super_admin"],
  ["superB", "s5a-super-b@example.test", "super_admin"],
  ["admin", "s5a-admin@example.test", "admin"],
  ["visual", "s5a-visual@example.test", "admin"],
  ["aal1", "s5a-aal1@example.test", "admin"],
];
const publishedProjectMode = process.env.RENZ_E2E_PUBLISHED_PROJECT === "true";
const publishedProjectIds = {
  service: "66000000-0000-4000-8000-000000000001",
  project: "66000000-0000-4000-8000-000000000002",
  serviceEvidence: "66000000-0000-4000-8000-000000000101",
  projectEvidence: "66000000-0000-4000-8000-000000000102",
};
const publishedProjectTimestamp = "2026-09-08T00:00:00.000Z";

function client(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function passwordLogin(email) {
  return Object.fromEntries([
    ["email", email],
    ["password", fixturePassphrase],
  ]);
}

async function insertSyntheticRow(operator, table, row) {
  const inserted = await operator.from(table).insert(row);
  if (inserted.error) {
    throw new Error(`Synthetic ${table} fixture insert failed (${inserted.error.code}).`);
  }
}

function publicationSucceeded(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && value.ok === true;
}

async function seedPublishedProject(operator, publisher, publisherId) {
  const evidence = (id, label) => ({
    id,
    fact_claim: `SYNTHETIC S6A evidence claim ${label}`,
    source_type: "internal_record",
    source_reference: `SYNTHETIC:S6A:${label}`,
    reviewer_id: publisherId,
    verified_at: publishedProjectTimestamp,
    verification_state: "verified",
    sensitivity: "public",
    consent_required: false,
    consent_state: "not_required",
    created_by: publisherId,
    updated_by: publisherId,
  });

  await insertSyntheticRow(
    operator,
    "evidence_records",
    evidence(publishedProjectIds.serviceEvidence, "published-service"),
  );
  await insertSyntheticRow(
    operator,
    "evidence_records",
    evidence(publishedProjectIds.projectEvidence, "published-project"),
  );
  await insertSyntheticRow(operator, "services", {
    id: publishedProjectIds.service,
    created_by: publisherId,
    updated_by: publisherId,
  });
  await insertSyntheticRow(operator, "service_localizations", {
    service_id: publishedProjectIds.service,
    locale: "en",
    slug: "synthetic-s6a-project-service",
    name: "SYNTHETIC S6A Project Service",
    summary: "SYNTHETIC service relationship used only for public-project browser verification.",
    body_blocks: [
      {
        type: "paragraph",
        text: "SYNTHETIC service content used only for isolated browser verification.",
      },
    ],
    schema_version: 1,
    seo_title: "SYNTHETIC S6A Project Service",
    seo_description: "SYNTHETIC service metadata used only for browser verification.",
    scope: "SYNTHETIC verified scope",
    deliverables: "SYNTHETIC verified deliverables",
    exclusions: "SYNTHETIC verified exclusions",
    client_inputs: "SYNTHETIC verified inputs",
    delivery_wording: "SYNTHETIC verified delivery wording",
    created_by: publisherId,
    updated_by: publisherId,
  });
  await insertSyntheticRow(operator, "service_evidence", {
    service_id: publishedProjectIds.service,
    evidence_id: publishedProjectIds.serviceEvidence,
    required: true,
  });
  await insertSyntheticRow(operator, "projects", {
    id: publishedProjectIds.project,
    public_location: "SYNTHETIC test locality",
    public_location_granularity: "locality",
    project_type: "SYNTHETIC test project type",
    project_scope: "SYNTHETIC evidence-backed project scope.",
    renz_role: "SYNTHETIC evidence-backed project role.",
    reviewed_by: publisherId,
    reviewed_at: publishedProjectTimestamp,
    featured: true,
    created_by: publisherId,
    updated_by: publisherId,
  });
  await insertSyntheticRow(operator, "project_localizations", {
    project_id: publishedProjectIds.project,
    locale: "en",
    slug: "synthetic-s6a-published-project",
    title: "SYNTHETIC S6A Published Project",
    summary: "SYNTHETIC project summary used only for isolated browser verification.",
    seo_title: "SYNTHETIC S6A Published Project",
    seo_description: "SYNTHETIC project metadata used only for browser verification.",
    created_by: publisherId,
    updated_by: publisherId,
  });
  await insertSyntheticRow(operator, "project_services", {
    project_id: publishedProjectIds.project,
    service_id: publishedProjectIds.service,
  });
  await insertSyntheticRow(operator, "project_evidence", {
    project_id: publishedProjectIds.project,
    evidence_id: publishedProjectIds.projectEvidence,
    required: true,
  });

  for (const [contentType, targetId] of [
    ["service", publishedProjectIds.service],
    ["project", publishedProjectIds.project],
  ]) {
    const published = await publisher.rpc("publish_content", {
      content_type: contentType,
      target_id: targetId,
      expected_version: 1,
    });
    if (published.error || !publicationSucceeded(published.data)) {
      throw new Error(`Synthetic ${contentType} fixture publication failed.`);
    }
  }
}

export default async function globalSetup() {
  const reset = runSupabase(["db", "reset", "--local"], { timeout: 180_000 });
  if (reset.error || reset.status !== 0) {
    throw new Error("S5A browser fixture reset failed; database output was suppressed.");
  }
  // Keep runs independent of any on-disk Next data cache left by a previous server.
  rmSync(join(root, ".next", "cache", "fetch-cache"), { recursive: true, force: true });
  rmSync(join(root, ".next", "dev", "cache", "fetch-cache"), { recursive: true, force: true });

  const credentials = getLocalSupabaseCredentials();
  const operator = client(credentials.url, credentials.secretKey);
  // C8: the private intake quarantine bucket (db reset drops storage buckets).
  const intakeBucket = await operator.storage.createBucket("lead-intake", {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  });
  if (intakeBucket.error && !/already exists/iu.test(intakeBucket.error.message)) {
    throw new Error("The lead-intake bucket could not be provisioned for the browser suite.");
  }
  // CR1: the private editorial buckets (owner media uploads) and the approved
  // content migrated into the registers, exactly as a fresh deployment runs it.
  for (const bucket of ["editorial-originals", "editorial-derivatives"]) {
    const created = await operator.storage.createBucket(bucket, { public: false });
    if (created.error && !/already exists/iu.test(created.error.message)) {
      throw new Error(`The ${bucket} bucket could not be provisioned for the browser suite.`);
    }
  }
  if (process.env.RENZ_E2E_SKIP_CONTENT_SEED !== "true") {
    execFileSync(process.execPath, [join(root, "scripts", "website-seed-content.mjs")], {
      cwd: root,
      stdio: "ignore",
      timeout: 300_000,
      windowsHide: true,
    });
  }
  const roles = await operator.from("roles").select("id,key").in("key", ["admin", "super_admin"]);
  if (roles.error || !roles.data) throw new Error("S5A roles were unavailable.");
  const roleIds = Object.fromEntries(roles.data.map((role) => [role.key, role.id]));
  const actors = {};
  let projectPublisher = null;
  let projectPublisherId = null;

  const actorsForRun = publishedProjectMode ? actorDefinitions.slice(0, 1) : actorDefinitions;
  for (const [key, email, role] of actorsForRun) {
    const created = await operator.auth.admin.createUser({
      ...passwordLogin(email),
      email_confirm: true,
      user_metadata: { display_name: `SYNTHETIC ${key}` },
    });
    if (created.error || !created.data.user)
      throw new Error(`Synthetic ${key} actor creation failed.`);
    const roleId = roleIds[role];
    if (!roleId) throw new Error(`Synthetic ${role} role was unavailable.`);
    const assigned = await operator.from("user_roles").insert({
      user_id: created.data.user.id,
      role_id: roleId,
    });
    if (assigned.error) throw new Error(`Synthetic ${key} role assignment failed.`);

    const actorClient = client(credentials.url, credentials.publishableKey);
    const signedIn = await actorClient.auth.signInWithPassword(passwordLogin(email));
    if (signedIn.error) throw new Error(`Synthetic ${key} first-factor setup failed.`);
    const enrolled = await actorClient.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `SYNTHETIC ${key} browser factor`,
    });
    if (enrolled.error || !enrolled.data.totp) {
      throw new Error(`Synthetic ${key} MFA enrollment failed.`);
    }
    let verified = await actorClient.auth.mfa.challengeAndVerify({
      factorId: enrolled.data.id,
      code: currentTotp(enrolled.data.totp.secret, -1),
    });
    if (verified.error) {
      verified = await actorClient.auth.mfa.challengeAndVerify({
        factorId: enrolled.data.id,
        code: currentTotp(enrolled.data.totp.secret),
      });
    }
    if (verified.error) throw new Error(`Synthetic ${key} MFA verification failed.`);
    const activated = await actorClient.rpc("activate_current_profile");
    if (activated.error || activated.data !== true) {
      throw new Error(`Synthetic ${key} profile activation failed.`);
    }
    if (publishedProjectMode && key === "superA") {
      projectPublisher = actorClient;
      projectPublisherId = created.data.user.id;
    } else {
      await actorClient.auth.signOut();
    }
    actors[key] = Object.fromEntries([
      ["id", created.data.user.id],
      ["email", email],
      ["password", fixturePassphrase],
      ["totpSecret", enrolled.data.totp.secret],
    ]);
  }

  if (publishedProjectMode) {
    if (!projectPublisher || !projectPublisherId) {
      throw new Error("Synthetic project publisher setup failed.");
    }
    await seedPublishedProject(operator, projectPublisher, projectPublisherId);
    const anonymous = client(credentials.url, credentials.anonymousKey);
    const publishedProject = await anonymous
      .from("published_projects")
      .select("id,slug")
      .eq("id", publishedProjectIds.project);
    if (
      publishedProject.error ||
      publishedProject.data?.length !== 1 ||
      publishedProject.data[0]?.slug !== "synthetic-s6a-published-project"
    ) {
      throw new Error("Synthetic project was not exposed by the anonymous S4 projection.");
    }
    await projectPublisher.auth.signOut();
  }

  mkdirSync(fixtureDirectory, { recursive: true });
  mkdirSync(join(fixtureDirectory, "screenshots"), { recursive: true });
  writeFileSync(
    fixturePath,
    JSON.stringify(
      Object.fromEntries([
        ["actors", actors],
        [
          "supabase",
          Object.fromEntries([
            ["url", credentials.url],
            ["anonymousKey", credentials.anonymousKey],
            ["secretKey", credentials.secretKey],
          ]),
        ],
      ]),
    ),
    { encoding: "utf8", mode: 0o600 },
  );
}
