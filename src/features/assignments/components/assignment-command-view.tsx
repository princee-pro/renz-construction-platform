"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import {
  adjustAssignmentAmountAction,
  changeAssignmentStatusAction,
  rateAssignmentAction,
  recordContractorPaymentAction,
  reverseContractorPaymentAction,
} from "@/features/assignments/assignment-actions";
import {
  assignmentActivityLabels,
  assignmentStatusLabels,
  assignmentStatusTone,
  paymentStateLabels,
  paymentStateTone,
  rateTypeLabels,
  rateUnitLabels,
  type AssignmentDetail,
} from "@/features/assignments/assignment-contract";
import {
  formatMoney,
  formatQuantity,
  paymentMethodLabels,
  paymentMethods,
} from "@/features/invoices/invoice-contract";
import { availabilityLabels, ratingScale } from "@/features/partners/partner-contract";

type Section = "overview" | "payments" | "performance" | "activity";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Offered transitions: the facade refuses only changes out of `cancelled` and cancelling with payments standing. */
const transitions: Readonly<Record<string, readonly AssignmentDetail["assignment"]["status"][]>> = {
  planned: ["active", "on_hold", "cancelled"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "completed", "cancelled"],
  completed: ["active"],
  cancelled: [],
};

export function AssignmentCommandView({
  detail,
  permissions,
}: Readonly<{
  detail: AssignmentDetail;
  permissions: Readonly<{ assign: boolean; payments: boolean }>;
}>) {
  const { connectionState } = useAdminRealtimeInvalidation(["contractor_assignment"]);
  const [section, setSection] = useState<Section>("overview");
  const [dialog, setDialog] = useState<"payment" | "adjust" | "status" | "rate" | null>(null);
  const [reversing, setReversing] = useState<string | null>(null);

  const [statusState, statusAction, statusPending] = useActionState(
    changeAssignmentStatusAction,
    initialAdminActionState,
  );
  const [adjustState, adjustAction, adjustPending] = useActionState(
    adjustAssignmentAmountAction,
    initialAdminActionState,
  );
  const [rateState, rateAction, ratePending] = useActionState(
    rateAssignmentAction,
    initialAdminActionState,
  );
  const [paymentState, paymentAction, paymentPending] = useActionState(
    recordContractorPaymentAction,
    initialAdminActionState,
  );
  const [reverseState, reverseAction, reversePending] = useActionState(
    reverseContractorPaymentAction,
    initialAdminActionState,
  );

  const assignment = detail.assignment;
  const money = detail.financials;
  const currency = assignment.currency;
  const isOpen = assignment.status !== "completed" && assignment.status !== "cancelled";
  const hasEffectivePayments = detail.payments.some((payment) => !payment.reversed_at);
  const canPay =
    permissions.payments &&
    currency !== null &&
    assignment.agreed_amount !== null &&
    money.payment_state !== "paid" &&
    assignment.status !== "cancelled";

  const latestVersion = Math.max(
    assignment.version,
    ...[statusState, adjustState, rateState, paymentState, reverseState].map(
      (state) => state.currentVersion ?? 0,
    ),
  );

  const [seen, setSeen] = useState({
    statusState,
    adjustState,
    rateState,
    paymentState,
    reverseState,
  });
  if (
    seen.statusState !== statusState ||
    seen.adjustState !== adjustState ||
    seen.rateState !== rateState ||
    seen.paymentState !== paymentState ||
    seen.reverseState !== reverseState
  ) {
    setSeen({ statusState, adjustState, rateState, paymentState, reverseState });
    if (
      statusState.status === "success" ||
      adjustState.status === "success" ||
      rateState.status === "success" ||
      paymentState.status === "success"
    ) {
      setDialog(null);
    }
    if (reverseState.status === "success") setReversing(null);
  }

  const nextStatuses = transitions[assignment.status] ?? [];
  const unitWord = assignment.rate_type ? rateUnitLabels[assignment.rate_type] : "unit";

  return (
    <div className="assignment-command-view admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Contractor assignment{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{assignment.scope}</h1>
          <p className="page-description">
            <Link href={`/admin/operations/contractors/${detail.partner.id}`}>
              {detail.partner.display_name}
            </Link>{" "}
            ·{" "}
            <Link href={`/admin/operations/projects/${detail.project.id}`}>
              {detail.project.title}
            </Link>{" "}
            ·{" "}
            <StatusBadge tone={assignmentStatusTone(assignment.status)}>
              {assignmentStatusLabels[assignment.status]}
            </StatusBadge>
          </p>
          <p className="page-meta">
            {assignment.specialization ? <span>{assignment.specialization}</span> : null}
            <span>
              {formatDate(assignment.start_date)} → {formatDate(assignment.end_date)}
            </span>
            {currency ? <span>{currency}</span> : null}
            {currency && assignment.agreed_amount !== null ? (
              <span>Agreed {formatMoney(assignment.agreed_amount, currency)}</span>
            ) : (
              <span>No agreed amount</span>
            )}
            {currency && money.remaining_amount !== null ? (
              <span>Remaining {formatMoney(money.remaining_amount, currency)}</span>
            ) : null}
          </p>
        </div>
        <div className="page-actions">
          {permissions.assign && isOpen ? (
            <Link
              className="button button-secondary"
              href={`/admin/operations/assignments/${assignment.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
          {canPay ? (
            <Button onClick={() => setDialog("payment")} tone="primary" type="button">
              Record Payment
            </Button>
          ) : null}
          {permissions.assign && isOpen && currency ? (
            <Button onClick={() => setDialog("adjust")} tone="quiet" type="button">
              Adjust Agreed Amount
            </Button>
          ) : null}
          {permissions.assign && nextStatuses.length > 0 ? (
            <Button onClick={() => setDialog("status")} tone="secondary" type="button">
              Change Status
            </Button>
          ) : null}
          {permissions.assign && assignment.status === "completed" ? (
            <Button onClick={() => setDialog("rate")} tone="secondary" type="button">
              {assignment.performance_rating ? "Update Rating" : "Rate Performance"}
            </Button>
          ) : null}
        </div>
      </header>

      {dialog === "payment" && currency ? (
        <section aria-labelledby="payment-heading" className="admin-panel dialog-panel">
          <h2 id="payment-heading">Record contractor payment</h2>
          <p>
            Remaining {formatMoney(money.remaining_amount ?? 0, currency)} of{" "}
            {formatMoney(assignment.agreed_amount ?? 0, currency)}. Payments are append-only; a
            mistaken payment is reversed, never edited.
          </p>
          <form action={paymentAction} className="admin-form">
            <input name="assignmentId" type="hidden" value={assignment.id} />
            <div className="field-grid field-grid-three">
              <Field
                error={paymentState.fieldErrors["amount"]}
                id="paymentAmount"
                label={`Amount (${currency})`}
              >
                <input
                  id="paymentAmount"
                  inputMode="decimal"
                  max={String(money.remaining_amount ?? "")}
                  min="0.01"
                  name="amount"
                  required
                  step="0.01"
                  type="number"
                />
              </Field>
              <Field
                error={paymentState.fieldErrors["paymentDate"]}
                id="paymentDate"
                label="Payment date"
              >
                <input
                  defaultValue={today()}
                  id="paymentDate"
                  name="paymentDate"
                  required
                  type="date"
                />
              </Field>
              <Field
                error={paymentState.fieldErrors["paymentMethod"]}
                id="paymentMethod"
                label="Method"
              >
                <select defaultValue="bank_transfer" id="paymentMethod" name="paymentMethod">
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabels[method]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="field-grid field-grid-two">
              <Field
                error={paymentState.fieldErrors["reference"]}
                id="paymentReference"
                label="Reference (optional)"
              >
                <input id="paymentReference" maxLength={120} name="reference" type="text" />
              </Field>
              <Field
                error={paymentState.fieldErrors["note"]}
                id="paymentNote"
                label="Note (optional)"
              >
                <input id="paymentNote" maxLength={2000} name="note" type="text" />
              </Field>
            </div>
            {paymentState.status === "error" ? (
              <Alert live tone="danger">
                <p>{paymentState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setDialog(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={paymentPending} tone="primary" type="submit">
                {paymentPending ? "Recording…" : "Record payment"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {dialog === "adjust" && currency ? (
        <section aria-labelledby="adjust-heading" className="admin-panel dialog-panel">
          <h2 id="adjust-heading">Adjust agreed amount</h2>
          <p>
            The current agreed amount is {formatMoney(assignment.agreed_amount ?? 0, currency)} with{" "}
            {formatMoney(money.paid_amount, currency)} already paid. The new amount cannot be lower
            than what has been paid. Every adjustment is audited with its reason.
          </p>
          <form action={adjustAction} className="admin-form">
            <input name="assignmentId" type="hidden" value={assignment.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
            <Field
              error={adjustState.fieldErrors["newAmount"]}
              id="newAmount"
              label={`New agreed amount (${currency})`}
            >
              <input
                defaultValue={String(assignment.agreed_amount ?? "")}
                id="newAmount"
                inputMode="decimal"
                min={String(money.paid_amount)}
                name="newAmount"
                required
                step="0.01"
                type="number"
              />
            </Field>
            <Field
              error={adjustState.fieldErrors["reason"]}
              id="adjustReason"
              label="Reason for adjustment"
            >
              <textarea id="adjustReason" maxLength={1000} name="reason" required rows={3} />
            </Field>
            {adjustState.status === "error" || adjustState.status === "conflict" ? (
              <Alert live tone="danger">
                <p>{adjustState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setDialog(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={adjustPending} tone="primary" type="submit">
                {adjustPending ? "Saving…" : "Save adjustment"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {dialog === "status" ? (
        <section aria-labelledby="status-heading" className="admin-panel dialog-panel">
          <h2 id="status-heading">Change assignment status</h2>
          <p>
            Currently {assignmentStatusLabels[assignment.status]}.
            {hasEffectivePayments && nextStatuses.includes("cancelled")
              ? " Cancelling is blocked while payments stand — reverse them first."
              : ""}
          </p>
          <form action={statusAction} className="admin-form">
            <input name="assignmentId" type="hidden" value={assignment.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
            <Field error={statusState.fieldErrors["nextStatus"]} id="nextStatus" label="New status">
              <select defaultValue={nextStatuses[0]} id="nextStatus" name="nextStatus">
                {nextStatuses.map((next) => (
                  <option key={next} value={next}>
                    {assignmentStatusLabels[next]}
                  </option>
                ))}
              </select>
            </Field>
            {statusState.status === "error" || statusState.status === "conflict" ? (
              <Alert live tone="danger">
                <p>{statusState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setDialog(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={statusPending} tone="primary" type="submit">
                {statusPending ? "Updating…" : "Update status"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {dialog === "rate" ? (
        <section aria-labelledby="rate-heading" className="admin-panel dialog-panel">
          <h2 id="rate-heading">Rate this completed assignment</h2>
          <p>
            Ratings feed the contractor's performance average. Keep the note factual — it is visible
            to all staff with contractor access.
          </p>
          <form action={rateAction} className="admin-form">
            <input name="assignmentId" type="hidden" value={assignment.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
            <fieldset className="rating-fieldset">
              <legend>Performance rating</legend>
              {rateState.fieldErrors["rating"] ? (
                <p className="field-error" role="alert">
                  {rateState.fieldErrors["rating"]}
                </p>
              ) : null}
              <div className="rating-options">
                {ratingScale.map((option) => (
                  <label className="rating-option" key={option.value}>
                    <input
                      defaultChecked={assignment.performance_rating === option.value}
                      name="rating"
                      required
                      type="radio"
                      value={option.value}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field error={rateState.fieldErrors["note"]} id="rateNote" label="Note (optional)">
              <textarea
                defaultValue={assignment.performance_note ?? ""}
                id="rateNote"
                maxLength={1000}
                name="note"
                rows={3}
              />
            </Field>
            {rateState.status === "error" || rateState.status === "conflict" ? (
              <Alert live tone="danger">
                <p>{rateState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setDialog(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={ratePending} tone="primary" type="submit">
                {ratePending ? "Saving…" : "Save rating"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <nav aria-label="Assignment sections" className="record-tabs">
        {(["overview", "payments", "performance", "activity"] as const).map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tab === "overview"
              ? "Overview"
              : tab === "payments"
                ? "Payments"
                : tab === "performance"
                  ? "Performance"
                  : "Activity"}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <div className="record-grid">
          <section className="admin-panel">
            <h2>Scope and schedule</h2>
            <dl className="detail-list">
              <div>
                <dt>Contractor</dt>
                <dd>
                  <Link href={`/admin/operations/contractors/${detail.partner.id}`}>
                    {detail.partner.display_name}
                  </Link>
                  {detail.partner.company_name ? ` · ${detail.partner.company_name}` : ""} ·{" "}
                  {availabilityLabels[detail.partner.availability_status]}
                </dd>
              </div>
              <div>
                <dt>Project</dt>
                <dd>
                  <Link href={`/admin/operations/projects/${detail.project.id}`}>
                    {detail.project.title}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Specialization</dt>
                <dd>{assignment.specialization ?? "—"}</dd>
              </div>
              <div>
                <dt>Start</dt>
                <dd>{formatDate(assignment.start_date)}</dd>
              </div>
              <div>
                <dt>End</dt>
                <dd>{formatDate(assignment.end_date)}</dd>
              </div>
              <div>
                <dt>Payment terms</dt>
                <dd>{assignment.payment_terms ?? "—"}</dd>
              </div>
            </dl>
          </section>
          <section className="admin-panel">
            <h2>Finance</h2>
            {!currency ? (
              <p className="quiet-empty">
                No rate or agreed amount yet. Edit the assignment to set a currency and agreed
                amount before recording payments.
              </p>
            ) : (
              <>
                <dl className="metric-register invoice-money-register">
                  <div>
                    <dt>Agreed</dt>
                    <dd>
                      {assignment.agreed_amount !== null
                        ? formatMoney(assignment.agreed_amount, currency)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>{formatMoney(money.paid_amount, currency)}</dd>
                  </div>
                  <div>
                    <dt>Remaining</dt>
                    <dd>
                      {money.remaining_amount !== null
                        ? formatMoney(money.remaining_amount, currency)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <dl className="detail-list">
                  <div>
                    <dt>Rate</dt>
                    <dd>
                      {assignment.rate_type && assignment.rate_amount !== null
                        ? `${formatMoney(assignment.rate_amount, currency)} · ${rateTypeLabels[assignment.rate_type]}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Planned units</dt>
                    <dd>
                      {assignment.planned_units !== null
                        ? `${formatQuantity(assignment.planned_units)} ${unitWord}${Number(assignment.planned_units) === 1 ? "" : "s"}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Payment state</dt>
                    <dd>
                      <StatusBadge tone={paymentStateTone(money.payment_state)}>
                        {paymentStateLabels[money.payment_state]}
                      </StatusBadge>
                    </dd>
                  </div>
                </dl>
              </>
            )}
            {detail.adjustments.length > 0 ? (
              <>
                <h3>Agreed amount history</h3>
                <ul className="activity-list">
                  {detail.adjustments.map((adjustment) => (
                    <li key={adjustment.id}>
                      <div>
                        <strong>
                          {adjustment.previous_amount !== null && currency
                            ? `${formatMoney(adjustment.previous_amount, currency)} → `
                            : ""}
                          {currency
                            ? formatMoney(adjustment.new_amount, currency)
                            : String(adjustment.new_amount)}
                        </strong>
                        <span>
                          {formatDateTime(adjustment.created_at)}
                          {adjustment.actor ? ` · ${adjustment.actor}` : ""} — {adjustment.reason}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {section === "payments" ? (
        <div className="notes-workspace">
          {!currency ? (
            <p className="quiet-empty">Set a currency and agreed amount before paying.</p>
          ) : null}
          {reverseState.status === "error" ? (
            <Alert live tone="danger">
              <p>{reverseState.message}</p>
            </Alert>
          ) : null}
          {detail.payments.length === 0 ? (
            <p className="quiet-empty">No payments recorded.</p>
          ) : (
            <ul className="activity-list payment-list">
              {detail.payments.map((payment) => (
                <li
                  className={payment.reversed_at ? "payment-reversed" : undefined}
                  key={payment.id}
                >
                  <div>
                    <strong>
                      {currency ? formatMoney(payment.amount, currency) : String(payment.amount)} ·{" "}
                      {paymentMethodLabels[payment.payment_method]}
                      {payment.reversed_at ? " · Reversed" : ""}
                    </strong>
                    <span>
                      {formatDate(payment.payment_date)}
                      {payment.reference ? ` · Ref ${payment.reference}` : ""}
                      {payment.recorded_by ? ` · Recorded by ${payment.recorded_by}` : ""}
                    </span>
                    {payment.note ? <span>{payment.note}</span> : null}
                    {payment.reversed_at ? (
                      <span>
                        Reversed {formatDateTime(payment.reversed_at)}
                        {payment.reversed_by ? ` by ${payment.reversed_by}` : ""} —{" "}
                        {payment.reversal_reason}
                      </span>
                    ) : null}
                  </div>
                  <div className="payment-actions">
                    {permissions.payments && !payment.reversed_at ? (
                      reversing === payment.id ? (
                        <form action={reverseAction} className="admin-form inline-form">
                          <input name="paymentId" type="hidden" value={payment.id} />
                          <Field
                            error={reverseState.fieldErrors["reason"]}
                            id={`reverse-${payment.id}`}
                            label="Reversal reason"
                          >
                            <input
                              id={`reverse-${payment.id}`}
                              maxLength={1000}
                              name="reason"
                              required
                              type="text"
                            />
                          </Field>
                          <div className="form-actions">
                            <Button onClick={() => setReversing(null)} tone="quiet" type="button">
                              Cancel
                            </Button>
                            <Button disabled={reversePending} tone="danger" type="submit">
                              {reversePending ? "Reversing…" : "Confirm reversal"}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button onClick={() => setReversing(payment.id)} tone="quiet" type="button">
                          Reverse
                        </Button>
                      )
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {section === "performance" ? (
        <div className="notes-workspace">
          {assignment.status !== "completed" ? (
            <p className="quiet-empty">
              Performance can be rated once the assignment is completed.
            </p>
          ) : assignment.performance_rating ? (
            <dl className="detail-list">
              <div>
                <dt>Rating</dt>
                <dd>
                  {ratingScale.find((option) => option.value === assignment.performance_rating)
                    ?.label ?? `${assignment.performance_rating} / 5`}
                </dd>
              </div>
              <div>
                <dt>Note</dt>
                <dd>{assignment.performance_note ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="quiet-empty">Completed but not yet rated.</p>
          )}
        </div>
      ) : null}

      {section === "activity" ? (
        <div className="notes-workspace">
          {detail.activity.length === 0 ? (
            <p className="quiet-empty">No activity yet.</p>
          ) : (
            <ul className="activity-list">
              {detail.activity.map((entry, index) => {
                const meta = entry.metadata ?? {};
                const amount =
                  typeof meta["amount"] === "number" || typeof meta["amount"] === "string"
                    ? meta["amount"]
                    : null;
                const metaCurrency =
                  typeof meta["currency"] === "string" ? meta["currency"] : currency;
                return (
                  <li key={`${entry.action}-${index}`}>
                    <div>
                      <strong>
                        {assignmentActivityLabels[entry.action] ?? "Administrative event"}
                        {amount !== null && metaCurrency
                          ? ` · ${formatMoney(amount, metaCurrency)}`
                          : ""}
                      </strong>
                      <span>
                        {formatDateTime(entry.occurred_at)}
                        {entry.actor ? ` · ${entry.actor}` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
