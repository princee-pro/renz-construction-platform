import type { ReactNode } from "react";

import { Field } from "@/components/site/fields";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import { serviceField } from "@/components/site/service-fields";
import type { ServiceCategory } from "@/features/services/content";
import { mailtoHref } from "@/lib/site/contact-details";
import { whatsappLink, type SiteIdentity } from "@/lib/site/public-configuration";

type IntakeFrameProps = Readonly<{
  identity: SiteIdentity;
  /** The published service when the form was opened from a service page. */
  service?: ServiceCategory | null;
  /** "What happens next" — honest steps in business language (owner-editable). */
  next: readonly string[];
  /** Owner-editable labels (Website → Globals). */
  labels?: Readonly<{
    whatsapp: string;
    message: string;
    preferToTalk: string;
    whatHappensNext: string;
    paused: string | null;
  }>;
  /** Copy for the paused state; the form is not rendered when intake is off. */
  children: ReactNode;
}>;

/**
 * Presentation frame around the C8 intake forms (D1 §47–48). It adds the
 * service cue, what-happens-next register and the WhatsApp/email
 * alternatives beside the form. It never touches the forms themselves —
 * tokens, rate limits, uploads and privacy semantics stay in the C8 code.
 */
export function IntakeFrame({
  identity,
  service = null,
  next,
  labels,
  children,
}: IntakeFrameProps) {
  const whatsapp = whatsappLink(
    identity.whatsappDigits,
    service
      ? `Hello ${identity.shortName}, I would like to ask about ${service.name}.`
      : (labels?.message ?? `Hello ${identity.shortName}, I would like to discuss a project.`),
  );

  return (
    <div className="intake-layout">
      <div className="intake-main">
        {identity.intake.enabled ? (
          children
        ) : (
          <p className="intake-hint intake-paused">
            {labels?.paused ??
              `Online intake is paused at the moment. Email or WhatsApp reach ${identity.shortName} directly.`}
          </p>
        )}
      </div>
      <aside aria-label="Before you write" className="intake-side">
        {service ? (
          <div className="intake-service-cue" data-service={service.slug}>
            <Field tone="light" variant={serviceField(service.slug, Number(service.index) - 1)} />
            <span className="index-mark">{service.index}</span>
            <strong>{service.name}</strong>
            <p>{service.positioning}</p>
          </div>
        ) : null}
        <div className="intake-side-block">
          <p className="datum-label">{labels?.whatHappensNext ?? "What happens next"}</p>
          <ol className="intake-next">
            {next.map((step, index) => (
              <li key={step}>
                <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="intake-side-block">
          <p className="datum-label">{labels?.preferToTalk ?? "Prefer to talk"}</p>
          <a
            className="intake-side-whatsapp"
            data-analytics-cta="whatsapp"
            href={whatsapp}
            rel="noreferrer"
            target="_blank"
          >
            <WhatsAppGlyph />
            {labels?.whatsapp ?? "Message on WhatsApp"}
          </a>
          <a
            className="intake-side-email"
            data-analytics-cta="email"
            href={mailtoHref(identity.email)}
          >
            {identity.email}
          </a>
        </div>
        <p className="intake-side-note">
          {identity.shortName} stores what you send here only to respond to it. The Privacy Notice
          on the form says exactly what is kept and for how long.
        </p>
      </aside>
    </div>
  );
}
