"use client";

import { useActionState, useState } from "react";

import { signInAction, type SignInActionState } from "@/app/admin/sign-in/actions";

const initialState: SignInActionState = {};

type SignInFormProps = Readonly<{
  next: string;
}>;

export function SignInForm({ next }: SignInFormProps) {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const [revealed, setRevealed] = useState(false);

  return (
    <form action={action} className="admin-form auth-form" noValidate>
      <input name="next" type="hidden" value={next} />
      <div className="field-group">
        <label htmlFor="admin-email">Email address</label>
        <input
          autoComplete="username"
          id="admin-email"
          inputMode="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="field-group auth-password">
        <label htmlFor="admin-password">Password</label>
        <div className="auth-password-control">
          <input
            autoComplete="current-password"
            id="admin-password"
            name="password"
            required
            type={revealed ? "text" : "password"}
          />
          <button
            aria-controls="admin-password"
            aria-pressed={revealed}
            className="auth-password-toggle"
            onClick={() => setRevealed((value) => !value)}
            type="button"
          >
            {revealed ? "Hide" : "Show"}
          </button>
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
        <span>{pending ? "Signing in…" : "Sign in"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
