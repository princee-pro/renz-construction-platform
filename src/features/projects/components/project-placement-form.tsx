"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { saveProjectPlacementAction } from "@/features/projects/project-presentation-actions";
import type { ProjectPresentation } from "@/features/projects/project-presentation";

/**
 * CR1 website placement: the owner chooses content, class, priority and an
 * optional layout hint; the website places the project automatically.
 */
export function ProjectPlacementForm({
  projectId,
  projectVersion,
  presentation,
  canWrite,
}: Readonly<{
  projectId: string;
  projectVersion: number;
  presentation: ProjectPresentation;
  canWrite: boolean;
}>) {
  const [state, action, pending] = useActionState(
    saveProjectPlacementAction,
    initialAdminActionState,
  );
  // Controlled fields (React resets uncontrolled inputs after a form
  // action) and a version that follows the freshest source: a newer server
  // render (the register form shares this row) or the last save result.
  const serverVersion = Math.max(projectVersion, presentation.version);
  const [fields, setFields] = useState(() => ({
    evidenceClass: presentation.evidence_class,
    homeFeatured: presentation.home_featured,
    layoutHint: presentation.layout_hint,
    materials: presentation.materials ?? "",
    tags: presentation.tags.join(", "),
  }));
  const [seenVersion, setSeenVersion] = useState(serverVersion);
  const [seenState, setSeenState] = useState(state);
  const [version, setVersion] = useState(serverVersion);
  if (seenVersion !== serverVersion) {
    setSeenVersion(serverVersion);
    setVersion(serverVersion);
  }
  if (seenState !== state) {
    setSeenState(state);
    if (state.currentVersion) setVersion(state.currentVersion);
  }
  const update = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) =>
    setFields((current) => ({ ...current, [key]: value }));
  return (
    <section aria-labelledby="placement-heading" className="editor-section project-placement">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Website placement</p>
          <h2 id="placement-heading">How this project appears on the website</h2>
        </div>
      </div>
      <p className="panel-copy">
        Projects are placed automatically on the website. Use Featured and Display order (Overview)
        to influence prominence and tick Feature on Home to show it on the home page; no layout
        setup is required. The address, filters and related-service placement update on publish.
      </p>
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
        </Alert>
      ) : null}
      <form action={action} className="editor-form" noValidate>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="expectedVersion" type="hidden" value={version} />
        <fieldset className="editor-lock-fieldset" disabled={!canWrite || pending}>
          <div className="field-group">
            <label htmlFor="placement-class">What this project is</label>
            <select
              id="placement-class"
              name="evidenceClass"
              onChange={(event) =>
                update("evidenceClass", event.target.value as typeof fields.evidenceClass)
              }
              value={fields.evidenceClass}
            >
              <option value="real_project">
                Real RENZ project (needs reviewed evidence and rights-cleared photographs)
              </option>
              <option value="concept_study">
                Concept study (generated study of approach — always labelled)
              </option>
              <option value="experience_study">
                Experience study (illustrative, always labelled)
              </option>
            </select>
            <p className="field-help">
              A real project requires reviewed evidence, a public-safe location and RENZ-provided
              media before it can be published. Studies are labelled on every card and page and
              never count as delivered work.
            </p>
            {state.fieldErrors["evidenceClass"] ? (
              <p className="field-error">{state.fieldErrors["evidenceClass"]}</p>
            ) : null}
          </div>
          <div className="field-grid field-grid-two">
            <label className="checkbox-row" htmlFor="placement-home">
              <input
                checked={fields.homeFeatured}
                id="placement-home"
                name="homeFeatured"
                onChange={(event) => update("homeFeatured", event.target.checked)}
                type="checkbox"
              />
              <span>Feature on Home</span>
            </label>
            <div className="field-group">
              <label htmlFor="placement-layout">Layout hint</label>
              <select
                id="placement-layout"
                name="layoutHint"
                onChange={(event) =>
                  update("layoutHint", event.target.value as typeof fields.layoutHint)
                }
                value={fields.layoutHint}
              >
                <option value="auto">Auto (recommended)</option>
                <option value="monument">Monument (full-width)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="technical">Technical (drawing-led)</option>
                <option value="strip">Strip</option>
                <option value="wide">Wide story</option>
              </select>
              <p className="field-help">
                The website may adjust a hint that would clash with its neighbours.
              </p>
            </div>
            <div className="field-group">
              <label htmlFor="placement-materials">Materials (shown on cards)</label>
              <input
                id="placement-materials"
                maxLength={300}
                name="materials"
                onChange={(event) => update("materials", event.target.value)}
                placeholder="Concrete / timber / stone"
                type="text"
                value={fields.materials}
              />
            </div>
            <div className="field-group">
              <label htmlFor="placement-tags">Tags (comma separated)</label>
              <input
                id="placement-tags"
                name="tags"
                onChange={(event) => update("tags", event.target.value)}
                type="text"
                value={fields.tags}
              />
            </div>
          </div>
          <div className="editor-actions">
            <Button tone="primary" type="submit">
              {pending ? "Saving…" : "Save placement"}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
