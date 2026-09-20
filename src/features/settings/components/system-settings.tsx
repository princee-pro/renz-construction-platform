"use client";

import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { updateIntakeSettingsAction } from "@/features/leads/lead-actions";
import type { IntakeSettings } from "@/features/leads/lead-contract";
import { SettingsForm } from "@/features/settings/components/settings-form";
import {
  updateDocumentDefaultsAction,
  updateOperationalSettingsAction,
} from "@/features/settings/settings-actions";
import type { SystemSettings } from "@/features/settings/settings-contract";

export function SystemSettingsView({
  data,
  environment,
  intake,
}: Readonly<{
  data: SystemSettings;
  environment: readonly Readonly<{ key: string; configured: boolean }>[];
  /** C8 intake settings (typed singleton); null when unavailable. */
  intake?: IntakeSettings | null | undefined;
}>) {
  const { connectionState } = useAdminRealtimeInvalidation(["settings"]);
  const defaults = data.document_defaults;
  const ops = data.operational;
  const readOnly = !data.can_write;
  return (
    <div className="settings-view">
      {connectionState === "connected" ? (
        <p className="eyebrow">
          System <span className="realtime-dot" title="Live updates connected" />
        </p>
      ) : null}
      <SettingsForm
        action={updateDocumentDefaultsAction}
        description="Form defaults for NEW invoice and purchase order drafts only. Issued documents, payments, receipts and their snapshots never change. The tax label stays “Tax” unless the owner confirms a verified alternative; a 0% rate is allowed."
        submitLabel="Save document defaults"
        title="Document defaults"
        version={defaults.version}
      >
        {(state) => (
          <fieldset className="settings-fieldset" disabled={readOnly}>
            <div className="field-grid field-grid-two">
              <Field
                error={state.fieldErrors["defaultCurrency"]}
                hint="A form default only — currencies are never summed together."
                id="defaultCurrency"
                label="Default currency"
              >
                <input
                  defaultValue={defaults.default_currency}
                  id="defaultCurrency"
                  maxLength={3}
                  name="defaultCurrency"
                  style={{ textTransform: "uppercase" }}
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["allowedCurrencies"]}
                hint="Comma-separated 3-letter codes."
                id="allowedCurrencies"
                label="Allowed currencies"
              >
                <input
                  defaultValue={defaults.allowed_currencies.join(", ")}
                  id="allowedCurrencies"
                  name="allowedCurrencies"
                  type="text"
                />
              </Field>
            </div>
            <h3>Invoices</h3>
            <div className="field-grid field-grid-three">
              <Field
                error={state.fieldErrors["invoiceTaxLabel"]}
                id="invoiceTaxLabel"
                label="Tax label"
              >
                <input
                  defaultValue={defaults.invoice_tax_label}
                  id="invoiceTaxLabel"
                  maxLength={40}
                  name="invoiceTaxLabel"
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["invoiceTaxRate"]}
                id="invoiceTaxRate"
                label="Default tax rate (%)"
              >
                <input
                  defaultValue={String(defaults.invoice_tax_rate)}
                  id="invoiceTaxRate"
                  inputMode="decimal"
                  name="invoiceTaxRate"
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["invoiceDueDays"]}
                id="invoiceDueDays"
                label="Default due days"
              >
                <input
                  defaultValue={defaults.invoice_due_days}
                  id="invoiceDueDays"
                  max={365}
                  min={0}
                  name="invoiceDueDays"
                  type="number"
                />
              </Field>
            </div>
            <Field
              error={state.fieldErrors["invoicePaymentTerms"]}
              hint="Bank / payment instructions shown on new invoices."
              id="invoicePaymentTerms"
              label="Default payment terms"
            >
              <textarea
                defaultValue={defaults.invoice_payment_terms ?? ""}
                id="invoicePaymentTerms"
                maxLength={4000}
                name="invoicePaymentTerms"
                rows={3}
              />
            </Field>
            <h3>Purchase orders</h3>
            <div className="field-grid field-grid-three">
              <Field error={state.fieldErrors["poTaxLabel"]} id="poTaxLabel" label="Tax label">
                <input
                  defaultValue={defaults.po_tax_label}
                  id="poTaxLabel"
                  maxLength={40}
                  name="poTaxLabel"
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["poTaxRate"]}
                id="poTaxRate"
                label="Default tax rate (%)"
              >
                <input
                  defaultValue={String(defaults.po_tax_rate)}
                  id="poTaxRate"
                  inputMode="decimal"
                  name="poTaxRate"
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["poExpectedDeliveryDays"]}
                id="poExpectedDeliveryDays"
                label="Default expected delivery (days)"
              >
                <input
                  defaultValue={defaults.po_expected_delivery_days}
                  id="poExpectedDeliveryDays"
                  max={365}
                  min={0}
                  name="poExpectedDeliveryDays"
                  type="number"
                />
              </Field>
            </div>
            <Field
              error={state.fieldErrors["poTerms"]}
              id="poTerms"
              label="Default purchase order terms"
            >
              <textarea
                defaultValue={defaults.po_terms ?? ""}
                id="poTerms"
                maxLength={4000}
                name="poTerms"
                rows={3}
              />
            </Field>
          </fieldset>
        )}
      </SettingsForm>

      <SettingsForm
        action={updateOperationalSettingsAction}
        description="Deterministic Control Room thresholds. The database action queues read these directly, so React and PostgreSQL never disagree. Defaults match the original C4–C6 behaviour."
        submitLabel="Save thresholds"
        title="Operational thresholds"
        version={ops.version}
      >
        {(state) => (
          <fieldset className="settings-fieldset" disabled={readOnly}>
            <div className="field-grid field-grid-three">
              <Field
                error={state.fieldErrors["projectEndingSoonDays"]}
                id="projectEndingSoonDays"
                label="Project ending soon (days)"
              >
                <input
                  defaultValue={ops.project_ending_soon_days}
                  id="projectEndingSoonDays"
                  max={120}
                  min={1}
                  name="projectEndingSoonDays"
                  type="number"
                />
              </Field>
              <Field
                error={state.fieldErrors["invoiceDueSoonDays"]}
                id="invoiceDueSoonDays"
                label="Invoice due soon (days)"
              >
                <input
                  defaultValue={ops.invoice_due_soon_days}
                  id="invoiceDueSoonDays"
                  max={120}
                  min={1}
                  name="invoiceDueSoonDays"
                  type="number"
                />
              </Field>
              <Field
                error={state.fieldErrors["staleDraftInvoiceDays"]}
                id="staleDraftInvoiceDays"
                label="Stale draft invoice (days)"
              >
                <input
                  defaultValue={ops.stale_draft_invoice_days}
                  id="staleDraftInvoiceDays"
                  max={365}
                  min={1}
                  name="staleDraftInvoiceDays"
                  type="number"
                />
              </Field>
            </div>
            <div className="field-grid field-grid-three">
              <Field
                error={state.fieldErrors["assignmentEndingSoonDays"]}
                id="assignmentEndingSoonDays"
                label="Assignment ending soon (days)"
              >
                <input
                  defaultValue={ops.assignment_ending_soon_days}
                  id="assignmentEndingSoonDays"
                  max={120}
                  min={1}
                  name="assignmentEndingSoonDays"
                  type="number"
                />
              </Field>
              <Field
                error={state.fieldErrors["materialRequiredSoonDays"]}
                id="materialRequiredSoonDays"
                label="Material required soon (days)"
              >
                <input
                  defaultValue={ops.material_required_soon_days}
                  id="materialRequiredSoonDays"
                  max={120}
                  min={1}
                  name="materialRequiredSoonDays"
                  type="number"
                />
              </Field>
              <Field
                error={state.fieldErrors["poExpectedSoonDays"]}
                id="poExpectedSoonDays"
                label="PO expected soon (days)"
              >
                <input
                  defaultValue={ops.po_expected_soon_days}
                  id="poExpectedSoonDays"
                  max={120}
                  min={1}
                  name="poExpectedSoonDays"
                  type="number"
                />
              </Field>
            </div>
          </fieldset>
        )}
      </SettingsForm>

      {intake ? (
        <SettingsForm
          action={updateIntakeSettingsAction}
          description="Public enquiry intake (C8). Pausing intake shows the WhatsApp and email fallback on every public form; the upload policy decides which supporting files are accepted into private quarantine. Thresholds drive the lead action queue in Postgres and the Control Room alike."
          submitLabel="Save intake settings"
          title="Online intake"
          version={intake.version}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              <label className="checkbox-row">
                <input
                  defaultChecked={intake.intake_enabled}
                  name="intakeEnabled"
                  type="checkbox"
                />{" "}
                Accept online enquiries (contact, service, project, material)
              </label>
              <div className="field-grid field-grid-three">
                <Field
                  error={state.fieldErrors["uploadPolicy"]}
                  hint="Images-only is the safe launch policy until a malware scanner is integrated (C10)."
                  id="uploadPolicy"
                  label="Supporting-file policy"
                >
                  <select defaultValue={intake.upload_policy} id="uploadPolicy" name="uploadPolicy">
                    <option value="disabled">Disabled</option>
                    <option value="images_only">Images only (JPEG, PNG, WebP)</option>
                    <option value="images_and_pdf">Images and PDF</option>
                  </select>
                </Field>
                <Field
                  error={state.fieldErrors["leadUncontactedHours"]}
                  id="leadUncontactedHours"
                  label="Uncontacted lead alert (hours)"
                >
                  <input
                    defaultValue={intake.lead_uncontacted_hours}
                    id="leadUncontactedHours"
                    max={720}
                    min={1}
                    name="leadUncontactedHours"
                    type="number"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["proposalStaleDays"]}
                  id="proposalStaleDays"
                  label="Stale proposal alert (days)"
                >
                  <input
                    defaultValue={intake.proposal_stale_days}
                    id="proposalStaleDays"
                    max={365}
                    min={1}
                    name="proposalStaleDays"
                    type="number"
                  />
                </Field>
              </div>
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      <section aria-labelledby="numbering-heading" className="admin-panel settings-panel">
        <h2 id="numbering-heading">Document numbering (read-only)</h2>
        <p className="panel-copy">
          The proven C5/C6 numbering is not configurable: uniqueness and history come first.
        </p>
        <dl className="detail-list">
          <div>
            <dt>Invoices</dt>
            <dd>
              {data.numbering.invoice_pattern} · counters:{" "}
              {Object.entries(data.numbering.invoice_counters).length === 0
                ? "none yet"
                : Object.entries(data.numbering.invoice_counters)
                    .map(([year, value]) => `${year} → ${value}`)
                    .join(", ")}
            </dd>
          </div>
          <div>
            <dt>Purchase orders</dt>
            <dd>
              {data.numbering.purchase_order_pattern} · counters:{" "}
              {Object.entries(data.numbering.purchase_order_counters).length === 0
                ? "none yet"
                : Object.entries(data.numbering.purchase_order_counters)
                    .map(([year, value]) => `${year} → ${value}`)
                    .join(", ")}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="environment-heading" className="admin-panel settings-panel">
        <h2 id="environment-heading">Environment (secrets boundary)</h2>
        <p className="panel-copy">
          Secrets never live in Settings and are never displayed — only whether each is configured
          on this deployment.
        </p>
        <ul className="settings-list settings-list-compact">
          {environment.map((entry) => (
            <li key={entry.key}>
              <div>
                <strong>
                  <code>{entry.key}</code>
                </strong>
              </div>
              <StatusBadge tone={entry.configured ? "ready" : "review"}>
                {entry.configured ? "Configured" : "Not configured"}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
