import { createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { getLocalSupabaseCredentials } from "./s4-local.mjs";

let localCredentials;
try {
  localCredentials = getLocalSupabaseCredentials();
} catch {
  localCredentials = null;
}

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? localCredentials?.url;
const publishableKey =
  process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ?? localCredentials?.publishableKey;
const secretKey = process.env["SUPABASE_SECRET_KEY"] ?? localCredentials?.secretKey;
const anonymousKey = process.env["SUPABASE_ANON_KEY"] ?? localCredentials?.anonymousKey;

if (!url || !publishableKey || !secretKey || !anonymousKey) {
  throw new Error(
    "Local Auth verification requires the public URL, publishable key, anonymous key, and server secret key.",
  );
}

const email = "s3-admin@example.test";
const invitedEmail = "s3-invited@example.test";
const password = "Local-S3-Only-Password-2026!";

function client(key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
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
    if (index < 0) {
      throw new Error("Local TOTP secret was not valid base32.");
    }
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const admin = client(secretKey);
const publicClient = client(publishableKey);
const anonymousClient = client(anonymousKey);
const users = await admin.auth.admin.listUsers({ perPage: 1000 });
const existing = users.data.users.find((user) => user.email === email);
if (existing) {
  await admin.auth.admin.deleteUser(existing.id);
}
const existingInvite = users.data.users.find((user) => user.email === invitedEmail);
if (existingInvite) {
  await admin.auth.admin.deleteUser(existingInvite.id);
}

let invitedUserId;
let createdUserId;
try {
  const invitation = await admin.auth.admin.inviteUserByEmail(invitedEmail);
  assert(
    invitation.data.user && !invitation.error,
    "Invitation-only Auth API did not create a local invite.",
  );
  invitedUserId = invitation.data.user.id;

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { display_name: "SYNTHETIC Local Admin" },
  });
  assert(created.data.user, "Synthetic local administrator was not created.");
  createdUserId = created.data.user.id;

  const role = await admin.from("roles").select("id").eq("key", "admin").single();
  assert(role.data, "Seeded admin role was not found.");
  const assignment = await admin.from("user_roles").insert({
    user_id: createdUserId,
    role_id: role.data.id,
  });
  assert(!assignment.error, "Synthetic administrator role assignment failed.");

  const signedIn = await publicClient.auth.signInWithPassword({ email, password });
  assert(
    !signedIn.error,
    `Synthetic administrator first-factor sign-in failed: ${signedIn.error?.message ?? "unknown authentication error"}.`,
  );

  const publicSignup = await anonymousClient.auth.signUp({
    email: "public-signup@example.test",
    password,
  });
  assert(Boolean(publicSignup.error), "Public signup was unexpectedly enabled.");

  const enrolled = await publicClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "SYNTHETIC local test factor",
  });
  assert(enrolled.data?.totp, "Synthetic TOTP enrollment failed.");

  const verified = await publicClient.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: currentTotp(enrolled.data.totp.secret),
  });
  assert(!verified.error, "Synthetic TOTP verification failed.");

  const activated = await publicClient.rpc("activate_current_profile");
  assert(activated.data === true && !activated.error, "AAL2 profile activation failed.");

  const invitedAdminAssignment = await publicClient.rpc("assign_invited_admin", {
    target_user_id: invitedUserId,
  });
  assert(
    invitedAdminAssignment.data === true && !invitedAdminAssignment.error,
    "Caller-scoped invited-admin assignment failed.",
  );

  const permission = await publicClient.rpc("current_user_has_permission", {
    requested_permission: "users.read",
  });
  assert(
    permission.data === true && !permission.error,
    "Fresh users.read permission check failed.",
  );

  const auditWrite = await publicClient.rpc("record_audit_event", {
    event_action: "s3.auth.verify",
    event_entity_type: "synthetic",
    event_entity_id: "s3-auth-verify",
    event_outcome: "success",
    event_metadata: { source: "local-auth-verification" },
  });
  assert(!auditWrite.error, "Redacted audit writer did not accept safe metadata.");

  const auditRead = await publicClient
    .from("audit_logs")
    .select("action, entity_type, entity_id, outcome, metadata")
    .eq("entity_id", "s3-auth-verify")
    .maybeSingle();
  assert(
    auditRead.data?.action === "s3.auth.verify" &&
      auditRead.data.entity_type === "synthetic" &&
      auditRead.data.metadata?.source === "local-auth-verification",
    "Redacted audit writer did not persist the bounded event.",
  );

  const prohibitedAudit = await publicClient.rpc("record_audit_event", {
    event_action: "s3.auth.prohibited",
    event_entity_type: "synthetic",
    event_entity_id: "s3-auth-verify",
    event_outcome: "rejected",
    event_metadata: { password: "synthetic" },
  });
  assert(Boolean(prohibitedAudit.error), "Audit writer accepted a prohibited credential field.");

  const anonymousProfiles = await anonymousClient.from("profiles").select("id");
  assert(Boolean(anonymousProfiles.error), "Anonymous profile access was unexpectedly allowed.");

  const access = await publicClient.rpc("current_user_access");
  assert(
    (access.data ?? []).some(
      (entry) => entry.role_key === "admin" && entry.permission_key === "users.read",
    ),
    "Current access facade did not return the assigned capability.",
  );

  const badCode = await publicClient.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: "000000",
  });
  assert(Boolean(badCode.error), "An invalid TOTP code was accepted.");

  await publicClient.auth.signOut();
  const signedOutPermission = await publicClient.rpc("current_user_has_permission", {
    requested_permission: "users.read",
  });
  assert(signedOutPermission.data !== true, "Signed-out permission check did not fail closed.");

  console.log(
    "Local Auth verification passed: invitation-created user, caller-scoped admin assignment, password sign-in, TOTP AAL2, fresh RBAC, invalid-code rejection, and sign-out denial.",
  );
} finally {
  await admin.from("audit_logs").delete().eq("entity_id", "s3-auth-verify");
  if (invitedUserId) {
    await admin.from("audit_logs").delete().eq("entity_id", invitedUserId);
  }
  if (createdUserId) {
    await admin.auth.admin.deleteUser(createdUserId);
  }
  if (invitedUserId) {
    await admin.auth.admin.deleteUser(invitedUserId);
  }
}
