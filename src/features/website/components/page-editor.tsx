"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import {
  addWebsiteSectionAction,
  archiveWebsitePageAction,
  deleteWebsiteSectionAction,
  duplicateWebsiteSectionAction,
  moveWebsiteSectionAction,
  publishWebsitePageAction,
  restoreWebsiteRevisionAction,
  saveWebsiteSectionAction,
  unpublishWebsitePageAction,
  updateWebsitePageAction,
} from "@/features/website/actions";
import { MediaPicker } from "@/features/website/components/media-picker";
import { SectionFields } from "@/features/website/components/section-form";
import type { EditorSection, PageDetail } from "@/features/website/contracts";
import {
  addableSectionTypes,
  getSectionType,
  sectionMotions,
  sectionSpacings,
  sectionToneLabels,
  sectionTones,
} from "@/features/website/section-registry";

type Pane = "sections" | "edit" | "publish";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function sectionTitle(section: EditorSection): string {
  const definition = getSectionType(section.type);
  const config = section.config;
  const heading =
    typeof config["heading"] === "string"
      ? config["heading"]
      : typeof config["title"] === "string"
        ? config["title"]
        : Array.isArray(config["headline_lines"])
          ? (config["headline_lines"] as string[]).join(" ")
          : null;
  return (
    section.label ??
    (heading
      ? `${definition?.label ?? section.type} — ${heading.slice(0, 48)}`
      : (definition?.label ?? section.type))
  );
}

/**
 * Page editor (CR1 §100–105): sections on the left, the selected section
 * or the page settings in the centre, status / publish / history on the
 * right. On narrow screens the three panes become tabs. Every change is a
 * draft until Publish; Preview renders the draft with the real site.
 */
export function PageEditor({ detail }: Readonly<{ detail: PageDetail }>) {
  const router = useRouter();
  const { page, permissions } = detail;
  const [pane, setPane] = useState<Pane>("sections");
  const [selected, setSelected] = useState<string>(detail.sections[0]?.id ?? "settings");
  const [notice, setNotice] = useState<AdminActionState | null>(null);
  const [pending, startTransition] = useTransition();
  const [pageVersion, setPageVersion] = useState(page.version);
  const [dirty, setDirty] = useState(false);
  const [summary, setSummary] = useState("");
  const [addType, setAddType] = useState<string>("");

  // A fresh server render carries the authoritative version (React's
  // "adjust state during render" pattern; no effect needed).
  const [seenPageVersion, setSeenPageVersion] = useState(page.version);
  if (seenPageVersion !== page.version) {
    setSeenPageVersion(page.version);
    setPageVersion(page.version);
  }

  // Warn before leaving a dirty editor (CR1 §104) — never on a clean one.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const selectedSection = detail.sections.find((section) => section.id === selected) ?? null;
  const addable = addableSectionTypes(page.page_type);
  const isGlobal = page.page_type === "global";
  const publicHref = isGlobal ? null : page.path;
  const previewHref = `/preview/website/${page.id}`;

  function run(action: () => Promise<AdminActionState>): void {
    startTransition(async () => {
      const result = await action();
      setNotice(result);
      if (result.currentVersion) setPageVersion(result.currentVersion);
      if (result.status === "success" || result.status === "conflict") router.refresh();
    });
  }

  function layout(action: () => Promise<AdminActionState>): void {
    if (dirty && !window.confirm("You have unsaved section changes. Continue and lose them?"))
      return;
    setDirty(false);
    run(action);
  }

  return (
    <div className={`page-editor page-editor-pane-${pane}`} data-dirty={dirty ? "true" : undefined}>
      <nav aria-label="Editor panes" className="page-editor-tabs">
        {(["sections", "edit", "publish"] as const).map((entry) => (
          <button
            aria-current={pane === entry ? "true" : undefined}
            className="page-editor-tab"
            key={entry}
            onClick={() => setPane(entry)}
            type="button"
          >
            {entry === "sections" ? "Sections" : entry === "edit" ? "Edit" : "Publish"}
          </button>
        ))}
      </nav>

      {notice && notice.status !== "idle" ? (
        <div className="page-editor-notice">
          <Alert
            live
            title={
              notice.status === "success"
                ? "Done"
                : notice.status === "conflict"
                  ? "Someone else saved first"
                  : "Not saved"
            }
            tone={
              notice.status === "success"
                ? "success"
                : notice.status === "conflict"
                  ? "warning"
                  : "danger"
            }
          >
            {notice.message}
            {notice.reauthHref ? (
              <>
                {" "}
                <Link href={notice.reauthHref}>Sign in again</Link>
              </>
            ) : null}
          </Alert>
        </div>
      ) : null}

      {/* LEFT — structure */}
      <aside aria-label="Page sections" className="page-editor-structure">
        <div className="page-editor-structure-head">
          <p className="datum-label">Sections</p>
          <p className="field-help">
            {isGlobal
              ? "Global content used across the website."
              : "Top to bottom, as visitors see them. Changes remain private until you publish."}
          </p>
        </div>
        <ol className="page-editor-section-list">
          {detail.sections.map((section, index) => {
            const definition = getSectionType(section.type);
            return (
              <li
                className={`page-editor-section${section.hidden ? " is-hidden" : ""}`}
                data-selected={selected === section.id ? "true" : undefined}
                key={section.id}
              >
                <button
                  aria-current={selected === section.id ? "true" : undefined}
                  className="page-editor-section-select"
                  onClick={() => {
                    setSelected(section.id);
                    setPane("edit");
                  }}
                  type="button"
                >
                  <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
                  <span className="page-editor-section-title">
                    <strong>{sectionTitle(section)}</strong>
                    <small>
                      {definition?.label ?? section.type}
                      {section.locked ? " · System module" : ""}
                      {section.hidden ? " · Hidden" : ""}
                    </small>
                  </span>
                </button>
                {permissions.can_layout ? (
                  <div
                    className="page-editor-section-actions"
                    role="group"
                    aria-label={`Arrange ${sectionTitle(section)}`}
                  >
                    <Button
                      aria-label="Move up"
                      disabled={pending || index === 0}
                      onClick={() =>
                        layout(() =>
                          moveWebsiteSectionAction(page.id, section.id, pageVersion, "up"),
                        )
                      }
                      tone="quiet"
                    >
                      ↑
                    </Button>
                    <Button
                      aria-label="Move down"
                      disabled={pending || index === detail.sections.length - 1}
                      onClick={() =>
                        layout(() =>
                          moveWebsiteSectionAction(page.id, section.id, pageVersion, "down"),
                        )
                      }
                      tone="quiet"
                    >
                      ↓
                    </Button>
                    {!section.locked && !isGlobal ? (
                      <>
                        <Button
                          aria-label="Duplicate"
                          disabled={pending}
                          onClick={() =>
                            layout(() =>
                              duplicateWebsiteSectionAction(page.id, section.id, pageVersion),
                            )
                          }
                          tone="quiet"
                        >
                          ⧉
                        </Button>
                        <Button
                          aria-label="Remove section"
                          disabled={pending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove “${sectionTitle(section)}” from the draft? It stays in the revision history.`,
                              )
                            ) {
                              layout(() =>
                                deleteWebsiteSectionAction(page.id, section.id, pageVersion),
                              );
                              if (selected === section.id) setSelected("settings");
                            }
                          }}
                          tone="quiet"
                        >
                          ×
                        </Button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        {permissions.can_layout && addable.length > 0 ? (
          <div className="page-editor-add">
            <label className="field-group" htmlFor="add-section-type">
              <span className="field-label">Add a section</span>
              <select
                id="add-section-type"
                onChange={(event) => setAddType(event.target.value)}
                value={addType}
              >
                <option value="">Choose a section type…</option>
                {addable.map((definition) => (
                  <option key={definition.key} value={definition.key}>
                    {definition.label}
                  </option>
                ))}
              </select>
            </label>
            {addType ? <p className="field-help">{getSectionType(addType)?.description}</p> : null}
            <Button
              disabled={pending || !addType}
              onClick={() =>
                layout(async () => {
                  const result = await addWebsiteSectionAction(page.id, pageVersion, addType, null);
                  if (result.createdId) {
                    setSelected(result.createdId);
                    setPane("edit");
                  }
                  return result;
                })
              }
              tone="secondary"
            >
              Add section
            </Button>
          </div>
        ) : null}
        <button
          className="page-editor-settings-link"
          data-selected={selected === "settings" ? "true" : undefined}
          onClick={() => {
            setSelected("settings");
            setPane("edit");
          }}
          type="button"
        >
          Page settings &amp; SEO
        </button>
      </aside>

      {/* CENTRE — editor */}
      <section aria-label="Editor" className="page-editor-main">
        {selected === "settings" || !selectedSection ? (
          <PageSettingsForm
            detail={detail}
            onDirty={setDirty}
            onSaved={(state) => {
              setNotice(state);
              if (state.currentVersion) setPageVersion(state.currentVersion);
              router.refresh();
            }}
          />
        ) : (
          <SectionEditor
            canWrite={permissions.can_write}
            key={selectedSection.id}
            onDirty={setDirty}
            onSaved={(state) => {
              setNotice(state);
              const pageVersionValue = Number(state.detail);
              if (Number.isInteger(pageVersionValue) && pageVersionValue > 0)
                setPageVersion(pageVersionValue);
              router.refresh();
            }}
            pageId={page.id}
            section={selectedSection}
          />
        )}
      </section>

      {/* RIGHT — status, publish, history */}
      <aside aria-label="Publishing" className="page-editor-status">
        <div className="page-editor-status-block">
          <p className="datum-label">Status</p>
          <p className="page-editor-status-line">
            <StatusBadge
              tone={
                page.status === "published"
                  ? "published"
                  : page.status === "archived"
                    ? "archived"
                    : "draft"
              }
            >
              {page.status === "published"
                ? "Published"
                : page.status === "archived"
                  ? "Archived"
                  : "Draft"}
            </StatusBadge>
            {page.status === "published" && page.has_draft_changes ? (
              <StatusBadge tone="review">Draft changes</StatusBadge>
            ) : null}
            {dirty ? <StatusBadge tone="blocked">Unsaved changes</StatusBadge> : null}
            {pending ? <StatusBadge tone="neutral">Saving…</StatusBadge> : null}
          </p>
          {page.published_at ? (
            <p className="field-help">
              Published revision {page.published_revision_no ?? "—"} on{" "}
              {formatDate(page.published_at)}
              {page.published_by ? ` by ${page.published_by}` : ""}.
            </p>
          ) : (
            <p className="field-help">Not published yet. Visitors cannot see this page.</p>
          )}
          <p className="field-help">
            Last edited {formatDate(page.updated_at)}
            {page.updated_by ? ` by ${page.updated_by}` : ""}.
          </p>
        </div>

        <div className="page-editor-status-block">
          <p className="datum-label">Preview and publish</p>
          <div className="page-editor-status-actions">
            <a
              className="button button-secondary"
              href={previewHref}
              rel="noreferrer"
              target="_blank"
            >
              Preview draft
            </a>
            {publicHref && page.status === "published" ? (
              <a className="button button-quiet" href={publicHref} rel="noreferrer" target="_blank">
                View published
              </a>
            ) : null}
          </div>
          {permissions.can_publish ? (
            <>
              <label className="field-group" htmlFor="publish-summary">
                <span className="field-label">What changed (optional)</span>
                <input
                  id="publish-summary"
                  maxLength={300}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="e.g. New hero headline"
                  type="text"
                  value={summary}
                />
              </label>
              <Button
                disabled={
                  pending ||
                  dirty ||
                  page.status === "archived" ||
                  (page.status === "published" && !page.has_draft_changes)
                }
                onClick={() =>
                  run(() => publishWebsitePageAction(page.id, page.path, pageVersion, summary))
                }
                tone="primary"
              >
                {page.status === "published" ? "Publish changes" : "Publish"}
              </Button>
              {dirty ? <p className="field-help">Save the section you are editing first.</p> : null}
              {page.status === "published" && page.page_type === "custom" ? (
                <Button
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Unpublish this page? Its address stops working for visitors; the draft and history are kept.",
                      )
                    ) {
                      run(() => unpublishWebsitePageAction(page.id, page.path, pageVersion));
                    }
                  }}
                  tone="danger"
                >
                  Unpublish
                </Button>
              ) : null}
              {page.status === "draft" && page.page_type === "custom" ? (
                <Button
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("Archive this page?"))
                      run(() => archiveWebsitePageAction(page.id, pageVersion));
                  }}
                  tone="quiet"
                >
                  Archive
                </Button>
              ) : null}
            </>
          ) : (
            <p className="field-help">You can prepare changes; a publisher makes them public.</p>
          )}
          {detail.dependencies.length > 0 ? (
            <p className="field-help">
              Linked from: {detail.dependencies.map((dependency) => dependency.label).join(", ")}.
            </p>
          ) : null}
        </div>

        {detail.health.length > 0 ? (
          <div className="page-editor-status-block">
            <p className="datum-label">Content health</p>
            <ul className="page-editor-health">
              {detail.health.map((entry, index) => (
                <li className={`health-${entry.severity}`} key={`${entry.code}-${index}`}>
                  {entry.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="page-editor-status-block">
          <p className="datum-label">Revision history</p>
          {detail.revisions.length === 0 ? (
            <p className="field-help">No revisions yet — the first publish creates one.</p>
          ) : (
            <ol className="page-editor-revisions">
              {detail.revisions.map((revision) => (
                <li key={revision.id}>
                  <div>
                    <strong>
                      Revision {revision.revision_no}
                      {revision.is_current ? " · Live" : ""}
                      {revision.kind === "restore_point" ? " · Restore point" : ""}
                    </strong>
                    <small>
                      {formatDate(revision.created_at)}
                      {revision.created_by ? ` · ${revision.created_by}` : ""}
                      {revision.summary ? ` · ${revision.summary}` : ""}
                    </small>
                  </div>
                  <div className="page-editor-revision-actions">
                    <a
                      className="button button-quiet"
                      href={`${previewHref}?revision=${revision.id}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Preview
                    </a>
                    {permissions.can_publish ? (
                      <Button
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Restore revision ${revision.revision_no} as the new draft? Nothing is deleted; the current draft is kept as a restore point.`,
                            )
                          ) {
                            layout(() =>
                              restoreWebsiteRevisionAction(page.id, pageVersion, revision.id),
                            );
                          }
                        }}
                        tone="quiet"
                      >
                        Restore as draft
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="page-editor-status-block page-editor-help">
          <p className="datum-label">How publishing works</p>
          <p className="field-help">
            Edit and save sections as a draft. Preview shows the draft with the real website.
            Publish makes the whole page live at once and keeps a revision you can restore later.
          </p>
        </div>
      </aside>
    </div>
  );
}

function metaOf(section: EditorSection) {
  return {
    variant: section.variant,
    tone: section.tone,
    spacing: section.spacing,
    motion: section.motion,
    hidden: section.hidden === true,
    label: section.label ?? "",
  };
}

function SectionEditor({
  section,
  pageId,
  canWrite,
  onDirty,
  onSaved,
}: Readonly<{
  section: EditorSection;
  pageId: string;
  canWrite: boolean;
  onDirty: (dirty: boolean) => void;
  onSaved: (state: AdminActionState) => void;
}>) {
  const definition = getSectionType(section.type);
  const [config, setConfig] = useState<Record<string, unknown>>(section.config);
  const [meta, setMeta] = useState(metaOf(section));
  const clean = useMemo(
    () => JSON.stringify({ config: section.config, meta: metaOf(section) }),
    [section],
  );
  const dirty = JSON.stringify({ config, meta }) !== clean;

  // A newer server version of this section (own save, restore, reorder,
  // someone else's save) replaces the local copy only when nothing is
  // unsaved; unsaved edits stay so a conflict never silently discards them.
  // (React's "adjust state during render" pattern — the editor stays
  // mounted, so the save result below still reaches the owner.)
  const [seenVersion, setSeenVersion] = useState(section.version);
  const [seenClean, setSeenClean] = useState(clean);
  if (seenVersion !== section.version) {
    setSeenVersion(section.version);
    if (JSON.stringify({ config, meta }) === seenClean) {
      setConfig(section.config);
      setMeta(metaOf(section));
    }
    setSeenClean(clean);
  }
  const [state, formAction, pending] = useActionState(
    saveWebsiteSectionAction,
    initialAdminActionState,
  );
  const lastHandled = useRef<AdminActionState | null>(null);

  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    if (state !== lastHandled.current && state.status !== "idle") {
      lastHandled.current = state;
      if (state.status === "success") onDirty(false);
      onSaved(state);
    }
  }, [state, onDirty, onSaved]);

  if (!definition) {
    return <p className="quiet-empty">This section type is not available in this version.</p>;
  }

  return (
    <form action={formAction} className="section-editor">
      <input name="pageId" type="hidden" value={pageId} />
      <input name="sectionId" type="hidden" value={section.id} />
      <input name="sectionType" type="hidden" value={section.type} />
      <input name="expectedVersion" type="hidden" value={section.version} />
      <input name="config" type="hidden" value={JSON.stringify(config)} />
      <header className="section-editor-head">
        <div>
          <p className="kicker">
            {definition.label}
            {section.locked ? " · System module" : ""}
          </p>
          <p className="field-help">{definition.description}</p>
        </div>
        <div className="section-editor-save">
          <StatusBadge tone={dirty ? "blocked" : "ready"}>
            {pending ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
          </StatusBadge>
          <Button disabled={!canWrite || pending || !dirty} tone="primary" type="submit">
            Save section
          </Button>
        </div>
      </header>
      {state.status === "error" && state.fieldErrors["form"] ? (
        <p className="field-error">{state.fieldErrors["form"]}</p>
      ) : null}
      <fieldset className="section-editor-fields" disabled={!canWrite}>
        {definition.fields.length === 0 ? (
          <p className="field-help">This section has no text of its own.</p>
        ) : null}
        <SectionFields
          errors={state.fieldErrors}
          fields={definition.fields}
          onChange={setConfig}
          value={config}
        />
      </fieldset>
      <fieldset className="section-editor-presets" disabled={!canWrite}>
        <legend className="field-label">Appearance</legend>
        <div className="field-grid field-grid-two">
          <label className="field-group" htmlFor={`label-${section.id}`}>
            <span className="field-label">Section label (Admin only)</span>
            <input
              id={`label-${section.id}`}
              maxLength={80}
              name="label"
              onChange={(event) => setMeta({ ...meta, label: event.target.value })}
              type="text"
              value={meta.label}
            />
          </label>
          {definition.variants.length > 1 ? (
            <label className="field-group" htmlFor={`variant-${section.id}`}>
              <span className="field-label">Layout</span>
              <select
                id={`variant-${section.id}`}
                name="variant"
                onChange={(event) => setMeta({ ...meta, variant: event.target.value })}
                value={meta.variant}
              >
                {definition.variants.map((variant) => (
                  <option key={variant.value} value={variant.value}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input name="variant" type="hidden" value={meta.variant} />
          )}
          <label className="field-group" htmlFor={`tone-${section.id}`}>
            <span className="field-label">Background</span>
            <select
              id={`tone-${section.id}`}
              name="tone"
              onChange={(event) =>
                setMeta({ ...meta, tone: event.target.value as typeof meta.tone })
              }
              value={meta.tone}
            >
              {sectionTones.map((tone) => (
                <option key={tone} value={tone}>
                  {sectionToneLabels[tone]}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group" htmlFor={`spacing-${section.id}`}>
            <span className="field-label">Spacing</span>
            <select
              id={`spacing-${section.id}`}
              name="spacing"
              onChange={(event) =>
                setMeta({ ...meta, spacing: event.target.value as typeof meta.spacing })
              }
              value={meta.spacing}
            >
              {sectionSpacings.map((spacing) => (
                <option key={spacing} value={spacing}>
                  {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group" htmlFor={`motion-${section.id}`}>
            <span className="field-label">Motion</span>
            <select
              id={`motion-${section.id}`}
              name="motion"
              onChange={(event) =>
                setMeta({ ...meta, motion: event.target.value as typeof meta.motion })
              }
              value={meta.motion}
            >
              {sectionMotions.map((motion) => (
                <option key={motion} value={motion}>
                  {motion.charAt(0).toUpperCase() + motion.slice(1)}
                </option>
              ))}
            </select>
          </label>
          {!section.locked ? (
            <label className="checkbox-row" htmlFor={`hidden-${section.id}`}>
              <input
                checked={meta.hidden}
                id={`hidden-${section.id}`}
                name="hidden"
                onChange={(event) => setMeta({ ...meta, hidden: event.target.checked })}
                type="checkbox"
              />
              <span>Hide this section (kept in the draft, not shown to visitors)</span>
            </label>
          ) : (
            <p className="field-help">
              A required module of this page: it cannot be hidden or removed, only its wording
              edited.
            </p>
          )}
        </div>
      </fieldset>
    </form>
  );
}

function PageSettingsForm({
  detail,
  onDirty,
  onSaved,
}: Readonly<{
  detail: PageDetail;
  onDirty: (dirty: boolean) => void;
  onSaved: (state: AdminActionState) => void;
}>) {
  const { page, permissions } = detail;
  const [state, formAction, pending] = useActionState(
    updateWebsitePageAction,
    initialAdminActionState,
  );
  const [ogMediaId, setOgMediaId] = useState<string | null>(page.og_media_id);
  const lastHandled = useRef<AdminActionState | null>(null);
  useEffect(() => {
    if (state !== lastHandled.current && state.status !== "idle") {
      lastHandled.current = state;
      if (state.status === "success") onDirty(false);
      onSaved(state);
    }
  }, [state, onDirty, onSaved]);
  const isGlobal = page.page_type === "global";
  return (
    <form action={formAction} className="section-editor" onChange={() => onDirty(true)}>
      <input name="pageId" type="hidden" value={page.id} />
      <input name="expectedVersion" type="hidden" value={page.version} />
      <input name="ogMediaId" type="hidden" value={ogMediaId ?? ""} />
      <header className="section-editor-head">
        <div>
          <p className="kicker">Page settings</p>
          <p className="field-help">
            {isGlobal ? "Global content has no public address." : `Address: ${page.path}`}
            {page.page_type === "system"
              ? " · System page (address fixed)"
              : page.page_type === "content"
                ? " · Content page"
                : ""}
          </p>
        </div>
        <div className="section-editor-save">
          <Button disabled={!permissions.can_write || pending} tone="primary" type="submit">
            Save settings
          </Button>
        </div>
      </header>
      <fieldset className="section-editor-fields" disabled={!permissions.can_write}>
        <div className="field-group">
          <label htmlFor="page-title">Page title (Admin and browser tab)</label>
          <input
            defaultValue={page.title}
            id="page-title"
            maxLength={160}
            name="title"
            type="text"
          />
          {state.fieldErrors["title"] ? (
            <p className="field-error">{state.fieldErrors["title"]}</p>
          ) : null}
        </div>
        {page.page_type === "custom" ? (
          <div className="field-group">
            <label htmlFor="page-slug">Address</label>
            <div className="input-prefix">
              <span>/</span>
              <input
                defaultValue={page.path.replace(/^\//u, "")}
                id="page-slug"
                maxLength={80}
                name="slug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                type="text"
              />
            </div>
            <p className="field-help">
              Lowercase letters, numbers and hyphens. Changing a published address keeps the old one
              redirecting.
            </p>
            {state.fieldErrors["slug"] ? (
              <p className="field-error">{state.fieldErrors["slug"]}</p>
            ) : null}
          </div>
        ) : null}
        {!isGlobal ? (
          <fieldset className="section-editor-presets" disabled={!permissions.can_seo}>
            <legend className="field-label">Search and sharing (SEO)</legend>
            <div className="field-group">
              <label htmlFor="page-seo-title">Search title</label>
              <input
                defaultValue={page.seo_title ?? ""}
                id="page-seo-title"
                maxLength={160}
                name="seoTitle"
                type="text"
              />
              <p className="field-help">Leave empty to use the page title.</p>
            </div>
            <div className="field-group">
              <label htmlFor="page-seo-description">Search description</label>
              <textarea
                defaultValue={page.seo_description ?? ""}
                id="page-seo-description"
                maxLength={320}
                name="seoDescription"
                rows={3}
              />
              <p className="field-help">
                Aim for 70–160 characters. Search engines show this under the title.
              </p>
            </div>
            <div className="field-group">
              <span className="field-label">Sharing image</span>
              <MediaPicker
                label="Sharing image"
                onChange={(id) => {
                  setOgMediaId(id);
                  onDirty(true);
                }}
                value={ogMediaId}
              />
              <p className="field-help">
                Shown when the page is shared on social media. The site default is used when empty.
              </p>
            </div>
            <label className="checkbox-row" htmlFor="page-noindex">
              <input
                defaultChecked={page.noindex}
                id="page-noindex"
                name="noindex"
                type="checkbox"
              />
              <span>Keep this page out of search engines</span>
            </label>
            {!permissions.can_seo ? (
              <p className="field-help">SEO fields need the website SEO permission.</p>
            ) : null}
          </fieldset>
        ) : null}
      </fieldset>
    </form>
  );
}
