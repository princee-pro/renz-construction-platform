"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { staffAction } from "@/features/settings/settings-actions";
import type { StaffRegister } from "@/features/settings/settings-contract";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

const statusLabels = {
  pending_mfa: "Pending MFA",
  active: "Active",
  disabled: "Disabled",
} as const;

type Pending = Readonly<{
  userId: string;
  action: "disable" | "reactivate" | "set_role";
  role?: string;
}>;

/**
 * Staff & access: the existing S3 auth/RBAC primitives exposed as a register.
 * No second auth architecture, no fake invitations (no email provider exists).
 */
export function StaffRegisterView({ data }: Readonly<{ data: StaffRegister }>) {
  const { connectionState } = useAdminRealtimeInvalidation(["settings"]);
  const [state, action, pending] = useActionState(staffAction, initialAdminActionState);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setConfirm(null);
  }
  return (
    <div className="settings-view">
      {connectionState === "connected" ? (
        <p className="eyebrow">
          Staff <span className="realtime-dot" title="Live updates connected" />
        </p>
      ) : null}
      {state.status === "success" ? (
        <Alert live tone="success">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <p className="field-help">
        Invitations are created from the Security page by an authorized operator; there is no email
        delivery provider, so no invitation email is sent by this application.
      </p>
      <div aria-hidden="true" className="staff-register-heading">
        <span>Staff member</span>
        <span>Roles</span>
        <span>Status</span>
        <span>MFA</span>
        <span>Last sign-in</span>
        <span>Last activity</span>
        <span>Action</span>
      </div>
      <ol className="staff-register">
        {data.staff.map((member) => (
          <li key={member.id}>
            <div className="staff-register-identity">
              <strong>{member.display_name ?? member.email ?? member.id}</strong>
              <span>{member.email ?? "no email"}</span>
            </div>
            <span data-label="Roles">{member.roles.join(", ") || "none"}</span>
            <div data-label="Status">
              <StatusBadge
                tone={
                  member.account_status === "active"
                    ? "ready"
                    : member.account_status === "disabled"
                      ? "archived"
                      : "review"
                }
              >
                {statusLabels[member.account_status]}
              </StatusBadge>
            </div>
            <span data-label="MFA">{member.mfa_enrolled ? "Enrolled" : "Not enrolled"}</span>
            <span data-label="Last sign-in">{formatDateTime(member.last_sign_in_at)}</span>
            <span data-label="Last activity">{formatDateTime(member.last_activity_at)}</span>
            <div className="staff-register-actions" data-label="Action">
              {data.can_manage && !member.is_self ? (
                <>
                  {member.account_status === "disabled" ? (
                    <Button
                      onClick={() => setConfirm({ userId: member.id, action: "reactivate" })}
                      tone="secondary"
                      type="button"
                    >
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setConfirm({ userId: member.id, action: "disable" })}
                      tone="danger"
                      type="button"
                    >
                      Disable
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      setConfirm({
                        userId: member.id,
                        action: "set_role",
                        role: member.roles.includes("super_admin") ? "admin" : "super_admin",
                      })
                    }
                    tone="quiet"
                    type="button"
                  >
                    {member.roles.includes("super_admin") ? "Make admin" : "Make super admin"}
                  </Button>
                </>
              ) : member.is_self ? (
                <span className="field-help">You</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {confirm ? (
        <section
          aria-labelledby="staff-confirm-heading"
          className="admin-panel dialog-panel settings-panel-danger"
        >
          <h2 id="staff-confirm-heading">
            {confirm.action === "disable"
              ? "Disable this account?"
              : confirm.action === "reactivate"
                ? "Reactivate this account?"
                : `Change role to ${confirm.role}?`}
          </h2>
          <p>
            {confirm.action === "disable"
              ? "The account keeps its history but can no longer sign in or act. This is audited."
              : confirm.action === "reactivate"
                ? "The account can sign in again with its existing second factor. This is audited."
                : "The account's role changes immediately for every protected operation. This is audited."}
          </p>
          <form action={action}>
            <input name="userId" type="hidden" value={confirm.userId} />
            <input name="action" type="hidden" value={confirm.action} />
            {confirm.role ? <input name="role" type="hidden" value={confirm.role} /> : null}
            <div className="form-actions">
              <Button onClick={() => setConfirm(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button
                disabled={pending}
                tone={confirm.action === "disable" ? "danger" : "primary"}
                type="submit"
              >
                {pending ? "Working…" : "Confirm"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
