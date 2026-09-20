"use client";

import { useActionState } from "react";

import { inviteAdminAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export function InviteAdminForm() {
  const [state, action, pending] = useActionState(inviteAdminAction, initialState);

  return (
    <form action={action} className="admin-form admin-form-inline" noValidate>
      <div className="field-group">
        <label htmlFor="invite-admin-email">Invite email</label>
        <input
          autoComplete="email"
          id="invite-admin-email"
          inputMode="email"
          name="email"
          required
          type="email"
        />
      </div>
      <button className="admin-button admin-button-primary" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send invitation"}
      </button>
      <p aria-live="polite" className="form-message">
        {state.error ?? state.success ?? ""}
      </p>
    </form>
  );
}
