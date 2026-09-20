"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import {
  changeInsightPublicationAction,
  markInsightReviewedAction,
  saveInsightAction,
} from "@/features/insights/insight-actions";
import type { InsightDetail } from "@/features/insights/insight-data";
import { MediaPicker } from "@/features/website/components/media-picker";
import { serializeRichText } from "@/lib/content/rich-text";

/**
 * Insight editor (CR1 §54): title, address, excerpt, body (rich text lite),
 * topic, related service, hero image, placement (featured / pinned /
 * priority), SEO, review, publication. Owner language throughout.
 */
export function InsightEditor({
  detail,
  canWrite,
  canPublish,
  canArchive,
  revisionsPanel = null,
}: Readonly<{
  detail: InsightDetail;
  canWrite: boolean;
  canPublish: boolean;
  canArchive: boolean;
  revisionsPanel?: ReactNode;
}>) {
  const router = useRouter();
  const { post, localization } = detail;
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: AdminActionState, formData: FormData) => {
      const result = await saveInsightAction(previous, formData);
      // Reset the dirty flag inside the action (not in an effect) once the save lands.
      if (result.status === "success") setDirty(false);
      return result;
    },
    initialAdminActionState,
  );
  const [notice, setNotice] = useState<AdminActionState | null>(null);
  const [heroAssetId, setHeroAssetId] = useState<string | null>(post.hero_asset_id);
  const [working, startTransition] = useTransition();
  const handled = useRef<AdminActionState | null>(null);
  // Versions follow the freshest source: a save result, or a new server
  // render (republish, media commands) — never a stale earlier save.
  const [versions, setVersions] = useState({
    post: post.version,
    localization: localization.version,
  });
  const [seenServer, setSeenServer] = useState(versions);
  const [seenState, setSeenState] = useState(state);
  if (seenServer.post !== post.version || seenServer.localization !== localization.version) {
    const next = { post: post.version, localization: localization.version };
    setSeenServer(next);
    setVersions(next);
  }
  if (seenState !== state) {
    setSeenState(state);
    if (state.currentVersion) {
      setVersions({
        post: state.currentVersion,
        localization: Number(state.detail) > 0 ? Number(state.detail) : versions.localization,
      });
    }
  }
  const version = versions.post;
  const localizationVersion = versions.localization;
  const editable = post.publication_status !== "archived" && canWrite;

  useEffect(() => {
    if (state !== handled.current && state.status !== "idle") {
      handled.current = state;
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function run(action: () => Promise<AdminActionState>): void {
    startTransition(async () => {
      const result = await action();
      setNotice(result);
      if (result.status === "success" || result.status === "conflict") router.refresh();
    });
  }

  return (
    <div className="service-editor-layout insight-editor">
      <form
        action={formAction}
        aria-busy={pending}
        className="editor-form"
        noValidate
        onChange={() => setDirty(true)}
      >
        <input name="postId" type="hidden" value={post.id} />
        <input name="expectedVersion" type="hidden" value={version} />
        <input name="expectedLocalizationVersion" type="hidden" value={localizationVersion} />
        <input name="heroAssetId" type="hidden" value={heroAssetId ?? ""} />
        {state.status !== "idle" ? (
          <Alert
            live
            tone={
              state.status === "success"
                ? "success"
                : state.status === "conflict"
                  ? "warning"
                  : "danger"
            }
          >
            <p>{state.message}</p>
            {state.reauthHref ? <Link href={state.reauthHref}>Sign in again</Link> : null}
          </Alert>
        ) : null}
        {post.publication_status === "published" ? (
          <Alert tone="info" title="Published article">
            Changes you save stay private until you press Publish changes. Visitors keep seeing the
            last published version.
          </Alert>
        ) : null}
        <fieldset className="editor-lock-fieldset" disabled={!editable || pending}>
          <div className="field-grid field-grid-two">
            <div className="field-group">
              <label htmlFor="insight-title">Title</label>
              <input
                defaultValue={localization.title}
                id="insight-title"
                maxLength={200}
                name="title"
                required
                type="text"
              />
              {state.fieldErrors["title"] ? (
                <p className="field-error">{state.fieldErrors["title"]}</p>
              ) : null}
            </div>
            <div className="field-group">
              <label htmlFor="insight-slug">Address</label>
              <div className="input-prefix">
                <span>/insights/</span>
                <input
                  defaultValue={localization.slug}
                  id="insight-slug"
                  maxLength={120}
                  name="slug"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                  type="text"
                />
              </div>
              <p className="field-help">
                Changing a published address keeps the old one redirecting.
              </p>
              {state.fieldErrors["slug"] ? (
                <p className="field-error">{state.fieldErrors["slug"]}</p>
              ) : null}
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="insight-excerpt">Excerpt</label>
            <textarea
              defaultValue={localization.excerpt ?? ""}
              id="insight-excerpt"
              maxLength={600}
              name="excerpt"
              rows={3}
            />
            <p className="field-help">
              Shown on the Insights page and in search results. One or two sentences.
            </p>
            {state.fieldErrors["excerpt"] ? (
              <p className="field-error">{state.fieldErrors["excerpt"]}</p>
            ) : null}
          </div>
          <div className="field-group">
            <label htmlFor="insight-body">Article</label>
            <textarea
              className="rich-text-input"
              defaultValue={serializeRichText(localization.body_blocks)}
              id="insight-body"
              name="body"
              rows={24}
              spellCheck
            />
            <p className="field-help">
              Paragraphs separated by a blank line. ## Heading, ### Sub-heading, - list item,
              **bold**, *italic*, [link label](/services/design). No code or HTML.
            </p>
            {state.fieldErrors["body"] ? (
              <p className="field-error">{state.fieldErrors["body"]}</p>
            ) : null}
          </div>
          <div className="field-grid field-grid-two">
            <div className="field-group">
              <label htmlFor="insight-topic">Topic</label>
              <input
                defaultValue={post.topic ?? ""}
                id="insight-topic"
                maxLength={80}
                name="topic"
                placeholder="e.g. Before design"
                type="text"
              />
              {state.fieldErrors["topic"] ? (
                <p className="field-error">{state.fieldErrors["topic"]}</p>
              ) : null}
            </div>
            <div className="field-group">
              <label htmlFor="insight-service">Related service</label>
              <select
                defaultValue={post.related_service_id ?? ""}
                id="insight-service"
                name="relatedServiceId"
              >
                <option value="">None</option>
                {detail.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="insight-date">Publication date</label>
              <input
                defaultValue={post.publication_date ?? ""}
                id="insight-date"
                name="publicationDate"
                type="date"
              />
              {state.fieldErrors["publicationDate"] ? (
                <p className="field-error">{state.fieldErrors["publicationDate"]}</p>
              ) : null}
            </div>
            <div className="field-group">
              <label htmlFor="insight-priority">Sort priority</label>
              <input
                defaultValue={post.sort_priority}
                id="insight-priority"
                max={100000}
                min={0}
                name="sortPriority"
                type="number"
              />
              <p className="field-help">
                Higher appears earlier among articles with the same date.
              </p>
            </div>
            <label className="checkbox-row" htmlFor="insight-featured">
              <input
                defaultChecked={post.featured}
                id="insight-featured"
                name="featured"
                type="checkbox"
              />
              <span>Featured (first choice for the featured story)</span>
            </label>
            <label className="checkbox-row" htmlFor="insight-pinned">
              <input
                defaultChecked={post.pinned}
                id="insight-pinned"
                name="pinned"
                type="checkbox"
              />
              <span>Pinned (always first)</span>
            </label>
          </div>
          <div className="field-group">
            <span className="field-label">Hero image (optional)</span>
            <MediaPicker
              label="hero image"
              onChange={(id) => {
                setHeroAssetId(id);
                setDirty(true);
              }}
              value={heroAssetId}
            />
          </div>
          <fieldset className="section-editor-presets">
            <legend className="field-label">Search and sharing (SEO)</legend>
            <div className="field-grid field-grid-two">
              <div className="field-group">
                <label htmlFor="insight-seo-title">Search title</label>
                <input
                  defaultValue={localization.seo_title ?? ""}
                  id="insight-seo-title"
                  maxLength={160}
                  name="seoTitle"
                  type="text"
                />
                {state.fieldErrors["seoTitle"] ? (
                  <p className="field-error">{state.fieldErrors["seoTitle"]}</p>
                ) : null}
              </div>
              <div className="field-group">
                <label htmlFor="insight-seo-description">Search description</label>
                <textarea
                  defaultValue={localization.seo_description ?? ""}
                  id="insight-seo-description"
                  maxLength={320}
                  name="seoDescription"
                  rows={3}
                />
                {state.fieldErrors["seoDescription"] ? (
                  <p className="field-error">{state.fieldErrors["seoDescription"]}</p>
                ) : null}
              </div>
            </div>
          </fieldset>
          <div className="editor-actions">
            <StatusBadge tone={dirty ? "blocked" : "ready"}>
              {pending ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
            </StatusBadge>
            <Button disabled={!editable || pending} tone="primary" type="submit">
              Save draft
            </Button>
          </div>
        </fieldset>
      </form>

      <aside className="editor-rail">
        <section aria-labelledby="insight-status-heading" className="rail-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="insight-status-heading">Status</h2>
            <StatusBadge tone={post.publication_status}>
              {post.publication_status.charAt(0).toUpperCase() + post.publication_status.slice(1)}
            </StatusBadge>
          </div>
          <p className="panel-copy">
            {post.reviewed_at
              ? `Reviewed ${new Date(post.reviewed_at).toLocaleDateString("en-GB")}${post.reviewed_by ? ` by ${post.reviewed_by}` : ""}.`
              : "Not yet marked as reviewed."}
          </p>
          <div className="rail-actions">
            <a
              className="button button-secondary"
              href={`/admin/content/insights/${post.id}/preview`}
              rel="noreferrer"
              target="_blank"
            >
              Preview draft
            </a>
            {post.publication_status === "published" ? (
              <a
                className="button button-quiet"
                href={`/insights/${localization.slug}`}
                rel="noreferrer"
                target="_blank"
              >
                View published
              </a>
            ) : null}
            {editable ? (
              <Button
                disabled={working || dirty}
                onClick={() => run(() => markInsightReviewedAction(post.id, version))}
                tone="secondary"
              >
                Mark as reviewed
              </Button>
            ) : null}
          </div>
        </section>
        <section aria-labelledby="insight-publication-heading" className="rail-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="insight-publication-heading">Publication</h2>
            <StatusBadge tone={detail.readiness.ready ? "ready" : "blocked"}>
              {detail.readiness.ready ? "Ready" : "Blocked"}
            </StatusBadge>
          </div>
          {detail.readiness.ready ? (
            <p className="panel-copy">Everything needed to publish is in place.</p>
          ) : (
            <ul className="readiness-list">
              {detail.readiness.reasons.map((reason, index) => (
                <li key={`${reason.code}-${index}`}>{reason.detail}</li>
              ))}
            </ul>
          )}
          {notice && notice.status !== "idle" ? (
            <Alert
              live
              tone={
                notice.status === "success"
                  ? "success"
                  : notice.status === "conflict"
                    ? "warning"
                    : "danger"
              }
            >
              <p>{notice.message}</p>
            </Alert>
          ) : null}
          <div className="rail-actions">
            {post.publication_status === "draft" && canPublish ? (
              <Button
                disabled={working || dirty || !detail.readiness.ready}
                onClick={() =>
                  run(() => changeInsightPublicationAction(post.id, version, "publish"))
                }
                tone="primary"
              >
                Publish
              </Button>
            ) : null}
            {post.publication_status === "published" && canPublish ? (
              <Button
                disabled={working}
                onClick={() => {
                  if (
                    window.confirm(
                      "Unpublish this article? It leaves the website; the draft is kept.",
                    )
                  )
                    run(() => changeInsightPublicationAction(post.id, version, "unpublish"));
                }}
                tone="secondary"
              >
                Unpublish
              </Button>
            ) : null}
            {post.publication_status !== "archived" && canArchive ? (
              <Button
                disabled={working}
                onClick={() => {
                  if (window.confirm("Archive this article?"))
                    run(() => changeInsightPublicationAction(post.id, version, "archive"));
                }}
                tone="danger"
              >
                Archive
              </Button>
            ) : null}
            {!canPublish && post.publication_status !== "archived" ? (
              <p className="permission-note">Your role can prepare drafts but cannot publish.</p>
            ) : null}
          </div>
        </section>
        {revisionsPanel}
      </aside>
    </div>
  );
}
