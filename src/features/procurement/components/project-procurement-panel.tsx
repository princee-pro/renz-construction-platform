"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { formatMoney, formatQuantity } from "@/features/invoices/invoice-contract";
import { RequirementForm } from "@/features/procurement/components/requirement-form";
import {
  approvalStateLabels,
  approvalStateTone,
  procurementStateLabels,
  procurementStateTone,
  purchaseOrderStatus,
  requirementPriorityLabels,
  type ProjectProcurement,
  type RequirementRow,
} from "@/features/procurement/procurement-contract";

function shortDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function isDueSoon(requiredBy: string | null, windowDays: number): boolean {
  if (!requiredBy) return false;
  const today = new Date();
  const due = new Date(`${requiredBy}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diff = (due.getTime() - start) / 86_400_000;
  return diff >= 0 && diff <= windowDays;
}

/**
 * Procurement tab of the Project Command Center: material requirements with
 * Required / Ordered / Received / Remaining, the project's purchase orders,
 * and ordered value by currency (never combined across currencies).
 */
export function ProjectProcurementPanel({
  data,
  projectId,
  permissions,
}: Readonly<{
  data: ProjectProcurement | null;
  projectId: string;
  permissions: Readonly<{ materialsWrite: boolean; ordersWrite: boolean; ordersRead: boolean }>;
}>) {
  const router = useRouter();
  const [editor, setEditor] = useState<"add" | RequirementRow | null>(null);
  if (!data) {
    return <p className="quiet-empty">Procurement could not be loaded for this project.</p>;
  }
  const close = () => setEditor(null);
  const saved = () => {
    setEditor(null);
    router.refresh();
  };

  return (
    <div className="notes-workspace project-procurement">
      <div className="form-actions form-actions-start">
        {permissions.materialsWrite ? (
          <Button
            onClick={() => setEditor(editor === "add" ? null : "add")}
            tone="secondary"
            type="button"
          >
            Add Requirement
          </Button>
        ) : null}
        {permissions.ordersWrite ? (
          <Link
            className="button button-primary"
            href={`/admin/procurement/orders/new?project=${projectId}`}
          >
            Create Purchase Order
          </Link>
        ) : null}
      </div>

      {editor === "add" ? (
        <RequirementForm onClose={close} onSaved={saved} projectId={projectId} />
      ) : null}

      <dl className="metric-register">
        <div>
          <dt>Requirements</dt>
          <dd>{data.summary.requirement_count}</dd>
        </div>
        <div>
          <dt>Fully received</dt>
          <dd>{data.summary.received_requirement_count}</dd>
        </div>
        <div>
          <dt>Open orders</dt>
          <dd>{data.summary.open_order_count}</dd>
        </div>
        <div className={data.summary.delayed_order_count > 0 ? "metric-attention" : undefined}>
          <dt>Delayed orders</dt>
          <dd>{data.summary.delayed_order_count}</dd>
        </div>
      </dl>

      {data.ordered_value_by_currency.length > 0 ? (
        <div className="relationship-finance-grid">
          {data.ordered_value_by_currency.map((row) => (
            <dl className="metric-register invoice-money-register" key={row.currency}>
              <div>
                <dt>{row.currency} ordered (issued + closed)</dt>
                <dd>{formatMoney(row.total, row.currency)}</dd>
              </div>
              <div>
                <dt>Orders</dt>
                <dd>{row.order_count}</dd>
              </div>
            </dl>
          ))}
        </div>
      ) : null}

      <section aria-labelledby="requirements-heading">
        <div className="section-heading-row">
          <h3 id="requirements-heading">Material requirements</h3>
        </div>
        {data.requirements.length === 0 ? (
          <p className="quiet-empty">
            No material requirements yet. Requirements describe what the project needs; approved
            ones can be placed on purchase orders.
          </p>
        ) : (
          <ol className="requirement-list">
            {data.requirements.map((row) => {
              const dueSoon =
                row.approval_state === "approved" &&
                Number.parseFloat(String(row.remaining_to_order)) > 0 &&
                isDueSoon(row.required_by, data.due_soon_window_days);
              return (
                <li
                  className={
                    row.approval_state === "cancelled" ? "requirement-cancelled" : undefined
                  }
                  key={row.id}
                >
                  <div className="requirement-identity">
                    <strong>{row.item_name}</strong>
                    <span>
                      {row.material ? (
                        <Link href={`/admin/procurement/materials/${row.material.id}`}>
                          {row.material.internal_code ?? row.material.name}
                        </Link>
                      ) : (
                        "Free text"
                      )}
                      {" · "}
                      {requirementPriorityLabels[row.priority]} priority
                      {row.required_by ? ` · Required ${shortDate(row.required_by)}` : ""}
                    </span>
                    {row.specification ? <span>{row.specification}</span> : null}
                  </div>
                  <span data-label="Required">
                    {formatQuantity(row.required_quantity)} {row.unit_label}
                  </span>
                  <span data-label="Ordered">{formatQuantity(row.ordered_quantity)}</span>
                  <span data-label="Received">{formatQuantity(row.received_quantity)}</span>
                  <span
                    className={
                      Number.parseFloat(String(row.remaining_to_receive)) > 0
                        ? "metric-attention"
                        : undefined
                    }
                    data-label="Remaining"
                  >
                    {formatQuantity(row.remaining_to_receive)}
                  </span>
                  <span className="badge-stack" data-label="State">
                    <StatusBadge tone={approvalStateTone(row.approval_state)}>
                      {approvalStateLabels[row.approval_state]}
                    </StatusBadge>
                    {row.approval_state !== "cancelled" ? (
                      <StatusBadge tone={procurementStateTone(row.procurement_state)}>
                        {procurementStateLabels[row.procurement_state]}
                      </StatusBadge>
                    ) : null}
                    {dueSoon ? <StatusBadge tone="blocked">Due soon</StatusBadge> : null}
                  </span>
                  <span className="requirement-actions">
                    {permissions.materialsWrite && row.approval_state !== "cancelled" ? (
                      <Button
                        onClick={() =>
                          setEditor(editor !== "add" && editor?.id === row.id ? null : row)
                        }
                        tone="quiet"
                        type="button"
                      >
                        Edit
                      </Button>
                    ) : null}
                    {permissions.ordersWrite &&
                    row.approval_state === "approved" &&
                    Number.parseFloat(String(row.remaining_to_order)) > 0 ? (
                      <Link
                        className="text-link"
                        href={`/admin/procurement/orders/new?project=${projectId}&requirement=${row.id}`}
                      >
                        Order
                      </Link>
                    ) : null}
                  </span>
                  {editor !== "add" && editor?.id === row.id ? (
                    <div className="requirement-editor">
                      <RequirementForm
                        onClose={close}
                        onSaved={saved}
                        projectId={projectId}
                        requirement={row}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {permissions.ordersRead ? (
        <section aria-labelledby="project-orders-heading">
          <div className="section-heading-row">
            <h3 id="project-orders-heading">Purchase orders</h3>
          </div>
          {data.purchase_orders.length === 0 ? (
            <p className="quiet-empty">No purchase orders for this project yet.</p>
          ) : (
            <ol className="relationship-invoice-list">
              {data.purchase_orders.map((order) => {
                const status = purchaseOrderStatus(order);
                return (
                  <li key={order.id}>
                    <div>
                      <Link href={`/admin/procurement/orders/${order.id}`}>
                        {order.purchase_order_number ?? "DRAFT"}
                      </Link>
                      <span>
                        <Link href={`/admin/procurement/suppliers/${order.supplier.id}`}>
                          {order.supplier.display_name}
                        </Link>
                        {order.issue_date ? ` · Issued ${shortDate(order.issue_date)}` : ""}
                        {order.expected_delivery_date
                          ? ` · Expected ${shortDate(order.expected_delivery_date)}`
                          : ""}
                      </span>
                    </div>
                    <span data-label="Total">{formatMoney(order.total, order.currency)}</span>
                    <span data-label="Ordered">{formatQuantity(order.ordered_quantity)}</span>
                    <span data-label="Received">{formatQuantity(order.received_quantity)}</span>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
