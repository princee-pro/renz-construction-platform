import type { Metadata } from "next";

import { Alert } from "@/components/admin/ui/alert";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
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
        description="Current assurance and capability state only; credentials and tokens are never displayed."
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
        <section aria-labelledby="capabilities-heading" className="admin-panel">
          <h2 id="capabilities-heading">Current capabilities</h2>
          <ul className="capability-list">
            {(access ?? []).map((item) => (
              <li key={`${item.role_key}:${item.permission_key}`}>
                <span>{item.permission_key}</span>
                <small>{item.role_key}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
