"use client";

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
import {
  createInvoiceAction,
  listClientProjectsAction,
  updateInvoiceAction,
  type ProjectPickerEntry,
} from "@/features/invoices/invoice-actions";
import { formatMoney, previewTotals } from "@/features/invoices/invoice-contract";
import {
  newLine,
  type InvoiceEditorInitial,
  type InvoiceEditorLine,
} from "@/features/invoices/invoice-editor-model";
import { ClientPickerField } from "@/features/operational-projects/components/client-picker-field";

function addDays(base: string, days: number): string {
  const date = /^\d{4}-\d{2}-\d{2}$/u.test(base) ? new Date(`${base}T00:00:00Z`) : new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function InvoiceEditor({
  mode,
  initial,
  invoiceId,
  version,
}: Readonly<{
  mode: "create" | "edit";
  initial: InvoiceEditorInitial;
  invoiceId?: string | undefined;
  version?: number | undefined;
}>) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createInvoiceAction : updateInvoiceAction,
    initialAdminActionState,
  );
  const edit = usePinnedEdit(
    version ?? 1,
    state.status === "success" ? state.currentVersion : null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success") return;
    const target = mode === "create" ? state.createdId : invoiceId;
    router.push(target ? `/admin/finance/invoices/${target}` : "/admin/finance/invoices");
  }, [state.status, state.createdId, mode, invoiceId, router]);

  return (
    <InvoiceEditorForm
      action={action}
      edit={edit}
      initial={initial}
      invoiceId={invoiceId}
      key={edit.formKey}
      mode={mode}
      pending={pending}
      state={state}
    />
  );
}

function InvoiceEditorForm({
  mode,
  initial,
  invoiceId,
  action,
  state,
  pending,
  edit,
}: Readonly<{
  mode: "create" | "edit";
  initial: InvoiceEditorInitial;
  invoiceId: string | undefined;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  edit: ReturnType<typeof usePinnedEdit>;
}>) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initial.clientId);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [projects, setProjects] = useState<readonly ProjectPickerEntry[]>([]);
  const [, startLoadingProjects] = useTransition();
  const [currency, setCurrency] = useState(initial.currency);
  const [taxRate, setTaxRate] = useState(initial.taxRate);
  const [reference, setReference] = useState(initial.reference);
  const [notes, setNotes] = useState(initial.notes);
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [lines, setLines] = useState<readonly InvoiceEditorLine[]>(
    initial.lines.length > 0 ? initial.lines : [newLine()],
  );

  useEffect(() => {
    // Loading projects is an external request; the empty case is handled in
    // the same transition so no setState runs synchronously in the effect.
    startLoadingProjects(async () => {
      const entries = clientId ? await listClientProjectsAction(clientId) : [];
      setProjects(entries);
    });
  }, [clientId]);

  const totals = previewTotals(lines, taxRate);
  const currencyLabel = /^[A-Za-z]{3}$/u.test(currency) ? currency.toUpperCase() : "";
  const money = (value: number) => (currencyLabel ? formatMoney(value, currencyLabel) : "—");

  const updateLine = (key: string, patch: Partial<InvoiceEditorLine>) =>
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

  const serializedLines = JSON.stringify(
    lines.map(({ description, quantity, unit_label, unit_price }) => ({
      description,
      quantity,
      unit_label,
      unit_price,
    })),
  );
  const lineError = state.fieldErrors["lines"];

  return (
    <form action={action} className="admin-form invoice-editor" noValidate>
      {invoiceId ? <input name="invoiceId" type="hidden" value={invoiceId} /> : null}
      {mode === "edit" ? (
        <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
      ) : null}
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

      <section aria-labelledby="invoice-parties-heading" className="invoice-editor-section">
        <h2 id="invoice-parties-heading">Client and project</h2>
        <div className="field-grid field-grid-two">
          <ClientPickerField
            error={state.fieldErrors["clientId"] ?? state.fieldErrors["client_id"]}
            initialClientId={initial.clientId || undefined}
            initialClientLabel={initial.clientLabel || undefined}
            onSelect={(entry) => {
              setClientId(entry?.id ?? "");
              setProjectId("");
            }}
          />
          <Field
            error={state.fieldErrors["projectId"] ?? state.fieldErrors["operational_project_id"]}
            hint="Only this client's active projects are offered. Optional."
            id="projectId"
            label="Operational project"
          >
            <select
              disabled={!clientId}
              id="projectId"
              name="projectId"
              onChange={(event) => setProjectId(event.target.value)}
              value={projectId}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
              {projectId && !projects.some((project) => project.id === projectId) ? (
                <option value={projectId}>Selected project</option>
              ) : null}
            </select>
          </Field>
        </div>
      </section>

      <section aria-labelledby="invoice-terms-heading" className="invoice-editor-section">
        <h2 id="invoice-terms-heading">Currency, tax and dates</h2>
        <div className="field-grid field-grid-three">
          <Field
            error={state.fieldErrors["currency"]}
            hint="ISO code, e.g. RWF, USD, GBP. One currency per invoice."
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
            hint="Percent, 0–100. Applied to the subtotal. 0 does not imply exemption."
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
          <Field error={state.fieldErrors["reference"]} id="reference" label="Reference">
            <input
              id="reference"
              maxLength={120}
              name="reference"
              onChange={(event) => setReference(event.target.value)}
              type="text"
              value={reference}
            />
          </Field>
        </div>
        <div className="field-grid field-grid-two">
          <Field
            error={state.fieldErrors["issueDate"]}
            hint="Planned. The official issue date is confirmed when you issue."
            id="issueDate"
            label="Planned issue date"
          >
            <input
              id="issueDate"
              name="issueDate"
              onChange={(event) => setIssueDate(event.target.value)}
              type="date"
              value={issueDate}
            />
          </Field>
          <Field error={state.fieldErrors["dueDate"]} id="dueDate" label="Planned due date">
            <input
              id="dueDate"
              name="dueDate"
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
            <div aria-label="Due date presets" className="preset-row" role="group">
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  onClick={() => setDueDate(addDays(issueDate, days))}
                  tone="quiet"
                  type="button"
                >
                  +{days} days
                </Button>
              ))}
            </div>
          </Field>
        </div>
      </section>

      <section aria-labelledby="invoice-lines-heading" className="invoice-editor-section">
        <div className="section-heading-row section-heading-compact">
          <h2 id="invoice-lines-heading">Line items</h2>
          <Button
            onClick={() => setLines((current) => [...current, newLine()])}
            tone="secondary"
            type="button"
          >
            + Add item
          </Button>
        </div>
        {lineError ? (
          <Alert live tone="danger">
            <p>{lineError}</p>
          </Alert>
        ) : null}
        <ol className="invoice-line-editor">
          {lines.map((line, index) => {
            const lineTotal = totals.lineTotals[index] ?? 0;
            return (
              <li key={line.key}>
                <div className="invoice-line-fields">
                  <Field id={`${line.key}-description`} label={`Description (item ${index + 1})`}>
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
                  <Field
                    hint="e.g. item, day, hour, m², service"
                    id={`${line.key}-unit`}
                    label="Unit"
                  >
                    <input
                      id={`${line.key}-unit`}
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
                <div
                  aria-label={`Item ${index + 1} actions`}
                  className="invoice-line-actions"
                  role="group"
                >
                  <Button
                    aria-label={`Move item ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveLine(line.key, -1)}
                    tone="quiet"
                    type="button"
                  >
                    ↑
                  </Button>
                  <Button
                    aria-label={`Move item ${index + 1} down`}
                    disabled={index === lines.length - 1}
                    onClick={() => moveLine(line.key, 1)}
                    tone="quiet"
                    type="button"
                  >
                    ↓
                  </Button>
                  <Button
                    aria-label={`Remove item ${index + 1}`}
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

      <section aria-labelledby="invoice-notes-heading" className="invoice-editor-section">
        <h2 id="invoice-notes-heading">Notes and payment terms</h2>
        <div className="field-grid field-grid-two">
          <Field
            error={state.fieldErrors["paymentTerms"]}
            hint="Payment instructions or terms shown to the client."
            id="paymentTerms"
            label="Payment terms"
          >
            <textarea
              id="paymentTerms"
              maxLength={4000}
              name="paymentTerms"
              onChange={(event) => setPaymentTerms(event.target.value)}
              rows={4}
              value={paymentTerms}
            />
          </Field>
          <Field
            error={state.fieldErrors["notes"]}
            hint="Scope clarification or other notes shown on the invoice."
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
              invoiceId ? `/admin/finance/invoices/${invoiceId}` : "/admin/finance/invoices",
            )
          }
          tone="quiet"
          type="button"
        >
          Cancel
        </Button>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Saving…" : "Save Draft"}
        </Button>
      </div>
    </form>
  );
}
