import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/admin/auth-shell";
import { SignInForm } from "@/components/admin/sign-in-form";
import { getAdminAuthSnapshot } from "@/lib/auth/guards";
import { safeInternalRedirect } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff sign in | RENZ",
  robots: { index: false, follow: false },
};

type SignInPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const snapshot = await getAdminAuthSnapshot();
  const params = await searchParams;
  const rawNext = typeof params["next"] === "string" ? params["next"] : undefined;

  if (snapshot?.currentLevel === "aal2" && snapshot.accountStatus === "active") {
    redirect(safeInternalRedirect(rawNext));
  }

  const errorKey = typeof params["error"] === "string" ? params["error"] : undefined;
  const notice =
    errorKey === "access"
      ? "This staff account is not active. Ask the RENZ owner to review your access."
      : errorKey === "expired"
        ? "Your session ended. Sign in again to continue."
        : null;

  return (
    <AuthShell
      headingId="admin-sign-in-heading"
      intro="Sign in with your staff email and password. A second step with your authenticator follows."
      step="01"
      stepLabel="Staff access"
      title="Sign in to the Control Room"
    >
      {notice ? (
        <p className="auth-notice" role="status">
          {notice}
        </p>
      ) : null}
      <SignInForm next={safeInternalRedirect(rawNext)} />
    </AuthShell>
  );
}
