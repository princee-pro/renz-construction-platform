import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/admin/ui/alert";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { roleDescriptions, summariseCapabilities } from "@/lib/auth/capabilities";
import { requirePermission } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Security | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function SecurityPage({ searchParams }: PageProps<"/admin/security">) {
  const snapshot = await requirePermission("security.manage");
  const client = await createServerSupabaseClient();
  const [{ data: factors }, { data: access }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.rpc("current_user_access"),
  ]);
  const params = await searchParams;

  return (
    <main className="workspace-page" id="main-content">
      <PageHeader
        description="Your authenticator, your password and what your role lets you do. Credentials and tokens are never displayed."
        eyebrow="Account controls"
        title="Security"
      />
      {params["error"] === "forbidden" ? (
        <Alert tone="warning" title="Permission required">
          Your current role does not allow the requested destination or operation.
        </Alert>
      ) : null}
      <div className="overview-grid">
        <section aria-labelledby="mfa-status-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="mfa-status-heading">Authenticator</h2>
            <StatusBadge tone={snapshot.currentLevel === "aal2" ? "ready" : "blocked"}>
              {snapshot.currentLevel.toUpperCase()}
            </StatusBadge>
          </div>
          <p className="panel-copy">
            {(factors?.totp ?? []).filter((factor) => factor.status === "verified").length} verified
            TOTP factor(s). This workspace requires AAL2.
          </p>
        </section>
        <section aria-labelledby="password-heading" className="admin-panel">
          <h2 id="password-heading">Password</h2>
          <p className="panel-copy">
            Choose a new password whenever you want. You stay signed in on this device.
          </p>
          <Link className="button button-secondary" href="/admin/security/password">
            Change my password
          </Link>
        </section>
        <section aria-labelledby="capabilities-heading" className="admin-panel">
          <h2 id="capabilities-heading">Your access</h2>
          <p className="panel-copy">
            Role:{" "}
            {[...new Set((access ?? []).map((item) => item.role_key))]
              .map((key) => roleDescriptions[key]?.label ?? key)
              .join(", ") || "none"}
          </p>
          <dl className="staff-capabilities">
            {summariseCapabilities((access ?? []).map((item) => item.permission_key)).map(
              (entry) => (
                <div key={entry.group}>
                  <dt>{entry.group}</dt>
                  <dd>
                    {entry.can.length > 0 ? `Can ${entry.can.join(", ")}.` : "No access."}
                    {entry.can.length > 0 && entry.cannot.length > 0 ? (
                      <span className="staff-cannot"> Cannot {entry.cannot.join(", ")}.</span>
                    ) : null}
                  </dd>
                </div>
              ),
            )}
          </dl>
          <details className="capability-technical">
            <summary>Technical detail (permission keys)</summary>
            <ul className="capability-list">
              {(access ?? []).map((item) => (
                <li key={`${item.role_key}:${item.permission_key}`}>
                  <span>{item.permission_key}</span>
                  <small>{item.role_key}</small>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </div>
    </main>
  );
}
