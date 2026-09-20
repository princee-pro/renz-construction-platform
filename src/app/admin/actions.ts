"use server";

import { redirect } from "next/navigation";

import { getAdminAuthSnapshot, requireAal2User, requirePermission } from "@/lib/auth/guards";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { inviteAdminUser } from "@/lib/supabase/admin";
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

  const { error: auditError } = await client.rpc("record_audit_event", {
    event_action: "mfa.verify",
    event_entity_type: "auth_factor",
    event_entity_id: factor.id,
    event_outcome: "success",
    event_metadata: {},
  });
  if (auditError) {
    return { error: "The verification could not be recorded. Try again." };
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const snapshot = await getAdminAuthSnapshot();
  const client = await createServerSupabaseClient();
  if (snapshot?.currentLevel === "aal2") {
    await client.rpc("record_audit_event", {
      event_action: "auth.sign_out",
      event_entity_type: "auth_session",
      event_entity_id: "current",
      event_outcome: "success",
      event_metadata: {},
    });
  }
  await client.auth.signOut();
  redirect("/admin/sign-in");
}

export async function inviteAdminAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("users.invite");
  const email = readText(formData, "email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid administrator email address." };
  }

  try {
    const invitation = await inviteAdminUser(email);
    const client = await createServerSupabaseClient();
    const { data: assigned, error: assignmentError } = await client.rpc("assign_invited_admin", {
      target_user_id: invitation.userId,
    });
    if (assignmentError || assigned !== true) {
      return {
        error:
          "The invitation could not be assigned. Try again or use the approved recovery process.",
      };
    }
  } catch {
    return {
      error: "The invitation could not be sent. Try again or use the approved recovery process.",
    };
  }

  return { success: "Invitation sent." };
}

export async function disableAdminAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("users.disable");
  const targetUserId = readText(formData, "userId");

  if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
    return { error: "The administrator reference is invalid." };
  }

  const client = await createServerSupabaseClient();
  const { error } = await client.rpc("disable_user", { target_user_id: targetUserId });

  return error
    ? { error: "The administrator could not be disabled." }
    : { success: "Administrator access disabled." };
}

export async function requireSecurityAccess() {
  return requireAal2User();
}
