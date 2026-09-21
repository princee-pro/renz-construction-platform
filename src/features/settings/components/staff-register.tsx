"use client";

import { useActionState, useId, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { useSingleSubmit } from "@/features/admin-shared/single-submit";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { createStaffAction, staffAction } from "@/features/settings/settings-actions";
import type { StaffRegister } from "@/features/settings/settings-contract";
import { roleDescriptions, summariseCapabilities } from "@/lib/auth/capabilities";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

const statusLabels = {
  pending_mfa: "Waiting for first sign-in",
  active: "Active",
  disabled: "Disabled",
} as const;

type Pending = Readonly<{
  userId: string;
  name: string;
  action: "disable" | "reactivate" | "set_role" | "reset_password" | "rename";
  role?: string;
}>;

function roleLabel(key: string, roles: StaffRegister["roles"]): string {
  return (
    roleDescriptions[key]?.label ?? roles.find((role) => role.key === key)?.display_name ?? key
  );
}

/** "Can …" lines for a member's roles (union of role permission sets). */
function memberCapabilities(member: StaffRegister["staff"][number], roles: StaffRegister["roles"]) {
  const permissions = new Set<string>();
  for (const key of member.roles) {
    for (const permission of roles.find((role) => role.key === key)?.permissions ?? []) {
      permissions.add(permission);
    }
  }
  return summariseCapabilities(permissions);
}

/**
 * Users & Access (C10 §19–27, §158): the owner creates staff with a
 * temporary password (no email is sent), sees who can sign in with which
 * role, what each person can and cannot do in plain English, and disables,
 * reactivates, renames, re-roles or resets a password — each confirmed and
 * audited. Passwords are shown once at creation / reset and never stored.
 */
export function StaffRegisterView({ data }: Readonly<{ data: StaffRegister }>) {
  const { connectionState } = useAdminRealtimeInvalidation(["settings"]);
  const [state, action, pending] = useActionState(
    guardAction(staffAction),
    initialAdminActionState,
  );
  const [createState, createSubmit, creating] = useActionState(
    guardAction(createStaffAction),
    initialAdminActionState,
  );
  const createGuard = useSingleSubmit(creating);
  const actionGuard = useSingleSubmit(pending);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [seen, setSeen] = useState(state);
  const formId = useId();
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setConfirm(null);
  }
  const roleOptions = data.roles.filter((role) => role.key in roleDescriptions);

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

      {data.can_manage ? (
        <details className="admin-panel staff-create-panel" open={data.staff.length <= 1}>
          <summary>Add a staff member</summary>
          <form
            action={createSubmit}
            className="admin-form"
            noValidate
            onSubmit={createGuard.onSubmit}
          >
            <p className="section-description">
              You create the account and hand over a temporary password privately. No email is sent.
              At first sign-in they choose their own password and set up their authenticator app
              before the workspace opens.
            </p>
            <div className="field-grid field-grid-two">
              <Field
                error={createState.fieldErrors["displayName"]}
                id={`${formId}-name`}
                label="Name"
              >
                <input
                  autoComplete="off"
                  id={`${formId}-name`}
                  maxLength={80}
                  name="displayName"
                  required
                  type="text"
                />
              </Field>
              <Field error={createState.fieldErrors["email"]} id={`${formId}-email`} label="Email">
                <input
                  autoComplete="off"
                  id={`${formId}-email`}
                  inputMode="email"
                  maxLength={160}
                  name="email"
                  required
                  type="email"
                />
              </Field>
            </div>
            <Field error={createState.fieldErrors["role"]} id={`${formId}-role`} label="Role">
              <select defaultValue="viewer" id={`${formId}-role`} name="role">
                {roleOptions.map((role) => (
                  <option key={role.key} value={role.key}>
                    {roleDescriptions[role.key]?.label ?? role.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <ul className="staff-role-notes">
              {roleOptions.map((role) => (
                <li key={role.key}>
                  <strong>{roleDescriptions[role.key]?.label ?? role.display_name}</strong> —{" "}
                  {roleDescriptions[role.key]?.note}
                </li>
              ))}
            </ul>
            <Field
              error={createState.fieldErrors["temporaryPassword"]}
              hint="Leave empty to let the system generate a strong one. Either way it is shown once, after you press Create."
              id={`${formId}-password`}
              label="Temporary password (optional)"
            >
              <input
                autoComplete="new-password"
                id={`${formId}-password`}
                maxLength={128}
                name="temporaryPassword"
                type="text"
              />
            </Field>
            <div className="form-actions">
              <Button disabled={creating} tone="primary" type="submit">
                {creating ? "Creating…" : "Create staff account"}
              </Button>
            </div>
            {createState.status === "success" ? (
              <Alert live tone="success">
                <p className="staff-secret-once">{createState.message}</p>
              </Alert>
            ) : null}
            {createState.status === "error" ? (
              <Alert live tone="danger">
                <p>{createState.message}</p>
              </Alert>
            ) : null}
          </form>
        </details>
      ) : (
        <p className="field-help">Only the owner (Super Admin) can add or change staff accounts.</p>
      )}

      <div aria-hidden="true" className="staff-register-heading">
        <span>Staff member</span>
        <span>Role</span>
        <span>Status</span>
        <span>Authenticator</span>
        <span>Last sign-in</span>
        <span>Last activity</span>
        <span>Actions</span>
      </div>
      <ol className="staff-register">
        {data.staff.map((member) => {
          const capabilities = memberCapabilities(member, data.roles);
          const open = expanded === member.id;
          return (
            <li key={member.id}>
              <div className="staff-register-identity">
                <strong>{member.display_name ?? member.email ?? member.id}</strong>
                <span>{member.email ?? "no email"}</span>
                <button
                  aria-expanded={open}
                  className="text-link staff-capability-toggle"
                  onClick={() => setExpanded(open ? null : member.id)}
                  type="button"
                >
                  {open ? "Hide what they can do" : "What can they do?"}
                </button>
                {open ? (
                  <dl className="staff-capabilities">
                    {capabilities.map((entry) => (
                      <div key={entry.group}>
                        <dt>{entry.group}</dt>
                        <dd>
                          {entry.can.length > 0 ? (
                            <span>Can {entry.can.join(", ")}.</span>
                          ) : (
                            <span>No access.</span>
                          )}
                          {entry.cannot.length > 0 && entry.can.length > 0 ? (
                            <span className="staff-cannot"> Cannot {entry.cannot.join(", ")}.</span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
              <span data-label="Role">
                {member.roles.map((key) => roleLabel(key, data.roles)).join(", ") || "No role"}
              </span>
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
                {member.must_change_password ? (
                  <span className="field-help">Must change password at next sign-in</span>
                ) : null}
              </div>
              <span data-label="Authenticator">
                {member.mfa_enrolled ? "Set up" : "Not set up yet"}
              </span>
              <span data-label="Last sign-in">{formatDateTime(member.last_sign_in_at)}</span>
              <span data-label="Last activity">{formatDateTime(member.last_activity_at)}</span>
              <div className="staff-register-actions" data-label="Actions">
                {data.can_manage && !member.is_self ? (
                  <>
                    <label className="staff-role-select">
                      <span className="visually-hidden">Change role for {member.display_name}</span>
                      <select
                        aria-label={`Change role for ${member.display_name ?? member.email ?? "staff member"}`}
                        onChange={(event) => {
                          const role = event.target.value;
                          if (role && !member.roles.includes(role)) {
                            setConfirm({
                              userId: member.id,
                              name: member.display_name ?? member.email ?? "this account",
                              action: "set_role",
                              role,
                            });
                          }
                          event.target.value = member.roles[0] ?? "";
                        }}
                        value={member.roles[0] ?? ""}
                      >
                        {roleOptions.map((role) => (
                          <option key={role.key} value={role.key}>
                            {roleDescriptions[role.key]?.label ?? role.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {member.account_status === "disabled" ? (
                      <Button
                        onClick={() =>
                          setConfirm({
                            userId: member.id,
                            name: member.display_name ?? member.email ?? "this account",
                            action: "reactivate",
                          })
                        }
                        tone="secondary"
                        type="button"
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          setConfirm({
                            userId: member.id,
                            name: member.display_name ?? member.email ?? "this account",
                            action: "disable",
                          })
                        }
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
                          name: member.display_name ?? member.email ?? "this account",
                          action: "reset_password",
                        })
                      }
                      tone="quiet"
                      type="button"
                    >
                      Reset password
                    </Button>
                    <Button
                      onClick={() =>
                        setConfirm({
                          userId: member.id,
                          name: member.display_name ?? member.email ?? "this account",
                          action: "rename",
                        })
                      }
                      tone="quiet"
                      type="button"
                    >
                      Rename
                    </Button>
                  </>
                ) : member.is_self ? (
                  <span className="field-help">You. Change your own password from Security.</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {data.can_manage && data.active_super_admins <= 1 ? (
        <p className="field-help">
          You are the only active Owner / Super Admin. The system will not let this account be
          disabled or demoted; add a second owner before you travel or hand over.
        </p>
      ) : null}

      {confirm ? (
        <section
          aria-labelledby="staff-confirm-heading"
          className={`admin-panel dialog-panel${confirm.action === "disable" ? " settings-panel-danger" : ""}`}
        >
          <h2 id="staff-confirm-heading">
            {confirm.action === "disable"
              ? `Disable ${confirm.name}?`
              : confirm.action === "reactivate"
                ? `Reactivate ${confirm.name}?`
                : confirm.action === "reset_password"
                  ? `Reset the password for ${confirm.name}?`
                  : confirm.action === "rename"
                    ? `Rename ${confirm.name}`
                    : `Change ${confirm.name} to ${roleLabel(confirm.role ?? "", data.roles)}?`}
          </h2>
          <p>
            {confirm.action === "disable"
              ? "They will not be able to sign in, and anything they were doing stops working at once. Their history stays. This is audited."
              : confirm.action === "reactivate"
                ? "They can sign in again with their existing password and authenticator. This is audited."
                : confirm.action === "reset_password"
                  ? "Their current password stops working. You will see a new temporary password once; give it to them privately. They must choose their own password at the next sign-in. This is audited (the password itself is never recorded)."
                  : confirm.action === "rename"
                    ? "Only the name shown in the workspace changes."
                    : confirm.role && roleDescriptions[confirm.role]?.privileged
                      ? `${roleDescriptions[confirm.role]?.label} is a high-privilege role: ${roleDescriptions[confirm.role]?.note} The change applies immediately to every protected operation and is audited.`
                      : `${roleDescriptions[confirm.role ?? ""]?.note ?? ""} The change applies immediately and is audited.`}
          </p>
          <form action={action} onSubmit={actionGuard.onSubmit}>
            <input name="userId" type="hidden" value={confirm.userId} />
            <input name="action" type="hidden" value={confirm.action} />
            {confirm.role ? <input name="role" type="hidden" value={confirm.role} /> : null}
            {confirm.action === "rename" ? (
              <Field id="staff-rename" label="Name">
                <input
                  defaultValue={confirm.name}
                  id="staff-rename"
                  maxLength={80}
                  name="displayName"
                  required
                  type="text"
                />
              </Field>
            ) : null}
            {confirm.action === "reset_password" ? (
              <Field
                hint="Leave empty to generate a strong one."
                id="staff-temporary"
                label="Temporary password (optional)"
              >
                <input
                  autoComplete="new-password"
                  id="staff-temporary"
                  maxLength={128}
                  name="temporaryPassword"
                  type="text"
                />
              </Field>
            ) : null}
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
