import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { ArrowMark } from "@/components/site/arrow-mark";
import { Field } from "@/components/site/fields";
import { IntakeSuccess } from "@/components/site/intake/intake-fields";
import { IntakeFrame } from "@/components/site/intake/intake-frame";
import {
  ContactForm,
  MaterialEnquiryForm,
  ServiceEnquiryForm,
  StartAProjectWizard,
} from "@/components/site/intake/lazy-forms";
import { LocationCard } from "@/components/site/location-card";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import { InlineText, list, text } from "@/components/site/sections/shared";
import type { SectionRenderProps } from "@/components/site/sections/types";
import { parseIntakePreselection } from "@/features/intake/intake-contract";
import { serviceKeys } from "@/features/intake/intake-policy";
import { weekdayLabels } from "@/features/settings/settings-contract";
import { interpolate } from "@/features/website/tokens";
import { mailtoHref } from "@/lib/site/contact-details";

import { whatsappLink } from "@/lib/site/whatsapp";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function frameLabels(context: SectionRenderProps["context"], paused: string | null) {
  return {
    whatsapp: context.globals.copy.whatsapp_cta_label,
    message: interpolate(context.globals.copy.whatsapp_message, context.tokens),
    preferToTalk: context.globals.copy.prefer_to_talk_label,
    whatHappensNext: context.globals.copy.what_happens_next_label,
    paused,
  };
}

/** Contact routes: WhatsApp / email / Start-a-Project (+ phone only when calling is enabled). */
export function ContactChannelsSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const identity = context.identity;
  const whatsapp = whatsappLink(
    identity.whatsappDigits,
    interpolate(context.globals.copy.whatsapp_message, context.tokens),
  );
  return (
    <section
      aria-label="Contact routes"
      className="sec sec-tight tone-paper contact-routes"
      data-section={section.type}
    >
      <Stagger as="div" className="container contact-route-grid" gap={0.08}>
        <StaggerItem as="div">
          <a
            className="contact-route contact-route-whatsapp"
            data-analytics-cta="whatsapp"
            href={whatsapp}
            rel="noreferrer"
            target="_blank"
          >
            <WhatsAppGlyph />
            <span className="datum-label">WhatsApp</span>
            <strong>{text(config, "whatsapp_title") ?? `Message ${identity.shortName}`}</strong>
            <span>{text(config, "whatsapp_body") ?? context.globals.copy.whatsapp_note}</span>
          </a>
        </StaggerItem>
        <StaggerItem as="div">
          <a className="contact-route" data-analytics-cta="email" href={mailtoHref(identity.email)}>
            <span aria-hidden="true" className="glyph-at">
              @
            </span>
            <span className="datum-label">Email</span>
            <strong>{identity.email}</strong>
            <span>{text(config, "email_body") ?? ""}</span>
          </a>
        </StaggerItem>
        <StaggerItem as="div" className="contact-route contact-route-primary">
          <span aria-hidden="true" className="glyph-index">
            {String(context.globals.processSteps.length).padStart(2, "0")}
          </span>
          <span className="datum-label">{text(config, "start_label") ?? "Start a project"}</span>
          <strong>{text(config, "start_title") ?? ""}</strong>
          <span>{text(config, "start_body") ?? ""}</span>
          <Link
            className="btn btn-primary"
            data-analytics-cta="start_project"
            href={identity.cta.href}
          >
            <span>{identity.cta.label}</span>
            <ArrowMark />
          </Link>
        </StaggerItem>
        {identity.telHref ? (
          <StaggerItem as="div">
            <a className="contact-route" href={identity.telHref}>
              <span className="datum-label">Phone</span>
              <strong>{text(config, "phone_title") ?? `Call ${identity.shortName}`}</strong>
            </a>
          </StaggerItem>
        ) : null}
      </Stagger>
    </section>
  );
}

export function ContactFormSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const identity = context.identity;
  const intake = context.route.intake;
  const whatsapp = whatsappLink(
    identity.whatsappDigits,
    interpolate(context.globals.copy.whatsapp_message, context.tokens),
  );
  const openDays = (identity.hours ?? []).filter((day) => day.is_open);
  const replySteps = list<string>(config, "reply_steps");
  return (
    <section
      aria-labelledby="contact-form-title"
      className="sec tone-concrete contact-main"
      data-section={section.type}
    >
      <div className="container contact-layout">
        <aside className="contact-aside">
          <Reveal as="div" className="contact-aside-intro" variant="rise">
            {text(config, "kicker") ? <p className="kicker">{text(config, "kicker")}</p> : null}
            <h2 className="contact-aside-title" id="contact-form-title">
              {text(config, "heading") ?? "Send a short message."}
            </h2>
            {text(config, "intro") ? (
              <p>
                <InlineText text={text(config, "intro") ?? ""} />
              </p>
            ) : null}
          </Reveal>
          {replySteps.length > 0 ? (
            <div className="contact-register-block">
              <p className="datum-label">{text(config, "reply_label") ?? "How RENZ replies"}</p>
              <ol className="contact-reply-steps">
                {replySteps.map((step, index) => (
                  <li key={`${index}-${step}`}>
                    <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="contact-register-block">
            <p className="datum-label">{text(config, "channels_label") ?? "Direct channels"}</p>
            <a
              className="contact-channel contact-channel-whatsapp"
              data-analytics-cta="whatsapp"
              href={whatsapp}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppGlyph />
              <span>
                <strong>WhatsApp</strong>
                <small>{text(config, "whatsapp_note") ?? "Messages only"}</small>
              </span>
            </a>
            <a
              className="contact-channel"
              data-analytics-cta="email"
              href={mailtoHref(identity.email)}
            >
              <span aria-hidden="true" className="glyph-at">
                @
              </span>
              <span>
                <strong>{identity.email}</strong>
                <small>{text(config, "email_note") ?? ""}</small>
              </span>
            </a>
          </div>
          {openDays.length > 0 ? (
            <div className="contact-register-block">
              <p className="datum-label">{text(config, "hours_label") ?? "Hours"}</p>
              <ul className="contact-hours">
                {openDays.map((day) => (
                  <li key={day.weekday}>
                    <span>{weekdayLabels[day.weekday]}</span>
                    <span>
                      {day.opens_at}–{day.closes_at}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <LocationCard location={identity.location} shortName={identity.shortName} />
          {identity.serviceArea ? (
            <div className="contact-register-block">
              <p className="datum-label">{text(config, "area_label") ?? "Works across"}</p>
              <p>{identity.serviceArea}</p>
            </div>
          ) : null}
          {identity.social.length > 0 ? (
            <div className="contact-register-block">
              <p className="datum-label">{text(config, "follow_label") ?? "Follow"}</p>
              <ul className="contact-social">
                {identity.social.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} rel="noreferrer" target="_blank">
                      {link.label ?? link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <div className="contact-form-slot">
          <div className="contact-form-surface">
            <Field className="contact-form-field" tone="light" variant="plan" />
            <span aria-hidden="true" className="contact-form-index">
              {String(context.globals.processSteps.length).padStart(2, "0")}
            </span>
            {identity.intake.enabled && intake ? (
              <ContactForm context={intake} />
            ) : (
              <p className="intake-hint">
                {text(config, "paused_text") ??
                  `Online enquiries are paused at the moment. Email or WhatsApp reach ${identity.shortName} directly.`}
              </p>
            )}
          </div>
          <p className="intake-aside">
            {text(config, "aside_prefix") ?? "Looking for a specific service?"}{" "}
            <Link href="/enquire/service">
              {text(config, "aside_service_label") ?? "Send a service enquiry"}
            </Link>
            . {text(config, "aside_middle") ?? "Need materials?"}{" "}
            <Link href="/enquire/materials">
              {text(config, "aside_material_label") ?? "Send a material enquiry"}
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

export function StartProjectWizardSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const identity = context.identity;
  const intake = context.route.intake;
  const preselected = parseIntakePreselection(context.route.searchParams);
  const serviceSlug =
    preselected.needKey && preselected.needKey !== "not_sure" && preselected.needKey !== "other"
      ? preselected.needKey
      : null;
  const service = serviceSlug
    ? (context.services.find((entry) => entry.slug === serviceSlug) ?? null)
    : null;
  return (
    <section className="sec tone-paper intake-section" data-section={section.type}>
      <div className="container">
        <IntakeFrame
          identity={identity}
          labels={frameLabels(context, text(config, "paused_text"))}
          next={list<string>(config, "next_steps")}
          service={service}
        >
          {intake ? (
            <StartAProjectWizard
              context={intake}
              preselected={preselected}
              uploadPolicy={identity.intake.uploadPolicy}
            />
          ) : null}
        </IntakeFrame>
      </div>
    </section>
  );
}

export function ServiceEnquiryFormSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const intake = context.route.intake;
  const requested = first(context.route.searchParams["service"]);
  const preselected = (serviceKeys as readonly string[]).includes(requested) ? requested : null;
  const service = preselected
    ? (context.services.find((entry) => entry.slug === preselected) ?? null)
    : null;
  return (
    <section className="sec tone-paper intake-section" data-section={section.type}>
      <div className="container">
        <IntakeFrame
          identity={context.identity}
          labels={frameLabels(context, null)}
          next={list<string>(config, "next_steps")}
          service={service}
        >
          {intake ? <ServiceEnquiryForm context={intake} preselected={preselected} /> : null}
        </IntakeFrame>
      </div>
    </section>
  );
}

export function MaterialEnquiryFormSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const intake = context.route.intake;
  return (
    <section className="sec tone-paper intake-section" data-section={section.type}>
      <div className="container">
        <IntakeFrame
          identity={context.identity}
          labels={frameLabels(context, null)}
          next={list<string>(config, "next_steps")}
        >
          {intake ? <MaterialEnquiryForm context={intake} /> : null}
        </IntakeFrame>
      </div>
    </section>
  );
}

export function IntakeSuccessSection({ section, context }: SectionRenderProps) {
  const config = section.config;
  const reference = first(context.route.searchParams["ref"]);
  const valid = /^RENZ-LEAD-[0-9]{4}-[0-9]{6}$/u.test(reference);
  return (
    <section className="public-section public-section-white" data-section={section.type}>
      <div className="public-container intake-container">
        {valid ? (
          <IntakeSuccess
            heading={text(config, "heading") ?? undefined}
            nextSteps={text(config, "next_steps") ?? undefined}
            reference={reference}
            shortName={context.identity.shortName}
            whatsappDigits={context.identity.whatsappDigits}
            continueLabel={context.globals.copy.whatsapp_continue_label}
          />
        ) : (
          <p className="intake-hint">
            {text(config, "invalid_text") ?? "This page needs a valid reference."}{" "}
            <Link href="/start-a-project">
              {text(config, "restart_label") ?? "Start a new brief"}
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
