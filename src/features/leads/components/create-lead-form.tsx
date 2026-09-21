"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { needLabels } from "@/features/intake/intake-policy";
import { createLeadAction } from "@/features/leads/lead-actions";
import { leadSourceLabels, leadTypeLabels, staffSources } from "@/features/leads/lead-contract";

/** Staff-created lead (WhatsApp, walk-in, referral): a legitimate source, never a public one. */
export function CreateLeadForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    guardAction(createLeadAction),
    initialAdminActionState,
  );
  const guard = useSingleSubmit(pending);
  useEffect(() => {
    if (state.status === "success" && state.createdId) {
      router.push(`/admin/operations/leads/${state.createdId}`);
    }
  }, [state, router]);
  const errors = state.fieldErrors;
  return (
    <form action={action} className="admin-form" onSubmit={guard.onSubmit}>
      {state.status === "error" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      {state.status === "reauth" ? (
        <Alert live tone="warning">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <div className="field-grid field-grid-two">
        <Field error={errors["leadType"]} id="leadType" label="Lead type">
          <select defaultValue="general" id="leadType" name="leadType">
            {Object.entries(leadTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field error={errors["sourceChannel"]} id="sourceChannel" label="Source">
          <select defaultValue="whatsapp" id="sourceChannel" name="sourceChannel">
            {staffSources.map((source) => (
              <option key={source} value={source}>
                {leadSourceLabels[source]}
              </option>
            ))}
          </select>
        </Field>
        <Field error={errors["fullName"]} id="fullName" label="Full name">
          <input id="fullName" maxLength={200} name="fullName" required type="text" />
        </Field>
        <Field error={errors["summary"]} id="summary" label="Summary">
          <input
            id="summary"
            maxLength={200}
            name="summary"
            placeholder="One line: what they want"
            required
            type="text"
          />
        </Field>
        <Field
          error={errors["email"]}
          hint="Email or phone — at least one."
          id="email"
          label="Email"
        >
          <input id="email" maxLength={254} name="email" type="email" />
        </Field>
        <Field error={errors["phone"]} id="phone" label="Phone / WhatsApp">
          <input id="phone" maxLength={40} name="phone" type="text" />
        </Field>
        <Field id="company" label="Company">
          <input id="company" maxLength={200} name="company" type="text" />
        </Field>
        <Field id="location" label="Location">
          <input id="location" maxLength={400} name="location" type="text" />
        </Field>
        <Field id="serviceKey" label="Service">
          <select defaultValue="" id="serviceKey" name="serviceKey">
            <option value="">None</option>
            {Object.entries(needLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="priority" label="Priority">
          <select defaultValue="" id="priority" name="priority">
            <option value="">Not set</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
      </div>
      <Field error={errors["message"]} id="message" label="Details">
        <textarea id="message" maxLength={4000} name="message" rows={4} />
      </Field>
      <label className="checkbox-row">
        <input defaultChecked name="assignToMe" type="checkbox" /> Assign to me
      </label>
      <div className="form-actions">
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Creating…" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
