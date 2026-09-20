"use client";

import { useActionState } from "react";

import { disableAdminAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

type DisableAdminFormProps = Readonly<{
  userId: string;
}>;

export function DisableAdminForm({ userId }: DisableAdminFormProps) {
  const [state, action, pending] = useActionState(disableAdminAction, initialState);

  return (
    <form action={action} className="admin-form-inline" noValidate>
      <input name="userId" type="hidden" value={userId} />
      <button className="admin-button admin-button-danger" disabled={pending} type="submit">
        {pending ? "Disabling…" : "Disable access"}
      </button>
      <span aria-live="polite" className="form-message">
        {state.error ?? state.success ?? ""}
      </span>
    </form>
  );
}
