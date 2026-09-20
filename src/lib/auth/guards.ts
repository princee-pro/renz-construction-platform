import "server-only";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminPermission } from "@/lib/auth/permissions";

export type AdminAuthSnapshot = Readonly<{
  userId: string;
  accountStatus: string;
  displayName: string | null;
  currentLevel: "aal1" | "aal2";
  nextLevel: "aal1" | "aal2";
  verifiedTotpFactorCount: number;
}>;

function normalizeAssuranceLevel(value: string | null | undefined): "aal1" | "aal2" {
  return value === "aal2" ? "aal2" : "aal1";
}

export async function getAdminAuthSnapshot(): Promise<AdminAuthSnapshot | null> {
  const client = await createServerSupabaseClient();
  const [{ data: userData }, { data: claimsData, error: claimsError }] = await Promise.all([
    client.auth.getUser(),
    client.auth.getClaims(),
  ]);

  if (!userData.user || claimsError || !claimsData) {
    return null;
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, display_name, account_status")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const verifiedTotpFactorCount = (userData.user.factors ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  ).length;
  const currentLevel = normalizeAssuranceLevel(claimsData.claims.aal);

  return {
    userId: profile.id,
    accountStatus: profile.account_status,
    displayName: profile.display_name,
    currentLevel,
    nextLevel: verifiedTotpFactorCount > 0 ? "aal2" : currentLevel,
    verifiedTotpFactorCount,
  };
}

export async function requireAuthenticatedUser(): Promise<AdminAuthSnapshot> {
  const snapshot = await getAdminAuthSnapshot();

  if (!snapshot) {
    redirect("/admin/sign-in");
  }

  return snapshot;
}

export async function requireAal2User(): Promise<AdminAuthSnapshot> {
  const snapshot = await requireAuthenticatedUser();

  if (snapshot.accountStatus === "disabled") {
    redirect("/admin/sign-in?error=access");
  }

  if (snapshot.currentLevel !== "aal2") {
    redirect(snapshot.verifiedTotpFactorCount > 0 ? "/admin/mfa" : "/admin/mfa/enroll");
  }

  return snapshot;
}

export async function requirePermission(permission: AdminPermission): Promise<AdminAuthSnapshot> {
  const snapshot = await requireAal2User();
  const client = await createServerSupabaseClient();
  const { data: allowed, error } = await client.rpc("current_user_has_permission", {
    requested_permission: permission,
  });

  if (error || allowed !== true) {
    redirect("/admin/security?error=forbidden");
  }

  return snapshot;
}
