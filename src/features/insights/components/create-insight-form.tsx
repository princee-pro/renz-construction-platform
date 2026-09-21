"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { createInsightAction } from "@/features/insights/insight-actions";
import { slugify } from "@/features/website/routes";

export function CreateInsightForm() {
  const [state, formAction, pending] = useActionState(
    guardAction(createInsightAction),
    initialAdminActionState,
  );
  const guard = useSingleSubmit(pending);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <form
      action={formAction}
      className="editor-form create-page-form"
      noValidate
      onSubmit={guard.onSubmit}
    >
      {state.status === "error" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <div className="field-group">
        <label htmlFor="insight-new-title">Title</label>
        <input
          id="insight-new-title"
          maxLength={200}
          name="title"
          onChange={(event) => {
            setTitle(event.target.value);
            if (!touched) setSlug(slugify(event.target.value));
          }}
          required
          type="text"
          value={title}
        />
        {state.fieldErrors["title"] ? (
          <p className="field-error">{state.fieldErrors["title"]}</p>
        ) : null}
      </div>
      <div className="field-group">
        <label htmlFor="insight-new-slug">Address</label>
        <div className="input-prefix">
          <span>/insights/</span>
          <input
            id="insight-new-slug"
            maxLength={120}
            name="slug"
            onChange={(event) => {
              setTouched(true);
              setSlug(event.target.value);
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            type="text"
            value={slug}
          />
        </div>
        {state.fieldErrors["slug"] ? (
          <p className="field-error">{state.fieldErrors["slug"]}</p>
        ) : null}
      </div>
      <Button disabled={pending} tone="primary" type="submit">
        {pending ? "Creating…" : "Create draft article"}
      </Button>
    </form>
  );
}
