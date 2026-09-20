import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/admin/actions";
import { AuthShell } from "@/components/admin/auth-shell";
import { MfaEnrollment } from "@/components/admin/mfa-enrollment";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { safeInternalRedirect } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set up authenticator | RENZ",
  robots: { index: false, follow: false },
};

type MfaEnrollPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function MfaEnrollPage({ searchParams }: MfaEnrollPageProps) {
  const snapshot = await requireAuthenticatedUser();
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

  return (
    <AuthShell
      aside={
        <form action={signOutAction} noValidate>
          <button className="auth-quiet-action" type="submit">
            Sign out and start again
          </button>
        </form>
      }
      headingId="mfa-enroll-heading"
      intro="The Control Room requires a verified authenticator app. Scan the code, enter the first six digits it shows, and the workspace opens."
      step="02"
      stepLabel="Security setup"
      title="Set up your authenticator"
    >
      <MfaEnrollment next={next} />
    </AuthShell>
  );
}
