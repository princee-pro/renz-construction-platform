"use client";

import Link from "next/link";
import { guardAction } from "@/features/admin-shared/action-state";
import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { CopyButton } from "@/components/admin/ui/copy-button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { useDraftFields } from "@/features/admin-shared/use-draft-fields";
import { RelationshipInvoicesPanel } from "@/features/invoices/components/relationship-invoices";
import type { RelationshipInvoices } from "@/features/invoices/invoice-contract";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { useRecordRecentlyViewed } from "@/features/admin-shared/use-record-recently-viewed";
import {
  archiveClientAction,
  createClientNoteAction,
  updateClientAction,
} from "@/features/clients/client-actions";
import {
  clientTierLabels,
  clientTiers,
  initialAdminActionState,
  type ClientDetail,
} from "@/features/clients/client-contract";

function whatsappHrefFor(phoneDisplay: string | null): string | null {
  if (!phoneDisplay) return null;
  const digits = phoneDisplay.replace(/[^0-9]/gu, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

type Section = "overview" | "projects" | "invoices" | "notes" | "activity";

export type OriginatingLead = Readonly<{
  id: string;
  reference: string;
  lead_type: string;
  status: string;
  submitted_at: string;
}>;

export function ClientDetailView({
  detail,
  canWrite,
  invoices,
  finance,
  originatingLeads,
}: Readonly<{
  detail: ClientDetail;
  canWrite: boolean;
  /** Null when the viewer lacks finance.invoices.read; undefined never. */
  invoices?: RelationshipInvoices | null | undefined;
  finance?: Readonly<{ read: boolean; write: boolean }> | undefined;
  /** C8: leads that were converted into this client (leads.read); null when not readable. */
  originatingLeads?: readonly OriginatingLead[] | null | undefined;
}>) {
  const { connectionState } = useAdminRealtimeInvalidation(["client", "invoice"]);
  const [section, setSection] = useState<Section>("overview");
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const [updateState, updateAction, updatePending] = useActionState(
    guardAction(updateClientAction),
    initialAdminActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    guardAction(archiveClientAction),
    initialAdminActionState,
  );
  const [noteState, noteAction, notePending] = useActionState(
    guardAction(createClientNoteAction),
    initialAdminActionState,
  );

  const client = detail.client;
  const edit = usePinnedEdit(
    client.version,
    updateState.status === "success" ? updateState.currentVersion : null,
  );
  const { editing } = edit;
  const draft = useDraftFields(
    {
      fullName: client.full_name,
      clientTier: client.client_tier,
      email: client.email ?? "",
      phone: client.phone_display ?? "",
      company: client.company ?? "",
      address: client.address ?? "",
      referralSource: client.referral_source ?? "",
      externalReference: client.external_reference ?? "",
    },
    edit.formKey,
  );
  const whatsapp = whatsappHrefFor(client.phone_display);

  useRecordRecentlyViewed({
    kind: "client",
    id: client.id,
    label: client.full_name,
    href: `/admin/operations/clients/${client.id}`,
  });

  const [prevUpdateState, setPrevUpdateState] = useState(updateState);
  if (updateState !== prevUpdateState) {
    setPrevUpdateState(updateState);
    if (updateState.status === "success" && editing) edit.closeEdit();
  }

  const [prevArchiveState, setPrevArchiveState] = useState(archiveState);
  if (archiveState !== prevArchiveState) {
    setPrevArchiveState(archiveState);
    if (archiveState.status === "success" && confirmingArchive) setConfirmingArchive(false);
  }

  return (
    <div className="client-360 admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Client{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{client.full_name}</h1>
          <p className="page-description">
            {client.company ?? "No company"} ·{" "}
            <StatusBadge tone={client.client_tier === "premium" ? "ready" : "review"}>
              {clientTierLabels[client.client_tier]}
            </StatusBadge>{" "}
            {client.archived_at ? <StatusBadge tone="archived">Archived</StatusBadge> : null}
          </p>
        </div>
        <div className="page-actions">
          {client.email ? (
            <>
              <a className="button button-quiet" href={`mailto:${client.email}`}>
                Email
              </a>
              <CopyButton label="Copy email" value={client.email} />
            </>
          ) : null}
          {client.phone_display ? (
            <CopyButton label="Copy phone" value={client.phone_display} />
          ) : null}
          {whatsapp ? (
            <a className="button button-whatsapp" href={whatsapp} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
          {canWrite && !client.archived_at ? (
            <>
              <Link
                className="button button-secondary"
                href={`/admin/operations/projects/new?client=${client.id}`}
              >
                Create Project
              </Link>
              <Button
                onClick={() => (editing ? edit.closeEdit() : edit.openEdit())}
                tone="secondary"
                type="button"
              >
                {editing ? "Close edit" : "Edit"}
              </Button>
              <Button onClick={() => setConfirmingArchive(true)} tone="danger" type="button">
                Archive Client
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {confirmingArchive ? (
        <Alert live tone="warning">
          <p>
            Archive {client.full_name}? Archived clients remain historically viewable and stay
            connected to their existing projects, but will not appear when starting a new project.
          </p>
          <form action={archiveAction}>
            <input name="clientId" type="hidden" value={client.id} />
            <input name="expectedVersion" type="hidden" value={client.version} />
            <div className="form-actions">
              <Button onClick={() => setConfirmingArchive(false)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={archivePending} tone="danger" type="submit">
                {archivePending ? "Archiving…" : "Confirm archive"}
              </Button>
            </div>
          </form>
        </Alert>
      ) : null}
      {archiveState.status === "error" || archiveState.status === "conflict" ? (
        <Alert tone="danger">
          <p>{archiveState.message}</p>
        </Alert>
      ) : null}

      {editing ? (
        <form action={updateAction} className="admin-form" key={edit.formKey}>
          <input name="clientId" type="hidden" value={client.id} />
          <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
          {edit.outdated && updateState.status !== "conflict" ? (
            <Alert live tone="warning">
              <p>
                Another staff member updated this client while you were editing. Saving now will be
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
          <div className="field-grid field-grid-two">
            <Field id="fullName" label="Full name">
              <input {...draft.field("fullName")} id="fullName" maxLength={200} type="text" />
            </Field>
            <Field id="clientTier" label="Client tier">
              <select id="clientTier" {...draft.field("clientTier")}>
                {clientTiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {clientTierLabels[tier]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="field-grid field-grid-two">
            <Field id="email" label="Email">
              <input {...draft.field("email")} id="email" maxLength={254} type="email" />
            </Field>
            <Field id="phone" label="Phone">
              <input {...draft.field("phone")} id="phone" maxLength={40} type="text" />
            </Field>
          </div>
          <div className="field-grid field-grid-two">
            <Field id="company" label="Company">
              <input {...draft.field("company")} id="company" maxLength={200} type="text" />
            </Field>
            <Field id="address" label="Address">
              <input {...draft.field("address")} id="address" maxLength={400} type="text" />
            </Field>
          </div>
          <div className="field-grid field-grid-two">
            <Field id="referralSource" label="Referral source">
              <input
                {...draft.field("referralSource")}
                id="referralSource"
                maxLength={200}
                type="text"
              />
            </Field>
            <Field id="externalReference" label="External / reference code">
              <input
                {...draft.field("externalReference")}
                id="externalReference"
                maxLength={120}
                type="text"
              />
            </Field>
          </div>
          {updateState.status === "conflict" ? (
            <Alert live tone="warning">
              <p>
                Another staff member saved changes to this client first. Your edits above are still
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
          {updateState.status === "error" ? (
            <Alert live tone="danger">
              <p>{updateState.message}</p>
            </Alert>
          ) : null}
          <div className="form-actions">
            <Button disabled={updatePending} tone="primary" type="submit">
              {updatePending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      ) : null}

      <nav aria-label="Client sections" className="record-tabs">
        {(
          [
            "overview",
            "projects",
            ...(finance?.read ? (["invoices"] as const) : []),
            "notes",
            "activity",
          ] as const
        ).map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tab === "overview"
              ? "Overview"
              : tab === "projects"
                ? "Projects"
                : tab === "invoices"
                  ? "Invoices"
                  : tab === "notes"
                    ? "Notes"
                    : "Activity"}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <dl className="definition-register">
          <div>
            <dt>Email</dt>
            <dd>{client.email ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{client.phone_display ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{client.address ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Referral source</dt>
            <dd>{client.referral_source ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>External reference</dt>
            <dd>{client.external_reference ?? "Not on file"}</dd>
          </div>
          <div>
            <dt>Relationship summary</dt>
            <dd>
              {detail.projects.length} project{detail.projects.length === 1 ? "" : "s"} ·{" "}
              {detail.projects.filter((project) => project.archived_at === null).length} active
            </dd>
          </div>
          {originatingLeads && originatingLeads.length > 0 ? (
            <div>
              <dt>Originating leads</dt>
              <dd>
                <ul className="originating-leads">
                  {originatingLeads.map((lead) => (
                    <li key={lead.id}>
                      <Link href={`/admin/operations/leads/${lead.id}`}>{lead.reference}</Link> ·{" "}
                      {lead.lead_type} · {lead.status} ·{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(lead.submitted_at))}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {section === "projects" ? (
        detail.projects.length > 0 ? (
          <ul className="activity-list">
            {detail.projects.map((project) => (
              <li key={project.id}>
                <div>
                  <strong>
                    <Link href={`/admin/operations/projects/${project.id}`}>{project.title}</Link>
                  </strong>
                  <span>
                    {project.status} · {project.current_phase} · {project.priority} priority
                    {project.archived_at ? " · archived" : ""}
                  </span>
                </div>
                <time dateTime={project.updated_at}>
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                    new Date(project.updated_at),
                  )}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-empty">No projects yet for this client.</p>
        )
      ) : null}

      {section === "notes" ? (
        <div className="notes-workspace">
          {canWrite && !client.archived_at ? (
            <form action={noteAction} className="admin-form">
              <input name="clientId" type="hidden" value={client.id} />
              <Field id="noteBody" label="Add a note">
                <textarea id="noteBody" maxLength={4000} name="body" rows={3} required />
              </Field>
              {noteState.status === "error" ? (
                <Alert live tone="danger">
                  <p>{noteState.message}</p>
                </Alert>
              ) : null}
              <div className="form-actions">
                <Button disabled={notePending} tone="secondary" type="submit">
                  {notePending ? "Saving…" : "Add note"}
                </Button>
              </div>
            </form>
          ) : null}
          {detail.notes.length > 0 ? (
            <ul className="activity-list">
              {detail.notes.map((note) => (
                <li key={note.id}>
                  <div>
                    <strong>{note.author ?? "Staff member"}</strong>
                    <span>{note.body}</span>
                  </div>
                  <time dateTime={note.created_at}>
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                      new Date(note.created_at),
                    )}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No notes recorded yet.</p>
          )}
        </div>
      ) : null}

      {section === "invoices" && finance?.read ? (
        <RelationshipInvoicesPanel
          canWrite={finance.write && !client.archived_at}
          createHref={`/admin/finance/invoices/new?client=${client.id}`}
          data={invoices ?? null}
          scopeLabel="client"
        />
      ) : null}

      {section === "activity" ? (
        detail.activity.length > 0 ? (
          <ul className="activity-list">
            {detail.activity.map((entry, index) => (
              <li key={`${entry.action}-${index}`}>
                <div>
                  <strong>{formatClientActivity(entry.action)}</strong>
                  <span>{entry.actor ?? "Staff member"}</span>
                </div>
                <time dateTime={entry.occurred_at}>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(entry.occurred_at))}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-empty">No recorded activity yet.</p>
        )
      ) : null}
    </div>
  );
}

function formatClientActivity(action: string): string {
  const labels: Readonly<Record<string, string>> = {
    "client.create": "Client created",
    "client.update": "Client updated",
    "client.archive": "Client archived",
    "client.note_create": "Note added",
    "invoice.issue": "Invoice issued",
    "invoice.payment_record": "Payment recorded",
    "invoice.payment_reverse": "Payment reversed",
    "invoice.paid": "Invoice paid",
    "invoice.void": "Invoice voided",
  };
  return labels[action] ?? action;
}
