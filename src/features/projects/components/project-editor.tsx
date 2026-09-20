"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { EvidenceWorkspace } from "@/features/projects/components/evidence-workspace";
import { ProjectMediaWorkspace } from "@/features/projects/components/project-media-workspace";
import { PublicationControls } from "@/features/projects/components/publication-controls";
import {
  createStageAction,
  deleteStageAction,
  markProjectReviewedAction,
  saveProjectAction,
  setProjectServicesAction,
  updateStageAction,
} from "@/features/projects/project-actions";
import {
  initialProjectActionState,
  type ProjectDetail,
  type ProjectStage,
} from "@/features/projects/project-contract";

function StageRow({
  stage,
  projectId,
  canWrite,
}: Readonly<{ stage: ProjectStage; projectId: string; canWrite: boolean }>) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateStageAction,
    initialProjectActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteStageAction,
    initialProjectActionState,
  );

  return (
    <li>
      <form action={updateAction} className="stage-edit-form" noValidate>
        <input name="stageId" type="hidden" value={stage.id} />
        <input name="projectId" type="hidden" value={projectId} />
        <input name="expectedStageVersion" type="hidden" value={stage.version} />
        <Field id={`stage-title-${stage.id}`} label="Chapter title">
          <input defaultValue={stage.title} maxLength={160} name="title" type="text" />
        </Field>
        <Field id={`stage-description-${stage.id}`} label="Chapter body">
          <textarea
            defaultValue={stage.description ?? ""}
            maxLength={4_000}
            name="description"
            rows={3}
          />
        </Field>
        <input defaultValue={stage.sort_order} name="sortOrder" type="hidden" />
        {canWrite ? (
          <div className="rail-actions">
            <Button disabled={updatePending} tone="secondary" type="submit">
              {updatePending ? "Saving…" : "Save chapter"}
            </Button>
          </div>
        ) : null}
        {updateState.status !== "idle" && updateState.status !== "success" ? (
          <Alert live tone="danger">
            <p>{updateState.message}</p>
          </Alert>
        ) : null}
      </form>
      {canWrite ? (
        <form action={deleteAction}>
          <input name="stageId" type="hidden" value={stage.id} />
          <input name="projectId" type="hidden" value={projectId} />
          <input name="expectedStageVersion" type="hidden" value={stage.version} />
          <Button disabled={deletePending} tone="danger" type="submit">
            {deletePending ? "Removing…" : "Delete chapter"}
          </Button>
          {deleteState.status !== "idle" && deleteState.status !== "success" ? (
            <Alert live tone="danger">
              <p>{deleteState.message}</p>
            </Alert>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}

type Section = "overview" | "story" | "services" | "media" | "placement" | "publication";

export function ProjectEditor({
  detail,
  availableServices,
  canWrite,
  canPublish,
  canArchive,
  canVerify,
  placementPanel = null,
  revisionsPanel = null,
  studyProject = false,
}: Readonly<{
  detail: ProjectDetail & { localization: NonNullable<ProjectDetail["localization"]> };
  /** D1.7: the project is a concept / context study (from Website placement). */
  studyProject?: boolean;
  availableServices: readonly { id: string; name: string }[];
  canWrite: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canVerify: boolean;
  /** CR1: evidence class, layout hint, Home feature, materials, tags. */
  placementPanel?: ReactNode;
  /** CR1: draft changes / publish changes / revision history. */
  revisionsPanel?: ReactNode;
}>) {
  const [section, setSection] = useState<Section>("overview");
  const [projectVersion, setProjectVersion] = useState(detail.project.version);
  const [localizationVersion, setLocalizationVersion] = useState(detail.localization.version);
  // Adopt the versions a fresh server render carries (republish, placement
  // save, media commands) so later commands are not refused as stale.
  const [seenVersions, setSeenVersions] = useState({
    project: detail.project.version,
    localization: detail.localization.version,
  });
  if (
    seenVersions.project !== detail.project.version ||
    seenVersions.localization !== detail.localization.version
  ) {
    setSeenVersions({
      project: detail.project.version,
      localization: detail.localization.version,
    });
    setProjectVersion(detail.project.version);
    setLocalizationVersion(detail.localization.version);
  }
  const router = useRouter();

  const [saveState, saveAction, savePending] = useActionState(
    saveProjectAction,
    initialProjectActionState,
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    markProjectReviewedAction,
    initialProjectActionState,
  );
  const [servicesState, servicesAction, servicesPending] = useActionState(
    setProjectServicesAction,
    initialProjectActionState,
  );
  const [stageState, stageAction, stagePending] = useActionState(
    createStageAction,
    initialProjectActionState,
  );

  const feedbackRef = useRef<HTMLDivElement>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<readonly string[]>(
    detail.services.map((service) => service.service_id),
  );

  // Deriving projectVersion/localizationVersion from the latest action result
  // is done during render, comparing against the previous state value held
  // in useState — React's documented alternative to a setState-in-effect
  // (refs cannot be read/written during render either). Only
  // router.refresh()/focus, true side effects, remain in effects below.
  const [prevSaveState, setPrevSaveState] = useState(saveState);
  if (saveState !== prevSaveState) {
    setPrevSaveState(saveState);
    if (saveState.status === "success" || saveState.status === "conflict") {
      if (saveState.projectVersion) setProjectVersion(saveState.projectVersion);
      if (saveState.localizationVersion) setLocalizationVersion(saveState.localizationVersion);
    }
  }
  const [prevReviewState, setPrevReviewState] = useState(reviewState);
  if (reviewState !== prevReviewState) {
    setPrevReviewState(reviewState);
    if (reviewState.status === "success" && reviewState.projectVersion) {
      setProjectVersion(reviewState.projectVersion);
    }
  }
  const [prevServicesState, setPrevServicesState] = useState(servicesState);
  if (servicesState !== prevServicesState) {
    setPrevServicesState(servicesState);
    if (
      (servicesState.status === "success" || servicesState.status === "conflict") &&
      servicesState.projectVersion
    ) {
      setProjectVersion(servicesState.projectVersion);
    }
  }

  useEffect(() => {
    if (saveState.status === "idle") return;
    if (saveState.status === "success" || saveState.status === "conflict") router.refresh();
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }, [router, saveState]);

  useEffect(() => {
    if (reviewState.status === "success") router.refresh();
  }, [reviewState, router]);

  useEffect(() => {
    if (servicesState.status === "success" || servicesState.status === "conflict") router.refresh();
  }, [servicesState, router]);

  const sections: readonly { key: Section; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "story", label: "Story" },
    { key: "services", label: "Services" },
    { key: "media", label: `Media (${detail.media.length})` },
    { key: "placement", label: "Website placement" },
    { key: "publication", label: "Publication" },
  ];

  const servicesPayload = JSON.stringify(
    selectedServiceIds.map((serviceId) => ({ serviceId, service_id: serviceId })),
  );

  return (
    <div className="project-editor">
      <nav aria-label="Editor sections" className="editor-tabs">
        {sections.map((item) => (
          <button
            aria-current={section === item.key ? "true" : undefined}
            className="editor-tab"
            key={item.key}
            onClick={() => setSection(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="editor-layout">
        <div className="editor-main">
          {section === "overview" ? (
            <form action={saveAction} className="project-overview-form" noValidate>
              <input name="projectId" type="hidden" value={detail.project.id} />
              <input name="projectVersion" type="hidden" value={projectVersion} />
              <input name="localizationVersion" type="hidden" value={localizationVersion} />
              <input name="locale" type="hidden" value={detail.localization.locale} />

              <div className="field-grid field-grid-two">
                <Field error={saveState.fieldErrors["title"]} id="title" label="Public title">
                  <input
                    defaultValue={detail.localization.title}
                    id="title"
                    maxLength={160}
                    name="title"
                    type="text"
                  />
                </Field>
                <Field error={saveState.fieldErrors["slug"]} id="slug" label="Slug">
                  <input
                    defaultValue={detail.localization.slug}
                    id="slug"
                    maxLength={120}
                    name="slug"
                    type="text"
                  />
                </Field>
              </div>

              <Field error={saveState.fieldErrors["summary"]} id="summary" label="Public summary">
                <textarea
                  defaultValue={detail.localization.summary ?? ""}
                  id="summary"
                  maxLength={600}
                  name="summary"
                  rows={3}
                />
              </Field>

              <div className="field-grid field-grid-two">
                <Field
                  error={saveState.fieldErrors["projectType"]}
                  id="projectType"
                  label="Project type"
                >
                  <input
                    defaultValue={detail.project.project_type ?? ""}
                    id="projectType"
                    maxLength={80}
                    name="projectType"
                    type="text"
                  />
                </Field>
                <Field
                  error={saveState.fieldErrors["deliveryStatus"]}
                  id="deliveryStatus"
                  label="Delivery status"
                >
                  <input
                    defaultValue={detail.project.delivery_status ?? ""}
                    id="deliveryStatus"
                    maxLength={80}
                    name="deliveryStatus"
                    type="text"
                  />
                </Field>
              </div>

              <div className="field-grid field-grid-two">
                <Field
                  error={saveState.fieldErrors["publicLocation"]}
                  hint="A public-safe location — city, region, or country only."
                  id="publicLocation"
                  label="Public location"
                >
                  <input
                    defaultValue={detail.project.public_location ?? ""}
                    id="publicLocation"
                    maxLength={200}
                    name="publicLocation"
                    type="text"
                  />
                </Field>
                <Field
                  error={saveState.fieldErrors["publicLocationGranularity"]}
                  id="publicLocationGranularity"
                  label="Location granularity"
                >
                  <select
                    defaultValue={detail.project.public_location_granularity ?? ""}
                    id="publicLocationGranularity"
                    name="publicLocationGranularity"
                  >
                    <option value="">Not set</option>
                    <option value="city">City</option>
                    <option value="region">Region</option>
                    <option value="country">Country</option>
                  </select>
                </Field>
              </div>

              <div className="field-grid field-grid-two">
                <Field error={saveState.fieldErrors["startYear"]} id="startYear" label="Start year">
                  <input
                    defaultValue={detail.project.start_year ?? ""}
                    id="startYear"
                    max={2500}
                    min={1800}
                    name="startYear"
                    type="number"
                  />
                </Field>
                <Field
                  error={saveState.fieldErrors["completionYear"]}
                  id="completionYear"
                  label="Completion year"
                >
                  <input
                    defaultValue={detail.project.completion_year ?? ""}
                    id="completionYear"
                    max={2500}
                    min={1800}
                    name="completionYear"
                    type="number"
                  />
                </Field>
              </div>

              <Field
                error={saveState.fieldErrors["projectScope"]}
                id="projectScope"
                label="Project scope"
              >
                <textarea
                  defaultValue={detail.project.project_scope ?? ""}
                  id="projectScope"
                  maxLength={4_000}
                  name="projectScope"
                  rows={3}
                />
              </Field>
              <Field error={saveState.fieldErrors["renzRole"]} id="renzRole" label="RENZ role">
                <textarea
                  defaultValue={detail.project.renz_role ?? ""}
                  id="renzRole"
                  maxLength={400}
                  name="renzRole"
                  rows={2}
                />
              </Field>

              <div className="field-grid field-grid-two">
                <Field error={saveState.fieldErrors["seoTitle"]} id="seoTitle" label="SEO title">
                  <input
                    defaultValue={detail.localization.seo_title ?? ""}
                    id="seoTitle"
                    maxLength={160}
                    name="seoTitle"
                    type="text"
                  />
                </Field>
                <Field
                  error={saveState.fieldErrors["seoDescription"]}
                  id="seoDescription"
                  label="SEO description"
                >
                  <input
                    defaultValue={detail.localization.seo_description ?? ""}
                    id="seoDescription"
                    maxLength={320}
                    name="seoDescription"
                    type="text"
                  />
                </Field>
              </div>

              <div className="field-grid field-grid-two">
                <Field
                  error={saveState.fieldErrors["sortOrder"]}
                  id="sortOrder"
                  label="Order on the website"
                >
                  <input
                    defaultValue={detail.project.sort_order}
                    id="sortOrder"
                    min={0}
                    name="sortOrder"
                    type="number"
                  />
                </Field>
                <Field
                  error={saveState.fieldErrors["heroAssetId"]}
                  id="heroAssetId"
                  label="Hero media asset id"
                >
                  <input
                    defaultValue={detail.project.hero_asset_id ?? ""}
                    id="heroAssetId"
                    name="heroAssetId"
                    placeholder="Set from the Media tab"
                    type="text"
                  />
                </Field>
              </div>

              <label className="check-field">
                <input defaultChecked={detail.project.featured} name="featured" type="checkbox" />
                <span>Featured</span>
              </label>

              <div ref={feedbackRef} tabIndex={saveState.status === "idle" ? undefined : -1}>
                {saveState.status === "success" ? (
                  <p aria-live="polite" className="form-success">
                    {saveState.message}
                  </p>
                ) : saveState.status !== "idle" ? (
                  <Alert live tone={saveState.status === "reauth" ? "warning" : "danger"}>
                    <p>{saveState.message}</p>
                    {saveState.reauthHref ? (
                      <a className="text-link" href={saveState.reauthHref}>
                        Continue to secure sign-in
                      </a>
                    ) : null}
                  </Alert>
                ) : null}
              </div>

              {canWrite ? (
                <div className="form-actions">
                  <Button disabled={savePending} tone="primary" type="submit">
                    {savePending ? "Saving…" : "Save draft"}
                  </Button>
                </div>
              ) : null}
            </form>
          ) : null}

          {section === "overview" ? (
            // Its own form: nested forms are dropped by the browser, which
            // would turn this button into a second "Save draft".
            <div className="project-review-block">
              {detail.project.reviewed_by ? (
                <p className="panel-copy">
                  Factually reviewed{" "}
                  {detail.project.reviewed_at
                    ? new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(detail.project.reviewed_at))
                    : ""}
                  .
                </p>
              ) : canVerify ? (
                <form action={reviewAction}>
                  <input name="projectId" type="hidden" value={detail.project.id} />
                  <input name="expectedVersion" type="hidden" value={projectVersion} />
                  <Button disabled={reviewPending} tone="secondary" type="submit">
                    {reviewPending ? "Recording…" : "Mark factually reviewed"}
                  </Button>
                  {reviewState.status === "error" || reviewState.status === "conflict" ? (
                    <Alert live tone="danger">
                      <p>{reviewState.message}</p>
                    </Alert>
                  ) : null}
                </form>
              ) : (
                <p className="permission-note">
                  This project has not been marked as factually reviewed yet.
                </p>
              )}
            </div>
          ) : null}

          {section === "story" ? (
            <div className="project-story-editor">
              <p className="section-description">
                Story chapters are optional and ordered. Attach media to a chapter from the Media
                tab once it exists here.
              </p>
              <ol className="stage-list">
                {detail.stages.map((stage) => (
                  <StageRow
                    canWrite={canWrite}
                    key={stage.id}
                    projectId={detail.project.id}
                    stage={stage}
                  />
                ))}
              </ol>
              {detail.stages.length === 0 ? (
                <p className="quiet-empty">No story chapters yet.</p>
              ) : null}

              {canWrite ? (
                <form action={stageAction} className="stage-create-form" noValidate>
                  <input name="projectId" type="hidden" value={detail.project.id} />
                  <input name="expectedVersion" type="hidden" value={projectVersion} />
                  <Field
                    error={stageState.fieldErrors["title"]}
                    id="new-stage-title"
                    label="New chapter title"
                  >
                    <input
                      id="new-stage-title"
                      maxLength={160}
                      name="title"
                      placeholder="e.g. Brief"
                      type="text"
                    />
                  </Field>
                  <Field
                    error={stageState.fieldErrors["description"]}
                    id="new-stage-description"
                    label="Chapter body"
                  >
                    <textarea
                      id="new-stage-description"
                      maxLength={4_000}
                      name="description"
                      rows={3}
                    />
                  </Field>
                  <input name="sortOrder" type="hidden" value={detail.stages.length} />
                  <div className="form-actions">
                    <Button disabled={stagePending} tone="primary" type="submit">
                      {stagePending ? "Adding…" : "Add chapter"}
                    </Button>
                  </div>
                  {stageState.status !== "idle" && stageState.status !== "success" ? (
                    <Alert live tone="danger">
                      <p>{stageState.message}</p>
                    </Alert>
                  ) : null}
                </form>
              ) : null}

              <EvidenceWorkspace
                canVerify={canVerify}
                canWrite={canWrite}
                evidence={detail.evidence}
                projectId={detail.project.id}
              />
            </div>
          ) : null}

          {section === "services" ? (
            <form action={servicesAction} className="project-services-form" noValidate>
              <input name="projectId" type="hidden" value={detail.project.id} />
              <input name="expectedVersion" type="hidden" value={projectVersion} />
              <input name="services" type="hidden" value={servicesPayload} />
              <p className="section-description">
                A published project must relate to at least one publishable service. Selections save
                immediately.
              </p>
              <fieldset className="service-checklist">
                <legend>Related services</legend>
                {availableServices.map((service) => (
                  <label className="check-field" key={service.id}>
                    <input
                      checked={selectedServiceIds.includes(service.id)}
                      onChange={(event) =>
                        setSelectedServiceIds((current) =>
                          event.target.checked
                            ? [...current, service.id]
                            : current.filter((id) => id !== service.id),
                        )
                      }
                      type="checkbox"
                    />
                    <span>{service.name}</span>
                  </label>
                ))}
                {availableServices.length === 0 ? (
                  <p className="quiet-empty">No services exist yet to relate to this project.</p>
                ) : null}
              </fieldset>
              {canWrite ? (
                <div className="form-actions">
                  <Button disabled={servicesPending} tone="primary" type="submit">
                    {servicesPending ? "Saving…" : "Save related services"}
                  </Button>
                </div>
              ) : null}
              {servicesState.status !== "idle" && servicesState.status !== "success" ? (
                <Alert live tone="danger">
                  <p>{servicesState.message}</p>
                </Alert>
              ) : servicesState.status === "success" ? (
                <p aria-live="polite" className="form-success">
                  {servicesState.message}
                </p>
              ) : null}
            </form>
          ) : null}

          {section === "media" ? (
            <ProjectMediaWorkspace
              canWrite={canWrite}
              media={detail.media}
              projectId={detail.project.id}
              projectVersion={projectVersion}
              stages={detail.stages}
              studyProject={studyProject}
            />
          ) : null}

          {section === "placement" ? placementPanel : null}

          {section === "publication" ? (
            <>
              <PublicationControls
                canArchive={canArchive}
                canPublish={canPublish}
                onVersionChange={setProjectVersion}
                projectId={detail.project.id}
                projectVersion={projectVersion}
                readiness={detail.readiness}
                status={detail.project.publication_status}
              />
              {revisionsPanel}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
