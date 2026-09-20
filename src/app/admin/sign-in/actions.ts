"use server";

import { redirect } from "next/navigation";

import { safeInternalRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SignInActionState = Readonly<{
  error?: string;
}>;

function readText(formData: FormData, name: string, trim = true): string {
  const value = formData.get(name);
  return typeof value === "string" ? (trim ? value.trim() : value) : "";
}

export async function signInAction(
  _previousState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password", false);
  const next = safeInternalRedirect(readText(formData, "next"));

  if (!email || !password) {
    return { error: "Enter your email and password to continue." };
  }

  const client = await createServerSupabaseClient();
  const { data: signIn, error } = await client.auth.signInWithPassword({ email, password });

  const accessToken = signIn.session?.access_token;
  if (error || !accessToken) {
    return { error: "Sign-in could not be completed. Check your details and try again." };
  }

  const [{ data: assurance }, { data: factors }] = await Promise.all([
    client.auth.mfa.getAuthenticatorAssuranceLevel(accessToken),
    client.auth.mfa.listFactors(),
  ]);
  const verifiedFactorCount = (factors?.totp ?? []).filter(
    (factor) => factor.status === "verified",
  ).length;
  const encodedNext = encodeURIComponent(next);

  if (assurance?.currentLevel === "aal2") {
    redirect(next);
  }

  redirect(
    verifiedFactorCount > 0
      ? `/admin/mfa?next=${encodedNext}`
      : `/admin/mfa/enroll?next=${encodedNext}`,
  );
}
