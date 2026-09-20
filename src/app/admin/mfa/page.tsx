import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/admin/actions";
import { AuthShell } from "@/components/admin/auth-shell";
import { MfaChallengeForm } from "@/components/admin/mfa-challenge-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify authenticator | RENZ",
  robots: { index: false, follow: false },
};

type MfaPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const snapshot = await requireAuthenticatedUser();
  const client = await createServerSupabaseClient();
  const { data: factors } = await client.auth.mfa.listFactors();
  const verifiedFactor = (factors?.totp ?? []).find((factor) => factor.status === "verified");
  const params = await searchParams;
  const next = safeInternalRedirect(
    typeof params["next"] === "string" ? params["next"] : undefined,
  );

  if (snapshot.accountStatus === "disabled") {
    redirect("/admin/sign-in?error=access");
  }
  if (snapshot.currentLevel === "aal2") {
    redirect(next);
  }
  if (!verifiedFactor) {
    redirect(`/admin/mfa/enroll?next=${encodeURIComponent(next)}`);
  }

  return (
    <AuthShell
      aside={
        <form action={signOutAction} noValidate>
          <button className="auth-quiet-action" type="submit">
            Sign out and start again
          </button>
        </form>
      }
      headingId="mfa-heading"
      intro="Your password was accepted. Enter the six-digit code from your authenticator app to open the workspace."
      step="02"
      stepLabel="Security verification"
      title="Verify your authenticator"
    >
      <MfaChallengeForm factorId={verifiedFactor.id} next={next} />
    </AuthShell>
  );
}
