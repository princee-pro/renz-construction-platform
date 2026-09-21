"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { CopyButton } from "@/components/admin/ui/copy-button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  guardAction,
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { useRecordRecentlyViewed } from "@/features/admin-shared/use-record-recently-viewed";
import { InvoiceDocumentView } from "@/features/invoices/components/invoice-document";
import {
  archiveInvoiceAction,
  createShareLinkAction,
  duplicateInvoiceAction,
  issueInvoiceAction,
  recordPaymentAction,
  reversePaymentAction,
  revokeShareLinkAction,
  voidInvoiceAction,
} from "@/features/invoices/invoice-actions";
import {
  formatMoney,
  invoiceActivityLabels,
  invoiceStatus,
  paymentMethodLabels,
  paymentMethods,
  type InvoiceDetail,
  type InvoiceDocument,
} from "@/features/invoices/invoice-contract";

type Section = "overview" | "payments" | "share" | "activity";

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

function addDays(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function whatsappDigits(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/gu, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Draft preview built from the live rows — issued invoices use the frozen document. */
function draftDocument(detail: InvoiceDetail): InvoiceDocument {
  return {
    id: detail.invoice.id,
    invoice_number: null,
    lifecycle_state: "draft",
    currency: detail.invoice.currency,
    tax_rate: detail.invoice.tax_rate,
    issue_date: detail.invoice.issue_date,
    due_date: detail.invoice.due_date,
    reference: detail.invoice.reference,
    notes: detail.invoice.notes,
    payment_terms: detail.invoice.payment_terms,
    voided_at: null,
    issuer: { name: "RENZ Construction Services Ltd", tax_label: "Tax" },
    client: {
      full_name: detail.client.full_name,
      ...(detail.client.company ? { company: detail.client.company } : {}),
      ...(detail.client.email ? { email: detail.client.email } : {}),
      ...(detail.client.phone_display ? { phone: detail.client.phone_display } : {}),
    },
    project: detail.project ? { title: detail.project.title } : null,
    lines: detail.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unit_label,
      unit_price: line.unit_price,
      line_total: line.line_total,
    })),
    subtotal: detail.financials.subtotal,
    tax_amount: detail.financials.tax_amount,
    total: detail.financials.total,
    paid_amount: detail.financials.paid_amount,
    balance_due: detail.financials.balance_due,
    payment_state: detail.financials.payment_state,
    is_overdue: false,
    payments: [],
  };
}

export function InvoiceCommandCenter({
  detail,
  permissions,
}: Readonly<{
  detail: InvoiceDetail;
  permissions: Readonly<{ write: boolean; issue: boolean; payments: boolean; void: boolean }>;
}>) {
  const router = useRouter();
  const { connectionState } = useAdminRealtimeInvalidation(["invoice"]);
  const [section, setSection] = useState<Section>("overview");
  const [dialog, setDialog] = useState<"issue" | "void" | "payment" | "archive" | null>(null);
  const [reversing, setReversing] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [issueState, issueAction, issuePending] = useActionState(
    guardAction(issueInvoiceAction),
    initialAdminActionState,
  );
  const [voidState, voidAction, voidPending] = useActionState(
    guardAction(voidInvoiceAction),
    initialAdminActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    guardAction(archiveInvoiceAction),
    initialAdminActionState,
  );
  const [duplicateState, duplicateAction, duplicatePending] = useActionState(
    guardAction(duplicateInvoiceAction),
    initialAdminActionState,
  );
  const [paymentState, paymentAction, paymentPending] = useActionState(
    guardAction(recordPaymentAction),
    initialAdminActionState,
  );
  const [reverseState, reverseAction, reversePending] = useActionState(
    guardAction(reversePaymentAction),
    initialAdminActionState,
  );
  const [shareState, shareAction, sharePending] = useActionState(
    guardAction(createShareLinkAction),
    initialAdminActionState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    guardAction(revokeShareLinkAction),
    initialAdminActionState,
  );

  const invoice = detail.invoice;
  const money = detail.financials;
  const status = invoiceStatus({ ...invoice, ...money });
  const isDraft = invoice.lifecycle_state === "draft";
  const isIssued = invoice.lifecycle_state === "issued";
  const label = invoice.invoice_number ?? "Draft invoice";

  useRecordRecentlyViewed({
    kind: "invoice",
    id: invoice.id,
    label: invoice.invoice_number ?? `Draft · ${detail.client.full_name}`,
    href: `/admin/finance/invoices/${invoice.id}`,
  });

  const latestVersion = Math.max(
    invoice.version,
    ...[issueState, voidState, archiveState, paymentState, reverseState].map(
      (state) => state.currentVersion ?? 0,
    ),
  );

  // Close dialogs on success; navigate on duplicate; capture the one-shot share token.
  const [seen, setSeen] = useState({
    issueState,
    voidState,
    archiveState,
    paymentState,
    reverseState,
    shareState,
    duplicateState,
  });
  if (
    seen.issueState !== issueState ||
    seen.voidState !== voidState ||
    seen.archiveState !== archiveState ||
    seen.paymentState !== paymentState ||
    seen.reverseState !== reverseState ||
    seen.shareState !== shareState ||
    seen.duplicateState !== duplicateState
  ) {
    setSeen({
      issueState,
      voidState,
      archiveState,
      paymentState,
      reverseState,
      shareState,
      duplicateState,
    });
    if (
      issueState.status === "success" ||
      voidState.status === "success" ||
      archiveState.status === "success" ||
      paymentState.status === "success"
    ) {
      setDialog(null);
    }
    if (reverseState.status === "success") setReversing(null);
    if (shareState.status === "success" && shareState.detail) {
      setShareUrl(`${window.location.origin}/i/${shareState.detail}`);
    }
  }
  useEffect(() => {
    if (duplicateState.status === "success" && duplicateState.createdId) {
      router.push(`/admin/finance/invoices/${duplicateState.createdId}`);
    }
  }, [duplicateState.status, duplicateState.createdId, router]);

  const document = isDraft ? draftDocument(detail) : detail.document;
  const clientWhatsapp = whatsappDigits(detail.client.phone_display);
  const shareMessage = shareUrl
    ? `RENZ Construction Services Ltd — Invoice ${invoice.invoice_number ?? ""} for ${formatMoney(money.total, invoice.currency)}, due ${formatDate(invoice.due_date)}. View and download it here: ${shareUrl}`
    : "";
  const mailto =
    shareUrl && detail.client.email
      ? `mailto:${detail.client.email}?subject=${encodeURIComponent(`Invoice ${invoice.invoice_number ?? ""} from RENZ Construction Services Ltd`)}&body=${encodeURIComponent(shareMessage)}`
      : null;
  const whatsapp =
    shareUrl && clientWhatsapp
      ? `https://wa.me/${clientWhatsapp}?text=${encodeURIComponent(shareMessage)}`
      : null;

  return (
    <div className="invoice-command-center admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Invoice{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{label}</h1>
          <p className="page-description">
            <Link href={`/admin/operations/clients/${detail.client.id}`}>
              {detail.client.full_name}
            </Link>
            {detail.project ? (
              <>
                {" "}
                ·{" "}
                <Link href={`/admin/operations/projects/${detail.project.id}`}>
                  {detail.project.title}
                </Link>
              </>
            ) : null}{" "}
            · <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </p>
          <p className="page-meta">
            <span>{invoice.currency}</span>
            <span>Total {formatMoney(money.total, invoice.currency)}</span>
            <span>
              Balance{" "}
              {invoice.lifecycle_state === "void"
                ? "—"
                : formatMoney(money.balance_due, invoice.currency)}
            </span>
            <span>Due {formatDate(invoice.due_date)}</span>
          </p>
        </div>
        <div className="page-actions">
          {invoice.invoice_number ? (
            <CopyButton label="Copy number" value={invoice.invoice_number} />
          ) : null}
          {isDraft && permissions.write && !invoice.archived_at ? (
            <Link
              className="button button-secondary"
              href={`/admin/finance/invoices/${invoice.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
          <Link
            className="button button-quiet"
            href={`/admin/finance/invoices/${invoice.id}/print`}
          >
            {isDraft ? "Preview" : "View / Print"}
          </Link>
          <a className="button button-quiet" href={`/admin/finance/invoices/${invoice.id}/pdf`}>
            {isDraft ? "Download draft PDF" : "Download PDF"}
          </a>
          {isDraft && permissions.issue && !invoice.archived_at ? (
            <Button onClick={() => setDialog("issue")} tone="primary" type="button">
              Issue Invoice
            </Button>
          ) : null}
          {isIssued && permissions.payments && money.payment_state !== "paid" ? (
            <Button onClick={() => setDialog("payment")} tone="primary" type="button">
              Record Payment
            </Button>
          ) : null}
          {permissions.write ? (
            <form action={duplicateAction}>
              <input name="invoiceId" type="hidden" value={invoice.id} />
              <input name="expectedVersion" type="hidden" value={latestVersion} />
              <Button disabled={duplicatePending} tone="quiet" type="submit">
                {duplicatePending ? "Duplicating…" : "Duplicate as new draft"}
              </Button>
            </form>
          ) : null}
          {isIssued && permissions.void ? (
            <Button onClick={() => setDialog("void")} tone="danger" type="button">
              Void Invoice
            </Button>
          ) : null}
          {isDraft && permissions.write && !invoice.archived_at ? (
            <Button onClick={() => setDialog("archive")} tone="danger" type="button">
              Archive Draft
            </Button>
          ) : null}
        </div>
      </header>

      {duplicateState.status === "error" ? (
        <Alert live tone="danger">
          <p>{duplicateState.message}</p>
        </Alert>
      ) : null}

      {dialog === "issue" ? (
        <IssueDialog
          action={issueAction}
          invoiceId={invoice.id}
          onClose={() => setDialog(null)}
          pending={issuePending}
          plannedDue={invoice.due_date}
          plannedIssue={invoice.issue_date}
          state={issueState}
          version={latestVersion}
        />
      ) : null}

      {dialog === "void" ? (
        <section aria-labelledby="void-heading" className="admin-panel dialog-panel">
          <h2 id="void-heading">Void {label}?</h2>
          <p>
            A void invoice keeps its number and history but nothing is payable against it. If
            payments have been recorded, reverse them first. To bill again, duplicate this invoice
            as a new draft.
          </p>
          <form action={voidAction} className="admin-form">
            <input name="invoiceId" type="hidden" value={invoice.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
            <Field
              error={voidState.fieldErrors["reason"]}
              id="voidReason"
              label="Reason for voiding"
            >
              <textarea id="voidReason" maxLength={1000} name="reason" required rows={3} />
            </Field>
            {voidState.status === "error" || voidState.status === "conflict" ? (
              <Alert live tone="danger">
                <p>{voidState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setDialog(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={voidPending} tone="danger" type="submit">
                {voidPending ? "Voiding…" : "Confirm void"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {dialog === "archive" ? (
        <section aria-labelledby="archive-heading" className="admin-panel dialog-panel">
          <h2 id="archive-heading">Archive this draft?</h2>
          <p>Archived drafts leave the register and cannot be issued. Nothing is deleted.</p>
          <form action={archiveAction}>
            <input name="invoiceId" type="hidden" value={invoice.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
            {archiveState.status === "error" || archiveState.status === "conflict" ? (
              <Alert live tone="danger">
                <p>{archiveState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setDialog(null)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={archivePending} tone="danger" type="submit">
                {archivePending ? "Archiving…" : "Confirm archive"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {dialog === "payment" ? (
        <PaymentDialog
          action={paymentAction}
          currency={invoice.currency}
          invoiceId={invoice.id}
          money={money}
          onClose={() => setDialog(null)}
          pending={paymentPending}
          state={paymentState}
        />
      ) : null}

      <nav aria-label="Invoice sections" className="record-tabs">
        {(["overview", "payments", "share", "activity"] as const).map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tab === "overview"
              ? "Document"
              : tab === "payments"
                ? "Payments"
                : tab === "share"
                  ? "Client link"
                  : "Activity"}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <div className="invoice-document-host">
          {invoice.archived_at ? (
            <Alert tone="info">
              <p>This draft is archived. It stays viewable but cannot be edited or issued.</p>
            </Alert>
          ) : null}
          {invoice.lifecycle_state === "void" && invoice.void_reason ? (
            <Alert tone="warning">
              <p>
                Voided {invoice.voided_at ? formatDateTime(invoice.voided_at) : ""} —{" "}
                {invoice.void_reason}
              </p>
            </Alert>
          ) : null}
          {document ? (
            <InvoiceDocumentView document={document} />
          ) : (
            <Alert tone="danger">
              <p>The issued document could not be loaded.</p>
            </Alert>
          )}
          {isDraft && detail.lines.length === 0 ? (
            <Alert tone="info">
              <p>Add at least one line item before this draft can be issued.</p>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {section === "payments" ? (
        <div className="notes-workspace">
          {!isIssued ? (
            <p className="quiet-empty">
              {isDraft
                ? "Payments can be recorded once the invoice is issued."
                : "No further payments can be recorded against a void invoice."}
            </p>
          ) : null}
          <dl className="metric-register invoice-money-register">
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(money.total, invoice.currency)}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>{formatMoney(money.paid_amount, invoice.currency)}</dd>
            </div>
            <div className={money.is_overdue ? "metric-attention" : undefined}>
              <dt>Balance due</dt>
              <dd>
                {invoice.lifecycle_state === "void"
                  ? "—"
                  : formatMoney(money.balance_due, invoice.currency)}
              </dd>
            </div>
          </dl>
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
                      {formatMoney(payment.amount, invoice.currency)} ·{" "}
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
                    <Link
                      className="text-link"
                      href={`/admin/finance/invoices/${invoice.id}/print?payment=${payment.id}`}
                    >
                      Receipt
                    </Link>
                    <a
                      className="text-link"
                      href={`/admin/finance/invoices/${invoice.id}/pdf?payment=${payment.id}`}
                    >
                      Receipt PDF
                    </a>
                    {permissions.payments && !payment.reversed_at && isIssued ? (
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

      {section === "share" ? (
        <div className="notes-workspace">
          {!isIssued ? (
            <p className="quiet-empty">
              {isDraft
                ? "Client links are generated once the invoice is issued."
                : "This invoice is void. Any existing client link now shows the void state."}
            </p>
          ) : null}
          <p>
            A client link opens a read-only copy of this invoice with print and PDF — no login
            required. Anyone holding the link can view this one invoice, so share it only with the
            client, and revoke it if it leaks.
          </p>
          {detail.share ? (
            <p>
              <StatusBadge tone="ready">Active link</StatusBadge> generated{" "}
              {formatDateTime(detail.share.created_at)}
              {detail.share.created_by ? ` by ${detail.share.created_by}` : ""}.
              {!shareUrl
                ? " The link itself is shown once at generation; regenerate to obtain a new one."
                : ""}
            </p>
          ) : (
            <p>
              <StatusBadge tone="neutral">Client link not generated</StatusBadge>
            </p>
          )}
          {shareUrl ? (
            <div className="share-link-box">
              <code>{shareUrl}</code>
              <div className="form-actions">
                <CopyButton label="Copy Link" value={shareUrl} />
                <a className="button button-quiet" href={shareUrl} rel="noreferrer" target="_blank">
                  Open link
                </a>
                {mailto ? (
                  <a className="button button-quiet" href={mailto}>
                    Email Invoice
                  </a>
                ) : null}
                {whatsapp ? (
                  <a
                    className="button button-whatsapp"
                    href={whatsapp}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Share on WhatsApp
                  </a>
                ) : null}
              </div>
              <p className="field-help">
                Email and WhatsApp open a prefilled message on this device — the application does
                not send anything itself.
              </p>
            </div>
          ) : null}
          {shareState.status === "error" || revokeState.status === "error" ? (
            <Alert live tone="danger">
              <p>{shareState.status === "error" ? shareState.message : revokeState.message}</p>
            </Alert>
          ) : null}
          {isIssued && permissions.write ? (
            <div className="form-actions">
              <form action={shareAction}>
                <input name="invoiceId" type="hidden" value={invoice.id} />
                <input name="expectedVersion" type="hidden" value={latestVersion} />
                <Button disabled={sharePending} tone="primary" type="submit">
                  {sharePending
                    ? "Generating…"
                    : detail.share
                      ? "Regenerate Link"
                      : "Generate Client Link"}
                </Button>
              </form>
              {detail.share ? (
                <form action={revokeAction}>
                  <input name="invoiceId" type="hidden" value={invoice.id} />
                  <input name="expectedVersion" type="hidden" value={latestVersion} />
                  <Button disabled={revokePending} tone="danger" type="submit">
                    {revokePending ? "Revoking…" : "Revoke Link"}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
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
                const currency =
                  typeof meta["currency"] === "string" ? meta["currency"] : invoice.currency;
                return (
                  <li key={`${entry.action}-${index}`}>
                    <div>
                      <strong>
                        {invoiceActivityLabels[entry.action] ?? "Administrative event"}
                        {amount !== null ? ` · ${formatMoney(amount, currency)}` : ""}
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

function IssueDialog({
  invoiceId,
  version,
  plannedIssue,
  plannedDue,
  action,
  state,
  pending,
  onClose,
}: Readonly<{
  invoiceId: string;
  version: number;
  plannedIssue: string | null;
  plannedDue: string | null;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  onClose: () => void;
}>) {
  const [issueDate, setIssueDate] = useState(plannedIssue ?? today());
  const [dueDate, setDueDate] = useState(plannedDue ?? "");
  return (
    <section aria-labelledby="issue-heading" className="admin-panel dialog-panel">
      <h2 id="issue-heading">Issue this invoice</h2>
      <p>
        Issuing assigns the next official RENZ number, freezes the client and project details, line
        items, tax and totals, and makes the invoice shareable. It cannot be edited afterwards —
        only voided and reissued.
      </p>
      <form action={action} className="admin-form">
        <input name="invoiceId" type="hidden" value={invoiceId} />
        <input name="expectedVersion" type="hidden" value={version} />
        <div className="field-grid field-grid-two">
          <Field error={state.fieldErrors["issueDate"]} id="issueDateConfirm" label="Issue date">
            <input
              id="issueDateConfirm"
              name="issueDate"
              onChange={(event) => setIssueDate(event.target.value)}
              required
              type="date"
              value={issueDate}
            />
          </Field>
          <Field error={state.fieldErrors["dueDate"]} id="dueDateConfirm" label="Due date">
            <input
              id="dueDateConfirm"
              name="dueDate"
              onChange={(event) => setDueDate(event.target.value)}
              required
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
        {state.status === "error" || state.status === "conflict" ? (
          <Alert live tone={state.status === "conflict" ? "warning" : "danger"}>
            <p>{state.message}</p>
          </Alert>
        ) : null}
        <div className="form-actions">
          <Button onClick={onClose} tone="quiet" type="button">
            Cancel
          </Button>
          <Button disabled={pending} tone="primary" type="submit">
            {pending ? "Issuing…" : "Confirm and issue"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PaymentDialog({
  invoiceId,
  currency,
  money,
  action,
  state,
  pending,
  onClose,
}: Readonly<{
  invoiceId: string;
  currency: string;
  money: InvoiceDetail["financials"];
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  onClose: () => void;
}>) {
  const [amount, setAmount] = useState("");
  const balance = Number.parseFloat(String(money.balance_due));
  const entered = Number.parseFloat(amount);
  const after = Number.isFinite(entered) ? Math.round((balance - entered) * 100) / 100 : balance;
  return (
    <section aria-labelledby="payment-heading" className="admin-panel dialog-panel">
      <h2 id="payment-heading">Record a payment</h2>
      <dl className="metric-register invoice-money-register">
        <div>
          <dt>Invoice total</dt>
          <dd>{formatMoney(money.total, currency)}</dd>
        </div>
        <div>
          <dt>Already paid</dt>
          <dd>{formatMoney(money.paid_amount, currency)}</dd>
        </div>
        <div>
          <dt>Current balance</dt>
          <dd>{formatMoney(money.balance_due, currency)}</dd>
        </div>
        <div className={after < 0 ? "metric-attention" : undefined}>
          <dt>Balance after payment</dt>
          <dd aria-live="polite">{formatMoney(after, currency)}</dd>
        </div>
      </dl>
      <form action={action} className="admin-form">
        <input name="invoiceId" type="hidden" value={invoiceId} />
        <div className="field-grid field-grid-two">
          <Field
            error={state.fieldErrors["amount"]}
            hint={`Up to ${formatMoney(money.balance_due, currency)}.`}
            id="paymentAmount"
            label={`Amount (${currency})`}
          >
            <input
              id="paymentAmount"
              inputMode="decimal"
              name="amount"
              onChange={(event) => setAmount(event.target.value)}
              required
              type="text"
              value={amount}
            />
          </Field>
          <Field error={state.fieldErrors["paymentDate"]} id="paymentDate" label="Payment date">
            <input
              defaultValue={today()}
              id="paymentDate"
              name="paymentDate"
              required
              type="date"
            />
          </Field>
        </div>
        <div className="field-grid field-grid-two">
          <Field error={state.fieldErrors["paymentMethod"]} id="paymentMethod" label="Method">
            <select defaultValue="bank_transfer" id="paymentMethod" name="paymentMethod">
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabels[method]}
                </option>
              ))}
            </select>
          </Field>
          <Field error={state.fieldErrors["reference"]} id="paymentReference" label="Reference">
            <input id="paymentReference" maxLength={120} name="reference" type="text" />
          </Field>
        </div>
        <Field
          error={state.fieldErrors["note"]}
          hint="Internal — never shown to the client."
          id="paymentNote"
          label="Note"
        >
          <textarea id="paymentNote" maxLength={2000} name="note" rows={2} />
        </Field>
        {state.status === "error" ? (
          <Alert live tone="danger">
            <p>{state.message}</p>
          </Alert>
        ) : null}
        <div className="form-actions">
          <Button onClick={onClose} tone="quiet" type="button">
            Cancel
          </Button>
          <Button disabled={pending || after < 0} tone="primary" type="submit">
            {pending ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
