import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/admin/actions";
import { AuthShell } from "@/components/admin/auth-shell";
import { PasswordChangeForm } from "@/components/admin/password-change-form";
import { requireAal2User } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose your password | RENZ",
  robots: { index: false, follow: false },
};

/**
 * First sign-in with a temporary password (C10 §21). Reached only after the
 * authenticator step; the workspace guard sends every other route here while
 * the change is pending, and the database grants no permission until it is
 * done. Staff who are not required to change can still use it voluntarily.
 */
export default async function PasswordChangePage() {
  const snapshot = await requireAal2User({ allowPasswordChangePending: true });
  if (snapshot.accountStatus !== "active" && snapshot.accountStatus !== "pending_mfa") {
    redirect("/admin/sign-in?error=access");
  }
  return (
    <AuthShell
      aside={
        <form action={signOutAction} noValidate>
          <button className="auth-quiet-action" type="submit">
            Sign out and continue later
          </button>
        </form>
      }
      headingId="password-heading"
      intro={
        snapshot.mustChangePassword
          ? "You signed in with a temporary password from the owner. Choose your own password to open the workspace."
          : "Choose a new password for your account. You will stay signed in."
      }
      step="02"
      stepLabel="Your password"
      title="Choose your own password"
    >
      <PasswordChangeForm />
    </AuthShell>
  );
}
