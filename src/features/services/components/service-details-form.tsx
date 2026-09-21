"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { saveServiceDetailsAction } from "@/features/services/service-details-actions";
import type { ServiceDetails } from "@/features/services/service-details";

/**
 * CR1 owner detail fields: what the public service page shows beyond the
 * S5A register fields — positioning line, sub-services, use cases, a
 * typical sequence, the coordination note and FAQs. Plain text only.
 */
function fieldsOf(details: ServiceDetails) {
  return {
    positioning: details.positioning ?? "",
    subServices: details.sub_services.join("\n"),
    useCases: details.use_cases.join("\n"),
    processSteps: details.process_steps.join("\n"),
    coordination: details.coordination ?? "",
  };
}

export function ServiceDetailsForm({
  serviceId,
  details,
  canWrite,
}: Readonly<{ serviceId: string; details: ServiceDetails; canWrite: boolean }>) {
  const [state, action, pending] = useActionState(
    guardAction(saveServiceDetailsAction),
    initialAdminActionState,
  );
  // Controlled fields: React resets uncontrolled inputs after a form
  // action, which would wipe the owner's text on a refused save.
  const [fields, setFields] = useState(() => fieldsOf(details));
  const [faqs, setFaqs] = useState(details.faqs.length > 0 ? details.faqs : []);
  // The register form ("Save draft") shares this localization row; when a
  // fresh server render carries a newer version, adopt it so the next save
  // is not refused for a change the same owner just made.
  const [seenVersion, setSeenVersion] = useState(details.localization_version);
  const [seenState, setSeenState] = useState(state);
  const [version, setVersion] = useState(details.localization_version);
  if (seenVersion !== details.localization_version) {
    setSeenVersion(details.localization_version);
    setVersion(details.localization_version);
  }
  if (seenState !== state) {
    setSeenState(state);
    if (state.currentVersion) setVersion(state.currentVersion);
  }
  const update = (key: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  return (
    <section aria-labelledby="service-details-heading" className="editor-section service-details">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Public page content</p>
          <h2 id="service-details-heading">What the service page says</h2>
        </div>
      </div>
      <p className="panel-copy">
        These fields shape the public service page: the one-line positioning under the title, what
        the service includes, the situations it fits, a typical sequence, how it combines with other
        services, and questions worth asking early. Empty sections are simply not shown.
      </p>
      {state.status !== "idle" ? (
        <Alert
          live
          tone={
            state.status === "success"
              ? "success"
              : state.status === "conflict"
                ? "warning"
                : "danger"
          }
        >
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <form action={action} className="editor-form" noValidate>
        <input name="serviceId" type="hidden" value={serviceId} />
        <input name="expectedLocalizationVersion" type="hidden" value={version} />
        <fieldset className="editor-lock-fieldset" disabled={!canWrite || pending}>
          <div className="field-group">
            <label htmlFor="details-positioning">Positioning line</label>
            <input
              id="details-positioning"
              maxLength={300}
              name="positioning"
              onChange={(event) => update("positioning", event.target.value)}
              type="text"
              value={fields.positioning}
            />
            <p className="field-help">
              One sentence under the service name, e.g. “Turning a site and a brief into drawings a
              builder can price and build from.”
            </p>
            {state.fieldErrors["positioning"] ? (
              <p className="field-error">{state.fieldErrors["positioning"]}</p>
            ) : null}
          </div>
          <div className="field-grid field-grid-two">
            <div className="field-group">
              <label htmlFor="details-sub-services">Sub-services (one per line)</label>
              <textarea
                id="details-sub-services"
                name="subServices"
                onChange={(event) => update("subServices", event.target.value)}
                rows={5}
                value={fields.subServices}
              />
              <p className="field-help">
                Shown as “Includes” on the service page and in the navigation panel.
              </p>
            </div>
            <div className="field-group">
              <label htmlFor="details-use-cases">Situations this service fits (one per line)</label>
              <textarea
                id="details-use-cases"
                name="useCases"
                onChange={(event) => update("useCases", event.target.value)}
                rows={5}
                value={fields.useCases}
              />
            </div>
            <div className="field-group">
              <label htmlFor="details-process">A typical sequence (one step per line)</label>
              <textarea
                id="details-process"
                name="processSteps"
                onChange={(event) => update("processSteps", event.target.value)}
                rows={5}
                value={fields.processSteps}
              />
            </div>
            <div className="field-group">
              <label htmlFor="details-coordination">How it combines with other services</label>
              <textarea
                id="details-coordination"
                maxLength={1000}
                name="coordination"
                onChange={(event) => update("coordination", event.target.value)}
                rows={5}
                value={fields.coordination}
              />
            </div>
          </div>
          <fieldset className="field-group">
            <legend className="field-label">Questions worth asking early (FAQ)</legend>
            <ol className="items-field-list">
              {faqs.map((faq, index) => (
                <li className="items-field-item" key={index}>
                  <div className="field-group">
                    <label htmlFor={`faq-q-${index}`}>Question</label>
                    <input
                      id={`faq-q-${index}`}
                      maxLength={300}
                      name="faqQuestion"
                      onChange={(event) =>
                        setFaqs(
                          faqs.map((entry, position) =>
                            position === index ? { ...entry, question: event.target.value } : entry,
                          ),
                        )
                      }
                      type="text"
                      value={faq.question}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor={`faq-a-${index}`}>Answer</label>
                    <textarea
                      id={`faq-a-${index}`}
                      maxLength={2000}
                      name="faqAnswer"
                      onChange={(event) =>
                        setFaqs(
                          faqs.map((entry, position) =>
                            position === index ? { ...entry, answer: event.target.value } : entry,
                          ),
                        )
                      }
                      rows={3}
                      value={faq.answer}
                    />
                  </div>
                  <Button
                    onClick={() => setFaqs(faqs.filter((_, position) => position !== index))}
                    tone="quiet"
                  >
                    Remove question
                  </Button>
                </li>
              ))}
            </ol>
            {faqs.length < 24 ? (
              <Button
                onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
                tone="secondary"
              >
                Add question
              </Button>
            ) : null}
          </fieldset>
          <div className="editor-actions">
            <Button tone="primary" type="submit">
              {pending ? "Saving…" : "Save page content"}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
