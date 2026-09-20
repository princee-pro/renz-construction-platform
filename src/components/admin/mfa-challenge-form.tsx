"use client";

import { useActionState } from "react";

import { verifyMfaAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

type MfaChallengeFormProps = Readonly<{
  factorId: string;
  next: string;
}>;

export function MfaChallengeForm({ factorId, next }: MfaChallengeFormProps) {
  const [state, action, pending] = useActionState(verifyMfaAction, initialState);

  return (
    <form action={action} className="admin-form auth-form" noValidate>
      <input name="factorId" type="hidden" value={factorId} />
      <input name="next" type="hidden" value={next} />
      <div className="field-group auth-otp">
        <label htmlFor="mfa-code">Authenticator code</label>
        {/* One accessible input, visually segmented into six positions (D1.5 §12).
            Paste, keyboard, numeric keypad and screen readers all use the same control. */}
        <div className="auth-otp-control" data-length={6}>
          <input
            autoComplete="one-time-code"
            autoFocus
            id="mfa-code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            name="code"
            pattern="[0-9]{6}"
            required
            spellCheck={false}
            type="text"
          />
          <span aria-hidden="true" className="auth-otp-cells">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <p className="field-help">
          Six digits from your authenticator app. Codes rotate every 30 seconds.
        </p>
      </div>
      <p aria-live="polite" className="form-message form-message-error">
        {state.error ?? ""}
      </p>
      <button
        className="admin-button admin-button-primary auth-submit"
        disabled={pending}
        type="submit"
      >
        <span>{pending ? "Verifying…" : "Verify and continue"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
