"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { SettingsForm } from "@/features/settings/components/settings-form";
import {
  publishLegalPageAction,
  updateLegalDraftAction,
} from "@/features/settings/settings-actions";
import {
  legalSlugLabels,
  legalSlugs,
  type LegalPage,
  type LegalPages,
  type LegalSlug,
} from "@/features/settings/settings-contract";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function LegalCenter({ data, canWrite }: Readonly<{ data: LegalPages; canWrite: boolean }>) {
  const { connectionState } = useAdminRealtimeInvalidation(["settings"]);
  const [slug, setSlug] = useState<LegalSlug>("privacy");
  const page = data.pages.find((entry) => entry.slug === slug);
  if (!page) return null;
  return (
    <div className="settings-view">
      <nav aria-label="Legal pages" className="record-tabs">
        {legalSlugs.map((entry) => {
          const item = data.pages.find((candidate) => candidate.slug === entry);
          return (
            <button
              aria-current={slug === entry ? "page" : undefined}
              className={slug === entry ? "record-tab record-tab-current" : "record-tab"}
              key={entry}
              onClick={() => setSlug(entry)}
              type="button"
            >
              {legalSlugLabels[entry]}
              {item?.published_body ? "" : " (unpublished)"}
            </button>
          );
        })}
        {connectionState === "connected" ? (
          <span className="realtime-dot" title="Live updates connected" />
        ) : null}
      </nav>
      <LegalPageEditor
        canPublish={data.can_publish}
        canWrite={canWrite}
        key={`${page.slug}-${page.version}`}
        page={page}
      />
    </div>
  );
}

function LegalPageEditor({
  page,
  canWrite,
  canPublish,
}: Readonly<{ page: LegalPage; canWrite: boolean; canPublish: boolean }>) {
  const [publishState, publishAction, publishing] = useActionState(
    publishLegalPageAction,
    initialAdminActionState,
  );
  const [confirming, setConfirming] = useState(false);
  const publishedVersion = publishState.currentVersion ?? page.version;
  return (
    <>
      <section className="admin-panel settings-panel">
        <div className="section-heading-row section-heading-compact">
          <div>
            <h2>{legalSlugLabels[page.slug]} — status</h2>
            <p className="panel-copy">
              The public route <code>/{page.slug}</code> shows only the published revision. Starter
              drafts are marked DRAFT, are not legal advice, and must be reviewed and saved before
              they can be published.
            </p>
          </div>
          <span className="badge-stack">
            <StatusBadge tone={page.published_body ? "ready" : "draft"}>
              {page.published_body
                ? `Published · revision ${page.published_revision}`
                : "Not published"}
            </StatusBadge>
            {page.draft_is_starter ? <StatusBadge tone="review">Starter draft</StatusBadge> : null}
            {page.has_unpublished_changes && !page.draft_is_starter ? (
              <StatusBadge tone="review">Draft differs from published</StatusBadge>
            ) : null}
          </span>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Last published</dt>
            <dd>
              {formatDateTime(page.published_at)}
              {page.published_by ? ` by ${page.published_by}` : ""}
            </dd>
          </div>
          <div>
            <dt>Revisions</dt>
            <dd>
              {page.revisions.length === 0
                ? "None yet"
                : page.revisions
                    .map(
                      (revision) =>
                        `#${revision.revision} · ${formatDateTime(revision.published_at)}`,
                    )
                    .join(" · ")}
            </dd>
          </div>
        </dl>
        {publishState.status === "error" || publishState.status === "conflict" ? (
          <Alert live tone="danger">
            <p>{publishState.message}</p>
          </Alert>
        ) : null}
        {publishState.status === "success" ? (
          <Alert live tone="success">
            <p>{publishState.message}</p>
          </Alert>
        ) : null}
        {canPublish && !page.draft_is_starter ? (
          confirming ? (
            <form action={publishAction} className="admin-form">
              <input name="slug" type="hidden" value={page.slug} />
              <input name="expectedVersion" type="hidden" value={publishedVersion} />
              <p>
                Publish the current draft of {legalSlugLabels[page.slug]} as revision{" "}
                {(page.published_revision ?? 0) + 1}? It replaces the public page immediately.
              </p>
              <div className="form-actions">
                <Button onClick={() => setConfirming(false)} tone="quiet" type="button">
                  Cancel
                </Button>
                <Button disabled={publishing} tone="primary" type="submit">
                  {publishing ? "Publishing…" : "Confirm publish"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="form-actions form-actions-start">
              <Button onClick={() => setConfirming(true)} tone="primary" type="button">
                Publish revision
              </Button>
            </div>
          )
        ) : (
          <p className="field-help">
            {page.draft_is_starter
              ? "Review and save the starter draft first; publishing requires settings.legal.publish (Super Admin)."
              : "Publishing requires settings.legal.publish (Super Admin)."}
          </p>
        )}
      </section>
      <SettingsForm
        action={updateLegalDraftAction}
        description="Plain text with Markdown-style headings (## Heading) and paragraphs. Do not add jurisdiction, registration or tax facts that have not been verified."
        hidden={{ slug: page.slug }}
        submitLabel="Save draft"
        title={`${legalSlugLabels[page.slug]} — draft`}
        version={page.version}
      >
        {(state) => (
          <fieldset className="settings-fieldset" disabled={!canWrite}>
            <Field error={state.fieldErrors["title"]} id="legalTitle" label="Title">
              <input
                defaultValue={page.draft_title}
                id="legalTitle"
                maxLength={200}
                name="title"
                required
                type="text"
              />
            </Field>
            <Field error={state.fieldErrors["body"]} id="legalBody" label="Body">
              <textarea
                className="legal-body-editor"
                defaultValue={page.draft_body}
                id="legalBody"
                maxLength={60000}
                name="body"
                rows={18}
              />
            </Field>
          </fieldset>
        )}
      </SettingsForm>
    </>
  );
}
