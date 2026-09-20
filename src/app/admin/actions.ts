"use server";

import { redirect } from "next/navigation";

import { getAdminAuthSnapshot } from "@/lib/auth/guards";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActionState = Readonly<{
  error?: string;
  success?: string;
}>;

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function verifyMfaAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = readText(formData, "code");
  const requestedFactorId = readText(formData, "factorId");
  const next = safeInternalRedirect(readText(formData, "next"));

  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter the six-digit code from your authenticator." };
  }

  const client = await createServerSupabaseClient();
  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
  const verifiedFactors = (factors?.totp ?? []).filter((factor) => factor.status === "verified");
  const factor = verifiedFactors.find(({ id }) => id === requestedFactorId) ?? verifiedFactors[0];

  if (factorsError || !factor) {
    return { error: "No verified authenticator is available for this account." };
  }

  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });

  if (error) {
    return { error: "The verification code was not accepted. Try again." };
  }

  const { data: activated, error: activationError } = await client.rpc("activate_current_profile");
  if (activationError || activated !== true) {
    return { error: "Your authenticator could not be activated. Try again." };
  }

  // C10: audited through a permission-free session event so every role
  // (and an account still holding a temporary password) can sign in.
  const { error: auditError } = await client.rpc("record_session_event", {
    event_action: "mfa.verify",
  });
  if (auditError) {
    return { error: "The verification could not be recorded. Try again." };
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const snapshot = await getAdminAuthSnapshot();
  const client = await createServerSupabaseClient();
  if (snapshot) {
    await client.rpc("record_session_event", { event_action: "auth.sign_out" });
  }
  await client.auth.signOut();
  redirect("/admin/sign-in");
}
