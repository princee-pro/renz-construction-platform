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
import { formatMoney, formatQuantity } from "@/features/invoices/invoice-contract";
import { PurchaseOrderDocumentView } from "@/features/procurement/components/po-document";
import {
  cancelPurchaseOrderAction,
  closePurchaseOrderAction,
  createPoShareLinkAction,
  duplicatePurchaseOrderAction,
  issuePurchaseOrderAction,
  recordGoodsReceiptAction,
  reverseGoodsReceiptAction,
  revokePoShareLinkAction,
} from "@/features/procurement/procurement-actions";
import {
  deliveryStateLabels,
  procurementActivityLabels,
  purchaseOrderStatus,
  type PoDetail,
  type PoDocument,
} from "@/features/procurement/procurement-contract";

type Section = "document" | "deliveries" | "requirements" | "share" | "activity";

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

function whatsappDigits(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/gu, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Draft preview built from the live rows — issued orders use the frozen document. */
function draftDocument(detail: PoDetail): PoDocument {
  const order = detail.purchase_order;
  return {
    id: order.id,
    purchase_order_number: null,
    lifecycle_state: "draft",
    currency: order.currency,
    tax_rate: order.tax_rate,
    issue_date: order.issue_date,
    expected_delivery_date: order.expected_delivery_date,
    reference: order.reference,
    notes: order.notes,
    terms: order.terms,
    cancelled_at: null,
    closed_at: null,
    issuer: { name: "RENZ Construction Services Ltd", tax_label: "Tax" },
    supplier: {
      display_name: detail.supplier.display_name,
      ...(detail.supplier.company_name ? { company_name: detail.supplier.company_name } : {}),
      ...(detail.supplier.email ? { email: detail.supplier.email } : {}),
      ...(detail.supplier.phone_display ? { phone: detail.supplier.phone_display } : {}),
    },
    project: { title: detail.project.title },
    lines: detail.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_label: line.unit_label,
      unit_price: line.unit_price,
      line_total: line.line_total,
      received_quantity: 0,
    })),
    subtotal: detail.financials.subtotal,
    tax_amount: detail.financials.tax_amount,
    total: detail.financials.total,
    delivery_state: "not_received",
  };
}

export function PurchaseOrderCommandCenter({
  detail,
  permissions,
}: Readonly<{
  detail: PoDetail;
  permissions: Readonly<{ write: boolean; issue: boolean; receipts: boolean }>;
}>) {
  const router = useRouter();
  const { connectionState } = useAdminRealtimeInvalidation(["purchase_order"]);
  const [section, setSection] = useState<Section>("document");
  const [dialog, setDialog] = useState<"issue" | "cancel" | "close" | "receipt" | null>(null);
  const [reversing, setReversing] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [issueState, issueAction, issuePending] = useActionState(
    guardAction(issuePurchaseOrderAction),
    initialAdminActionState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    guardAction(cancelPurchaseOrderAction),
    initialAdminActionState,
  );
  const [closeState, closeAction, closePending] = useActionState(
    guardAction(closePurchaseOrderAction),
    initialAdminActionState,
  );
  const [duplicateState, duplicateAction, duplicatePending] = useActionState(
    guardAction(duplicatePurchaseOrderAction),
    initialAdminActionState,
  );
  const [receiptState, receiptAction, receiptPending] = useActionState(
    guardAction(recordGoodsReceiptAction),
    initialAdminActionState,
  );
  const [reverseState, reverseAction, reversePending] = useActionState(
    guardAction(reverseGoodsReceiptAction),
    initialAdminActionState,
  );
  const [shareState, shareAction, sharePending] = useActionState(
    guardAction(createPoShareLinkAction),
    initialAdminActionState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    guardAction(revokePoShareLinkAction),
    initialAdminActionState,
  );

  const order = detail.purchase_order;
  const money = detail.financials;
  const status = purchaseOrderStatus({
    lifecycle_state: order.lifecycle_state,
    delivery_state: money.delivery_state,
    is_delayed: money.is_delayed,
  });
  const isDraft = order.lifecycle_state === "draft";
  const isIssued = order.lifecycle_state === "issued";
  const label = order.purchase_order_number ?? "Draft purchase order";
  const hasEffectiveReceipts = detail.receipts.some((receipt) => !receipt.reversed_at);
  const remainingToReceive = Number.parseFloat(String(money.remaining_quantity));

  useRecordRecentlyViewed({
    kind: "purchase_order",
    id: order.id,
    label: order.purchase_order_number ?? `Draft · ${detail.supplier.display_name}`,
    href: `/admin/procurement/orders/${order.id}`,
  });

  const latestVersion = Math.max(
    order.version,
    ...[issueState, cancelState, closeState, receiptState, reverseState].map(
      (state) => state.currentVersion ?? 0,
    ),
  );

  const [seen, setSeen] = useState({
    issueState,
    cancelState,
    closeState,
    receiptState,
    reverseState,
    shareState,
  });
  if (
    seen.issueState !== issueState ||
    seen.cancelState !== cancelState ||
    seen.closeState !== closeState ||
    seen.receiptState !== receiptState ||
    seen.reverseState !== reverseState ||
    seen.shareState !== shareState
  ) {
    setSeen({ issueState, cancelState, closeState, receiptState, reverseState, shareState });
    if (
      issueState.status === "success" ||
      cancelState.status === "success" ||
      closeState.status === "success" ||
      receiptState.status === "success"
    ) {
      setDialog(null);
    }
    if (reverseState.status === "success") setReversing(null);
    if (shareState.status === "success" && shareState.detail) {
      setShareUrl(`${window.location.origin}/po/${shareState.detail}`);
    }
  }
  useEffect(() => {
    if (duplicateState.status === "success" && duplicateState.createdId) {
      router.push(`/admin/procurement/orders/${duplicateState.createdId}`);
    }
  }, [duplicateState.status, duplicateState.createdId, router]);

  const document = isDraft ? draftDocument(detail) : detail.document;
  const supplierWhatsapp = whatsappDigits(detail.supplier.phone_display);
  const shareMessage = shareUrl
    ? `RENZ Construction Services Ltd — Purchase order ${order.purchase_order_number ?? ""} for ${formatMoney(money.total, order.currency)}${order.expected_delivery_date ? `, delivery expected ${formatDate(order.expected_delivery_date)}` : ""}. View and download it here: ${shareUrl}`
    : "";
  const mailto =
    shareUrl && detail.supplier.email
      ? `mailto:${detail.supplier.email}?subject=${encodeURIComponent(`Purchase order ${order.purchase_order_number ?? ""} from RENZ Construction Services Ltd`)}&body=${encodeURIComponent(shareMessage)}`
      : null;
  const whatsapp =
    shareUrl && supplierWhatsapp
      ? `https://wa.me/${supplierWhatsapp}?text=${encodeURIComponent(shareMessage)}`
      : null;
  const linkedRequirements = detail.lines.filter((line) => line.requirement !== null);

  return (
    <div className="invoice-command-center po-command-center admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Purchase order{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{label}</h1>
          <p className="page-description">
            <Link href={`/admin/procurement/suppliers/${detail.supplier.id}`}>
              {detail.supplier.display_name}
            </Link>{" "}
            ·{" "}
            <Link href={`/admin/operations/projects/${detail.project.id}`}>
              {detail.project.title}
            </Link>{" "}
            · <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </p>
          <p className="page-meta">
            <span>{order.currency}</span>
            <span>Total {formatMoney(money.total, order.currency)}</span>
            <span>
              Received {formatQuantity(money.received_quantity)} /{" "}
              {formatQuantity(money.ordered_quantity)}
            </span>
            <span>Expected {formatDate(order.expected_delivery_date)}</span>
          </p>
        </div>
        <div className="page-actions">
          {order.purchase_order_number ? (
            <CopyButton label="Copy number" value={order.purchase_order_number} />
          ) : null}
          {isDraft && permissions.write ? (
            <Link
              className="button button-secondary"
              href={`/admin/procurement/orders/${order.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
          <Link
            className="button button-quiet"
            href={`/admin/procurement/orders/${order.id}/print`}
          >
            {isDraft ? "Preview" : "View / Print"}
          </Link>
          {!isDraft ? (
            <a className="button button-quiet" href={`/admin/procurement/orders/${order.id}/pdf`}>
              Download PDF
            </a>
          ) : null}
          {isDraft && permissions.issue ? (
            <Button onClick={() => setDialog("issue")} tone="primary" type="button">
              Issue Purchase Order
            </Button>
          ) : null}
          {isIssued && permissions.receipts && remainingToReceive > 0 ? (
            <Button onClick={() => setDialog("receipt")} tone="primary" type="button">
              Record Delivery
            </Button>
          ) : null}
          {permissions.write ? (
            <form action={duplicateAction}>
              <input name="orderId" type="hidden" value={order.id} />
              <Button disabled={duplicatePending} tone="quiet" type="submit">
                {duplicatePending ? "Duplicating…" : "Duplicate as new draft"}
              </Button>
            </form>
          ) : null}
          {isIssued && permissions.issue ? (
            <Button onClick={() => setDialog("close")} tone="secondary" type="button">
              Close Order
            </Button>
          ) : null}
          {isIssued && permissions.issue && !hasEffectiveReceipts ? (
            <Button onClick={() => setDialog("cancel")} tone="danger" type="button">
              Cancel Order
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
          expectedDelivery={order.expected_delivery_date}
          lineCount={detail.lines.length}
          onClose={() => setDialog(null)}
          orderId={order.id}
          pending={issuePending}
          state={issueState}
          version={latestVersion}
        />
      ) : null}

      {dialog === "cancel" ? (
        <ReasonDialog
          action={cancelAction}
          confirmLabel="Confirm cancellation"
          description="A cancelled purchase order keeps its number and history but nothing may be delivered against it. Orders with recorded deliveries cannot be cancelled — reverse the receipts first or close the order instead."
          headingId="cancel-heading"
          onClose={() => setDialog(null)}
          orderId={order.id}
          pending={cancelPending}
          pendingLabel="Cancelling…"
          state={cancelState}
          title={`Cancel ${label}?`}
          tone="danger"
          version={latestVersion}
        />
      ) : null}

      {dialog === "close" ? (
        <ReasonDialog
          action={closeAction}
          confirmLabel="Confirm close"
          description={
            remainingToReceive > 0
              ? `Closing records that no further delivery is expected. ${formatQuantity(money.remaining_quantity)} remain undelivered and will stay that way — note the reason (short delivery, substitution, etc.).`
              : "Everything has been received. Closing marks the order complete; nothing else changes."
          }
          headingId="close-heading"
          onClose={() => setDialog(null)}
          orderId={order.id}
          pending={closePending}
          pendingLabel="Closing…"
          state={closeState}
          title={`Close ${label}?`}
          tone="primary"
          version={latestVersion}
        />
      ) : null}

      {dialog === "receipt" ? (
        <ReceiptDialog
          action={receiptAction}
          lines={detail.lines}
          onClose={() => setDialog(null)}
          orderId={order.id}
          pending={receiptPending}
          state={receiptState}
        />
      ) : null}

      <nav aria-label="Purchase order sections" className="record-tabs">
        {(["document", "deliveries", "requirements", "share", "activity"] as const).map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tab === "document"
              ? "Document"
              : tab === "deliveries"
                ? "Deliveries"
                : tab === "requirements"
                  ? "Material requirements"
                  : tab === "share"
                    ? "Supplier link"
                    : "Activity"}
          </button>
        ))}
      </nav>

      {section === "document" ? (
        <div className="invoice-document-host">
          {order.lifecycle_state === "cancelled" && order.cancel_reason ? (
            <Alert tone="warning">
              <p>
                Cancelled {order.cancelled_at ? formatDateTime(order.cancelled_at) : ""} —{" "}
                {order.cancel_reason}
              </p>
            </Alert>
          ) : null}
          {order.lifecycle_state === "closed" && order.close_reason ? (
            <Alert tone="info">
              <p>
                Closed {order.closed_at ? formatDateTime(order.closed_at) : ""} —{" "}
                {order.close_reason}
              </p>
            </Alert>
          ) : null}
          {money.is_delayed ? (
            <Alert tone="warning">
              <p>
                Delivery is delayed: expected {formatDate(order.expected_delivery_date)} with{" "}
                {formatQuantity(money.remaining_quantity)} still outstanding.
              </p>
            </Alert>
          ) : null}
          {document ? (
            <PurchaseOrderDocumentView document={document} />
          ) : (
            <Alert tone="danger">
              <p>The issued document could not be loaded.</p>
            </Alert>
          )}
          {isDraft && detail.lines.length === 0 ? (
            <Alert tone="info">
              <p>Add at least one line before this draft can be issued.</p>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {section === "deliveries" ? (
        <div className="notes-workspace">
          {!isIssued && order.lifecycle_state !== "closed" ? (
            <p className="quiet-empty">
              {isDraft
                ? "Deliveries can be recorded once the purchase order is issued."
                : "No deliveries can be recorded against a cancelled order."}
            </p>
          ) : null}
          <dl className="metric-register invoice-money-register">
            <div>
              <dt>Ordered</dt>
              <dd>{formatQuantity(money.ordered_quantity)}</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{formatQuantity(money.received_quantity)}</dd>
            </div>
            <div className={money.is_delayed ? "metric-attention" : undefined}>
              <dt>Remaining</dt>
              <dd>{formatQuantity(money.remaining_quantity)}</dd>
            </div>
            <div>
              <dt>Delivery state</dt>
              <dd>{deliveryStateLabels[money.delivery_state]}</dd>
            </div>
          </dl>
          <h3>Per line</h3>
          <ol className="po-line-progress">
            {detail.lines.map((line) => (
              <li key={line.id}>
                <span>{line.description}</span>
                <span data-label="Ordered">
                  {formatQuantity(line.quantity)} {line.unit_label}
                </span>
                <span data-label="Received">{formatQuantity(line.received_quantity)}</span>
                <span
                  className={
                    Number.parseFloat(String(line.remaining_quantity)) > 0 && isIssued
                      ? "metric-attention"
                      : undefined
                  }
                  data-label="Remaining"
                >
                  {formatQuantity(line.remaining_quantity)}
                </span>
              </li>
            ))}
          </ol>
          {reverseState.status === "error" ? (
            <Alert live tone="danger">
              <p>{reverseState.message}</p>
            </Alert>
          ) : null}
          <h3>Receipts</h3>
          {detail.receipts.length === 0 ? (
            <p className="quiet-empty">No deliveries recorded.</p>
          ) : (
            <ul className="activity-list payment-list">
              {detail.receipts.map((receipt) => (
                <li
                  className={receipt.reversed_at ? "payment-reversed" : undefined}
                  key={receipt.id}
                >
                  <div>
                    <strong>
                      Delivery {formatDate(receipt.received_at)}
                      {receipt.delivery_reference ? ` · Ref ${receipt.delivery_reference}` : ""}
                      {receipt.reversed_at ? " · Reversed" : ""}
                    </strong>
                    <span>
                      {receipt.items
                        .map((item) =>
                          `${formatQuantity(item.quantity_received)} ${item.unit_label ?? ""} ${item.description}`.trim(),
                        )
                        .join(" · ")}
                    </span>
                    <span>
                      Recorded {formatDateTime(receipt.created_at)}
                      {receipt.received_by ? ` by ${receipt.received_by}` : ""}
                    </span>
                    {receipt.note ? <span>{receipt.note}</span> : null}
                    {receipt.reversed_at ? (
                      <span>
                        Reversed {formatDateTime(receipt.reversed_at)}
                        {receipt.reversed_by ? ` by ${receipt.reversed_by}` : ""} —{" "}
                        {receipt.reversal_reason}
                      </span>
                    ) : null}
                  </div>
                  <div className="payment-actions">
                    {permissions.receipts && !receipt.reversed_at && isIssued ? (
                      reversing === receipt.id ? (
                        <form action={reverseAction} className="admin-form inline-form">
                          <input name="receiptId" type="hidden" value={receipt.id} />
                          <Field
                            error={reverseState.fieldErrors["reason"]}
                            id={`reverse-${receipt.id}`}
                            label="Reversal reason"
                          >
                            <input
                              id={`reverse-${receipt.id}`}
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
                        <Button onClick={() => setReversing(receipt.id)} tone="quiet" type="button">
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

      {section === "requirements" ? (
        <div className="notes-workspace">
          {linkedRequirements.length === 0 ? (
            <p className="quiet-empty">
              No lines on this order are linked to a project material requirement.
            </p>
          ) : (
            <ol className="po-line-progress">
              {linkedRequirements.map((line) => (
                <li key={line.id}>
                  <span>
                    <Link href={`/admin/operations/projects/${detail.project.id}?tab=procurement`}>
                      {line.requirement?.item_name}
                    </Link>
                    {" ← "}
                    {line.description}
                    {line.over_order_confirmed ? " · over-order confirmed" : ""}
                  </span>
                  <span data-label="Required">
                    {line.requirement ? formatQuantity(line.requirement.required_quantity) : "—"}{" "}
                    {line.requirement?.unit_label}
                  </span>
                  <span data-label="On this order">{formatQuantity(line.quantity)}</span>
                  <span data-label="Received here">{formatQuantity(line.received_quantity)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="field-help">
            Requirement totals (ordered across all issued orders, received, remaining) live on the
            project&apos;s Procurement tab.
          </p>
        </div>
      ) : null}

      {section === "share" ? (
        <div className="notes-workspace">
          {isDraft ? (
            <p className="quiet-empty">Supplier links are generated once the order is issued.</p>
          ) : null}
          <p>
            A supplier link opens a read-only copy of this purchase order with print and PDF — no
            login required. Anyone holding the link can view this one order (and its cancelled or
            closed state), so share it only with the supplier, and revoke it if it leaks. Internal
            notes and requirement links are never included.
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
              <StatusBadge tone="neutral">Supplier link not generated</StatusBadge>
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
                    Email Order
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
          {!isDraft && permissions.write ? (
            <div className="form-actions">
              <form action={shareAction}>
                <input name="orderId" type="hidden" value={order.id} />
                <Button disabled={sharePending} tone="primary" type="submit">
                  {sharePending
                    ? "Generating…"
                    : detail.share
                      ? "Regenerate Link"
                      : "Generate Supplier Link"}
                </Button>
              </form>
              {detail.share ? (
                <form action={revokeAction}>
                  <input name="orderId" type="hidden" value={order.id} />
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
                const quantity =
                  typeof meta["quantity"] === "number" || typeof meta["quantity"] === "string"
                    ? meta["quantity"]
                    : null;
                return (
                  <li key={`${entry.action}-${index}`}>
                    <div>
                      <strong>
                        {procurementActivityLabels[entry.action] ?? "Administrative event"}
                        {quantity !== null ? ` · ${formatQuantity(quantity)}` : ""}
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
  orderId,
  version,
  expectedDelivery,
  lineCount,
  action,
  state,
  pending,
  onClose,
}: Readonly<{
  orderId: string;
  version: number;
  expectedDelivery: string | null;
  lineCount: number;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  onClose: () => void;
}>) {
  return (
    <section aria-labelledby="issue-heading" className="admin-panel dialog-panel">
      <h2 id="issue-heading">Issue this purchase order</h2>
      <p>
        Issuing assigns the next official RENZ-PO number, freezes the supplier and project details,
        lines, tax and totals, and makes the order shareable with the supplier. It cannot be edited
        afterwards — only cancelled, closed, or duplicated as a new draft.
      </p>
      {lineCount === 0 ? (
        <Alert tone="warning">
          <p>This draft has no lines. Add at least one line before issuing.</p>
        </Alert>
      ) : null}
      <form action={action} className="admin-form">
        <input name="orderId" type="hidden" value={orderId} />
        <input name="expectedVersion" type="hidden" value={version} />
        <div className="field-grid field-grid-two">
          <Field error={state.fieldErrors["issueDate"]} id="issueDateConfirm" label="Issue date">
            <input
              defaultValue={today()}
              id="issueDateConfirm"
              name="issueDate"
              required
              type="date"
            />
          </Field>
          <Field
            error={state.fieldErrors["expectedDeliveryDate"]}
            hint="Optional, but needed for the delayed state."
            id="expectedDeliveryConfirm"
            label="Expected delivery"
          >
            <input
              defaultValue={expectedDelivery ?? ""}
              id="expectedDeliveryConfirm"
              name="expectedDeliveryDate"
              type="date"
            />
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
          <Button disabled={pending || lineCount === 0} tone="primary" type="submit">
            {pending ? "Issuing…" : "Confirm and issue"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ReasonDialog({
  orderId,
  version,
  headingId,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone,
  action,
  state,
  pending,
  onClose,
}: Readonly<{
  orderId: string;
  version: number;
  headingId: string;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  tone: "primary" | "danger";
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  onClose: () => void;
}>) {
  return (
    <section aria-labelledby={headingId} className="admin-panel dialog-panel">
      <h2 id={headingId}>{title}</h2>
      <p>{description}</p>
      <form action={action} className="admin-form">
        <input name="orderId" type="hidden" value={orderId} />
        <input name="expectedVersion" type="hidden" value={version} />
        <Field error={state.fieldErrors["reason"]} id={`${headingId}-reason`} label="Reason">
          <textarea id={`${headingId}-reason`} maxLength={1000} name="reason" required rows={3} />
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
          <Button disabled={pending} tone={tone} type="submit">
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ReceiptDialog({
  orderId,
  lines,
  action,
  state,
  pending,
  onClose,
}: Readonly<{
  orderId: string;
  lines: PoDetail["lines"];
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  onClose: () => void;
}>) {
  const openLines = lines.filter((line) => Number.parseFloat(String(line.remaining_quantity)) > 0);
  const [entered, setEntered] = useState<Readonly<Record<string, string>>>({});
  const overReceipt = openLines.some((line) => {
    const value = Number.parseFloat(entered[line.id] ?? "");
    return Number.isFinite(value) && value > Number.parseFloat(String(line.remaining_quantity));
  });
  const anyEntered = openLines.some((line) => Number.parseFloat(entered[line.id] ?? "") > 0);
  return (
    <section aria-labelledby="receipt-heading" className="admin-panel dialog-panel">
      <h2 id="receipt-heading">Record a delivery</h2>
      <p>
        Enter what actually arrived, per line. Partial deliveries are normal; a quantity above what
        is still outstanding is refused. Receipts are append-only — a mistaken receipt is reversed,
        never edited.
      </p>
      <form action={action} className="admin-form">
        <input name="orderId" type="hidden" value={orderId} />
        <div className="field-grid field-grid-two">
          <Field error={state.fieldErrors["receivedAt"]} id="receivedAt" label="Delivery date">
            <input defaultValue={today()} id="receivedAt" name="receivedAt" required type="date" />
          </Field>
          <Field
            error={state.fieldErrors["reference"]}
            hint="Delivery note or waybill number."
            id="receiptReference"
            label="Delivery reference"
          >
            <input id="receiptReference" maxLength={120} name="reference" type="text" />
          </Field>
        </div>
        {state.fieldErrors["items"] ? (
          <Alert live tone="danger">
            <p>{state.fieldErrors["items"]}</p>
          </Alert>
        ) : null}
        <ol className="receipt-line-editor">
          {openLines.map((line) => {
            const remaining = Number.parseFloat(String(line.remaining_quantity));
            const value = Number.parseFloat(entered[line.id] ?? "");
            const tooMuch = Number.isFinite(value) && value > remaining;
            return (
              <li key={line.id}>
                <div>
                  <strong>{line.description}</strong>
                  <span>
                    Outstanding {formatQuantity(line.remaining_quantity)} {line.unit_label} of{" "}
                    {formatQuantity(line.quantity)}
                  </span>
                </div>
                <Field
                  error={
                    tooMuch ? `At most ${formatQuantity(remaining)} can be received.` : undefined
                  }
                  id={`received-${line.id}`}
                  label={`Received (${line.unit_label})`}
                >
                  <div className="inline-picker-row">
                    <input
                      id={`received-${line.id}`}
                      inputMode="decimal"
                      max={remaining}
                      min="0"
                      name={`received[${line.id}]`}
                      onChange={(event) =>
                        setEntered((current) => ({ ...current, [line.id]: event.target.value }))
                      }
                      step="0.001"
                      type="number"
                      value={entered[line.id] ?? ""}
                    />
                    <Button
                      onClick={() =>
                        setEntered((current) => ({
                          ...current,
                          [line.id]: String(line.remaining_quantity),
                        }))
                      }
                      tone="quiet"
                      type="button"
                    >
                      All outstanding
                    </Button>
                  </div>
                </Field>
              </li>
            );
          })}
        </ol>
        <Field
          error={state.fieldErrors["note"]}
          hint="Internal — never shown to the supplier."
          id="receiptNote"
          label="Note"
        >
          <textarea id="receiptNote" maxLength={2000} name="note" rows={2} />
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
          <Button disabled={pending || overReceipt || !anyEntered} tone="primary" type="submit">
            {pending ? "Recording…" : "Record delivery"}
          </Button>
        </div>
      </form>
    </section>
  );
}
