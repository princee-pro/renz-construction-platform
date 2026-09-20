"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import {
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import { formatMoney, formatQuantity, previewTotals } from "@/features/invoices/invoice-contract";
import { PartnerPickerField } from "@/features/partners/components/partner-picker-field";
import { MaterialPickerField } from "@/features/procurement/components/material-picker-field";
import { ProcurementProjectPicker } from "@/features/procurement/components/procurement-project-picker";
import {
  lineFromRequirement,
  lineOverOrders,
  newPoLine,
  type PoEditorInitial,
  type PoEditorLine,
  type PoEditorRequirement,
} from "@/features/procurement/po-editor-model";
import {
  createPurchaseOrderAction,
  listOrderableRequirementsAction,
  updatePurchaseOrderAction,
} from "@/features/procurement/procurement-actions";
import { unitOptions } from "@/features/procurement/procurement-contract";

export function PurchaseOrderEditor({
  mode,
  initial,
  orderId,
  version,
}: Readonly<{
  mode: "create" | "edit";
  initial: PoEditorInitial;
  orderId?: string | undefined;
  version?: number | undefined;
}>) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createPurchaseOrderAction : updatePurchaseOrderAction,
    initialAdminActionState,
  );
  const edit = usePinnedEdit(
    version ?? 1,
    state.status === "success" ? state.currentVersion : null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success") return;
    const target = mode === "create" ? state.createdId : orderId;
    router.push(target ? `/admin/procurement/orders/${target}` : "/admin/procurement/orders");
  }, [state.status, state.createdId, mode, orderId, router]);

  return (
    <PurchaseOrderEditorForm
      action={action}
      edit={edit}
      initial={initial}
      key={edit.formKey}
      mode={mode}
      orderId={orderId}
      pending={pending}
      state={state}
    />
  );
}

function seedLines(initial: PoEditorInitial): readonly PoEditorLine[] {
  if (initial.lines.length > 0) return initial.lines;
  const preselected = initial.requirements.find(
    (requirement) => requirement.id === initial.preselectedRequirementId,
  );
  return [preselected ? lineFromRequirement(preselected) : newPoLine()];
}

function PurchaseOrderEditorForm({
  mode,
  initial,
  orderId,
  action,
  state,
  pending,
  edit,
}: Readonly<{
  mode: "create" | "edit";
  initial: PoEditorInitial;
  orderId: string | undefined;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  edit: ReturnType<typeof usePinnedEdit>;
}>) {
  const guard = useSingleSubmit(pending);
  const router = useRouter();
  const projectLocked = mode === "edit" || initial.projectId !== "";
  const [projectId, setProjectId] = useState(initial.projectId);
  const [requirements, setRequirements] = useState<readonly PoEditorRequirement[]>(
    initial.requirements,
  );
  const [, startLoadingRequirements] = useTransition();
  const [currency, setCurrency] = useState(initial.currency);
  const [taxRate, setTaxRate] = useState(initial.taxRate);
  const [reference, setReference] = useState(initial.reference);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(initial.expectedDeliveryDate);
  const [notes, setNotes] = useState(initial.notes);
  const [terms, setTerms] = useState(initial.terms);
  const [lines, setLines] = useState<readonly PoEditorLine[]>(() => seedLines(initial));
  const [requirementPick, setRequirementPick] = useState("");

  useEffect(() => {
    if (projectLocked) return;
    startLoadingRequirements(async () => {
      setRequirements(projectId ? await listOrderableRequirementsAction(projectId) : []);
    });
  }, [projectId, projectLocked]);

  const totals = previewTotals(lines, taxRate);
  const currencyLabel = /^[A-Za-z]{3}$/u.test(currency) ? currency.toUpperCase() : "";
  const money = (value: number) => (currencyLabel ? formatMoney(value, currencyLabel) : "—");

  const updateLine = (key: string, patch: Partial<PoEditorLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const moveLine = (key: string, delta: -1 | 1) =>
    setLines((current) => {
      const index = current.findIndex((line) => line.key === key);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  const removeLine = (key: string) =>
    setLines((current) =>
      current.length > 1 ? current.filter((line) => line.key !== key) : current,
    );
  const addFromRequirement = () => {
    const requirement = requirements.find((entry) => entry.id === requirementPick);
    if (!requirement) return;
    setLines((current) => {
      const onlyBlank =
        current.length === 1 &&
        current[0] !== undefined &&
        current[0].description === "" &&
        current[0].unit_price === "";
      return onlyBlank
        ? [lineFromRequirement(requirement)]
        : [...current, lineFromRequirement(requirement)];
    });
    setRequirementPick("");
  };

  const linkedRequirementIds = new Set(
    lines.map((line) => line.material_requirement_id).filter((id) => id !== ""),
  );
  const unconfirmedOverOrders = lines.filter(
    (line) => lineOverOrders(line) && !line.over_order_confirmed,
  ).length;

  const serializedLines = JSON.stringify(
    lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unit_label,
      unit_price: line.unit_price,
      material_requirement_id: line.material_requirement_id,
      material_id: line.material_id,
      over_order_confirmed: line.over_order_confirmed,
    })),
  );
  const lineError = state.fieldErrors["lines"];

  return (
    <form
      action={action}
      className="admin-form invoice-editor po-editor"
      noValidate
      onSubmit={guard.onSubmit}
    >
      {orderId ? <input name="orderId" type="hidden" value={orderId} /> : null}
      {mode === "edit" ? (
        <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
      ) : null}
      {projectLocked ? <input name="projectId" type="hidden" value={initial.projectId} /> : null}
      <input name="lines" type="hidden" value={serializedLines} />

      {mode === "edit" && edit.outdated && state.status !== "conflict" ? (
        <Alert live tone="warning">
          <p>
            Another staff member updated this draft while you were editing. Saving now will be
            rejected; reload to see their changes first.
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

      <section aria-labelledby="po-parties-heading" className="invoice-editor-section">
        <h2 id="po-parties-heading">Project and supplier</h2>
        <div className="field-grid field-grid-two">
          {projectLocked ? (
            <Field
              hint="A purchase order belongs to exactly one project."
              id="projectLabel"
              label="Project"
            >
              <input disabled id="projectLabel" type="text" value={initial.projectTitle} />
            </Field>
          ) : (
            <ProcurementProjectPicker
              error={state.fieldErrors["projectId"] ?? state.fieldErrors["operational_project_id"]}
              onSelect={(entry) => setProjectId(entry?.id ?? "")}
            />
          )}
          <PartnerPickerField
            capability="supplier"
            error={state.fieldErrors["supplierId"] ?? state.fieldErrors["supplier_id"]}
            initialId={initial.supplierId || undefined}
            initialLabel={initial.supplierLabel || undefined}
            label="Supplier"
            name="supplierId"
          />
        </div>
      </section>

      <section aria-labelledby="po-terms-heading" className="invoice-editor-section">
        <h2 id="po-terms-heading">Currency, tax and delivery</h2>
        <div className="field-grid field-grid-three">
          <Field
            error={state.fieldErrors["currency"]}
            hint="ISO code, e.g. RWF, USD, GBP. One currency per order."
            id="currency"
            label="Currency"
          >
            <input
              autoComplete="off"
              id="currency"
              maxLength={3}
              name="currency"
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              style={{ textTransform: "uppercase" }}
              type="text"
              value={currency}
            />
          </Field>
          <Field
            error={state.fieldErrors["taxRate"] ?? state.fieldErrors["tax_rate"]}
            hint="Percent, 0–100. Applied to the subtotal."
            id="taxRate"
            label="Tax rate (%)"
          >
            <input
              id="taxRate"
              inputMode="decimal"
              name="taxRate"
              onChange={(event) => setTaxRate(event.target.value)}
              type="text"
              value={taxRate}
            />
          </Field>
          <Field
            error={state.fieldErrors["expectedDeliveryDate"]}
            hint="Drives the delayed state once the order is issued."
            id="expectedDeliveryDate"
            label="Expected delivery"
          >
            <input
              id="expectedDeliveryDate"
              name="expectedDeliveryDate"
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
              type="date"
              value={expectedDeliveryDate}
            />
          </Field>
        </div>
        <Field
          error={state.fieldErrors["reference"]}
          hint="Quote or supplier reference, if any."
          id="reference"
          label="Reference"
        >
          <input
            id="reference"
            maxLength={120}
            name="reference"
            onChange={(event) => setReference(event.target.value)}
            type="text"
            value={reference}
          />
        </Field>
      </section>

      <section aria-labelledby="po-lines-heading" className="invoice-editor-section">
        <div className="section-heading-row section-heading-compact">
          <h2 id="po-lines-heading">Order lines</h2>
          <Button
            onClick={() => setLines((current) => [...current, newPoLine()])}
            tone="secondary"
            type="button"
          >
            + Add free-text line
          </Button>
        </div>
        {requirements.length > 0 ? (
          <div className="po-requirement-picker">
            <Field
              hint="Approved requirements of this project with quantity left to order."
              id="requirementPick"
              label="Add from material requirement"
            >
              <div className="inline-picker-row">
                <select
                  id="requirementPick"
                  onChange={(event) => setRequirementPick(event.target.value)}
                  value={requirementPick}
                >
                  <option value="">Choose a requirement…</option>
                  {requirements.map((requirement) => (
                    <option
                      disabled={linkedRequirementIds.has(requirement.id)}
                      key={requirement.id}
                      value={requirement.id}
                    >
                      {requirement.item_name} — {formatQuantity(requirement.remaining_to_order)}{" "}
                      {requirement.unit_label} left
                      {linkedRequirementIds.has(requirement.id) ? " (already on this order)" : ""}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!requirementPick}
                  onClick={addFromRequirement}
                  tone="secondary"
                  type="button"
                >
                  Add line
                </Button>
              </div>
            </Field>
          </div>
        ) : projectId ? (
          <p className="field-help">
            No approved requirements are waiting to be ordered on this project — add free-text
            lines, or add requirements from the project&apos;s Procurement tab.
          </p>
        ) : null}
        {lineError ? (
          <Alert live tone="danger">
            <p>{lineError}</p>
          </Alert>
        ) : null}
        <ol className="invoice-line-editor po-line-editor">
          {lines.map((line, index) => {
            const lineTotal = totals.lineTotals[index] ?? 0;
            const overOrder = lineOverOrders(line);
            return (
              <li key={line.key}>
                {line.material_requirement_id ? (
                  <p className="po-line-requirement">
                    Linked requirement: {line.requirement_label}
                  </p>
                ) : null}
                <div className="invoice-line-fields po-line-fields">
                  <Field id={`${line.key}-description`} label={`Description (line ${index + 1})`}>
                    <input
                      id={`${line.key}-description`}
                      maxLength={500}
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                      type="text"
                      value={line.description}
                    />
                  </Field>
                  <Field id={`${line.key}-quantity`} label="Quantity">
                    <input
                      id={`${line.key}-quantity`}
                      inputMode="decimal"
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                      type="text"
                      value={line.quantity}
                    />
                  </Field>
                  <Field id={`${line.key}-unit`} label="Unit">
                    <input
                      id={`${line.key}-unit`}
                      list="po-unit-options"
                      maxLength={40}
                      onChange={(event) => updateLine(line.key, { unit_label: event.target.value })}
                      type="text"
                      value={line.unit_label}
                    />
                  </Field>
                  <Field id={`${line.key}-price`} label="Unit price">
                    <input
                      id={`${line.key}-price`}
                      inputMode="decimal"
                      onChange={(event) => updateLine(line.key, { unit_price: event.target.value })}
                      type="text"
                      value={line.unit_price}
                    />
                  </Field>
                  <div className="invoice-line-total">
                    <span className="field-label">Line total</span>
                    <output aria-live="polite" htmlFor={`${line.key}-quantity ${line.key}-price`}>
                      {money(lineTotal)}
                    </output>
                  </div>
                </div>
                {!line.material_requirement_id ? (
                  <div className="po-line-material">
                    <MaterialPickerField
                      hint="Optional catalog link for this free-text line."
                      initialId={line.material_id}
                      label="Catalog material"
                      name={`${line.key}-material-display`}
                      onSelect={(entry) =>
                        updateLine(line.key, {
                          material_id: entry?.id ?? "",
                          ...(entry && !line.description ? { description: entry.name } : {}),
                          ...(entry && !line.unit_label ? { unit_label: entry.default_unit } : {}),
                        })
                      }
                    />
                  </div>
                ) : null}
                {overOrder ? (
                  <Alert live tone="warning">
                    <p>
                      This line orders more than the requirement still needs (
                      {formatQuantity(line.requirement_remaining)} {line.unit_label} left).
                    </p>
                    <label className="checkbox-row" htmlFor={`${line.key}-over`}>
                      <input
                        checked={line.over_order_confirmed}
                        id={`${line.key}-over`}
                        onChange={(event) =>
                          updateLine(line.key, { over_order_confirmed: event.target.checked })
                        }
                        type="checkbox"
                      />
                      <span>I confirm this over-order is intended</span>
                    </label>
                  </Alert>
                ) : null}
                <div
                  aria-label={`Line ${index + 1} actions`}
                  className="invoice-line-actions"
                  role="group"
                >
                  <Button
                    aria-label={`Move line ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveLine(line.key, -1)}
                    tone="quiet"
                    type="button"
                  >
                    ↑
                  </Button>
                  <Button
                    aria-label={`Move line ${index + 1} down`}
                    disabled={index === lines.length - 1}
                    onClick={() => moveLine(line.key, 1)}
                    tone="quiet"
                    type="button"
                  >
                    ↓
                  </Button>
                  <Button
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => removeLine(line.key)}
                    tone="danger"
                    type="button"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <datalist id="po-unit-options">
          {unitOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <dl aria-label="Draft totals preview" className="invoice-preview-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(totals.subtotal)}</dd>
          </div>
          <div>
            <dt>Tax ({taxRate || "0"}%)</dt>
            <dd>{money(totals.tax)}</dd>
          </div>
          <div className="invoice-total-row">
            <dt>Total</dt>
            <dd>{money(totals.total)}</dd>
          </div>
        </dl>
        <p className="field-help">
          Preview only — the server recalculates every amount when the draft is saved and issued.
        </p>
      </section>

      <section aria-labelledby="po-notes-heading" className="invoice-editor-section">
        <h2 id="po-notes-heading">Terms and notes</h2>
        <div className="field-grid field-grid-two">
          <Field
            error={state.fieldErrors["terms"]}
            hint="Delivery and payment terms shown to the supplier."
            id="terms"
            label="Terms"
          >
            <textarea
              id="terms"
              maxLength={4000}
              name="terms"
              onChange={(event) => setTerms(event.target.value)}
              rows={4}
              value={terms}
            />
          </Field>
          <Field
            error={state.fieldErrors["notes"]}
            hint="Delivery instructions or other notes shown on the order."
            id="notes"
            label="Notes"
          >
            <textarea
              id="notes"
              maxLength={4000}
              name="notes"
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              value={notes}
            />
          </Field>
        </div>
      </section>

      {state.status === "conflict" ? (
        <Alert live tone="warning">
          <p>
            Another staff member saved changes to this draft first. Your edits above are still
            shown, but have not been saved.
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
              orderId ? `/admin/procurement/orders/${orderId}` : "/admin/procurement/orders",
            )
          }
          tone="quiet"
          type="button"
        >
          Cancel
        </Button>
        <Button disabled={pending || unconfirmedOverOrders > 0} tone="primary" type="submit">
          {pending
            ? "Saving…"
            : unconfirmedOverOrders > 0
              ? "Confirm over-orders to save"
              : "Save Draft"}
        </Button>
      </div>
    </form>
  );
}
