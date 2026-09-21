"use client";

import { startTransition, useActionState, type FormEvent } from "react";

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
import { submitServiceEnquiryAction } from "@/features/intake/intake-actions";
import { guardIntakeAction, initialIntakeActionState } from "@/features/intake/intake-contract";
import { needLabels, serviceKeys } from "@/features/intake/intake-policy";

const labels: Readonly<Record<string, string>> = {
  serviceKey: "Service",
  fullName: "Name",
  email: "Email",
  phone: "Phone / WhatsApp",
  context: "Project / location context",
  requirement: "What you need",
  timing: "Preferred timing",
  privacy: "Privacy notice",
};

/** Service enquiry with the service preselected from the page the visitor came from (C8 §16–17). */
export function ServiceEnquiryForm({
  context,
  preselected,
}: Readonly<{ context: IntakeFormContext; preselected: string | null }>) {
  const [state, formAction, pending] = useActionState(
    guardIntakeAction(submitServiceEnquiryAction),
    initialIntakeActionState,
  );
  if (state.status === "success" && state.reference) {
    return (
      <IntakeSuccess
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
      aria-labelledby="service-enquiry-title"
      className="intake-form"
      data-analytics-form="service_enquiry_start"
      noValidate
      onSubmit={submit}
    >
      <div className="intake-form-heading">
        <p className="section-kicker">Service enquiry</p>
        <h2 id="service-enquiry-title">Ask about a service.</h2>
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
      <IntakeField error={errors["serviceKey"]} id="serviceKey" label="Service">
        <select
          aria-describedby={describedBy("serviceKey", undefined, errors["serviceKey"])}
          aria-invalid={errors["serviceKey"] ? true : undefined}
          defaultValue={preselected ?? ""}
          id="serviceKey"
          name="serviceKey"
          required
        >
          <option value="">Choose a service</option>
          {serviceKeys.map((key) => (
            <option key={key} value={key}>
              {needLabels[key]}
            </option>
          ))}
        </select>
      </IntakeField>
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
        <IntakeField error={errors["timing"]} id="timing" label="Preferred timing" optional>
          <input
            id="timing"
            maxLength={120}
            name="timing"
            placeholder="e.g. within three months"
            type="text"
          />
        </IntakeField>
      </div>
      <IntakeField
        error={errors["context"]}
        id="context"
        label="Project / location context"
        optional
      >
        <input id="context" maxLength={1000} name="context" type="text" />
      </IntakeField>
      <IntakeField error={errors["requirement"]} id="requirement" label="What you need">
        <textarea
          aria-invalid={errors["requirement"] ? true : undefined}
          id="requirement"
          maxLength={2000}
          name="requirement"
          required
          rows={5}
        />
      </IntakeField>
      <PrivacyAcknowledgement error={errors["privacy"]} revision={context.privacyRevision} />
      <TurnstileWidget siteKey={context.turnstileSiteKey} />
      <div className="intake-actions">
        <button className="intake-submit" disabled={pending} type="submit">
          {pending ? "Sending…" : "Send service enquiry"}
        </button>
      </div>
    </form>
  );
}
