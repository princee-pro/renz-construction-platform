"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";
import { guardAction } from "@/features/admin-shared/action-state";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { createServiceAction } from "@/features/services/service-actions";
import { initialServiceActionState } from "@/features/services/service-contract";

export function CreateServiceForm() {
  const [state, action, pending] = useActionState(
    guardAction(createServiceAction),
    initialServiceActionState,
  );
  const guard = useSingleSubmit(pending);
  const [values, setValues] = useState({ name: "", slug: "", locale: "en" });
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
    <form
      action={action}
      className="editor-form editor-form-narrow"
      noValidate
      onSubmit={guard.onSubmit}
    >
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
      <section className="editor-section" aria-labelledby="new-service-identity">
        <div className="editor-section-heading">
          <p className="section-index">01</p>
          <div>
            <h2 id="new-service-identity">Draft identity</h2>
            <p>Create the private record first. Publication remains a separate gated operation.</p>
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
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              required
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
            hint="Language of the text. English (en) for now."
            id="locale"
            label="Language"
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
        <p>A new service always begins as Draft and remains private.</p>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Creating draft…" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
