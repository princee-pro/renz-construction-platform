"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import {
  guardAction,
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import {
  createAssignmentAction,
  updateAssignmentAction,
} from "@/features/assignments/assignment-actions";
import {
  assignmentStatusLabels,
  assignmentStatuses,
  rateTypeLabels,
  rateTypes,
  rateUnitLabels,
  suggestedPlannedValue,
} from "@/features/assignments/assignment-contract";
import { formatMoney } from "@/features/invoices/invoice-contract";
import { ProjectPickerField } from "@/features/assignments/components/project-picker-field";
import { PartnerPickerField } from "@/features/partners/components/partner-picker-field";
import { specializationOptions } from "@/features/partners/partner-contract";

export type AssignmentFormInitial = Readonly<{
  projectId: string;
  projectTitle: string;
  partnerId: string;
  partnerLabel: string;
  scope: string;
  specialization: string;
  status: string;
  startDate: string;
  endDate: string;
  rateType: string;
  rateAmount: string;
  currency: string;
  plannedUnits: string;
  agreedAmount: string;
  paymentTerms: string;
}>;

export function AssignmentForm({
  mode,
  initial,
  assignmentId,
  version,
  financeLocked = false,
}: Readonly<{
  mode: "create" | "edit";
  initial: AssignmentFormInitial;
  assignmentId?: string | undefined;
  version?: number | undefined;
  /** True once a payment exists: currency/agreed amount are read-only here (use Adjust). */
  financeLocked?: boolean;
}>) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    guardAction(mode === "create" ? createAssignmentAction : updateAssignmentAction),
    initialAdminActionState,
  );
  const edit = usePinnedEdit(
    version ?? 1,
    state.status === "success" ? state.currentVersion : null,
  );
  useEffect(() => {
    if (state.status !== "success") return;
    const id = mode === "create" ? state.createdId : assignmentId;
    router.push(id ? `/admin/operations/assignments/${id}` : "/admin/operations/contractors");
  }, [state.status, state.createdId, mode, assignmentId, router]);
  return (
    <AssignmentFormFields
      action={action}
      assignmentId={assignmentId}
      edit={edit}
      financeLocked={financeLocked}
      initial={initial}
      key={edit.formKey}
      mode={mode}
      pending={pending}
      state={state}
    />
  );
}

function AssignmentFormFields({
  mode,
  initial,
  assignmentId,
  action,
  state,
  pending,
  edit,
  financeLocked,
}: Readonly<{
  mode: "create" | "edit";
  initial: AssignmentFormInitial;
  assignmentId: string | undefined;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  edit: ReturnType<typeof usePinnedEdit>;
  financeLocked: boolean;
}>) {
  const router = useRouter();
  const [scope, setScope] = useState(initial.scope);
  const [specialization, setSpecialization] = useState(initial.specialization);
  const [status, setStatus] = useState(initial.status || "planned");
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [rateType, setRateType] = useState(initial.rateType);
  const [rateAmount, setRateAmount] = useState(initial.rateAmount);
  const [currency, setCurrency] = useState(initial.currency);
  const [plannedUnits, setPlannedUnits] = useState(initial.plannedUnits);
  const [agreedAmount, setAgreedAmount] = useState(initial.agreedAmount);
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const suggested = suggestedPlannedValue(rateAmount, plannedUnits, rateType);
  const currencyLabel = /^[A-Za-z]{3}$/u.test(currency) ? currency.toUpperCase() : "";
  const unitWord =
    rateType && rateType in rateUnitLabels
      ? rateUnitLabels[rateType as keyof typeof rateUnitLabels]
      : "unit";

  return (
    <form action={action} className="admin-form" noValidate>
      {assignmentId ? <input name="assignmentId" type="hidden" value={assignmentId} /> : null}
      {mode === "edit" ? (
        <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
      ) : null}
      {mode === "create" && initial.projectId ? (
        <input name="projectId" type="hidden" value={initial.projectId} />
      ) : null}

      {mode === "edit" && edit.outdated && state.status !== "conflict" ? (
        <Alert live tone="warning">
          <p>
            Another staff member updated this assignment while you were editing. Reload to see their
            changes first.
          </p>
          <Button
            disabled={edit.reloading}
            onClick={edit.reloadLatest}
            tone="secondary"
            type="button"
          >
            {edit.reloading ? "Reloading…" : "Reload latest"}
          </Button>
        </Alert>
      ) : null}

      <section className="invoice-editor-section">
        <h2>Contractor and scope</h2>
        <div className="field-grid field-grid-two">
          {mode === "create" && !initial.partnerId ? (
            <PartnerPickerField
              capability="contractor"
              error={state.fieldErrors["partnerId"] ?? state.fieldErrors["trade_partner_id"]}
              label="Contractor"
              name="partnerId"
            />
          ) : (
            <Field id="partnerLabel" label="Contractor">
              {mode === "create" ? (
                <input name="partnerId" type="hidden" value={initial.partnerId} />
              ) : null}
              <input disabled id="partnerLabel" type="text" value={initial.partnerLabel} />
            </Field>
          )}
          {mode === "create" && !initial.projectId ? (
            <ProjectPickerField
              error={state.fieldErrors["projectId"] ?? state.fieldErrors["operational_project_id"]}
            />
          ) : (
            <Field id="projectLabel" label="Project">
              <input disabled id="projectLabel" type="text" value={initial.projectTitle} />
            </Field>
          )}
        </div>
        <Field error={state.fieldErrors["scope"]} id="scope" label="Scope of work">
          <textarea
            id="scope"
            maxLength={500}
            name="scope"
            onChange={(e) => setScope(e.target.value)}
            required
            rows={2}
            value={scope}
          />
        </Field>
        <div className="field-grid field-grid-three">
          <Field
            error={state.fieldErrors["specialization"]}
            id="specialization"
            label="Specialization / trade"
          >
            <input
              id="specialization"
              list="specialization-options"
              maxLength={80}
              name="specialization"
              onChange={(e) => setSpecialization(e.target.value)}
              type="text"
              value={specialization}
            />
            <datalist id="specialization-options">
              {specializationOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          {mode === "create" ? (
            <Field error={state.fieldErrors["status"]} id="status" label="Status">
              <select
                id="status"
                name="status"
                onChange={(e) => setStatus(e.target.value)}
                value={status}
              >
                {assignmentStatuses
                  .filter((s) => s !== "cancelled" && s !== "completed")
                  .map((s) => (
                    <option key={s} value={s}>
                      {assignmentStatusLabels[s]}
                    </option>
                  ))}
              </select>
            </Field>
          ) : null}
          <Field error={state.fieldErrors["startDate"]} id="startDate" label="Start date">
            <input
              id="startDate"
              name="startDate"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </Field>
          <Field error={state.fieldErrors["endDate"]} id="endDate" label="End date">
            <input
              id="endDate"
              name="endDate"
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              value={endDate}
            />
          </Field>
        </div>
      </section>

      <section className="invoice-editor-section">
        <h2>Rate and agreed amount</h2>
        {financeLocked ? (
          <Alert tone="info">
            <p>
              Payments have been recorded. The currency is frozen and the agreed amount changes only
              through “Adjust agreed amount” on the assignment page.
            </p>
          </Alert>
        ) : null}
        <div className="field-grid field-grid-three">
          <Field error={state.fieldErrors["rateType"]} id="rateType" label="Rate type">
            <select
              id="rateType"
              name="rateType"
              onChange={(e) => setRateType(e.target.value)}
              value={rateType}
            >
              <option value="">No rate recorded</option>
              {rateTypes.map((type) => (
                <option key={type} value={type}>
                  {rateTypeLabels[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            error={state.fieldErrors["rateAmount"]}
            id="rateAmount"
            label={rateType ? `Rate per ${unitWord}` : "Rate"}
          >
            <input
              id="rateAmount"
              inputMode="decimal"
              name="rateAmount"
              onChange={(e) => setRateAmount(e.target.value)}
              type="text"
              value={rateAmount}
            />
          </Field>
          <Field
            error={state.fieldErrors["currency"]}
            hint="ISO code, e.g. RWF, USD, GBP."
            id="currency"
            label="Currency"
          >
            <input
              disabled={financeLocked}
              id="currency"
              maxLength={3}
              name={financeLocked ? undefined : "currency"}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
              type="text"
              value={currency}
            />
            {financeLocked ? <input name="currency" type="hidden" value={currency} /> : null}
          </Field>
        </div>
        <div className="field-grid field-grid-three">
          <Field
            error={state.fieldErrors["plannedUnits"]}
            hint={
              rateType && rateType !== "fixed_project"
                ? `Planned ${unitWord}s (optional).`
                : "Not used for a fixed project rate."
            }
            id="plannedUnits"
            label="Planned units"
          >
            <input
              disabled={rateType === "fixed_project" || rateType === ""}
              id="plannedUnits"
              inputMode="decimal"
              name="plannedUnits"
              onChange={(e) => setPlannedUnits(e.target.value)}
              type="text"
              value={plannedUnits}
            />
          </Field>
          <div className="field-group">
            <span className="field-label">Suggested planned value</span>
            <output aria-live="polite" className="planned-value">
              {suggested !== null && currencyLabel ? formatMoney(suggested, currencyLabel) : "—"}
            </output>
            <p className="field-help">
              Rate × planned units. Guidance only — the agreed amount is the obligation.
            </p>
          </div>
          <Field
            error={state.fieldErrors["agreedAmount"]}
            hint="The confirmed obligation contractor payments are measured against."
            id="agreedAmount"
            label="Agreed amount"
          >
            <input
              disabled={financeLocked}
              id="agreedAmount"
              inputMode="decimal"
              name={financeLocked ? undefined : "agreedAmount"}
              onChange={(e) => setAgreedAmount(e.target.value)}
              type="text"
              value={agreedAmount}
            />
            {financeLocked ? (
              <input name="agreedAmount" type="hidden" value={agreedAmount} />
            ) : null}
            {suggested !== null && !financeLocked && agreedAmount === "" ? (
              <Button onClick={() => setAgreedAmount(String(suggested))} tone="quiet" type="button">
                Use suggested value
              </Button>
            ) : null}
          </Field>
        </div>
        <Field error={state.fieldErrors["paymentTerms"]} id="paymentTerms" label="Payment terms">
          <textarea
            id="paymentTerms"
            maxLength={2000}
            name="paymentTerms"
            onChange={(e) => setPaymentTerms(e.target.value)}
            rows={2}
            value={paymentTerms}
          />
        </Field>
      </section>

      {state.status === "conflict" ? (
        <Alert live tone="warning">
          <p>
            Another staff member saved changes to this assignment first. Your edits are still shown,
            but have not been saved.
          </p>
          <Button
            disabled={edit.reloading}
            onClick={edit.reloadLatest}
            tone="secondary"
            type="button"
          >
            {edit.reloading ? "Reloading…" : "Reload latest"}
          </Button>
        </Alert>
      ) : null}
      {state.status === "error" || state.status === "reauth" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <div className="form-actions">
        <Button
          onClick={() =>
            router.push(
              assignmentId
                ? `/admin/operations/assignments/${assignmentId}`
                : initial.projectId
                  ? `/admin/operations/projects/${initial.projectId}`
                  : "/admin/operations/contractors",
            )
          }
          tone="quiet"
          type="button"
        >
          Cancel
        </Button>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Saving…" : mode === "create" ? "Assign Contractor" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
