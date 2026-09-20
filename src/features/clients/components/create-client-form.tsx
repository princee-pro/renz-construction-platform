"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { createClientAction } from "@/features/clients/client-actions";
import {
  clientTierLabels,
  clientTiers,
  initialAdminActionState,
} from "@/features/clients/client-contract";
import { DuplicateClientCheck } from "@/features/clients/components/duplicate-client-check";

export function CreateClientForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createClientAction, initialAdminActionState);
  const guard = useSingleSubmit(pending);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (state.status === "success") {
      router.push(
        state.createdId
          ? `/admin/operations/clients/${state.createdId}`
          : "/admin/operations/clients",
      );
    }
  }, [state.status, state.createdId, router]);

  return (
    <form action={action} className="admin-form" noValidate onSubmit={guard.onSubmit}>
      <div className="field-grid field-grid-two">
        <Field
          error={state.fieldErrors["full_name"] ?? state.fieldErrors["fullName"]}
          id="fullName"
          label="Full name"
        >
          <input
            id="fullName"
            maxLength={200}
            name="fullName"
            onChange={(event) => setFullName(event.target.value)}
            required
            type="text"
            value={fullName}
          />
        </Field>
        <Field id="clientTier" label="Client tier">
          <select defaultValue="standard" id="clientTier" name="clientTier">
            {clientTiers.map((tier) => (
              <option key={tier} value={tier}>
                {clientTierLabels[tier]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="field-grid field-grid-two">
        <Field
          error={state.fieldErrors["email"]}
          hint="Enter an email or phone number."
          id="email"
          label="Email"
        >
          <input
            id="email"
            maxLength={254}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </Field>
        <Field id="phone" label="Phone">
          <input
            id="phone"
            maxLength={40}
            name="phone"
            onChange={(event) => setPhone(event.target.value)}
            type="text"
            value={phone}
          />
        </Field>
      </div>
      <DuplicateClientCheck email={email} fullName={fullName} phone={phone} />
      <div className="field-grid field-grid-two">
        <Field id="company" label="Company">
          <input id="company" maxLength={200} name="company" type="text" />
        </Field>
        <Field id="address" label="Address">
          <input id="address" maxLength={400} name="address" type="text" />
        </Field>
      </div>
      <div className="field-grid field-grid-two">
        <Field id="referralSource" label="Referral source">
          <input id="referralSource" maxLength={200} name="referralSource" type="text" />
        </Field>
        <Field id="externalReference" label="External / reference code">
          <input id="externalReference" maxLength={120} name="externalReference" type="text" />
        </Field>
      </div>
      <Field
        hint="Optional. Creates the first dated note on this client."
        id="initialNote"
        label="Initial note"
      >
        <textarea id="initialNote" maxLength={4000} name="initialNote" rows={3} />
      </Field>
      {state.status === "error" || state.status === "reauth" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <div className="form-actions">
        <Button onClick={() => router.push("/admin/operations/clients")} tone="quiet" type="button">
          Cancel
        </Button>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Creating…" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
