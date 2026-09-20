"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { useDraftFields } from "@/features/admin-shared/use-draft-fields";
import type { ProjectContractors } from "@/features/assignments/assignment-contract";
import { ProjectContractorsPanel } from "@/features/assignments/components/project-contractors-panel";
import { RelationshipInvoicesPanel } from "@/features/invoices/components/relationship-invoices";
import type { RelationshipInvoices } from "@/features/invoices/invoice-contract";
import { ProjectDeliverySummaryPanel } from "@/features/procurement/components/project-delivery-summary";
import { ProjectProcurementPanel } from "@/features/procurement/components/project-procurement-panel";
import type {
  ProjectDeliverySummary,
  ProjectProcurement,
} from "@/features/procurement/procurement-contract";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { useRecordRecentlyViewed } from "@/features/admin-shared/use-record-recently-viewed";
import {
  archiveProjectAction,
  changeProjectPhaseAction,
  changeProjectPriorityAction,
  changeProjectStatusAction,
  createCaseStudyDraftFromProjectAction,
  createProjectNoteAction,
  linkCaseStudyAction,
  unlinkCaseStudyAction,
  updateProjectAction,
} from "@/features/operational-projects/project-actions";
import {
  initialAdminActionState,
  projectHealth,
  projectHealthLabels,
  projectPhaseLabels,
  projectPhases,
  projectPriorities,
  projectPriorityLabels,
  projectStatusLabels,
  projectStatuses,
  type OperationalProjectDetail,
} from "@/features/operational-projects/project-contract";

function formatBudget(amount: string | number | null, currency: string | null): string {
  if (amount === null || currency === null) return "Not set";
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return `${currency} ${new Intl.NumberFormat("en").format(numeric)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

function priorityTone(priority: string): "ready" | "review" | "blocked" {
  if (priority === "high") return "blocked";
  if (priority === "medium") return "review";
  return "ready";
}

function healthTone(health: "on_track" | "attention" | "overdue"): "ready" | "review" | "blocked" {
  if (health === "overdue") return "blocked";
  if (health === "attention") return "review";
  return "ready";
}

function caseStudyLabel(status: string | null): string {
  if (status === "published") return "published";
  if (status === "archived") return "archived";
  return "draft";
}

function caseStudyDisplayLabel(status: string | null): string {
  const label = caseStudyLabel(status);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function caseStudyTone(status: string | null): "draft" | "published" | "archived" | "neutral" {
  if (status === "published") return "published";
  if (status === "archived") return "archived";
  if (status === "draft") return "draft";
  return "neutral";
}

type Section =
  | "overview"
  | "status"
  | "invoices"
  | "contractors"
  | "procurement"
  | "notes"
  | "case-study"
  | "activity";

const sectionNames: readonly Section[] = [
  "overview",
  "status",
  "invoices",
  "contractors",
  "procurement",
  "notes",
  "case-study",
  "activity",
];

export function ProjectCommandCenter({
  detail,
  canWrite,
  originatingLead,
  invoices,
  finance,
  contractors,
  procurement,
  deliverySummary,
  delivery,
  initialSection,
}: Readonly<{
  detail: OperationalProjectDetail;
  canWrite: boolean;
  invoices?: RelationshipInvoices | null | undefined;
  finance?: Readonly<{ read: boolean; write: boolean }> | undefined;
  contractors?: ProjectContractors | null | undefined;
  procurement?: ProjectProcurement | null | undefined;
  deliverySummary?: ProjectDeliverySummary | null | undefined;
  /** C8: the lead this project was created from, when any (leads.read). */
  originatingLead?:
    Readonly<{ id: string; reference: string; full_name: string }> | null | undefined;
  /** C6 delivery permissions; every flag false hides the matching tab. */
  delivery?:
    | Readonly<{
        partnersRead: boolean;
        assign: boolean;
        materialsRead: boolean;
        materialsWrite: boolean;
        ordersRead: boolean;
        ordersWrite: boolean;
      }>
    | undefined;
  /** Deep-link target (`?tab=`), validated against the visible sections. */
  initialSection?: string | undefined;
}>) {
  const { connectionState } = useAdminRealtimeInvalidation([
    "operational_project",
    "invoice",
    "contractor_assignment",
    "purchase_order",
    "material_requirement",
  ]);
  const showContractors = Boolean(delivery?.partnersRead);
  const showProcurement = Boolean(delivery?.materialsRead || delivery?.ordersRead);
  const [section, setSection] = useState<Section>(() => {
    const wanted = sectionNames.find((name) => name === initialSection);
    if (!wanted) return "overview";
    if (wanted === "contractors" && !showContractors) return "overview";
    if (wanted === "procurement" && !showProcurement) return "overview";
    if (wanted === "invoices" && !finance?.read) return "overview";
    return wanted;
  });
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [showCaseStudyDraftForm, setShowCaseStudyDraftForm] = useState(false);
  const [showCaseStudyLinkForm, setShowCaseStudyLinkForm] = useState(false);

  const [updateState, updateAction, updatePending] = useActionState(
    updateProjectAction,
    initialAdminActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    changeProjectStatusAction,
    initialAdminActionState,
  );
  const [phaseState, phaseAction, phasePending] = useActionState(
    changeProjectPhaseAction,
    initialAdminActionState,
  );
  const [priorityState, priorityAction, priorityPending] = useActionState(
    changeProjectPriorityAction,
    initialAdminActionState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveProjectAction,
    initialAdminActionState,
  );
  const [noteState, noteAction, notePending] = useActionState(
    createProjectNoteAction,
    initialAdminActionState,
  );
  const [linkState, linkAction, linkPending] = useActionState(
    linkCaseStudyAction,
    initialAdminActionState,
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkCaseStudyAction,
    initialAdminActionState,
  );
  const [draftState, draftAction, draftPending] = useActionState(
    createCaseStudyDraftFromProjectAction,
    initialAdminActionState,
  );

  const project = detail.project;
  const health = projectHealth(project);
  const edit = usePinnedEdit(
    project.version,
    updateState.status === "success" ? updateState.currentVersion : null,
  );
  const { editing } = edit;
  const draft = useDraftFields(
    {
      title: project.title,
      description: project.description ?? "",
      startDate: project.start_date ?? "",
      endDate: project.end_date ?? "",
      budgetAmount: project.budget_amount === null ? "" : String(project.budget_amount),
      budgetCurrency: project.budget_currency ?? "",
    },
    edit.formKey,
  );

  useRecordRecentlyViewed({
    kind: "project",
    id: project.id,
    label: project.title,
    href: `/admin/operations/projects/${project.id}`,
  });

  // Quick commands (status/phase/priority/link/unlink/draft/archive) always
  // target the newest version this page knows about: the server-rendered
  // record, or any later version a command result reported (including the
  // `current_version` a conflict carries). Each command is an explicit intent
  // rather than a stale field set, so following the latest version is safe.
  const latestVersion = Math.max(
    project.version,
    ...[
      updateState,
      statusState,
      phaseState,
      priorityState,
      linkState,
      unlinkState,
      draftState,
    ].map((state) => state.currentVersion ?? 0),
  );

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
  const [prevDraftState, setPrevDraftState] = useState(draftState);
  if (draftState !== prevDraftState) {
    setPrevDraftState(draftState);
    if (draftState.status === "success" && showCaseStudyDraftForm) setShowCaseStudyDraftForm(false);
  }
  const [prevLinkState, setPrevLinkState] = useState(linkState);
  if (linkState !== prevLinkState) {
    setPrevLinkState(linkState);
    if (linkState.status === "success" && showCaseStudyLinkForm) setShowCaseStudyLinkForm(false);
  }

  return (
    <div className="project-command-center admin-record-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Operational Project{" "}
            {connectionState === "connected" ? (
              <span className="realtime-dot" title="Live updates connected" />
            ) : null}
          </p>
          <h1>{project.title}</h1>
          <p className="page-description">
            <Link href={`/admin/operations/clients/${detail.client.id}`}>
              {detail.client.full_name}
            </Link>{" "}
            · <StatusBadge tone="neutral">{projectStatusLabels[project.status]}</StatusBadge>{" "}
            <StatusBadge tone="neutral">{projectPhaseLabels[project.current_phase]}</StatusBadge>{" "}
            <StatusBadge tone={priorityTone(project.priority)}>
              {projectPriorityLabels[project.priority]}
            </StatusBadge>{" "}
            {health ? (
              <StatusBadge tone={healthTone(health)}>{projectHealthLabels[health]}</StatusBadge>
            ) : null}{" "}
            {project.archived_at ? <StatusBadge tone="archived">Archived</StatusBadge> : null}
          </p>
          <p className="page-meta">
            <span>
              {project.start_date || project.end_date
                ? `${project.start_date ? formatDate(project.start_date) : "No start"} → ${
                    project.end_date ? formatDate(project.end_date) : "No end date"
                  }`
                : "No dates set"}
            </span>
            <span>Budget {formatBudget(project.budget_amount, project.budget_currency)}</span>
            <span>
              {detail.case_study
                ? `Case study ${caseStudyLabel(detail.case_study.publication_status)}`
                : "No public case study"}
            </span>
            {originatingLead ? (
              <span>
                From lead{" "}
                <Link href={`/admin/operations/leads/${originatingLead.id}`}>
                  {originatingLead.reference}
                </Link>
              </span>
            ) : null}
          </p>
        </div>
        <div className="page-actions">
          <Link
            className="button button-quiet"
            href={`/admin/operations/clients/${detail.client.id}`}
          >
            Open Client
          </Link>
          {canWrite && !project.archived_at ? (
            <>
              <Button
                onClick={() => (editing ? edit.closeEdit() : edit.openEdit())}
                tone="secondary"
                type="button"
              >
                {editing ? "Close edit" : "Edit"}
              </Button>
              <Button onClick={() => setConfirmingArchive(true)} tone="danger" type="button">
                Archive
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <dl className="definition-register">
        <div>
          <dt>Dates</dt>
          <dd>
            {project.start_date ? formatDate(project.start_date) : "No start date"} —{" "}
            {project.end_date ? formatDate(project.end_date) : "No end date"}
          </dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{formatBudget(project.budget_amount, project.budget_currency)}</dd>
        </div>
        <div>
          <dt>Public case study</dt>
          <dd>
            {detail.case_study ? (
              <StatusBadge tone={caseStudyTone(detail.case_study.publication_status)}>
                {caseStudyDisplayLabel(detail.case_study.publication_status)}
              </StatusBadge>
            ) : (
              "Not linked"
            )}
          </dd>
        </div>
      </dl>

      {confirmingArchive ? (
        <Alert live tone="warning">
          <p>
            Archive {project.title}? Archived projects keep their client relationship, history, and
            case study link, but will not appear in the active register.
          </p>
          <form action={archiveAction}>
            <input name="projectId" type="hidden" value={project.id} />
            <input name="expectedVersion" type="hidden" value={latestVersion} />
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
          <input name="projectId" type="hidden" value={project.id} />
          <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
          {edit.outdated && updateState.status !== "conflict" ? (
            <Alert live tone="warning">
              <p>
                Another staff member updated this project while you were editing. Saving now will be
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
          <Field error={updateState.fieldErrors["title"]} id="title" label="Project title">
            <input {...draft.field("title")} id="title" maxLength={200} type="text" />
          </Field>
          <Field id="description" label="Description">
            <textarea {...draft.field("description")} id="description" maxLength={4000} rows={3} />
          </Field>
          <div className="field-grid field-grid-two">
            <Field error={updateState.fieldErrors["startDate"]} id="startDate" label="Start date">
              <input {...draft.field("startDate")} id="startDate" type="date" />
            </Field>
            <Field error={updateState.fieldErrors["endDate"]} id="endDate" label="End date">
              <input {...draft.field("endDate")} id="endDate" type="date" />
            </Field>
          </div>
          <div className="field-grid field-grid-two">
            <Field
              error={updateState.fieldErrors["budgetAmount"]}
              id="budgetAmount"
              label="Budget amount"
            >
              <input
                {...draft.field("budgetAmount")}
                id="budgetAmount"
                inputMode="decimal"
                type="text"
              />
            </Field>
            <Field
              error={updateState.fieldErrors["budgetCurrency"]}
              id="budgetCurrency"
              label="Budget currency"
            >
              <input
                {...draft.field("budgetCurrency")}
                id="budgetCurrency"
                maxLength={3}
                style={{ textTransform: "uppercase" }}
                type="text"
              />
            </Field>
          </div>
          {updateState.status === "conflict" ? (
            <Alert live tone="warning">
              <p>
                Another staff member saved changes to this project first. Your edits are still
                shown.
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

      <nav aria-label="Project sections" className="record-tabs">
        {(
          [
            "overview",
            "status",
            ...(finance?.read ? (["invoices"] as const) : []),
            ...(showContractors ? (["contractors"] as const) : []),
            ...(showProcurement ? (["procurement"] as const) : []),
            "notes",
            "case-study",
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
              : tab === "status"
                ? "Status & Phase"
                : tab === "invoices"
                  ? "Invoices"
                  : tab === "contractors"
                    ? "Contractors"
                    : tab === "procurement"
                      ? "Procurement"
                      : tab === "notes"
                        ? "Notes"
                        : tab === "case-study"
                          ? "Public Case Study"
                          : "Activity"}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <>
          <dl className="definition-register">
            <div>
              <dt>Description</dt>
              <dd>{project.description ?? "No description on file"}</dd>
            </div>
            <div>
              <dt>Client tier</dt>
              <dd>{detail.client.client_tier}</dd>
            </div>
            <div>
              <dt>Client state</dt>
              <dd>{detail.client.archived_at ? "Archived" : "Active"}</dd>
            </div>
          </dl>
          <ProjectDeliverySummaryPanel summary={deliverySummary ?? null} />
        </>
      ) : null}

      {section === "contractors" && showContractors ? (
        <ProjectContractorsPanel
          canAssign={Boolean(delivery?.assign) && !project.archived_at}
          data={contractors ?? null}
          projectId={project.id}
        />
      ) : null}

      {section === "procurement" && showProcurement ? (
        <ProjectProcurementPanel
          data={procurement ?? null}
          permissions={{
            materialsWrite: Boolean(delivery?.materialsWrite) && !project.archived_at,
            ordersWrite: Boolean(delivery?.ordersWrite) && !project.archived_at,
            ordersRead: Boolean(delivery?.ordersRead),
          }}
          projectId={project.id}
        />
      ) : null}

      {section === "status" ? (
        <div className="notes-workspace">
          {canWrite && !project.archived_at ? (
            <div className="field-grid field-grid-three">
              <form action={statusAction}>
                <input name="projectId" type="hidden" value={project.id} />
                <input name="expectedVersion" type="hidden" value={latestVersion} />
                <Field id="nextStatus" label="Change status">
                  <select defaultValue={project.status} id="nextStatus" name="nextStatus">
                    {projectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {projectStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button disabled={statusPending} tone="secondary" type="submit">
                  {statusPending ? "Updating…" : "Update status"}
                </Button>
              </form>
              <form action={phaseAction}>
                <input name="projectId" type="hidden" value={project.id} />
                <input name="expectedVersion" type="hidden" value={latestVersion} />
                <Field id="nextPhase" label="Change phase">
                  <select defaultValue={project.current_phase} id="nextPhase" name="nextPhase">
                    {projectPhases.map((phase) => (
                      <option key={phase} value={phase}>
                        {projectPhaseLabels[phase]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button disabled={phasePending} tone="secondary" type="submit">
                  {phasePending ? "Updating…" : "Update phase"}
                </Button>
              </form>
              <form action={priorityAction}>
                <input name="projectId" type="hidden" value={project.id} />
                <input name="expectedVersion" type="hidden" value={latestVersion} />
                <Field id="nextPriority" label="Change priority">
                  <select defaultValue={project.priority} id="nextPriority" name="nextPriority">
                    {projectPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {projectPriorityLabels[priority]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button disabled={priorityPending} tone="secondary" type="submit">
                  {priorityPending ? "Updating…" : "Update priority"}
                </Button>
              </form>
            </div>
          ) : null}
          {statusState.status === "conflict" || statusState.status === "error" ? (
            <Alert live tone={statusState.status === "conflict" ? "warning" : "danger"}>
              <p>{statusState.message}</p>
            </Alert>
          ) : null}
          {phaseState.status === "conflict" || phaseState.status === "error" ? (
            <Alert live tone={phaseState.status === "conflict" ? "warning" : "danger"}>
              <p>{phaseState.message}</p>
            </Alert>
          ) : null}
          {priorityState.status === "conflict" || priorityState.status === "error" ? (
            <Alert live tone={priorityState.status === "conflict" ? "warning" : "danger"}>
              <p>{priorityState.message}</p>
            </Alert>
          ) : null}

          <div className="section-heading-row">
            <h2>Status history</h2>
          </div>
          {detail.status_history.length > 0 ? (
            <ul className="activity-list">
              {detail.status_history.map((entry, index) => (
                <li key={`status-${index}`}>
                  <div>
                    <strong>
                      {entry.from_status
                        ? (projectStatusLabels[
                            entry.from_status as keyof typeof projectStatusLabels
                          ] ?? entry.from_status)
                        : "Created"}
                      {" → "}
                      {projectStatusLabels[entry.to_status as keyof typeof projectStatusLabels] ??
                        entry.to_status}
                    </strong>
                    <span>{entry.actor ?? "Staff member"}</span>
                  </div>
                  <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No status history yet.</p>
          )}

          <div className="section-heading-row">
            <h2>Phase history</h2>
          </div>
          {detail.phase_history.length > 0 ? (
            <ul className="activity-list">
              {detail.phase_history.map((entry, index) => (
                <li key={`phase-${index}`}>
                  <div>
                    <strong>
                      {entry.from_phase
                        ? (projectPhaseLabels[
                            entry.from_phase as keyof typeof projectPhaseLabels
                          ] ?? entry.from_phase)
                        : "Created"}
                      {" → "}
                      {projectPhaseLabels[entry.to_phase as keyof typeof projectPhaseLabels] ??
                        entry.to_phase}
                    </strong>
                    <span>{entry.actor ?? "Staff member"}</span>
                  </div>
                  <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No phase history yet.</p>
          )}
        </div>
      ) : null}

      {section === "notes" ? (
        <div className="notes-workspace">
          {canWrite && !project.archived_at ? (
            <form action={noteAction} className="admin-form">
              <input name="projectId" type="hidden" value={project.id} />
              <Field id="noteBody" label="Add a note">
                <textarea id="noteBody" maxLength={4000} name="body" required rows={3} />
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
                  <time dateTime={note.created_at}>{formatDate(note.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No notes recorded yet.</p>
          )}
        </div>
      ) : null}

      {section === "case-study" ? (
        <div className="notes-workspace">
          {detail.case_study ? (
            <>
              <dl className="definition-register">
                <div>
                  <dt>State</dt>
                  <dd>
                    <StatusBadge tone={caseStudyTone(detail.case_study.publication_status)}>
                      {caseStudyDisplayLabel(detail.case_study.publication_status)}
                    </StatusBadge>
                  </dd>
                </div>
                <div>
                  <dt>Title</dt>
                  <dd>{detail.case_study.title ?? "Untitled draft"}</dd>
                </div>
              </dl>
              <div className="form-actions">
                <Link
                  className="button button-secondary"
                  href={`/admin/content/projects/${detail.case_study.id}`}
                >
                  Open Editor
                </Link>
                <Link
                  className="button button-secondary"
                  href={`/admin/content/projects/${detail.case_study.id}/preview`}
                >
                  Preview
                </Link>
                {detail.case_study.publication_status === "published" && detail.case_study.slug ? (
                  <Link
                    className="button button-quiet"
                    href={`/projects/${detail.case_study.slug}`}
                    target="_blank"
                  >
                    View public
                  </Link>
                ) : null}
                {canWrite && !project.archived_at ? (
                  <form action={unlinkAction}>
                    <input name="projectId" type="hidden" value={project.id} />
                    <input name="expectedVersion" type="hidden" value={latestVersion} />
                    <Button disabled={unlinkPending} tone="danger" type="submit">
                      {unlinkPending ? "Unlinking…" : "Unlink"}
                    </Button>
                  </form>
                ) : null}
              </div>
              {unlinkState.status === "error" || unlinkState.status === "conflict" ? (
                <Alert live tone="danger">
                  <p>{unlinkState.message}</p>
                </Alert>
              ) : null}
            </>
          ) : (
            <>
              <p className="quiet-empty">
                No public case study is linked to this project. A draft prefills only safe,
                public-facing information — never client identity, contact details, budget, or
                private notes.
              </p>
              {canWrite && !project.archived_at ? (
                <div className="form-actions">
                  <Button
                    onClick={() => setShowCaseStudyDraftForm((value) => !value)}
                    tone="secondary"
                    type="button"
                  >
                    {showCaseStudyDraftForm ? "Close" : "Create Draft"}
                  </Button>
                  <Button
                    onClick={() => setShowCaseStudyLinkForm((value) => !value)}
                    tone="secondary"
                    type="button"
                  >
                    {showCaseStudyLinkForm ? "Close" : "Link Existing"}
                  </Button>
                </div>
              ) : null}
              {showCaseStudyDraftForm ? (
                <form action={draftAction} className="admin-form">
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="expectedVersion" type="hidden" value={latestVersion} />
                  <input name="locale" type="hidden" value="en" />
                  <Field error={draftState.fieldErrors["title"]} id="csTitle" label="Working title">
                    <input id="csTitle" maxLength={160} name="title" required type="text" />
                  </Field>
                  <Field
                    error={draftState.fieldErrors["slug"]}
                    hint="Lowercase words separated by hyphens."
                    id="csSlug"
                    label="Slug"
                  >
                    <input id="csSlug" maxLength={120} name="slug" required type="text" />
                  </Field>
                  {draftState.status === "error" ? (
                    <Alert live tone="danger">
                      <p>{draftState.message}</p>
                    </Alert>
                  ) : null}
                  <div className="form-actions">
                    <Button disabled={draftPending} tone="primary" type="submit">
                      {draftPending ? "Creating…" : "Create draft"}
                    </Button>
                  </div>
                </form>
              ) : null}
              {showCaseStudyLinkForm ? (
                <form action={linkAction} className="admin-form">
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="expectedVersion" type="hidden" value={latestVersion} />
                  <Field
                    error={linkState.fieldErrors["caseStudyId"]}
                    hint="Paste the public project's id from the Website → Projects register."
                    id="caseStudyId"
                    label="Case study id"
                  >
                    <input id="caseStudyId" name="caseStudyId" required type="text" />
                  </Field>
                  {linkState.status === "error" ? (
                    <Alert live tone="danger">
                      <p>{linkState.message}</p>
                    </Alert>
                  ) : null}
                  <div className="form-actions">
                    <Button disabled={linkPending} tone="primary" type="submit">
                      {linkPending ? "Linking…" : "Link case study"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {section === "invoices" && finance?.read ? (
        <RelationshipInvoicesPanel
          canWrite={finance.write && !project.archived_at && !detail.client.archived_at}
          createHref={`/admin/finance/invoices/new?project=${project.id}`}
          data={invoices ?? null}
          scopeLabel="project"
        />
      ) : null}

      {section === "activity" ? (
        detail.activity.length > 0 ? (
          <ul className="activity-list">
            {detail.activity.map((entry, index) => (
              <li key={`${entry.action}-${index}`}>
                <div>
                  <strong>{formatProjectActivity(entry.action)}</strong>
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

function formatProjectActivity(action: string): string {
  const labels: Readonly<Record<string, string>> = {
    "operational_project.create": "Project created",
    "operational_project.update": "Project updated",
    "operational_project.status_change": "Status changed",
    "operational_project.phase_change": "Phase changed",
    "operational_project.priority_change": "Priority changed",
    "operational_project.case_study_link": "Case study linked",
    "operational_project.case_study_unlink": "Case study unlinked",
    "operational_project.archive": "Project archived",
    "operational_project.note_create": "Note added",
    "invoice.issue": "Invoice issued",
    "invoice.paid": "Invoice paid",
    "invoice.void": "Invoice voided",
  };
  return labels[action] ?? action;
}
