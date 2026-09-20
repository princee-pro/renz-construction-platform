import { createClient } from "@supabase/supabase-js";

import { currentTotp } from "../tests/e2e/support/totp.mjs";
import { assert, createLocalAdminClient, getLocalSupabaseCredentials } from "./s4-local.mjs";

// Shared synthetic-actor helpers for the C4 verification scripts
// (verify-c4.mjs, verify-c4-realtime.mjs). Every actor created here is
// local-only, obviously synthetic, and removed by the caller's cleanup.

export const credentials = getLocalSupabaseCredentials();
export const admin = createLocalAdminClient();

export function client(key) {
  return createClient(credentials.url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function removeUserByEmail(email) {
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

export async function createActor(email, password, roleKey) {
  await removeUserByEmail(email);
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { display_name: "SYNTHETIC C4 actor" },
  });
  assert(created.data?.user && !created.error, "Synthetic C4 user creation failed.");
  const role = await admin.from("roles").select("id").eq("key", roleKey).single();
  assert(role.data && !role.error, `Role ${roleKey} is missing.`);
  const assignment = await admin
    .from("user_roles")
    .insert({ user_id: created.data.user.id, role_id: role.data.id });
  assert(!assignment.error, "Synthetic C4 role assignment failed.");
  return created.data.user.id;
}

// Signs in, enrolls + verifies TOTP (AAL2), and activates the profile —
// the same three steps a real staff member completes in the browser.
export async function signInAndActivate(email, password) {
  const actorClient = client(credentials.publishableKey);
  const signIn = await actorClient.auth.signInWithPassword({ email, password });
  assert(!signIn.error, `Synthetic sign-in failed for ${email}.`);
  const enrolled = await actorClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "SYNTHETIC C4 operator",
  });
  assert(enrolled.data?.totp && !enrolled.error, "Synthetic MFA enrollment failed.");
  const verified = await actorClient.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: currentTotp(enrolled.data.totp.secret),
  });
  assert(!verified.error, "Synthetic MFA verification failed.");
  const activated = await actorClient.rpc("activate_current_profile");
  assert(activated.data === true && !activated.error, "Synthetic profile activation failed.");
  // supabase-js pushes tokens to the realtime socket on SIGNED_IN /
  // TOKEN_REFRESHED only, not after an MFA step-up — mirror the browser hook
  // and push the AAL2 token explicitly so realtime RLS sees the right claims.
  const session = await actorClient.auth.getSession();
  if (session.data.session?.access_token) {
    actorClient.realtime.setAuth(session.data.session.access_token);
  }
  return actorClient;
}

export async function rpc(actorClient, name, args) {
  const result = await actorClient.rpc(name, args);
  assert(!result.error, `${name} RPC transport failed: ${result.error?.message ?? ""}`);
  return result.data;
}
