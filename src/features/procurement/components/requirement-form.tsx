"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { MaterialPickerField } from "@/features/procurement/components/material-picker-field";
import {
  createRequirementAction,
  updateRequirementAction,
} from "@/features/procurement/procurement-actions";
import {
  approvalStateLabels,
  approvalStates,
  requirementPriorities,
  requirementPriorityLabels,
  unitOptions,
  type RequirementRow,
} from "@/features/procurement/procurement-contract";

/**
 * Inline add/edit form for one project material requirement. Lives inside
 * the project's Procurement tab; on success the parent closes it and the
 * refreshed server data carries the new row.
 */
export function RequirementForm({
  projectId,
  requirement,
  onClose,
  onSaved,
}: Readonly<{
  projectId: string;
  requirement?: RequirementRow | undefined;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const mode = requirement ? "edit" : "create";
  const [state, action, pending] = useActionState(
    mode === "create" ? createRequirementAction : updateRequirementAction,
    initialAdminActionState,
  );
  const [itemName, setItemName] = useState(requirement?.item_name ?? "");
  const [unit, setUnit] = useState(requirement?.unit_label ?? "");
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") onSaved();
  }
  const orderedAlready = requirement ? Number.parseFloat(String(requirement.ordered_quantity)) : 0;
  const headingId = requirement ? `requirement-edit-${requirement.id}` : "requirement-add";

  return (
    <section aria-labelledby={headingId} className="admin-panel dialog-panel">
      <h3 id={headingId}>{requirement ? "Edit requirement" : "Add material requirement"}</h3>
      <form action={action} className="admin-form" noValidate>
        <input name="projectId" type="hidden" value={projectId} />
        {requirement ? (
          <>
            <input name="requirementId" type="hidden" value={requirement.id} />
            <input name="expectedVersion" type="hidden" value={requirement.version} />
          </>
        ) : null}
        <div className="field-grid field-grid-two">
          <Field error={state.fieldErrors["itemName"]} id={`${headingId}-name`} label="Item">
            <input
              id={`${headingId}-name`}
              maxLength={200}
              name="itemName"
              onChange={(e) => setItemName(e.target.value)}
              required
              type="text"
              value={itemName}
            />
          </Field>
          <MaterialPickerField
            error={state.fieldErrors["materialId"]}
            initialId={requirement?.material?.id ?? ""}
            initialLabel={requirement?.material?.name ?? ""}
            label="Catalog material"
            name="materialId"
            onSelect={(entry) => {
              if (!entry) return;
              if (!itemName.trim()) setItemName(entry.name);
              if (!unit.trim()) setUnit(entry.default_unit);
            }}
          />
        </div>
        <div className="field-grid field-grid-three">
          <Field
            error={state.fieldErrors["quantity"]}
            hint={
              orderedAlready > 0
                ? `${orderedAlready} already ordered — quantity cannot drop below that.`
                : undefined
            }
            id={`${headingId}-quantity`}
            label="Required quantity"
          >
            <input
              defaultValue={requirement ? String(requirement.required_quantity) : ""}
              id={`${headingId}-quantity`}
              inputMode="decimal"
              min="0.001"
              name="quantity"
              required
              step="0.001"
              type="number"
            />
          </Field>
          <Field error={state.fieldErrors["unit"]} id={`${headingId}-unit`} label="Unit">
            <input
              id={`${headingId}-unit`}
              list={`${headingId}-units`}
              maxLength={40}
              name="unit"
              onChange={(e) => setUnit(e.target.value)}
              required
              type="text"
              value={unit}
            />
            <datalist id={`${headingId}-units`}>
              {unitOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field
            error={state.fieldErrors["requiredBy"]}
            id={`${headingId}-required-by`}
            label="Required by"
          >
            <input
              defaultValue={requirement?.required_by ?? ""}
              id={`${headingId}-required-by`}
              name="requiredBy"
              type="date"
            />
          </Field>
        </div>
        <div className="field-grid field-grid-two">
          <Field
            error={state.fieldErrors["priority"]}
            id={`${headingId}-priority`}
            label="Priority"
          >
            <select
              defaultValue={requirement?.priority ?? "medium"}
              id={`${headingId}-priority`}
              name="priority"
            >
              {requirementPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {requirementPriorityLabels[priority]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            error={state.fieldErrors["state"]}
            hint="Only approved requirements can be placed on a purchase order."
            id={`${headingId}-state`}
            label="Approval"
          >
            <select
              defaultValue={requirement?.approval_state ?? "approved"}
              id={`${headingId}-state`}
              name="state"
            >
              {approvalStates.map((value) => (
                <option
                  disabled={value === "cancelled" && orderedAlready > 0}
                  key={value}
                  value={value}
                >
                  {approvalStateLabels[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          error={state.fieldErrors["specification"]}
          id={`${headingId}-spec`}
          label="Specification (optional)"
        >
          <textarea
            defaultValue={requirement?.specification ?? ""}
            id={`${headingId}-spec`}
            maxLength={2000}
            name="specification"
            rows={2}
          />
        </Field>
        <Field
          error={state.fieldErrors["note"]}
          hint="Internal only — never printed on purchase orders."
          id={`${headingId}-note`}
          label="Private note (optional)"
        >
          <textarea
            defaultValue={requirement?.private_note ?? ""}
            id={`${headingId}-note`}
            maxLength={2000}
            name="note"
            rows={2}
          />
        </Field>
        {state.status === "error" || state.status === "conflict" ? (
          <Alert live tone="danger">
            <p>{state.message}</p>
          </Alert>
        ) : null}
        <div className="form-actions">
          <Button onClick={onClose} tone="quiet" type="button">
            Cancel
          </Button>
          <Button disabled={pending} tone="primary" type="submit">
            {pending ? "Saving…" : requirement ? "Save requirement" : "Add requirement"}
          </Button>
        </div>
      </form>
    </section>
  );
}
