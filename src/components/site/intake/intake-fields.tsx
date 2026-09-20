"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { continueOnWhatsAppMessage, honeypotFieldName } from "@/features/intake/intake-policy";
import type { IntakeActionState } from "@/features/intake/intake-contract";
import { whatsappLink } from "@/lib/site/whatsapp";

/** Accessible field wrapper: label, optional hint, field-level error wired by aria. */
export function IntakeField({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  optional?: boolean | undefined;
  children: ReactNode;
}>) {
  return (
    <div className={`intake-field${error ? " intake-field-invalid" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional ? <span className="intake-optional"> (optional)</span> : null}
      </label>
      {hint ? (
        <p className="intake-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="intake-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** Error summary that receives focus so keyboard and screen-reader users land on the problems. */
export function IntakeErrorSummary({
  state,
  labels,
}: Readonly<{ state: IntakeActionState; labels: Readonly<Record<string, string>> }>) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(state.fieldErrors);
  useEffect(() => {
    if (
      state.status === "error" ||
      state.status === "rate_limited" ||
      state.status === "unavailable"
    ) {
      ref.current?.focus();
    }
  }, [state]);
  if (
    state.status !== "error" &&
    state.status !== "rate_limited" &&
    state.status !== "unavailable"
  ) {
    return null;
  }
  return (
    <div className="intake-summary" ref={ref} role="alert" tabIndex={-1}>
      <p className="intake-summary-title">{state.message}</p>
      {entries.length > 0 ? (
        <ul>
          {entries.map(([field, message]) => (
            <li key={field}>
              {field === "form" ||
              field === "formToken" ||
              field === "turnstileToken" ||
              field === "files" ? (
                <span>{message}</span>
              ) : (
                <a href={`#${field}`}>
                  {labels[field] ?? field}: {message}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Honeypot: outside the accessibility tree, unfocusable, never announced. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="intake-honeypot">
      <label htmlFor={`intake-${honeypotFieldName}`}>Leave this field empty</label>
      <input
        autoComplete="off"
        id={`intake-${honeypotFieldName}`}
        name={honeypotFieldName}
        tabIndex={-1}
        type="text"
      />
    </div>
  );
}

export function PrivacyAcknowledgement({
  error,
  revision,
}: Readonly<{ error?: string | undefined; revision: number | null }>) {
  return (
    <div className={`intake-field intake-consent${error ? " intake-field-invalid" : ""}`}>
      <label htmlFor="privacy">
        <input
          aria-describedby={error ? "privacy-error" : undefined}
          aria-invalid={error ? true : undefined}
          id="privacy"
          name="privacy"
          type="checkbox"
        />
        <span>
          I have read the{" "}
          <a href="/privacy" rel="noreferrer" target="_blank">
            Privacy Notice
          </a>
          {revision ? ` (revision ${revision})` : ""} and agree that RENZ stores this enquiry to
          respond to it.
        </span>
      </label>
      {error ? (
        <p className="intake-error" id="privacy-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function IntakeFallback({
  whatsappDigits,
  shortName,
  email,
  retryAfterSeconds,
}: Readonly<{
  whatsappDigits: string;
  shortName: string;
  email: string;
  retryAfterSeconds: number | null;
}>) {
  const wait =
    retryAfterSeconds && retryAfterSeconds > 0 ? Math.ceil(retryAfterSeconds / 60) : null;
  return (
    <div className="intake-fallback">
      {wait ? (
        <p>
          You can try the form again in about {wait} minute{wait === 1 ? "" : "s"}.
        </p>
      ) : null}
      <div className="intake-fallback-actions">
        <a
          className="public-link public-link-whatsapp"
          data-analytics-cta="whatsapp"
          href={whatsappLink(
            whatsappDigits,
            `Hello ${shortName}, I would like to discuss a project.`,
          )}
          rel="noreferrer"
          target="_blank"
        >
          <span>Message on WhatsApp</span>
        </a>
        <a className="public-link public-link-quiet" href={`mailto:${email}`}>
          <span>Email {shortName}</span>
        </a>
      </div>
    </div>
  );
}

export function IntakeSuccess({
  reference,
  whatsappDigits,
  shortName,
  heading,
  nextSteps,
  continueLabel,
}: Readonly<{
  reference: string;
  whatsappDigits: string;
  shortName: string;
  heading?: string | undefined;
  nextSteps?: string | undefined;
  continueLabel?: string | undefined;
}>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <section
      aria-labelledby="intake-success-title"
      className="intake-success"
      ref={ref}
      tabIndex={-1}
    >
      <p className="section-kicker">Received</p>
      <h2 id="intake-success-title">{heading ?? "Thank you — your enquiry is with RENZ."}</h2>
      <p className="intake-reference-label">Your reference</p>
      <p className="intake-reference">
        <code>{reference}</code>
        <CopyReferenceButton reference={reference} />
      </p>
      <p>
        {nextSteps ??
          `Keep this reference for any follow-up. A member of ${shortName} will review what you sent and reply through the contact details you gave; response times depend on the current workload.`}
      </p>
      <div className="intake-fallback-actions">
        <a
          className="public-link public-link-whatsapp"
          data-analytics-cta="whatsapp"
          href={whatsappLink(whatsappDigits, continueOnWhatsAppMessage(reference, shortName))}
          rel="noreferrer"
          target="_blank"
        >
          <span>{continueLabel ?? "Continue on WhatsApp"}</span>
        </a>
        <Link className="public-link public-link-quiet" href="/">
          <span>Back to the site</span>
        </Link>
      </div>
    </section>
  );
}

function CopyReferenceButton({ reference }: Readonly<{ reference: string }>) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      className="intake-copy"
      onClick={() => {
        navigator.clipboard
          .writeText(reference)
          .then(() => {
            if (ref.current) ref.current.textContent = "Copied";
          })
          .catch(() => {
            if (ref.current) ref.current.textContent = "Select and copy";
          });
      }}
      ref={ref}
      type="button"
    >
      Copy reference
    </button>
  );
}
