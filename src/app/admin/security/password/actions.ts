"use server";

import { redirect } from "next/navigation";

import { temporaryPasswordSchema } from "@/features/settings/settings-contract";
import { requireAal2User } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PasswordChangeState = Readonly<{ error?: string }>;

/**
 * C10 §21, §100: replaces the temporary password with the staff member's own.
 * Runs at AAL2 (the authenticator was verified first), updates Auth, then
 * clears the database gate through `complete_password_change`. The password
 * never leaves this request; nothing about it is logged or audited.
 */
export async function changePasswordAction(
  _previous: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  await requireAal2User({ allowPasswordChangePending: true });
  const passwordField = formData.get("password");
  const confirmField = formData.get("confirm");
  const password = typeof passwordField === "string" ? passwordField : "";
  const confirm = typeof confirmField === "string" ? confirmField : "";
  const policy = temporaryPasswordSchema.safeParse(password);
  if (!policy.success) {
    return { error: policy.error.issues[0]?.message ?? "Choose a stronger password." };
  }
  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }
  const client = await createServerSupabaseClient();
  const updated = await client.auth.updateUser({ password });
  if (updated.error) {
    return {
      error: updated.error.message.toLowerCase().includes("different")
        ? "Choose a password you have not used before."
        : "The password could not be changed. Try again.",
    };
  }
  const cleared = await client.rpc("complete_password_change");
  if (cleared.error) {
    return {
      error: "Your password changed, but the workspace could not be unlocked. Sign in again.",
    };
  }
  redirect("/admin");
}
