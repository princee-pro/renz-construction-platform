"use client";

import { useActionState, useState } from "react";

import {
  changePasswordAction,
  type PasswordChangeState,
} from "@/app/admin/security/password/actions";

const initialState: PasswordChangeState = {};

/** First-login password form (C10 §99): password-manager friendly, show/hide, clear rules. */
export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);
  const [revealed, setRevealed] = useState(false);
  const type = revealed ? "text" : "password";
  return (
    <form action={action} className="admin-form auth-form" noValidate>
      <div className="field-group auth-password">
        <label htmlFor="new-password">New password</label>
        <div className="auth-password-control">
          <input
            aria-describedby="password-rules"
            autoComplete="new-password"
            id="new-password"
            minLength={12}
            name="password"
            required
            type={type}
          />
          <button
            aria-controls="new-password confirm-password"
            aria-pressed={revealed}
            className="auth-password-toggle"
            onClick={() => setRevealed((value) => !value)}
            type="button"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        </div>
        <p className="field-help" id="password-rules">
          At least 12 characters, with a letter and a digit. A sentence you will remember works
          well.
        </p>
      </div>
      <div className="field-group auth-password">
        <label htmlFor="confirm-password">Repeat the new password</label>
        <div className="auth-password-control">
          <input
            autoComplete="new-password"
            id="confirm-password"
            minLength={12}
            name="confirm"
            required
            type={type}
          />
        </div>
      </div>
      <p aria-live="polite" className="form-message form-message-error">
        {state.error ?? ""}
      </p>
      <button
        className="admin-button admin-button-primary auth-submit"
        disabled={pending}
        type="submit"
      >
        <span>{pending ? "Saving…" : "Save password and continue"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
