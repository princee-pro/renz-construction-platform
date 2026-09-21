"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { useRecordRecentlyViewed } from "@/features/admin-shared/use-record-recently-viewed";
import { formatMoney, formatQuantity } from "@/features/invoices/invoice-contract";
import { archiveMaterialAction } from "@/features/procurement/procurement-actions";
import {
  poLifecycleLabels,
  procurementActivityLabels,
  type MaterialDetail,
} from "@/features/procurement/procurement-contract";

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

export function Material360({
  detail,
  canWrite,
}: Readonly<{ detail: MaterialDetail; canWrite: boolean }>) {
  const { connectionState } = useAdminRealtimeInvalidation(["material"]);
  const [dialog, setDialog] = useState<"archive" | null>(null);
  const [archiveState, archiveAction, archivePending] = useActionState(
    guardAction(archiveMaterialAction),
    initialAdminActionState,
  );
  const material = detail.material;
  useRecordRecentlyViewed({
    kind: "material",
    id: material.id,
    label: material.name,
    href: `/admin/procurement/materials/${material.id}`,
  });
  const latestVersion = Math.max(material.version, archiveState.currentVersion ?? 0);

  return (
    <div className="material-360 admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Material{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{material.name}</h1>
          <p className="page-description">
            {material.internal_code ?? "No internal code"}
            {material.category ? ` · ${material.category}` : ""} · {material.default_unit} ·{" "}
            <StatusBadge
              tone={material.archived_at ? "archived" : material.active ? "ready" : "neutral"}
            >
              {material.archived_at ? "Archived" : material.active ? "Active" : "Inactive"}
            </StatusBadge>
          </p>
          <p className="page-meta">
            <span>
              Preferred supplier:{" "}
              {material.preferred_supplier ? (
                <Link href={`/admin/procurement/suppliers/${material.preferred_supplier.id}`}>
                  {material.preferred_supplier.display_name}
                </Link>
              ) : (
                "none"
              )}
            </span>
            <span>Updated {formatDate(material.updated_at)}</span>
          </p>
        </div>
        <div className="page-actions">
          {canWrite && !material.archived_at ? (
            <Link
              className="button button-secondary"
              href={`/admin/procurement/materials/${material.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
          {canWrite && !material.archived_at ? (
            <Button onClick={() => setDialog("archive")} tone="danger" type="button">
              Archive
            </Button>
          ) : null}
        </div>
      </header>

      {dialog === "archive" ? (
        <section aria-labelledby="archive-material-heading" className="admin-panel dialog-panel">
          <h2 id="archive-material-heading">Archive {material.name}?</h2>
          <p>
            Archived materials leave the pickers. Existing requirements and purchase order lines
            keep their reference; nothing is deleted.
          </p>
          <form action={archiveAction}>
            <input name="materialId" type="hidden" value={material.id} />
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

      <div className="record-grid">
        <section className="admin-panel">
          <h2>Specification</h2>
          {material.specification ? (
            <p className="prewrap">{material.specification}</p>
          ) : (
            <p className="quiet-empty">No specification recorded.</p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Recent purchase order lines</h2>
          {detail.recent_orders.length === 0 ? (
            <p className="quiet-empty">This material has not been ordered yet.</p>
          ) : (
            <ul className="activity-list">
              {detail.recent_orders.map((row, index) => (
                <li key={`${row.purchase_order_id}-${index}`}>
                  <div>
                    <strong>
                      <Link href={`/admin/procurement/orders/${row.purchase_order_id}`}>
                        {row.purchase_order_number ?? "Draft order"}
                      </Link>{" "}
                      · {formatQuantity(row.quantity)} {row.unit_label ?? material.default_unit} @{" "}
                      {formatMoney(row.unit_price, row.currency)}
                    </strong>
                    <span>
                      {row.supplier} · {poLifecycleLabels[row.lifecycle_state]}
                      {row.issue_date ? ` · Issued ${formatDate(row.issue_date)}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="admin-panel">
        <h2>Activity</h2>
        {detail.activity.length === 0 ? (
          <p className="quiet-empty">No activity yet.</p>
        ) : (
          <ul className="activity-list">
            {detail.activity.map((entry, index) => (
              <li key={`${entry.action}-${index}`}>
                <div>
                  <strong>
                    {procurementActivityLabels[entry.action] ?? "Administrative event"}
                  </strong>
                  <span>
                    {formatDateTime(entry.occurred_at)}
                    {entry.actor ? ` · ${entry.actor}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
