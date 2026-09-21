"use client";

import { startTransition, useActionState, useRef, type FormEvent } from "react";

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
import { submitContactAction } from "@/features/intake/intake-actions";
import { guardIntakeAction, initialIntakeActionState } from "@/features/intake/intake-contract";

export type IntakeFormContext = Readonly<{
  formToken: string;
  privacyRevision: number | null;
  turnstileSiteKey: string | null;
  whatsappDigits: string;
  shortName: string;
  email: string;
}>;

const labels: Readonly<Record<string, string>> = {
  fullName: "Name",
  email: "Email",
  phone: "Phone / WhatsApp",
  subject: "Subject",
  message: "Message",
  privacy: "Privacy notice",
};

/**
 * Real general-contact form (C8 §14–15). Submission goes through the origin-
 * validated server action; a failed submission keeps every value in place.
 */
export function ContactForm({ context }: Readonly<{ context: IntakeFormContext }>) {
  const [state, formAction, pending] = useActionState(
    guardIntakeAction(submitContactAction),
    initialIntakeActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  if (state.status === "success" && state.reference) {
    return (
      <IntakeSuccess
        reference={state.reference}
        shortName={context.shortName}
        whatsappDigits={context.whatsappDigits}
      />
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(() => formAction(new FormData(form)));
  };
  const errors = state.fieldErrors;

  return (
    <form
      aria-labelledby="contact-form-title"
      className="intake-form"
      noValidate
      onSubmit={submit}
      ref={formRef}
    >
      <div className="intake-form-heading">
        <p className="section-kicker">Send an enquiry</p>
        <h2 id="contact-form-title">Send us a message.</h2>
        <p>
          Give a name and one way to reach you. Nothing else is required, and no account is created.
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
      <div className="intake-grid">
        <IntakeField error={errors["fullName"]} id="fullName" label="Name">
          <input
            aria-describedby={describedBy("fullName", undefined, errors["fullName"])}
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
            aria-describedby={describedBy("email", undefined, errors["email"])}
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
        <IntakeField error={errors["subject"]} id="subject" label="Subject">
          <input
            aria-describedby={describedBy("subject", undefined, errors["subject"])}
            aria-invalid={errors["subject"] ? true : undefined}
            id="subject"
            maxLength={200}
            name="subject"
            required
            type="text"
          />
        </IntakeField>
      </div>
      <IntakeField error={errors["message"]} id="message" label="Message">
        <textarea
          aria-describedby={describedBy("message", undefined, errors["message"])}
          aria-invalid={errors["message"] ? true : undefined}
          id="message"
          maxLength={4000}
          name="message"
          required
          rows={6}
        />
      </IntakeField>
      <PrivacyAcknowledgement error={errors["privacy"]} revision={context.privacyRevision} />
      <TurnstileWidget siteKey={context.turnstileSiteKey} />
      <div className="intake-actions">
        <button className="intake-submit" disabled={pending} type="submit">
          {pending ? "Sending…" : "Send enquiry"}
        </button>
      </div>
    </form>
  );
}
