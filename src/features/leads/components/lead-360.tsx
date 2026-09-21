"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
import { useDraftFields } from "@/features/admin-shared/use-draft-fields";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { useRecordRecentlyViewed } from "@/features/admin-shared/use-record-recently-viewed";
import { budgetPreferenceLabels, preferredContactLabels } from "@/features/intake/intake-policy";
import {
  archiveLeadAction,
  assignLeadAction,
  changeLeadStatusAction,
  convertLeadToClientAction,
  createLeadNoteAction,
  createProjectFromLeadAction,
  createRequirementsFromLeadAction,
  logLeadContactAction,
  reviewLeadAttachmentAction,
  updateLeadAction,
} from "@/features/leads/lead-actions";
import {
  contactTypeLabels,
  contactTypes,
  currentStageLabels,
  formatLeadDateTime,
  leadEventLabels,
  leadSourceLabels,
  leadStatusLabels,
  leadStatusTones,
  leadStatuses,
  leadTypeLabel,
  lostReasonLabels,
  lostReasons,
  needLabels,
  projectPhasesForConversion,
  projectTypeLabels,
  scaleBandLabels,
  type LeadAssignee,
  type LeadDetail,
  type LeadStatus,
} from "@/features/leads/lead-contract";
import { describeTimeZone } from "@/lib/time/business-time";

type Section =
  "overview" | "requirements" | "attachments" | "contact" | "notes" | "activity" | "conversion";

const sectionLabels: Readonly<Record<Section, string>> = {
  overview: "Overview",
  requirements: "Requirements",
  attachments: "Attachments",
  contact: "Contact",
  notes: "Notes",
  activity: "Activity",
  conversion: "Conversion",
};

function ActionAlert({ state }: Readonly<{ state: AdminActionState }>) {
  if (state.status === "idle") return null;
  const tone =
    state.status === "success"
      ? "success"
      : state.status === "conflict" || state.status === "reauth"
        ? "warning"
        : "danger";
  return (
    <Alert live tone={tone}>
      <p>{state.message}</p>
      {state.reauthHref ? <Link href={state.reauthHref}>Verify session</Link> : null}
    </Alert>
  );
}

function formatNumber(value: number | string | null | undefined, suffix = ""): string | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return null;
  return `${new Intl.NumberFormat("en").format(numeric)}${suffix}`;
}

/**
 * Lead 360 (C8 §47–65): one lead, everything a small construction team needs
 * to handle it — requirements, private attachments, contact actions, notes,
 * timeline and the deliberate conversion path to Client → Operational
 * Project (→ material requirements for material enquiries).
 */
export function Lead360({
  detail,
  assignees,
  currentUserId,
  timeZone,
}: Readonly<{
  detail: LeadDetail;
  assignees: readonly LeadAssignee[];
  currentUserId: string | null;
  /** Configured business timezone; every instant below is rendered in it. */
  timeZone: string;
}>) {
  const whenHint = `Local time in ${describeTimeZone(timeZone)}. Leave blank for now.`;
  const { connectionState } = useAdminRealtimeInvalidation([
    "lead",
    "client",
    "operational_project",
  ]);
  const lead = detail.lead;
  const permissions = detail.permissions;
  const [section, setSection] = useState<Section>("overview");
  const [statusTarget, setStatusTarget] = useState<LeadStatus | "">("");
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [convertMode, setConvertMode] = useState<"new" | "existing">(
    detail.possible_matches.clients.length > 0 ? "existing" : "new",
  );

  const [updateState, updateAction, updatePending] = useActionState(
    guardAction(updateLeadAction),
    initialAdminActionState,
  );
  const [assignState, assignAction, assignPending] = useActionState(
    guardAction(assignLeadAction),
    initialAdminActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    guardAction(changeLeadStatusAction),
    initialAdminActionState,
  );
  const [contactState, contactAction, contactPending] = useActionState(
    guardAction(logLeadContactAction),
    initialAdminActionState,
  );
  const [noteState, noteAction, notePending] = useActionState(
    guardAction(createLeadNoteAction),
    initialAdminActionState,
  );
  const [convertState, convertAction, convertPending] = useActionState(
    guardAction(convertLeadToClientAction),
    initialAdminActionState,
  );
  const [projectState, projectAction, projectPending] = useActionState(
    guardAction(createProjectFromLeadAction),
    initialAdminActionState,
  );
  const [requirementsState, requirementsAction, requirementsPending] = useActionState(
    guardAction(createRequirementsFromLeadAction),
    initialAdminActionState,
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    guardAction(reviewLeadAttachmentAction),
    initialAdminActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    guardAction(archiveLeadAction),
    initialAdminActionState,
  );

  const latestSaved = [
    updateState,
    assignState,
    statusState,
    convertState,
    projectState,
    requirementsState,
    archiveState,
    contactState,
  ]
    .map((state) => (state.status === "success" ? state.currentVersion : null))
    .reduce<number | null>(
      (max, value) => (value !== null && (max === null || value > max) ? value : max),
      null,
    );
  const edit = usePinnedEdit(lead.version, latestSaved);
  const version = Math.max(lead.version, latestSaved ?? 0);
  const draft = useDraftFields(
    {
      fullName: lead.full_name,
      summary: lead.summary,
      email: lead.email ?? "",
      phone: lead.phone_display ?? "",
      company: lead.company ?? "",
      location: lead.location_text ?? "",
      preferredContact: lead.preferred_contact ?? "",
      serviceKey: lead.service_key ?? "",
      priority: lead.priority ?? "",
    },
    edit.formKey,
  );
  useRecordRecentlyViewed({
    kind: "lead",
    id: lead.id,
    label: `${lead.reference} · ${lead.full_name}`,
    href: `/admin/operations/leads/${lead.id}`,
  });

  const [prevUpdate, setPrevUpdate] = useState(updateState);
  if (updateState !== prevUpdate) {
    setPrevUpdate(updateState);
    if (updateState.status === "success" && edit.editing) edit.closeEdit();
  }
  const [prevStatus, setPrevStatus] = useState(statusState);
  if (statusState !== prevStatus) {
    setPrevStatus(statusState);
    if (statusState.status === "success") setStatusTarget("");
  }
  const [prevArchive, setPrevArchive] = useState(archiveState);
  if (archiveState !== prevArchive) {
    setPrevArchive(archiveState);
    if (archiveState.status === "success") setConfirmingArchive(false);
  }

  const readOnly = Boolean(lead.archived_at);
  const canWrite = permissions.write && !readOnly;
  const whatsapp = lead.whatsapp_digits ? `https://wa.me/${lead.whatsapp_digits}` : null;
  const isMine = currentUserId !== null && lead.assigned_to === currentUserId;
  const canWin =
    lead.client_id !== null &&
    (lead.lead_type !== "project" || lead.operational_project_id !== null);
  const outdated = edit.outdated;

  return (
    <div className="lead-360 admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Lead · {leadTypeLabel(lead.lead_type)}{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>
            <span className="lead-reference">{lead.reference}</span> {lead.full_name}
          </h1>
          <p className="page-description">
            <StatusBadge tone={leadStatusTones[lead.status]}>
              {leadStatusLabels[lead.status]}
            </StatusBadge>{" "}
            {leadSourceLabels[lead.source_channel]} · Submitted{" "}
            {formatLeadDateTime(lead.submitted_at, timeZone)} ·{" "}
            {lead.assigned_to_name ? `Assigned to ${lead.assigned_to_name}` : "Unassigned"}
            {lead.priority ? ` · ${lead.priority} priority` : ""}
            {lead.archived_at ? (
              <>
                {" "}
                <StatusBadge tone="archived">Archived</StatusBadge>
              </>
            ) : null}
          </p>
        </div>
        <div className="page-actions">
          <CopyButton label="Copy reference" value={lead.reference} />
          {lead.email ? (
            <>
              <a className="button button-quiet" href={`mailto:${lead.email}`}>
                Email
              </a>
              <CopyButton label="Copy email" value={lead.email} />
            </>
          ) : null}
          {lead.phone_display ? <CopyButton label="Copy phone" value={lead.phone_display} /> : null}
          {whatsapp ? (
            <a className="button button-whatsapp" href={whatsapp} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
          {lead.tel_href ? (
            <a className="button button-quiet" href={lead.tel_href}>
              Call
            </a>
          ) : null}
          {permissions.assign && !readOnly && !isMine ? (
            <form action={assignAction}>
              <input name="id" type="hidden" value={lead.id} />
              <input name="expectedVersion" type="hidden" value={version} />
              <input name="assignee" type="hidden" value="me" />
              <Button disabled={assignPending} tone="secondary" type="submit">
                Assign to me
              </Button>
            </form>
          ) : null}
          {canWrite ? (
            <>
              <Button
                onClick={() => (edit.editing ? edit.closeEdit() : edit.openEdit())}
                tone="secondary"
                type="button"
              >
                {edit.editing ? "Close edit" : "Edit"}
              </Button>
              <Button onClick={() => setConfirmingArchive(true)} tone="danger" type="button">
                Archive
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <ActionAlert state={assignState} />
      <ActionAlert state={archiveState} />
      {confirmingArchive ? (
        <Alert live tone="warning">
          <p>
            Archive {lead.reference}? Archiving is a record-lifecycle action, not a sales outcome:
            the lead stays readable with its history, and nothing is deleted. Use “Lost” for a sales
            outcome.
          </p>
          <form action={archiveAction}>
            <input name="id" type="hidden" value={lead.id} />
            <input name="expectedVersion" type="hidden" value={version} />
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

      {(detail.possible_matches.leads.length > 0 || detail.possible_matches.clients.length > 0) &&
      lead.client_id === null ? (
        <Alert tone="warning">
          <p>
            <strong>Possible match.</strong> The same email or phone appears on existing records.
            Nothing is merged automatically.
          </p>
          <ul className="lead-matches">
            {detail.possible_matches.clients.map((client) => (
              <li key={client.id}>
                Client{" "}
                <Link href={`/admin/operations/clients/${client.id}`}>{client.full_name}</Link>
                {client.company ? ` (${client.company})` : ""} · matched by {client.match_reason}
                {client.archived_at ? " · archived" : ""}
              </li>
            ))}
            {detail.possible_matches.leads.map((other) => (
              <li key={other.id}>
                Lead <Link href={`/admin/operations/leads/${other.id}`}>{other.reference}</Link> ·{" "}
                {leadStatusLabels[other.status as LeadStatus] ?? other.status} · matched by{" "}
                {other.match_reason}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {edit.editing ? (
        <form action={updateAction} className="admin-form" key={edit.formKey}>
          <input name="id" type="hidden" value={lead.id} />
          <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
          {outdated && updateState.status !== "conflict" ? (
            <Alert live tone="warning">
              <p>
                Another staff member updated this lead while you were editing. Saving now will be
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
            <Field error={updateState.fieldErrors["fullName"]} id="fullName" label="Full name">
              <input {...draft.field("fullName")} id="fullName" maxLength={200} type="text" />
            </Field>
            <Field error={updateState.fieldErrors["summary"]} id="summary" label="Summary">
              <input {...draft.field("summary")} id="summary" maxLength={200} type="text" />
            </Field>
            <Field error={updateState.fieldErrors["email"]} id="email" label="Email">
              <input {...draft.field("email")} id="email" maxLength={254} type="email" />
            </Field>
            <Field error={updateState.fieldErrors["phone"]} id="phone" label="Phone / WhatsApp">
              <input {...draft.field("phone")} id="phone" maxLength={40} type="text" />
            </Field>
            <Field id="company" label="Company">
              <input {...draft.field("company")} id="company" maxLength={200} type="text" />
            </Field>
            <Field id="location" label="Location">
              <input {...draft.field("location")} id="location" maxLength={400} type="text" />
            </Field>
            <Field id="preferredContact" label="Visitor's preferred contact">
              <select {...draft.field("preferredContact")} id="preferredContact">
                <option value="">Not stated</option>
                {Object.entries(preferredContactLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="serviceKey" label="Service">
              <select {...draft.field("serviceKey")} id="serviceKey">
                <option value="">None</option>
                {Object.entries(needLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="priority" label="Priority">
              <select {...draft.field("priority")} id="priority">
                <option value="">Not set</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>
          {updateState.status === "conflict" ? (
            <Alert live tone="warning">
              <p>{updateState.message}</p>
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

      {canWrite ? (
        <section aria-labelledby="lead-stage-heading" className="admin-panel lead-stage-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="lead-stage-heading">Pipeline stage</h2>
            <StatusBadge tone={leadStatusTones[lead.status]}>
              {leadStatusLabels[lead.status]}
            </StatusBadge>
          </div>
          <div className="lead-stage-controls" role="group" aria-label="Change stage">
            {leadStatuses
              .filter((status) => status !== lead.status)
              .map((status) => (
                <Button
                  aria-pressed={statusTarget === status}
                  disabled={status === "won" && !canWin}
                  key={status}
                  onClick={() => setStatusTarget(status)}
                  tone={status === "lost" ? "danger" : status === "won" ? "primary" : "secondary"}
                  type="button"
                >
                  {status === "lost"
                    ? "Mark Lost"
                    : status === "won"
                      ? "Mark Won"
                      : `→ ${leadStatusLabels[status]}`}
                </Button>
              ))}
          </div>
          {!canWin ? (
            <p className="field-help">
              “Won” needs a linked client
              {lead.lead_type === "project" ? " and an operational project" : ""}: convert first so
              a won lead always points at real records.
            </p>
          ) : null}
          {statusTarget ? (
            <form action={statusAction} className="admin-form lead-stage-form">
              <input name="id" type="hidden" value={lead.id} />
              <input name="expectedVersion" type="hidden" value={version} />
              <input name="status" type="hidden" value={statusTarget} />
              <p>
                Move <strong>{lead.reference}</strong> from {leadStatusLabels[lead.status]} to{" "}
                <strong>{leadStatusLabels[statusTarget]}</strong>?
              </p>
              {statusTarget === "lost" ? (
                <Field error={statusState.fieldErrors["reasonCode"]} id="reasonCode" label="Reason">
                  <select defaultValue="" id="reasonCode" name="reasonCode" required>
                    <option value="">Choose a reason</option>
                    {lostReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {lostReasonLabels[reason]}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field
                hint="Private; never shown to the visitor."
                id="statusNote"
                label="Private note (optional)"
              >
                <textarea id="statusNote" maxLength={4000} name="note" rows={2} />
              </Field>
              <div className="form-actions">
                <Button onClick={() => setStatusTarget("")} tone="quiet" type="button">
                  Cancel
                </Button>
                <Button
                  disabled={statusPending}
                  tone={statusTarget === "lost" ? "danger" : "primary"}
                  type="submit"
                >
                  {statusPending ? "Saving…" : `Confirm ${leadStatusLabels[statusTarget]}`}
                </Button>
              </div>
            </form>
          ) : null}
          <ActionAlert state={statusState} />
        </section>
      ) : null}

      <nav aria-label="Lead sections" className="record-tabs">
        {(Object.keys(sectionLabels) as Section[]).map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {sectionLabels[tab]}
            {tab === "attachments" && detail.attachments.length > 0
              ? ` (${detail.attachments.length})`
              : ""}
            {tab === "notes" && detail.notes.length > 0 ? ` (${detail.notes.length})` : ""}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <div className="lead-overview">
          <dl className="definition-register">
            <div>
              <dt>Reference</dt>
              <dd>{lead.reference}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{leadTypeLabel(lead.lead_type)}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{leadSourceLabels[lead.source_channel]}</dd>
            </div>
            <div>
              <dt>Summary</dt>
              <dd>{lead.summary}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>
                {lead.service_key
                  ? (needLabels[lead.service_key as keyof typeof needLabels] ?? lead.service_key)
                  : "—"}
                {lead.service_name ? ` · linked: ${lead.service_name}` : ""}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{lead.location_text ?? "—"}</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>{lead.assigned_to_name ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{formatLeadDateTime(lead.submitted_at, timeZone)}</dd>
            </div>
            <div>
              <dt>First contact</dt>
              <dd>{formatLeadDateTime(lead.first_contact_at, timeZone)}</dd>
            </div>
            <div>
              <dt>Qualified</dt>
              <dd>{formatLeadDateTime(lead.qualified_at, timeZone)}</dd>
            </div>
            <div>
              <dt>Won / Lost</dt>
              <dd>
                {lead.won_at
                  ? `Won ${formatLeadDateTime(lead.won_at, timeZone)}`
                  : lead.lost_at
                    ? `Lost ${formatLeadDateTime(lead.lost_at, timeZone)}${lead.lost_reason ? ` · ${lostReasonLabels[lead.lost_reason as keyof typeof lostReasonLabels] ?? lead.lost_reason}` : ""}`
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Privacy acknowledgement</dt>
              <dd>
                {lead.consented_at
                  ? `Revision ${lead.consent_revision ?? 0} · ${formatLeadDateTime(lead.consented_at, timeZone)}`
                  : lead.created_by_name
                    ? `Staff-created by ${lead.created_by_name}`
                    : "—"}
              </dd>
            </div>
          </dl>
          {lead.message ? (
            <section aria-labelledby="lead-message-heading" className="admin-panel">
              <h2 id="lead-message-heading">Message</h2>
              <p className="lead-message">{lead.message}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {section === "requirements" ? (
        <div className="lead-requirements">
          {detail.project_details ? (
            <dl className="definition-register">
              <div>
                <dt>Need</dt>
                <dd>
                  {needLabels[detail.project_details.need_key as keyof typeof needLabels] ??
                    detail.project_details.need_key}
                </dd>
              </div>
              <div>
                <dt>Project type</dt>
                <dd>
                  {projectTypeLabels[
                    detail.project_details.project_type as keyof typeof projectTypeLabels
                  ] ?? detail.project_details.project_type}
                </dd>
              </div>
              <div>
                <dt>Site state</dt>
                <dd>{detail.project_details.site_state ?? "—"}</dd>
              </div>
              <div>
                <dt>Floor area</dt>
                <dd>{formatNumber(detail.project_details.floor_area_m2, " m²") ?? "—"}</dd>
              </div>
              <div>
                <dt>Floors</dt>
                <dd>{detail.project_details.floors ?? "—"}</dd>
              </div>
              <div>
                <dt>Rooms / units</dt>
                <dd>{detail.project_details.units ?? "—"}</dd>
              </div>
              <div>
                <dt>Site area</dt>
                <dd>{formatNumber(detail.project_details.site_area_m2, " m²") ?? "—"}</dd>
              </div>
              <div>
                <dt>Scale</dt>
                <dd>
                  {detail.project_details.scale_band
                    ? scaleBandLabels[
                        detail.project_details.scale_band as keyof typeof scaleBandLabels
                      ]
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Desired start</dt>
                <dd>{detail.project_details.start_timing ?? "—"}</dd>
              </div>
              <div>
                <dt>Desired completion</dt>
                <dd>{detail.project_details.completion_timing ?? "—"}</dd>
              </div>
              <div>
                <dt>Current stage</dt>
                <dd>
                  {detail.project_details.current_stage
                    ? currentStageLabels[
                        detail.project_details.current_stage as keyof typeof currentStageLabels
                      ]
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>
                  {detail.project_details.budget_preference === "range"
                    ? `${detail.project_details.budget_currency ?? ""} ${formatNumber(detail.project_details.budget_min) ?? "?"} – ${formatNumber(detail.project_details.budget_max) ?? "?"}`
                    : budgetPreferenceLabels[
                        detail.project_details
                          .budget_preference as keyof typeof budgetPreferenceLabels
                      ]}
                </dd>
              </div>
              <div>
                <dt>Special requirements</dt>
                <dd>{detail.project_details.special_requirements ?? "—"}</dd>
              </div>
              <div>
                <dt>Came from</dt>
                <dd>{detail.project_details.source_context ?? "—"}</dd>
              </div>
            </dl>
          ) : null}
          {detail.service_details ? (
            <dl className="definition-register">
              <div>
                <dt>Service</dt>
                <dd>
                  {needLabels[detail.service_details.service_key as keyof typeof needLabels] ??
                    detail.service_details.service_key}
                </dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{detail.service_details.context_text ?? "—"}</dd>
              </div>
              <div>
                <dt>Requirement</dt>
                <dd>{detail.service_details.requirement_text}</dd>
              </div>
              <div>
                <dt>Preferred timing</dt>
                <dd>{detail.service_details.preferred_timing ?? "—"}</dd>
              </div>
            </dl>
          ) : null}
          {detail.material_items.length > 0 ? (
            <table className="lead-items-table">
              <caption>Requested materials (visitor-stated, no prices)</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Item</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Specification</th>
                </tr>
              </thead>
              <tbody>
                {detail.material_items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.sort_order}</td>
                    <td>{item.description}</td>
                    <td>{formatNumber(item.quantity) ?? "—"}</td>
                    <td>{item.unit ?? "—"}</td>
                    <td>{item.specification ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {!detail.project_details &&
          !detail.service_details &&
          detail.material_items.length === 0 ? (
            <p className="quiet-empty">
              A general enquiry carries no structured requirements; see the message on the Overview
              tab.
            </p>
          ) : null}
        </div>
      ) : null}

      {section === "attachments" ? (
        <div className="lead-attachments">
          {detail.attachments.length === 0 ? (
            <p className="quiet-empty">No supporting files were attached.</p>
          ) : (
            <ul className="lead-attachment-list">
              {detail.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <div className="lead-attachment-identity">
                    <strong>{attachment.original_filename}</strong>
                    <span>
                      {attachment.detected_mime_type} ·{" "}
                      {new Intl.NumberFormat("en").format(Math.round(attachment.byte_size / 1024))}{" "}
                      KB · {formatLeadDateTime(attachment.uploaded_at, timeZone)}
                    </span>
                  </div>
                  <StatusBadge
                    tone={
                      attachment.scan_status === "safe"
                        ? "ready"
                        : attachment.scan_status === "rejected"
                          ? "blocked"
                          : "review"
                    }
                  >
                    {attachment.scan_status === "pending_review"
                      ? "Quarantine · pending review"
                      : attachment.scan_status === "safe"
                        ? "Marked safe"
                        : "Rejected"}
                  </StatusBadge>
                  {attachment.rejection_reason ? (
                    <span className="field-help">{attachment.rejection_reason}</span>
                  ) : null}
                  <div className="lead-attachment-actions">
                    {permissions.attachments && attachment.scan_status !== "rejected" ? (
                      attachment.detected_mime_type.startsWith("image/") ? (
                        <>
                          <a
                            className="button button-quiet"
                            href={`/api/leads/attachments/${attachment.id}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Preview
                          </a>
                          <a
                            className="button button-quiet"
                            href={`/api/leads/attachments/${attachment.id}?download=1`}
                          >
                            Download
                          </a>
                        </>
                      ) : (
                        <a
                          className="button button-quiet"
                          href={`/api/leads/attachments/${attachment.id}?download=1`}
                        >
                          Download (PDF, no inline viewing)
                        </a>
                      )
                    ) : null}
                    {canWrite &&
                    permissions.attachments &&
                    attachment.scan_status === "pending_review" ? (
                      <>
                        <form action={reviewAction}>
                          <input name="attachmentId" type="hidden" value={attachment.id} />
                          <input name="leadId" type="hidden" value={lead.id} />
                          <input name="state" type="hidden" value="safe" />
                          <Button disabled={reviewPending} tone="secondary" type="submit">
                            Mark safe
                          </Button>
                        </form>
                        <form action={reviewAction} className="lead-attachment-reject">
                          <input name="attachmentId" type="hidden" value={attachment.id} />
                          <input name="leadId" type="hidden" value={lead.id} />
                          <input name="state" type="hidden" value="rejected" />
                          <label className="visually-hidden" htmlFor={`reject-${attachment.id}`}>
                            Rejection reason
                          </label>
                          <input
                            id={`reject-${attachment.id}`}
                            maxLength={200}
                            name="reason"
                            placeholder="Reason"
                            required
                            type="text"
                          />
                          <Button disabled={reviewPending} tone="danger" type="submit">
                            Reject
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="field-help">
            Files are private quarantine objects served through a permission-checked, short-lived
            signed route. They are never public and never copied into case-study media.
          </p>
          <ActionAlert state={reviewState} />
        </div>
      ) : null}

      {section === "contact" ? (
        <div className="lead-contact">
          <dl className="definition-register">
            <div>
              <dt>Email</dt>
              <dd>{lead.email ?? "Not given"}</dd>
            </div>
            <div>
              <dt>Phone / WhatsApp</dt>
              <dd>{lead.phone_display ?? "Not given"}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{lead.company ?? "—"}</dd>
            </div>
            <div>
              <dt>Preferred contact</dt>
              <dd>
                {lead.preferred_contact
                  ? preferredContactLabels[
                      lead.preferred_contact as keyof typeof preferredContactLabels
                    ]
                  : "Not stated"}
              </dd>
            </div>
          </dl>
          {canWrite ? (
            <form action={contactAction} className="admin-form">
              <h2>Log contact</h2>
              <div className="field-grid field-grid-two">
                <Field
                  error={contactState.fieldErrors["contactType"]}
                  id="contactType"
                  label="Type"
                >
                  <select defaultValue="whatsapp" id="contactType" name="contactType">
                    {contactTypes.map((type) => (
                      <option key={type} value={type}>
                        {contactTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  error={contactState.fieldErrors["occurredAt"]}
                  hint={whenHint}
                  id="occurredAt"
                  label="When"
                >
                  <input id="occurredAt" name="occurredAt" type="datetime-local" />
                </Field>
              </div>
              <input name="id" type="hidden" value={lead.id} />
              <Field
                error={contactState.fieldErrors["note"]}
                id="contactNote"
                label="Short private note (optional)"
              >
                <textarea id="contactNote" maxLength={1000} name="note" rows={2} />
              </Field>
              {lead.status === "new" ? (
                <label className="checkbox-row">
                  <input defaultChecked name="markContacted" type="checkbox" /> Also move the stage
                  to Contacted
                </label>
              ) : null}
              <div className="form-actions">
                <Button disabled={contactPending} tone="primary" type="submit">
                  {contactPending ? "Saving…" : "Log contact"}
                </Button>
              </div>
              <ActionAlert state={contactState} />
            </form>
          ) : null}
          {detail.contact_logs.length > 0 ? (
            <ul className="activity-list">
              {detail.contact_logs.map((log) => (
                <li key={log.id}>
                  <strong>{contactTypeLabels[log.contact_type]}</strong> ·{" "}
                  {formatLeadDateTime(log.occurred_at, timeZone)}
                  {log.actor ? ` · ${log.actor}` : ""}
                  {log.note ? <p>{log.note}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No contact logged yet.</p>
          )}
        </div>
      ) : null}

      {section === "notes" ? (
        <div className="notes-workspace">
          {canWrite ? (
            <form action={noteAction} className="admin-form">
              <input name="id" type="hidden" value={lead.id} />
              <Field
                error={noteState.fieldErrors["body"]}
                hint="Private to staff. Never shown to the visitor, never copied to the client."
                id="noteBody"
                label="New note"
              >
                <textarea id="noteBody" maxLength={4000} name="body" required rows={3} />
              </Field>
              <div className="form-actions">
                <Button disabled={notePending} tone="primary" type="submit">
                  {notePending ? "Saving…" : "Add note"}
                </Button>
              </div>
              <ActionAlert state={noteState} />
            </form>
          ) : null}
          {detail.notes.length > 0 ? (
            <ul className="activity-list">
              {detail.notes.map((note) => (
                <li key={note.id}>
                  <strong>{note.author ?? "Staff"}</strong> ·{" "}
                  {formatLeadDateTime(note.created_at, timeZone)}
                  <p>{note.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No notes yet.</p>
          )}
        </div>
      ) : null}

      {section === "activity" ? (
        detail.timeline.length > 0 ? (
          <ol className="activity-list lead-timeline">
            {detail.timeline.map((entry, index) => (
              <li key={`${entry.kind}-${entry.at}-${index}`}>
                <strong>
                  {entry.kind === "status"
                    ? entry.from_status
                      ? `Stage: ${leadStatusLabels[entry.from_status as LeadStatus] ?? entry.from_status} → ${leadStatusLabels[entry.to_status as LeadStatus] ?? entry.to_status}`
                      : "Lead submitted (New)"
                    : entry.kind === "contact"
                      ? `Contact logged: ${contactTypeLabels[entry.contact_type as keyof typeof contactTypeLabels] ?? entry.contact_type}`
                      : (leadEventLabels[entry.event_type ?? ""] ?? entry.event_type)}
                </strong>{" "}
                · {formatLeadDateTime(entry.at, timeZone)}
                {entry.actor ? ` · ${entry.actor}` : ""}
                {entry.reason_code
                  ? ` · ${lostReasonLabels[entry.reason_code as keyof typeof lostReasonLabels] ?? entry.reason_code}`
                  : ""}
                {entry.kind === "event" &&
                entry.event_type === "assigned" &&
                entry.metadata &&
                typeof entry.metadata["assignee_name"] === "string"
                  ? ` → ${String(entry.metadata["assignee_name"])}`
                  : ""}
              </li>
            ))}
          </ol>
        ) : (
          <p className="quiet-empty">No activity yet.</p>
        )
      ) : null}

      {section === "conversion" ? (
        <div className="lead-conversion">
          <section aria-labelledby="conversion-client-heading" className="admin-panel">
            <div className="section-heading-row section-heading-compact">
              <h2 id="conversion-client-heading">1. Client</h2>
              <StatusBadge tone={detail.client ? "ready" : "review"}>
                {detail.client ? "Linked" : "Not linked"}
              </StatusBadge>
            </div>
            {detail.client ? (
              <p>
                Linked to{" "}
                <Link href={`/admin/operations/clients/${detail.client.id}`}>
                  {detail.client.full_name}
                </Link>
                {detail.client.company ? ` (${detail.client.company})` : ""}
                {detail.client.archived_at ? " · archived" : ""}. The lead stays as the source
                history.
              </p>
            ) : permissions.convert && !readOnly ? (
              <form action={convertAction} className="admin-form">
                <input name="id" type="hidden" value={lead.id} />
                <input name="expectedVersion" type="hidden" value={version} />
                <div className="lead-convert-mode" role="group" aria-label="Conversion mode">
                  <label className="checkbox-row">
                    <input
                      checked={convertMode === "existing"}
                      name="mode"
                      onChange={() => setConvertMode("existing")}
                      type="radio"
                      value="existing"
                    />{" "}
                    Link an existing client
                  </label>
                  <label className="checkbox-row">
                    <input
                      checked={convertMode === "new"}
                      name="mode"
                      onChange={() => setConvertMode("new")}
                      type="radio"
                      value="new"
                    />{" "}
                    Create a client from this lead
                  </label>
                </div>
                {convertMode === "existing" ? (
                  <Field
                    error={convertState.fieldErrors["existingClientId"]}
                    hint="Only matches by the visitor's email or phone are offered here; use the Clients register for others."
                    id="existingClientId"
                    label="Existing client"
                  >
                    <select
                      defaultValue={detail.possible_matches.clients[0]?.id ?? ""}
                      id="existingClientId"
                      name="existingClientId"
                      required
                    >
                      <option value="">Choose a client</option>
                      {detail.possible_matches.clients
                        .filter((client) => !client.archived_at)
                        .map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.full_name}
                            {client.company ? ` · ${client.company}` : ""} (matched by{" "}
                            {client.match_reason})
                          </option>
                        ))}
                    </select>
                  </Field>
                ) : (
                  <>
                    <p className="field-help">
                      Prefilled from the lead: name, email, phone, company and location. Private
                      notes, attachments and activity are never copied.
                    </p>
                    <div className="field-grid field-grid-two">
                      <Field id="convertFullName" label="Client name">
                        <input
                          defaultValue={lead.full_name}
                          id="convertFullName"
                          maxLength={200}
                          name="fullName"
                          type="text"
                        />
                      </Field>
                      <Field id="clientTier" label="Tier">
                        <select defaultValue="standard" id="clientTier" name="clientTier">
                          <option value="standard">Standard</option>
                          <option value="vip">VIP</option>
                          <option value="premium">Premium</option>
                        </select>
                      </Field>
                      <Field id="convertEmail" label="Email">
                        <input
                          defaultValue={lead.email ?? ""}
                          id="convertEmail"
                          maxLength={254}
                          name="email"
                          type="email"
                        />
                      </Field>
                      <Field id="convertPhone" label="Phone">
                        <input
                          defaultValue={lead.phone_display ?? ""}
                          id="convertPhone"
                          maxLength={40}
                          name="phone"
                          type="text"
                        />
                      </Field>
                      <Field id="convertCompany" label="Company">
                        <input
                          defaultValue={lead.company ?? ""}
                          id="convertCompany"
                          maxLength={200}
                          name="company"
                          type="text"
                        />
                      </Field>
                      <Field id="convertAddress" label="Address / location">
                        <input
                          defaultValue={lead.location_text ?? ""}
                          id="convertAddress"
                          maxLength={400}
                          name="address"
                          type="text"
                        />
                      </Field>
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <Button
                    disabled={
                      convertPending || (!permissions.clients_write && convertMode === "new")
                    }
                    tone="primary"
                    type="submit"
                  >
                    {convertPending
                      ? "Converting…"
                      : convertMode === "existing"
                        ? "Link existing client"
                        : "Create client from lead"}
                  </Button>
                </div>
                {!permissions.clients_write && convertMode === "new" ? (
                  <p className="field-help">Creating a client needs clients.write.</p>
                ) : null}
                <ActionAlert state={convertState} />
              </form>
            ) : (
              <p className="quiet-empty">Not converted yet.</p>
            )}
          </section>

          <section aria-labelledby="conversion-project-heading" className="admin-panel">
            <div className="section-heading-row section-heading-compact">
              <h2 id="conversion-project-heading">2. Operational project</h2>
              <StatusBadge tone={detail.operational_project ? "ready" : "review"}>
                {detail.operational_project ? "Created" : "None"}
              </StatusBadge>
            </div>
            {detail.operational_project ? (
              <p>
                <Link href={`/admin/operations/projects/${detail.operational_project.id}`}>
                  {detail.operational_project.title}
                </Link>{" "}
                · {detail.operational_project.status} · {detail.operational_project.current_phase}
              </p>
            ) : !detail.client ? (
              <p className="quiet-empty">Link or create the client first.</p>
            ) : permissions.convert && permissions.projects_write && !readOnly ? (
              <form action={projectAction} className="admin-form">
                <input name="id" type="hidden" value={lead.id} />
                <input name="expectedVersion" type="hidden" value={version} />
                <p className="field-help">
                  Staff choose the phase and priority; nothing is inferred from the public form.
                  Public uploads are not copied into case-study media.
                </p>
                <div className="field-grid field-grid-two">
                  <Field
                    error={projectState.fieldErrors["title"]}
                    id="projectTitle"
                    label="Working title"
                  >
                    <input
                      defaultValue={
                        detail.project_details
                          ? `${projectTypeLabels[detail.project_details.project_type as keyof typeof projectTypeLabels] ?? "Project"} for ${lead.full_name}`
                          : lead.summary
                      }
                      id="projectTitle"
                      maxLength={200}
                      name="title"
                      type="text"
                    />
                  </Field>
                  <Field id="projectPhase" label="Starting phase">
                    <select defaultValue="planning" id="projectPhase" name="phase">
                      {projectPhasesForConversion.map((phase) => (
                        <option key={phase} value={phase}>
                          {phase.charAt(0).toUpperCase() + phase.slice(1)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="projectPriority" label="Priority">
                    <select defaultValue="medium" id="projectPriority" name="priority">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </Field>
                  <Field id="projectStart" label="Planned start (optional)">
                    <input id="projectStart" name="startDate" type="date" />
                  </Field>
                </div>
                <Field id="projectDescription" label="Description">
                  <textarea
                    defaultValue={lead.message ?? ""}
                    id="projectDescription"
                    maxLength={4000}
                    name="description"
                    rows={4}
                  />
                </Field>
                <div className="form-actions">
                  <Button disabled={projectPending} tone="primary" type="submit">
                    {projectPending ? "Creating…" : "Create operational project"}
                  </Button>
                </div>
                <ActionAlert state={projectState} />
              </form>
            ) : (
              <p className="quiet-empty">
                Creating a project needs leads.convert and operations.projects.write.
              </p>
            )}
          </section>

          {lead.lead_type === "material" ? (
            <section aria-labelledby="conversion-materials-heading" className="admin-panel">
              <div className="section-heading-row section-heading-compact">
                <h2 id="conversion-materials-heading">3. Material requirements</h2>
                <StatusBadge tone={detail.requirements_created > 0 ? "ready" : "review"}>
                  {detail.requirements_created > 0
                    ? `${detail.requirements_created} created`
                    : "None yet"}
                </StatusBadge>
              </div>
              {!detail.operational_project ? (
                <p className="quiet-empty">
                  Create the operational project first. Requirements are created as drafts on the
                  project; no purchase order or supplier order is created.
                </p>
              ) : permissions.convert && permissions.materials_write && !readOnly ? (
                <form action={requirementsAction} className="admin-form">
                  <input name="id" type="hidden" value={lead.id} />
                  <input name="expectedVersion" type="hidden" value={version} />
                  <p className="field-help">
                    Select the enquiry items to carry over and edit them before saving. Each becomes
                    a <strong>draft</strong> project material requirement — nothing is ordered.
                  </p>
                  <ol className="lead-requirement-editor">
                    {detail.material_items.map((item, index) => (
                      <li key={item.id}>
                        <label className="checkbox-row">
                          <input name={`select_${index}`} type="checkbox" /> Include item{" "}
                          {item.sort_order}
                        </label>
                        <div className="field-grid field-grid-two">
                          <Field id={`item_${index}_name`} label="Item">
                            <input
                              defaultValue={item.description.slice(0, 200)}
                              id={`item_${index}_name`}
                              maxLength={200}
                              name={`item_${index}_name`}
                              type="text"
                            />
                          </Field>
                          <Field id={`item_${index}_quantity`} label="Quantity">
                            <input
                              defaultValue={
                                item.quantity === null || item.quantity === undefined
                                  ? ""
                                  : String(item.quantity)
                              }
                              id={`item_${index}_quantity`}
                              min={0}
                              name={`item_${index}_quantity`}
                              step="any"
                              type="number"
                            />
                          </Field>
                          <Field id={`item_${index}_unit`} label="Unit">
                            <input
                              defaultValue={item.unit ?? ""}
                              id={`item_${index}_unit`}
                              maxLength={40}
                              name={`item_${index}_unit`}
                              type="text"
                            />
                          </Field>
                          <Field id={`item_${index}_required_by`} label="Required by">
                            <input
                              id={`item_${index}_required_by`}
                              name={`item_${index}_required_by`}
                              type="date"
                            />
                          </Field>
                          <Field id={`item_${index}_priority`} label="Priority">
                            <select
                              defaultValue="medium"
                              id={`item_${index}_priority`}
                              name={`item_${index}_priority`}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </Field>
                          <Field id={`item_${index}_specification`} label="Specification">
                            <input
                              defaultValue={item.specification ?? ""}
                              id={`item_${index}_specification`}
                              maxLength={2000}
                              name={`item_${index}_specification`}
                              type="text"
                            />
                          </Field>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="form-actions">
                    <Button disabled={requirementsPending} tone="primary" type="submit">
                      {requirementsPending ? "Creating…" : "Create material requirements"}
                    </Button>
                  </div>
                  <ActionAlert state={requirementsState} />
                </form>
              ) : (
                <p className="quiet-empty">
                  Creating requirements needs leads.convert and procurement.materials.write.
                </p>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {permissions.assign && !readOnly ? (
        <section aria-labelledby="lead-assign-heading" className="admin-panel lead-assign-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="lead-assign-heading">Assignment</h2>
          </div>
          <form action={assignAction} className="admin-form lead-assign-form">
            <input name="id" type="hidden" value={lead.id} />
            <input name="expectedVersion" type="hidden" value={version} />
            <Field id="assignee" label="Assigned staff">
              <select defaultValue={lead.assigned_to ?? ""} id="assignee" name="assignee">
                <option value="">Unassigned</option>
                {assignees.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name ?? member.id}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-actions">
              <Button disabled={assignPending} tone="secondary" type="submit">
                {assignPending ? "Saving…" : "Save assignment"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
