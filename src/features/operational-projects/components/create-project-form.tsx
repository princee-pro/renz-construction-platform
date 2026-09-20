"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { createProjectAction } from "@/features/operational-projects/project-actions";
import {
  initialAdminActionState,
  projectPhaseLabels,
  projectPhases,
  projectPriorities,
  projectPriorityLabels,
  projectStatusLabels,
  projectStatuses,
} from "@/features/operational-projects/project-contract";
import { ClientPickerField } from "@/features/operational-projects/components/client-picker-field";

export function CreateProjectForm({
  initialClientId,
  initialClientLabel,
}: Readonly<{ initialClientId?: string | undefined; initialClientLabel?: string | undefined }>) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProjectAction, initialAdminActionState);
  const guard = useSingleSubmit(pending);

  useEffect(() => {
    if (state.status === "success") {
      router.push(
        state.createdId
          ? `/admin/operations/projects/${state.createdId}`
          : "/admin/operations/projects",
      );
    }
  }, [state.status, state.createdId, router]);

  return (
    <form action={action} className="admin-form" noValidate onSubmit={guard.onSubmit}>
      <ClientPickerField
        error={state.fieldErrors["clientId"]}
        initialClientId={initialClientId}
        initialClientLabel={initialClientLabel}
      />
      <Field error={state.fieldErrors["title"]} id="title" label="Project title">
        <input id="title" maxLength={200} name="title" required type="text" />
      </Field>
      <Field id="description" label="Description">
        <textarea id="description" maxLength={4000} name="description" rows={3} />
      </Field>
      <div className="field-grid field-grid-three">
        <Field id="status" label="Status">
          <select defaultValue="planning" id="status" name="status">
            {projectStatuses.map((status) => (
              <option key={status} value={status}>
                {projectStatusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="phase" label="Phase">
          <select defaultValue="design" id="phase" name="phase">
            {projectPhases.map((phase) => (
              <option key={phase} value={phase}>
                {projectPhaseLabels[phase]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="priority" label="Priority">
          <select defaultValue="medium" id="priority" name="priority">
            {projectPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {projectPriorityLabels[priority]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="field-grid field-grid-two">
        <Field error={state.fieldErrors["startDate"]} id="startDate" label="Start date">
          <input id="startDate" name="startDate" type="date" />
        </Field>
        <Field error={state.fieldErrors["endDate"]} id="endDate" label="End date">
          <input id="endDate" name="endDate" type="date" />
        </Field>
      </div>
      <div className="field-grid field-grid-two">
        <Field
          error={state.fieldErrors["budgetAmount"]}
          hint="A budget amount requires a currency, and a currency requires an amount."
          id="budgetAmount"
          label="Budget amount"
        >
          <input id="budgetAmount" inputMode="decimal" name="budgetAmount" type="text" />
        </Field>
        <Field
          error={state.fieldErrors["budgetCurrency"]}
          hint="Three-letter code, e.g. RWF, USD, GBP."
          id="budgetCurrency"
          label="Budget currency"
        >
          <input
            id="budgetCurrency"
            maxLength={3}
            name="budgetCurrency"
            style={{ textTransform: "uppercase" }}
            type="text"
          />
        </Field>
      </div>
      {state.status === "error" || state.status === "reauth" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <div className="form-actions">
        <Button
          onClick={() => router.push("/admin/operations/projects")}
          tone="quiet"
          type="button"
        >
          Cancel
        </Button>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Creating…" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
