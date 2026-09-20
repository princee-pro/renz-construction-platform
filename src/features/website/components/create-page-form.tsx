"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { createWebsitePageAction } from "@/features/website/actions";
import { slugify } from "@/features/website/routes";

/** New custom page (CR1 §11). The address is suggested from the title and checked against the reserved routes. */
export function CreatePageForm() {
  const [state, formAction, pending] = useActionState(
    createWebsitePageAction,
    initialAdminActionState,
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  return (
    <section aria-labelledby="create-page-title" className="register-section create-page">
      <h2 id="create-page-title">Create a new page</h2>
      <p className="field-help">
        A custom page starts as a draft with a masthead. Add sections, preview, publish, then add it
        to the navigation from Website → Navigation.
      </p>
      {state.status === "error" ? (
        <Alert live title="Not created" tone="danger">
          {state.message}
        </Alert>
      ) : null}
      <form action={formAction} className="create-page-form">
        <div className="field-group">
          <label htmlFor="new-page-title">Title</label>
          <input
            id="new-page-title"
            maxLength={160}
            name="title"
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
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
          <label htmlFor="new-page-slug">Address</label>
          <div className="input-prefix">
            <span>/</span>
            <input
              id="new-page-slug"
              maxLength={80}
              name="slug"
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              type="text"
              value={slug}
            />
          </div>
          <p className="field-help">
            Lowercase letters, numbers and hyphens. Addresses used by the website itself (services,
            projects, contact …) are reserved.
          </p>
          {state.fieldErrors["slug"] ? (
            <p className="field-error">{state.fieldErrors["slug"]}</p>
          ) : null}
        </div>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Creating…" : "Create draft page"}
        </Button>
      </form>
    </section>
  );
}
