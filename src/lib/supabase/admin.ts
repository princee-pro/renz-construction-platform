import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/database.types";
import { getSupabaseSecretKey, getSupabaseServerEnvironment } from "@/lib/supabase/server-env";

function createNarrowAuthAdminClient() {
  const environment = getSupabaseServerEnvironment();

  return createClient<Database>(environment.url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

type CreatedStaff = Readonly<{ userId: string }>;

/**
 * C10 staff provisioning (server-only): creates the Auth user with the
 * owner-issued temporary password and a confirmed email (no invitation email
 * is sent — none is configured). The password is used once here and never
 * stored, logged or returned; the profile row is created by the S3 trigger
 * and prepared by the `admin_prepare_staff_profile` facade.
 */
export async function createStaffUser(
  email: string,
  temporaryPassword: string,
  displayName: string,
): Promise<CreatedStaff> {
  const client = createNarrowAuthAdminClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    throw new Error(error?.message.includes("already") ? "email_exists" : "create_failed");
  }
  return { userId: data.user.id };
}

/** Replaces a staff member's password with a new temporary one (server-only). */
export async function setStaffPassword(userId: string, temporaryPassword: string): Promise<void> {
  const client = createNarrowAuthAdminClient();
  const { error } = await client.auth.admin.updateUserById(userId, { password: temporaryPassword });
  if (error) throw new Error("password_reset_failed");
}

/**
 * Disabling bans the Auth user (refresh tokens stop working at once); the
 * profile status already blocks every facade for the current access token.
 * Reactivating lifts the ban.
 */
export async function setStaffBan(userId: string, banned: boolean): Promise<void> {
  const client = createNarrowAuthAdminClient();
  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) throw new Error("ban_update_failed");
}
