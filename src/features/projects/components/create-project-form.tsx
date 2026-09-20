"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { createProjectAction } from "@/features/projects/project-actions";
import { initialProjectActionState } from "@/features/projects/project-contract";

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, initialProjectActionState);
  const [values, setValues] = useState({ title: "", slug: "", locale: "en" });
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error" || state.status === "reauth") {
      const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
      (firstInvalid ?? summaryRef.current)?.focus();
    }
  }, [state]);

  const errorFor = (field: string) => state.fieldErrors[field];
  const describedBy = (field: string, hasHint = false) =>
    [hasHint ? `${field}-hint` : "", errorFor(field) ? `${field}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form action={action} className="editor-form editor-form-narrow" noValidate>
      {state.status !== "idle" ? (
        <div ref={summaryRef} tabIndex={-1}>
          <Alert
            live
            tone={state.status === "reauth" ? "warning" : "danger"}
            title="Draft not created"
          >
            <p>{state.message}</p>
            {state.reauthHref ? (
              <a className="text-link" href={state.reauthHref}>
                Continue to secure sign-in
              </a>
            ) : null}
          </Alert>
        </div>
      ) : null}
      <section aria-labelledby="new-project-identity" className="editor-section">
        <div className="editor-section-heading">
          <p className="section-index">01</p>
          <div>
            <h2 id="new-project-identity">Draft identity</h2>
            <p>
              Create the private record first. Story, media, related services, and publication
              remain separate steps in the editor.
            </p>
          </div>
        </div>
        <div className="field-grid field-grid-two">
          <Field error={errorFor("title")} id="title" label="Working title">
            <input
              aria-describedby={describedBy("title")}
              aria-invalid={Boolean(errorFor("title"))}
              autoComplete="off"
              id="title"
              maxLength={160}
              name="title"
              onChange={(event) =>
                setValues((current) => ({ ...current, title: event.target.value }))
              }
              required
              type="text"
              value={values.title}
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
              onChange={(event) =>
                setValues((current) => ({ ...current, slug: event.target.value }))
              }
              required
              spellCheck={false}
              type="text"
              value={values.slug}
            />
          </Field>
          <Field
            error={errorFor("locale")}
            hint="BCP 47 code; English is the current launch baseline."
            id="locale"
            label="Locale"
          >
            <input
              aria-describedby={describedBy("locale", true)}
              aria-invalid={Boolean(errorFor("locale"))}
              autoComplete="off"
              id="locale"
              maxLength={35}
              name="locale"
              onChange={(event) =>
                setValues((current) => ({ ...current, locale: event.target.value }))
              }
              required
              spellCheck={false}
              type="text"
              value={values.locale}
            />
          </Field>
        </div>
      </section>
      <div className="editor-action-bar">
        <p>A new project case study always begins as Draft and remains private.</p>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Creating draft…" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
