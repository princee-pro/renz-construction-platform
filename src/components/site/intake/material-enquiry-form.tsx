"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";

import type { IntakeFormContext } from "@/components/site/intake/contact-form";
import {
  Honeypot,
  IntakeErrorSummary,
  IntakeFallback,
  IntakeField,
  IntakeSuccess,
  PrivacyAcknowledgement,
  describedBy,
} from "@/components/site/intake/intake-fields";
import { TurnstileWidget } from "@/components/site/intake/turnstile-widget";
import { submitMaterialEnquiryAction } from "@/features/intake/intake-actions";
import { guardIntakeAction, initialIntakeActionState } from "@/features/intake/intake-contract";

const labels: Readonly<Record<string, string>> = {
  fullName: "Name",
  email: "Email",
  phone: "Phone / WhatsApp",
  location: "Delivery location",
  notes: "Notes",
  items: "Materials",
  privacy: "Privacy notice",
};

/**
 * Material enquiry (C8 §18–19): visitor-stated needs, several items, no
 * catalog, no prices, no checkout. Staff translate accepted items into
 * project material requirements deliberately.
 */
export function MaterialEnquiryForm({ context }: Readonly<{ context: IntakeFormContext }>) {
  const [state, formAction, pending] = useActionState(
    guardIntakeAction(submitMaterialEnquiryAction),
    initialIntakeActionState,
  );
  const [rows, setRows] = useState<number[]>([0, 1]);
  if (state.status === "success" && state.reference) {
    return (
      <IntakeSuccess
        heading="Thank you — your materials list is with RENZ."
        nextSteps={`${context.shortName} reviews material requests by hand and replies with availability and next steps through the contact details you gave. Nothing is ordered until you confirm with RENZ.`}
        reference={state.reference}
        shortName={context.shortName}
        whatsappDigits={context.whatsappDigits}
      />
    );
  }
  const errors = state.fieldErrors;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(() => formAction(new FormData(form)));
  };
  return (
    <form
      aria-labelledby="material-enquiry-title"
      className="intake-form"
      noValidate
      onSubmit={submit}
    >
      <div className="intake-form-heading">
        <p className="section-kicker">Material enquiry</p>
        <h2 id="material-enquiry-title">Tell us what materials you need.</h2>
        <p>
          Describe each item in your own words. This is an enquiry, not an order — RENZ replies with
          what is possible.
        </p>
      </div>
      <IntakeErrorSummary labels={labels} state={state} />
      {state.fallback ? (
        <IntakeFallback
          email={context.email}
          retryAfterSeconds={state.retryAfterSeconds}
          shortName={context.shortName}
          whatsappDigits={context.whatsappDigits}
        />
      ) : null}
      <input name="formToken" type="hidden" value={context.formToken} />
      <Honeypot />
      <fieldset className="intake-fieldset">
        <legend>Materials</legend>
        {errors["items"] ? (
          <p className="intake-error" id="items-error" role="alert">
            {errors["items"]}
          </p>
        ) : null}
        <ol className="intake-items">
          {rows.map((row, index) => (
            <li className="intake-item" key={row}>
              <IntakeField
                error={errors[`items.${index}.description`] ?? errors[`item_${index}_description`]}
                id={`item_${index}_description`}
                label={`Item ${index + 1}`}
              >
                <input
                  id={`item_${index}_description`}
                  maxLength={300}
                  name={`item_${index}_description`}
                  placeholder="e.g. Cement 42.5N"
                  type="text"
                />
              </IntakeField>
              <div className="intake-item-details">
                <IntakeField id={`item_${index}_quantity`} label="Quantity" optional>
                  <input
                    id={`item_${index}_quantity`}
                    inputMode="decimal"
                    min={0}
                    name={`item_${index}_quantity`}
                    step="any"
                    type="number"
                  />
                </IntakeField>
                <IntakeField id={`item_${index}_unit`} label="Unit" optional>
                  <input
                    id={`item_${index}_unit`}
                    maxLength={40}
                    name={`item_${index}_unit`}
                    placeholder="bags, m³, tonnes…"
                    type="text"
                  />
                </IntakeField>
              </div>
              <IntakeField
                id={`item_${index}_specification`}
                label="Specification / notes"
                optional
              >
                <input
                  id={`item_${index}_specification`}
                  maxLength={1000}
                  name={`item_${index}_specification`}
                  type="text"
                />
              </IntakeField>
              {rows.length > 1 ? (
                <button
                  className="intake-remove"
                  onClick={() => setRows((current) => current.filter((value) => value !== row))}
                  type="button"
                >
                  Remove item {index + 1}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
        {rows.length < 20 ? (
          <button
            className="intake-secondary"
            onClick={() => setRows((current) => [...current, (current.at(-1) ?? 0) + 1])}
            type="button"
          >
            Add another item
          </button>
        ) : null}
      </fieldset>
      <div className="intake-grid">
        <IntakeField error={errors["fullName"]} id="fullName" label="Name">
          <input
            aria-invalid={errors["fullName"] ? true : undefined}
            autoComplete="name"
            id="fullName"
            maxLength={200}
            name="fullName"
            required
            type="text"
          />
        </IntakeField>
        <IntakeField error={errors["email"]} id="email" label="Email">
          <input
            aria-invalid={errors["email"] ? true : undefined}
            autoComplete="email"
            id="email"
            inputMode="email"
            maxLength={254}
            name="email"
            type="email"
          />
        </IntakeField>
        <IntakeField
          error={errors["phone"]}
          hint="Give at least one: email or phone."
          id="phone"
          label="Phone / WhatsApp"
        >
          <input
            aria-describedby={describedBy(
              "phone",
              "Give at least one: email or phone.",
              errors["phone"],
            )}
            aria-invalid={errors["phone"] ? true : undefined}
            autoComplete="tel"
            id="phone"
            inputMode="tel"
            maxLength={40}
            name="phone"
            type="tel"
          />
        </IntakeField>
        <IntakeField error={errors["location"]} id="location" label="Delivery location" optional>
          <input id="location" maxLength={400} name="location" type="text" />
        </IntakeField>
      </div>
      <IntakeField error={errors["notes"]} id="notes" label="Notes" optional>
        <textarea id="notes" maxLength={2000} name="notes" rows={4} />
      </IntakeField>
      <PrivacyAcknowledgement error={errors["privacy"]} revision={context.privacyRevision} />
      <TurnstileWidget siteKey={context.turnstileSiteKey} />
      <div className="intake-actions">
        <button className="intake-submit" disabled={pending} type="submit">
          {pending ? "Sending…" : "Send material enquiry"}
        </button>
      </div>
    </form>
  );
}
