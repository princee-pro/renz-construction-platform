"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { CopyButton } from "@/components/admin/ui/copy-button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { useRecordRecentlyViewed } from "@/features/admin-shared/use-record-recently-viewed";
import { formatMoney } from "@/features/invoices/invoice-contract";
import {
  addPartnerCapabilityAction,
  archivePartnerAction,
} from "@/features/partners/partner-actions";
import {
  assignmentStatusLabels,
  availabilityLabels,
  partnerActivityLabels,
  partnerCapabilityLabels,
  ratingLabel,
  type PartnerCapability,
  type PartnerDetail,
} from "@/features/partners/partner-contract";

type Section =
  "overview" | "assignments" | "orders" | "finance" | "performance" | "activity" | "notes";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );
}

function whatsappHrefFor(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/gu, "");
  return digits.length >= 10 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

/** Contractor 360 / Supplier 360 — one component, sections chosen by the viewing capability. */
export function Partner360({
  detail,
  view,
  canWrite,
  canAssign,
  canOrder,
}: Readonly<{
  detail: PartnerDetail;
  view: PartnerCapability;
  canWrite: boolean;
  canAssign: boolean;
  canOrder: boolean;
}>) {
  const { connectionState } = useAdminRealtimeInvalidation([
    "trade_partner",
    "contractor_assignment",
    "purchase_order",
  ]);
  const partner = detail.partner;
  const isContractorView = view === "contractor";
  const base = isContractorView ? "/admin/operations/contractors" : "/admin/procurement/suppliers";
  const [section, setSection] = useState<Section>("overview");
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiveState, archiveAction, archivePending] = useActionState(
    archivePartnerAction,
    initialAdminActionState,
  );
  const [capabilityState, capabilityAction, capabilityPending] = useActionState(
    addPartnerCapabilityAction,
    initialAdminActionState,
  );
  const latestVersion = Math.max(
    partner.version,
    archiveState.currentVersion ?? 0,
    capabilityState.currentVersion ?? 0,
  );
  const whatsapp = whatsappHrefFor(partner.phone_display);
  const missingCapability = (["contractor", "supplier"] as const).find(
    (c) => !partner.capabilities.includes(c),
  );

  useRecordRecentlyViewed({
    kind: isContractorView ? "contractor" : "supplier",
    id: partner.id,
    label: partner.display_name,
    href: `${base}/${partner.id}`,
  });

  const tabs: readonly Section[] = isContractorView
    ? ["overview", "assignments", "finance", "performance", "activity", "notes"]
    : ["overview", "orders", "activity", "notes"];
  const tabLabel: Readonly<Record<Section, string>> = {
    overview: "Overview",
    assignments: "Assignments",
    orders: "Purchase orders",
    finance: "Finance",
    performance: "Performance",
    activity: "Activity",
    notes: "Notes",
  };

  return (
    <div className="partner-360 admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {isContractorView ? "Contractor" : "Supplier"}{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{partner.display_name}</h1>
          <p className="page-description">
            {partner.company_name ?? "No company"} ·{" "}
            {partner.capabilities.map((c) => (
              <StatusBadge key={c} tone="neutral">
                {partnerCapabilityLabels[c]}
              </StatusBadge>
            ))}{" "}
            {isContractorView ? (
              <StatusBadge
                tone={
                  partner.availability_status === "available"
                    ? "ready"
                    : partner.availability_status === "busy"
                      ? "review"
                      : "blocked"
                }
              >
                {availabilityLabels[partner.availability_status]}
              </StatusBadge>
            ) : null}{" "}
            {partner.archived_at ? <StatusBadge tone="archived">Archived</StatusBadge> : null}
          </p>
          <p className="page-meta">
            {isContractorView ? (
              <>
                <span>
                  {partner.specializations.length > 0
                    ? partner.specializations.join(", ")
                    : "No specializations recorded"}
                </span>
                <span>
                  Performance{" "}
                  {partner.performance.rated_count
                    ? `${ratingLabel(partner.performance.average_rating)} · ${partner.performance.rated_count} rated`
                    : "not yet rated"}
                </span>
                <span>
                  {partner.active_assignment_count} active assignment
                  {partner.active_assignment_count === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <>
                <span>
                  {partner.open_order_count} open order{partner.open_order_count === 1 ? "" : "s"}
                </span>
                <span>{partner.contact_name ?? "No contact person"}</span>
              </>
            )}
          </p>
        </div>
        <div className="page-actions">
          {partner.email ? (
            <>
              <a className="button button-quiet" href={`mailto:${partner.email}`}>
                Email
              </a>
              <CopyButton label="Copy email" value={partner.email} />
            </>
          ) : null}
          {partner.phone_display ? (
            <CopyButton label="Copy phone" value={partner.phone_display} />
          ) : null}
          {whatsapp ? (
            <a className="button button-quiet" href={whatsapp} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
          {canWrite && !partner.archived_at ? (
            <Link className="button button-secondary" href={`${base}/${partner.id}/edit`}>
              Edit
            </Link>
          ) : null}
          {isContractorView && canAssign && !partner.archived_at ? (
            <Link
              className="button button-primary"
              href={`/admin/operations/assignments/new?partner=${partner.id}`}
            >
              Assign to project
            </Link>
          ) : null}
          {!isContractorView && canOrder && !partner.archived_at ? (
            <Link
              className="button button-primary"
              href={`/admin/procurement/orders/new?supplier=${partner.id}`}
            >
              New purchase order
            </Link>
          ) : null}
          {canWrite && !partner.archived_at ? (
            <Button onClick={() => setConfirmingArchive(true)} tone="danger" type="button">
              Archive
            </Button>
          ) : null}
        </div>
      </header>

      {canWrite && !partner.archived_at && missingCapability ? (
        <form action={capabilityAction} className="capability-offer">
          <input name="partnerId" type="hidden" value={partner.id} />
          <input name="expectedVersion" type="hidden" value={latestVersion} />
          <input name="capability" type="hidden" value={missingCapability} />
          <p>
            This partner is currently a{" "}
            {partner.capabilities
              .map((c) => partnerCapabilityLabels[c].toLowerCase())
              .join(" and ")}{" "}
            only. If the same business also{" "}
            {missingCapability === "supplier" ? "supplies materials" : "carries out contract work"},
            add the capability instead of creating a second record.
          </p>
          <Button disabled={capabilityPending} tone="secondary" type="submit">
            {capabilityPending
              ? "Adding…"
              : `Add ${partnerCapabilityLabels[missingCapability].toLowerCase()} capability`}
          </Button>
          {capabilityState.status === "error" || capabilityState.status === "conflict" ? (
            <Alert live tone="danger">
              <p>{capabilityState.message}</p>
            </Alert>
          ) : null}
        </form>
      ) : null}

      {confirmingArchive ? (
        <section aria-labelledby="archive-partner-heading" className="admin-panel dialog-panel">
          <h2 id="archive-partner-heading">Archive {partner.display_name}?</h2>
          <p>
            Archived partners keep their assignments, payments and purchase orders in history but
            cannot be assigned or ordered from. Active assignments and open orders must be resolved
            first.
          </p>
          <form action={archiveAction}>
            <input name="partnerId" type="hidden" value={partner.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
            {archiveState.status === "error" || archiveState.status === "conflict" ? (
              <Alert live tone="danger">
                <p>{archiveState.message}</p>
              </Alert>
            ) : null}
            <div className="form-actions">
              <Button onClick={() => setConfirmingArchive(false)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={archivePending} tone="danger" type="submit">
                {archivePending ? "Archiving…" : "Confirm archive"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <nav aria-label="Partner sections" className="record-tabs">
        {tabs.map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tabLabel[tab]}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <dl className="definition-register">
          <div>
            <dt>Contact person</dt>
            <dd>{partner.contact_name ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{partner.email ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{partner.phone_display ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{partner.address ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Capabilities</dt>
            <dd>{partner.capabilities.map((c) => partnerCapabilityLabels[c]).join(" + ")}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(partner.created_at)}</dd>
          </div>
        </dl>
      ) : null}

      {section === "assignments" ? (
        <div className="notes-workspace">
          {detail.assignments.length === 0 ? (
            <p className="quiet-empty">
              No assignments yet. Assign this contractor from a project's Contractors tab.
            </p>
          ) : (
            <ol className="relationship-invoice-list">
              {detail.assignments.map((assignment) => (
                <li key={assignment.id}>
                  <div>
                    <Link href={`/admin/operations/assignments/${assignment.id}`}>
                      {assignment.scope}
                    </Link>
                    <span>
                      <Link href={`/admin/operations/projects/${assignment.project.id}`}>
                        {assignment.project.title}
                      </Link>
                      {assignment.specialization ? ` · ${assignment.specialization}` : ""} ·{" "}
                      {formatDate(assignment.start_date)} → {formatDate(assignment.end_date)}
                    </span>
                  </div>
                  <span data-label="Agreed">
                    {assignment.currency
                      ? formatMoney(assignment.agreed_amount, assignment.currency)
                      : "—"}
                  </span>
                  <span data-label="Paid">
                    {assignment.currency
                      ? formatMoney(assignment.paid_amount, assignment.currency)
                      : "—"}
                  </span>
                  <span data-label="Remaining">
                    {assignment.currency && assignment.remaining_amount !== null
                      ? formatMoney(assignment.remaining_amount, assignment.currency)
                      : "—"}
                  </span>
                  <StatusBadge
                    tone={
                      assignment.status === "completed"
                        ? "ready"
                        : assignment.status === "cancelled"
                          ? "archived"
                          : "neutral"
                    }
                  >
                    {assignmentStatusLabels[assignment.status]}
                  </StatusBadge>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}

      {section === "orders" ? (
        <div className="notes-workspace">
          {detail.purchase_orders.length === 0 ? (
            <p className="quiet-empty">No purchase orders yet for this supplier.</p>
          ) : (
            <ol className="relationship-invoice-list">
              {detail.purchase_orders.map((po) => (
                <li key={po.id}>
                  <div>
                    <Link href={`/admin/procurement/orders/${po.id}`}>
                      {po.purchase_order_number ?? "DRAFT"}
                    </Link>
                    <span>
                      <Link href={`/admin/operations/projects/${po.project.id}`}>
                        {po.project.title}
                      </Link>{" "}
                      · Issued {formatDate(po.issue_date)} · Expected{" "}
                      {formatDate(po.expected_delivery_date)}
                    </span>
                  </div>
                  <span data-label="Total">{formatMoney(po.total, po.currency)}</span>
                  <span data-label="Delivery">{po.delivery_state.replaceAll("_", " ")}</span>
                  <span data-label="Lifecycle">{po.lifecycle_state}</span>
                  <StatusBadge
                    tone={
                      po.lifecycle_state === "issued"
                        ? "review"
                        : po.lifecycle_state === "closed"
                          ? "ready"
                          : "archived"
                    }
                  >
                    {po.lifecycle_state}
                  </StatusBadge>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}

      {section === "finance" ? (
        <div className="notes-workspace">
          {partner.outstanding_by_currency.length === 0 ? (
            <p className="quiet-empty">No funded assignments yet.</p>
          ) : (
            <div className="relationship-finance-grid">
              {partner.outstanding_by_currency.map((row) => (
                <dl className="metric-register invoice-money-register" key={row.currency}>
                  <div>
                    <dt>{row.currency} agreed</dt>
                    <dd>{formatMoney(row.agreed, row.currency)}</dd>
                  </div>
                  <div>
                    <dt>{row.currency} paid</dt>
                    <dd>{formatMoney(row.paid, row.currency)}</dd>
                  </div>
                  <div
                    className={
                      Number.parseFloat(String(row.remaining)) > 0 ? "metric-attention" : undefined
                    }
                  >
                    <dt>{row.currency} remaining</dt>
                    <dd>{formatMoney(row.remaining, row.currency)}</dd>
                  </div>
                </dl>
              ))}
            </div>
          )}
          <p className="field-help">
            Remaining balances are obligations against agreed amounts — never summed across
            currencies, and not overdue unless a payment schedule says so.
          </p>
          <Link
            className="text-link"
            href={`/admin/finance/contractor-payables?partner=${partner.id}`}
          >
            Open in Contractor Payables
          </Link>
        </div>
      ) : null}

      {section === "performance" ? (
        <div className="notes-workspace">
          <dl className="metric-register invoice-money-register">
            <div>
              <dt>Average rating</dt>
              <dd>
                {partner.performance.rated_count
                  ? ratingLabel(partner.performance.average_rating)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Rated assignments</dt>
              <dd>{partner.performance.rated_count ?? 0}</dd>
            </div>
          </dl>
          <p className="field-help">
            Derived from completed, rated assignments only. Private to RENZ staff.
          </p>
          {detail.rated_assignments.length === 0 ? (
            <p className="quiet-empty">
              No performance reviews yet. Completed assignments can be rated from the assignment
              page.
            </p>
          ) : (
            <ul className="activity-list">
              {detail.rated_assignments.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>
                      {ratingLabel(entry.performance_rating)} ·{" "}
                      <Link href={`/admin/operations/assignments/${entry.id}`}>{entry.scope}</Link>
                    </strong>
                    <span>
                      {entry.project.title}
                      {entry.performance_note ? ` — ${entry.performance_note}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {section === "activity" ? (
        <div className="notes-workspace">
          {detail.activity.length === 0 ? (
            <p className="quiet-empty">No activity yet.</p>
          ) : (
            <ul className="activity-list">
              {detail.activity.map((entry, index) => (
                <li key={`${entry.action}-${index}`}>
                  <div>
                    <strong>
                      {partnerActivityLabels[entry.action] ?? "Administrative event"}
                      {typeof entry.metadata?.["purchase_order_number"] === "string"
                        ? ` · ${entry.metadata["purchase_order_number"]}`
                        : ""}
                      {typeof entry.metadata?.["rating"] === "number"
                        ? ` · ${entry.metadata["rating"]}/5`
                        : ""}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "UTC",
                      }).format(new Date(entry.occurred_at))}
                      {entry.actor ? ` · ${entry.actor}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {section === "notes" ? (
        <div className="notes-workspace">
          {partner.notes ? (
            <p className="note-body">{partner.notes}</p>
          ) : (
            <p className="quiet-empty">No private notes. Add them from Edit.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
