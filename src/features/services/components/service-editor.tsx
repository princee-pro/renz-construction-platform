"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { EvidenceWorkspace } from "@/features/services/components/evidence-workspace";
import { PublicationControls } from "@/features/services/components/publication-controls";
import { StructuredBlockEditor } from "@/features/services/components/structured-block-editor";
import { saveServiceAction } from "@/features/services/service-actions";
import {
  initialServiceActionState,
  type PublicationStatus,
  type ServiceDetail,
  type ServiceEditorValues,
} from "@/features/services/service-contract";

function statusLabel(status: PublicationStatus): string {
  return `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}

function serialize(values: ServiceEditorValues): string {
  return JSON.stringify(values);
}

export function ServiceEditor({
  detail,
  canWrite,
  canPublish,
  canArchive,
  canVerify,
  revisionsPanel = null,
  detailsPanel = null,
}: Readonly<{
  detail: ServiceDetail & { localization: NonNullable<ServiceDetail["localization"]> };
  canWrite: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canVerify: boolean;
  /** CR1: draft changes / publish changes / revision history (server-rendered). */
  revisionsPanel?: ReactNode;
  /** CR1: owner detail fields (positioning, sub-services, use cases, process, FAQ). */
  detailsPanel?: ReactNode;
}>) {
  const initialValues: ServiceEditorValues = useMemo(
    () => ({
      locale: detail.localization.locale,
      slug: detail.localization.slug,
      name: detail.localization.name,
      summary: detail.localization.summary ?? "",
      scope: detail.localization.scope ?? "",
      deliverables: detail.localization.deliverables ?? "",
      exclusions: detail.localization.exclusions ?? "",
      clientInputs: detail.localization.client_inputs ?? "",
      deliveryWording: detail.localization.delivery_wording ?? "",
      professionalTerminology: detail.localization.professional_terminology ?? "",
      seoTitle: detail.localization.seo_title ?? "",
      seoDescription: detail.localization.seo_description ?? "",
      sortOrder: detail.service.sort_order,
      featured: detail.service.featured,
      bodyBlocks: detail.localization.body_blocks,
    }),
    [detail],
  );
  const [values, setValues] = useState<ServiceEditorValues>(initialValues);
  const [versions, setVersions] = useState({
    service: detail.service.version,
    localization: detail.localization.version,
  });
  // A fresh server render (after a republish, a details save or another
  // panel's command) carries the authoritative versions; adopt them so the
  // next command is not refused as stale. Unsaved field values are kept.
  const [seenVersions, setSeenVersions] = useState(versions);
  if (
    seenVersions.service !== detail.service.version ||
    seenVersions.localization !== detail.localization.version
  ) {
    const next = { service: detail.service.version, localization: detail.localization.version };
    setSeenVersions(next);
    setVersions(next);
  }
  const [cleanSnapshot, setCleanSnapshot] = useState(() => serialize(initialValues));
  const pendingHref = useRef<string | null>(null);
  const pendingForm = useRef<HTMLFormElement | null>(null);
  const unsavedDialog = useRef<HTMLDialogElement>(null);
  const reloadDialog = useRef<HTMLDialogElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [state, setState] = useState(initialServiceActionState);
  const [pending, startTransition] = useTransition();
  // CR1: published services stay editable — the public reads the last
  // published revision until "Publish changes".
  const editable = detail.service.publication_status !== "archived" && canWrite;
  const dirty = useMemo(() => serialize(values) !== cleanSnapshot, [cleanSnapshot, values]);

  const runSave = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const nextState = await saveServiceAction(state, formData);
        setState(nextState);

        if (nextState.status === "success") {
          if (nextState.serviceVersion && nextState.localizationVersion) {
            setVersions({
              service: nextState.serviceVersion,
              localization: nextState.localizationVersion,
            });
          }
          setCleanSnapshot(serialize(values));
          router.refresh();
        }

        if (nextState.status === "error" || nextState.status === "reauth") {
          requestAnimationFrame(() => {
            const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
            (firstInvalid ?? messageRef.current)?.focus();
          });
        }
      });
    },
    [router, state, values],
  );

  useEffect(() => {
    if (!dirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const interceptNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.dataset["bypassDirty"] === "true") return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === current.href ||
        (destination.pathname === current.pathname && destination.search === current.search)
      )
        return;
      event.preventDefault();
      pendingHref.current = destination.href;
      pendingForm.current = null;
      unsavedDialog.current?.showModal();
    };
    document.addEventListener("click", interceptNavigation, true);
    return () => document.removeEventListener("click", interceptNavigation, true);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const interceptNavigationForm = (event: SubmitEvent) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        form.dataset["navigationForm"] !== "true" ||
        form.dataset["bypassDirty"] === "true"
      ) {
        return;
      }
      event.preventDefault();
      pendingHref.current = null;
      pendingForm.current = form;
      unsavedDialog.current?.showModal();
    };
    document.addEventListener("submit", interceptNavigationForm, true);
    return () => document.removeEventListener("submit", interceptNavigationForm, true);
  }, [dirty]);

  const updateText = (key: keyof ServiceEditorValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };
  const errorFor = (field: string) => state.fieldErrors[field];
  const describedBy = (field: string, hint = false) =>
    [hint ? `${field}-hint` : "", errorFor(field) ? `${field}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const updatePublicationVersion = useCallback((version: number) => {
    setVersions((current) => ({ ...current, service: version }));
  }, []);
  const errorEntries = Object.entries(state.fieldErrors);

  return (
    <>
      <div className="editor-status-strip">
        <div>
          <StatusBadge tone={detail.service.publication_status}>
            {statusLabel(detail.service.publication_status)}
          </StatusBadge>
          <span>Service v{versions.service}</span>
          <span>Locale v{versions.localization}</span>
        </div>
        <Link
          className="text-link"
          href={`/admin/content/services/${detail.service.id}/preview?locale=${encodeURIComponent(values.locale)}`}
        >
          Private preview
        </Link>
      </div>

      {!editable ? (
        <Alert tone="info" title="Editing locked">
          {detail.service.publication_status === "archived"
            ? "Archived services retain their history and are not editable."
            : "Your role can view this draft but cannot change it."}
        </Alert>
      ) : detail.service.publication_status === "published" ? (
        <Alert tone="info" title="Published service">
          Changes you save here stay private until you press Publish changes. Visitors keep seeing
          the last published version.
        </Alert>
      ) : null}

      <div className="service-editor-layout">
        <form action={runSave} aria-busy={pending} className="editor-form" noValidate>
          <input name="serviceId" type="hidden" value={detail.service.id} />
          <input name="serviceVersion" type="hidden" value={versions.service} />
          <input name="localizationVersion" type="hidden" value={versions.localization} />
          <input name="locale" type="hidden" value={values.locale} />
          <input name="bodyBlocks" type="hidden" value={JSON.stringify(values.bodyBlocks)} />

          {state.status !== "idle" ? (
            <div ref={messageRef} tabIndex={-1}>
              {state.status === "success" ? (
                <Alert live tone="success" title="Saved">
                  {state.message}
                </Alert>
              ) : (
                <Alert
                  live
                  tone={
                    state.status === "conflict"
                      ? "warning"
                      : state.status === "reauth"
                        ? "warning"
                        : "danger"
                  }
                  title={state.status === "conflict" ? "Newer version detected" : "Draft not saved"}
                >
                  <p>{state.message}</p>
                  {errorEntries.length > 0 ? (
                    <ul className="error-summary-list">
                      {errorEntries.map(([field, message]) => (
                        <li key={field}>
                          <a href={`#${field}`}>{message}</a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {state.status === "conflict" ? (
                    <Button
                      onClick={() => reloadDialog.current?.showModal()}
                      tone="secondary"
                      type="button"
                    >
                      Review reload option
                    </Button>
                  ) : null}
                  {state.reauthHref ? (
                    <a className="text-link" href={state.reauthHref}>
                      Continue to secure sign-in
                    </a>
                  ) : null}
                </Alert>
              )}
            </div>
          ) : null}

          <fieldset className="editor-lock-fieldset" disabled={!editable}>
            <legend className="visually-hidden">Service draft fields</legend>
            <section aria-labelledby="service-identity-heading" className="editor-section">
              <div className="editor-section-heading">
                <p className="section-index">01</p>
                <div>
                  <h2 id="service-identity-heading">Identity</h2>
                  <p>Public label, route identity, locale, and ordering.</p>
                </div>
              </div>
              <div className="field-grid field-grid-two">
                <Field error={errorFor("name")} id="name" label="Service name">
                  <input
                    aria-describedby={describedBy("name")}
                    aria-invalid={Boolean(errorFor("name"))}
                    autoComplete="off"
                    id="name"
                    maxLength={160}
                    name="name"
                    onChange={(event) => updateText("name", event.target.value)}
                    type="text"
                    value={values.name}
                  />
                </Field>
                <Field
                  error={errorFor("slug")}
                  hint="Lowercase words separated by hyphens."
                  id="slug"
                  label="Public slug"
                >
                  <input
                    aria-describedby={describedBy("slug", true)}
                    aria-invalid={Boolean(errorFor("slug"))}
                    autoComplete="off"
                    id="slug"
                    maxLength={120}
                    name="slug"
                    onChange={(event) => updateText("slug", event.target.value)}
                    spellCheck={false}
                    type="text"
                    value={values.slug}
                  />
                </Field>
                <Field
                  hint="This localization key is fixed after draft creation."
                  id="locale-display"
                  label="Locale"
                >
                  <input
                    aria-describedby="locale-display-hint"
                    id="locale-display"
                    readOnly
                    type="text"
                    value={values.locale}
                  />
                </Field>
                <Field id="sortOrder" label="Sort order" error={errorFor("sortOrder")}>
                  <input
                    aria-describedby={describedBy("sortOrder")}
                    aria-invalid={Boolean(errorFor("sortOrder"))}
                    id="sortOrder"
                    max={100_000}
                    min={0}
                    name="sortOrder"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        sortOrder: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={values.sortOrder}
                  />
                </Field>
              </div>
              <label className="check-field featured-check">
                <input
                  checked={values.featured}
                  name="featured"
                  onChange={(event) =>
                    setValues((current) => ({ ...current, featured: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Mark as featured for a later approved public composition</span>
              </label>
              <Field error={errorFor("summary")} id="summary" label="Summary">
                <textarea
                  aria-describedby={describedBy("summary")}
                  aria-invalid={Boolean(errorFor("summary"))}
                  className="resize-none"
                  id="summary"
                  maxLength={600}
                  name="summary"
                  onChange={(event) => updateText("summary", event.target.value)}
                  rows={4}
                  value={values.summary}
                />
              </Field>
            </section>

            <section aria-labelledby="service-delivery-heading" className="editor-section">
              <div className="editor-section-heading">
                <p className="section-index">02</p>
                <div>
                  <h2 id="service-delivery-heading">Delivery definition</h2>
                  <p>These fields are publication-gated and must remain evidence-safe.</p>
                </div>
              </div>
              {(
                [
                  ["scope", "Scope", values.scope],
                  ["deliverables", "Deliverables", values.deliverables],
                  ["exclusions", "Exclusions", values.exclusions],
                  ["clientInputs", "Client inputs", values.clientInputs],
                  ["deliveryWording", "Delivery wording", values.deliveryWording],
                  [
                    "professionalTerminology",
                    "Professional terminology",
                    values.professionalTerminology,
                  ],
                ] as const
              ).map(([field, label, value]) => (
                <Field error={errorFor(field)} id={field} key={field} label={label}>
                  <textarea
                    aria-describedby={describedBy(field)}
                    aria-invalid={Boolean(errorFor(field))}
                    className="resize-none"
                    id={field}
                    maxLength={4_000}
                    name={field}
                    onChange={(event) => updateText(field, event.target.value)}
                    rows={4}
                    value={value}
                  />
                </Field>
              ))}
            </section>

            <section aria-labelledby="service-content-heading" className="editor-section">
              <div className="editor-section-heading">
                <p className="section-index">03</p>
                <div>
                  <h2 id="service-content-heading">Structured content</h2>
                  <p>Only Heading, Paragraph, List, and Link blocks are admitted.</p>
                </div>
              </div>
              <StructuredBlockEditor
                blocks={values.bodyBlocks}
                error={errorFor("bodyBlocks")}
                onChange={(bodyBlocks) => setValues((current) => ({ ...current, bodyBlocks }))}
              />
            </section>

            <section aria-labelledby="service-seo-heading" className="editor-section">
              <div className="editor-section-heading">
                <p className="section-index">04</p>
                <div>
                  <h2 id="service-seo-heading">Search presentation</h2>
                  <p>Private draft metadata only; S5A does not create public SEO pages.</p>
                </div>
              </div>
              <Field error={errorFor("seoTitle")} id="seoTitle" label="SEO title">
                <input
                  aria-describedby={describedBy("seoTitle")}
                  aria-invalid={Boolean(errorFor("seoTitle"))}
                  autoComplete="off"
                  id="seoTitle"
                  maxLength={160}
                  name="seoTitle"
                  onChange={(event) => updateText("seoTitle", event.target.value)}
                  type="text"
                  value={values.seoTitle}
                />
              </Field>
              <Field error={errorFor("seoDescription")} id="seoDescription" label="SEO description">
                <textarea
                  aria-describedby={describedBy("seoDescription")}
                  aria-invalid={Boolean(errorFor("seoDescription"))}
                  className="resize-none"
                  id="seoDescription"
                  maxLength={320}
                  name="seoDescription"
                  onChange={(event) => updateText("seoDescription", event.target.value)}
                  rows={3}
                  value={values.seoDescription}
                />
              </Field>
            </section>
          </fieldset>

          <div className="editor-action-bar">
            <p aria-live="polite">
              {pending ? "Saving securely…" : dirty ? "Unsaved changes" : "All changes saved"}
            </p>
            <Button disabled={!editable || !dirty || pending} tone="primary" type="submit">
              {pending ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </form>

        <aside aria-label="Service publication controls" className="editor-rail">
          <section className="rail-panel service-record-panel">
            <p className="eyebrow">Record</p>
            <dl className="compact-definition-list">
              <div>
                <dt>Status</dt>
                <dd>{statusLabel(detail.service.publication_status)}</dd>
              </div>
              <div>
                <dt>Locale</dt>
                <dd>{values.locale}</dd>
              </div>
              <div>
                <dt>Schema</dt>
                <dd>v{detail.localization.schema_version}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }).format(new Date(detail.service.updated_at))}
                </dd>
              </div>
            </dl>
          </section>
          <PublicationControls
            canArchive={canArchive}
            canPublish={canPublish}
            onVersionChange={updatePublicationVersion}
            readiness={detail.readiness}
            serviceId={detail.service.id}
            serviceVersion={versions.service}
            status={detail.service.publication_status}
          />
          {revisionsPanel}
        </aside>
      </div>

      {detailsPanel}

      <EvidenceWorkspace
        canVerify={canVerify}
        canWrite={canWrite}
        evidence={detail.evidence}
        serviceId={detail.service.id}
      />

      <dialog className="confirm-dialog" ref={unsavedDialog}>
        <div className="confirm-dialog-panel">
          <p className="eyebrow">Unsaved changes</p>
          <h2>Leave this editor?</h2>
          <p>Your current changes have not been saved and will be discarded if you leave.</p>
          <div className="confirm-actions">
            <Button onClick={() => unsavedDialog.current?.close()} tone="primary" type="button">
              Keep editing
            </Button>
            <Button
              onClick={() => {
                const form = pendingForm.current;
                if (form) {
                  form.dataset["bypassDirty"] = "true";
                  unsavedDialog.current?.close();
                  try {
                    form.requestSubmit();
                  } finally {
                    delete form.dataset["bypassDirty"];
                  }
                  return;
                }
                const destination = pendingHref.current;
                if (destination) window.location.assign(destination);
              }}
              tone="danger"
              type="button"
            >
              Leave without saving
            </Button>
          </div>
        </div>
      </dialog>

      <dialog className="confirm-dialog" ref={reloadDialog}>
        <div className="confirm-dialog-panel">
          <p className="eyebrow">Version conflict</p>
          <h2>Reload the authoritative version?</h2>
          <p>
            Reloading will discard your preserved local values. Copy any needed text before
            continuing.
          </p>
          <div className="confirm-actions">
            <Button onClick={() => reloadDialog.current?.close()} tone="primary" type="button">
              Keep my values
            </Button>
            <Button onClick={() => window.location.reload()} tone="danger" type="button">
              Reload authoritative version
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
