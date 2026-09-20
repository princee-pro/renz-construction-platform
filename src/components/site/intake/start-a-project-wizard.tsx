"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { IntakeFormContext } from "@/components/site/intake/contact-form";
import {
  Honeypot,
  IntakeFallback,
  IntakeField,
  PrivacyAcknowledgement,
  describedBy,
} from "@/components/site/intake/intake-fields";
import type {
  IntakeAttachment,
  IntakeUploadSession,
} from "@/components/site/intake/intake-upload-field";
import { TurnstileWidget } from "@/components/site/intake/turnstile-widget";
import { submitProjectIntakeAction } from "@/features/intake/intake-actions";
import { initialIntakeActionState } from "@/features/intake/intake-contract";
import {
  budgetCurrencies,
  budgetPreferenceLabels,
  budgetPreferences,
  currentStages,
  intakeStepLabels,
  intakeSteps,
  needKeys,
  preferredContactLabels,
  preferredContacts,
  projectTypes,
  publicCurrentStageLabels,
  publicNeedLabels,
  publicProjectTypeLabels,
  scaleBandLabels,
  scaleBands,
  type IntakeStep,
  type IntakeUploadPolicy,
} from "@/features/intake/intake-policy";

const IntakeUploadField = dynamic(
  () => import("@/components/site/intake/intake-upload-field").then((m) => m.IntakeUploadField),
  { ssr: false, loading: () => <p className="intake-hint">Preparing the upload control…</p> },
);

type Values = Readonly<Record<string, string>>;

const emptyValues: Values = {
  needKey: "",
  projectType: "",
  location: "",
  siteState: "",
  description: "",
  floorArea: "",
  floors: "",
  units: "",
  siteArea: "",
  scaleBand: "",
  startTiming: "",
  completionTiming: "",
  currentStage: "",
  budgetPreference: "not_sure",
  budgetCurrency: "",
  budgetMin: "",
  budgetMax: "",
  specialRequirements: "",
  fullName: "",
  email: "",
  phone: "",
  company: "",
  preferredContact: "",
};

const stepFields: Readonly<Record<IntakeStep, readonly string[]>> = {
  need: ["needKey"],
  context: ["projectType", "location", "siteState", "description"],
  scale: ["floorArea", "floors", "units", "siteArea", "scaleBand"],
  parameters: [
    "startTiming",
    "completionTiming",
    "currentStage",
    "budgetPreference",
    "budgetCurrency",
    "budgetMin",
    "budgetMax",
    "specialRequirements",
  ],
  material: ["files", "uploadSessionId"],
  contact: ["fullName", "email", "phone", "company", "preferredContact"],
  review: ["privacy", "form", "formToken", "turnstileToken"],
};

const fieldLabels: Readonly<Record<string, string>> = {
  needKey: "What you need",
  projectType: "Project type",
  location: "Location",
  siteState: "What is on the site now",
  description: "What you want to build",
  floorArea: "Floor area",
  floors: "Floors",
  units: "Rooms / units",
  siteArea: "Site area",
  scaleBand: "Scale",
  startTiming: "Start",
  completionTiming: "Finish",
  currentStage: "Current stage",
  budgetPreference: "Budget",
  budgetCurrency: "Currency",
  budgetMin: "Budget minimum",
  budgetMax: "Budget maximum",
  specialRequirements: "Anything else",
  fullName: "Full name",
  email: "Email",
  phone: "Phone / WhatsApp",
  company: "Company",
  preferredContact: "How to contact you",
  privacy: "Privacy notice",
};

const DRAFT_KEY = "renz-start-a-project-draft-v1";

function validateStep(step: IntakeStep, values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  const numeric = (key: string, label: string) => {
    const raw = values[key]?.trim() ?? "";
    if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) <= 0))
      errors[key] = `${label} must be a positive number.`;
  };
  switch (step) {
    case "need":
      if (!values["needKey"]) errors["needKey"] = "Choose the option closest to what you need.";
      break;
    case "context":
      if (!values["projectType"]) errors["projectType"] = "Choose the closest project type.";
      if ((values["description"]?.trim().length ?? 0) < 10)
        errors["description"] = "Describe the project in at least a sentence.";
      break;
    case "scale":
      numeric("floorArea", "Floor area");
      numeric("floors", "Number of floors");
      numeric("units", "Number of units");
      numeric("siteArea", "Site area");
      break;
    case "parameters":
      if (values["budgetPreference"] === "range") {
        if (!values["budgetCurrency"])
          errors["budgetCurrency"] = "Choose a currency for the range.";
        numeric("budgetMin", "Budget minimum");
        numeric("budgetMax", "Budget maximum");
        if (!values["budgetMin"] && !values["budgetMax"])
          errors["budgetMin"] = "Enter a minimum or a maximum.";
        if (
          values["budgetMin"] &&
          values["budgetMax"] &&
          Number(values["budgetMax"]) < Number(values["budgetMin"])
        ) {
          errors["budgetMax"] = "Maximum must not be below minimum.";
        }
      }
      break;
    case "contact":
      if ((values["fullName"]?.trim().length ?? 0) < 2)
        errors["fullName"] = "Enter your full name.";
      if (!values["email"]?.trim() && !values["phone"]?.trim())
        errors["email"] = "Enter an email address or a phone / WhatsApp number.";
      if (values["email"]?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(values["email"].trim()))
        errors["email"] = "Enter a valid email address.";
      if (values["phone"]?.trim() && values["phone"].replace(/[^0-9]/gu, "").length < 6)
        errors["phone"] = "Enter a valid phone or WhatsApp number.";
      break;
    default:
      break;
  }
  return errors;
}

/**
 * The real seven-step Start-a-Project intake (C8 §21–41). One question group
 * at a time; values persist while moving back and forth (and across a
 * refresh through sessionStorage for non-file fields); files never touch
 * browser storage; the review step shows a readable summary before the
 * single authoritative server submission.
 */
export function StartAProjectWizard({
  context,
  uploadPolicy,
  preselected,
}: Readonly<{
  context: IntakeFormContext;
  uploadPolicy: IntakeUploadPolicy;
  preselected: Readonly<{
    needKey: string | null;
    projectType: string | null;
    sourceContext: string | null;
  }>;
}>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitProjectIntakeAction,
    initialIntakeActionState,
  );
  const [values, setValues] = useState<Values>(() => ({
    ...emptyValues,
    needKey: preselected.needKey ?? "",
    projectType: preselected.projectType ?? "",
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<readonly IntakeAttachment[]>([]);
  const [session, setSession] = useState<IntakeUploadSession | null>(null);
  const [restored, setRestored] = useState(false);
  const [seenState, setSeenState] = useState(state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const step = intakeSteps[stepIndex] ?? "need";
  const stepErrorEntries = Object.entries(errors).filter(([key]) => stepFields[step].includes(key));

  // Refresh recovery for non-sensitive, non-file draft fields only: a one-time
  // sync from sessionStorage (an external system) into component state.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage on mount */
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { values?: Values; step?: number };
      if (draft.values) {
        setValues((current) => ({
          ...current,
          ...draft.values,
          ...(preselected.needKey ? { needKey: preselected.needKey } : {}),
          ...(preselected.projectType ? { projectType: preselected.projectType } : {}),
        }));
      }
      if (typeof draft.step === "number" && draft.step >= 0 && draft.step < intakeSteps.length)
        setStepIndex(draft.step);
    } catch {
      // Ignore unreadable drafts.
    }
  }, [restored, preselected.needKey, preselected.projectType]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!restored) return;
    try {
      const safe = Object.fromEntries(
        Object.entries(values).filter(([key]) => !["email", "phone", "fullName"].includes(key)),
      );
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values: safe, step: stepIndex }));
    } catch {
      // Storage unavailable; the form still works within the page.
    }
  }, [values, stepIndex, restored]);

  // Server outcome: jump to the earliest step with an error, or to the success page.
  if (seenState !== state) {
    setSeenState(state);
    if (state.status === "error") {
      setErrors(state.fieldErrors);
      const failing = intakeSteps.findIndex((candidate) =>
        stepFields[candidate].some((field) => field in state.fieldErrors),
      );
      if (failing >= 0) setStepIndex(failing);
    }
  }

  useEffect(() => {
    if (state.status !== "success" || !state.reference) return;
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    router.push(`/start-a-project/success?ref=${encodeURIComponent(state.reference)}`);
  }, [state, router]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const field = (key: string) => ({
    id: key,
    name: key,
    value: values[key] ?? "",
    onChange: (event: { currentTarget: { value: string } }) => set(key, event.currentTarget.value),
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": describedBy(key, undefined, errors[key]),
  });

  const next = () => {
    const stepErrors = validateStep(step, values);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStepIndex((current) => Math.min(current + 1, intakeSteps.length - 1));
  };
  const back = () => setStepIndex((current) => Math.max(current - 1, 0));
  const goTo = (target: IntakeStep) => setStepIndex(intakeSteps.indexOf(target));

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    data.set("formToken", context.formToken);
    data.set("sourceContext", preselected.sourceContext ?? "");
    data.set("uploadSessionId", session?.id ?? "");
    data.set("uploadSessionToken", session?.token ?? "");
    startTransition(() => formAction(data));
  };

  const choice = (
    key: string,
    options: readonly string[],
    labels: Readonly<Record<string, string>>,
    legend: string,
  ) => (
    <fieldset
      aria-describedby={errors[key] ? `${key}-error` : undefined}
      className={`intake-fieldset intake-choices${errors[key] ? " intake-field-invalid" : ""}`}
      id={key}
    >
      <legend>{legend}</legend>
      {options.map((option) => (
        <label
          className={`intake-choice${values[key] === option ? " intake-choice-selected" : ""}`}
          key={option}
        >
          <input
            checked={values[key] === option}
            name={key}
            onChange={() => set(key, option)}
            type="radio"
            value={option}
          />
          <span>{labels[option]}</span>
        </label>
      ))}
      {errors[key] ? (
        <p className="intake-error" id={`${key}-error`} role="alert">
          {errors[key]}
        </p>
      ) : null}
    </fieldset>
  );

  const summaryRow = (
    label: string,
    value: string | null | undefined,
    target: IntakeStep,
  ): ReactNode =>
    value ? (
      <div key={label}>
        <dt>{label}</dt>
        <dd>
          {value}{" "}
          <button className="intake-edit" onClick={() => goTo(target)} type="button">
            Edit
          </button>
        </dd>
      </div>
    ) : null;

  const budgetSummary = () => {
    if (values["budgetPreference"] !== "range")
      return (
        budgetPreferenceLabels[values["budgetPreference"] as keyof typeof budgetPreferenceLabels] ??
        null
      );
    const parts = [
      values["budgetMin"] ? `from ${values["budgetMin"]}` : null,
      values["budgetMax"] ? `to ${values["budgetMax"]}` : null,
    ].filter(Boolean);
    return `${values["budgetCurrency"]} ${parts.join(" ")}`;
  };

  return (
    <form
      aria-labelledby="intake-step-title"
      className="intake-form intake-wizard"
      data-analytics-form="project_intake_start"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "review") submit(event.currentTarget);
        else next();
      }}
    >
      <ol aria-label="Steps" className="intake-progress">
        {intakeSteps.map((candidate, index) => (
          <li
            aria-current={candidate === step ? "step" : undefined}
            className={
              index < stepIndex
                ? "intake-progress-done"
                : index === stepIndex
                  ? "intake-progress-current"
                  : ""
            }
            key={candidate}
          >
            <span className="intake-progress-index">{index + 1}</span>
            <span className="intake-progress-label">{intakeStepLabels[candidate]}</span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="intake-progress-live">
        Step {stepIndex + 1} of {intakeSteps.length}: {intakeStepLabels[step]}
      </p>
      <h2 className="intake-step-title" id="intake-step-title" ref={headingRef} tabIndex={-1}>
        {intakeStepLabels[step]}
      </h2>
      <Honeypot />
      {state.status === "rate_limited" || state.status === "unavailable" ? (
        <div className="intake-summary" role="alert">
          <p className="intake-summary-title">{state.message}</p>
          <IntakeFallback
            email={context.email}
            retryAfterSeconds={state.retryAfterSeconds}
            shortName={context.shortName}
            whatsappDigits={context.whatsappDigits}
          />
        </div>
      ) : null}
      {stepErrorEntries.length > 0 ? (
        <div className="intake-summary" ref={summaryRef} role="alert" tabIndex={-1}>
          <p className="intake-summary-title">Please check the following before continuing.</p>
          <ul>
            {stepErrorEntries.map(([key, message]) => (
              <li key={key}>
                {fieldLabels[key] ? (
                  <a
                    href={`#${key}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(key)?.focus();
                    }}
                  >
                    {fieldLabels[key]}: {message}
                  </a>
                ) : (
                  <span>{message}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === "need" ? (
        <div className="intake-step">
          <p className="intake-step-lead">
            What do you need from RENZ? Pick the closest option. If you are not sure, that is fine —
            choose "Not sure yet".
          </p>
          {choice("needKey", needKeys, publicNeedLabels, "What you need")}
        </div>
      ) : null}

      {step === "context" ? (
        <div className="intake-step">
          {choice("projectType", projectTypes, publicProjectTypeLabels, "Project type")}
          <IntakeField
            error={errors["location"]}
            hint="The town, district or area is enough."
            id="location"
            label="Where is the project?"
            optional
          >
            <input {...field("location")} maxLength={400} type="text" />
          </IntakeField>
          <IntakeField
            error={errors["siteState"]}
            id="siteState"
            label="What is on the site now?"
            optional
          >
            <input
              {...field("siteState")}
              maxLength={400}
              placeholder="e.g. empty plot, existing house to extend"
              type="text"
            />
          </IntakeField>
          <IntakeField
            error={errors["description"]}
            id="description"
            label="What do you want to build?"
          >
            <textarea {...field("description")} maxLength={4000} rows={5} />
          </IntakeField>
        </div>
      ) : null}

      {step === "scale" ? (
        <div className="intake-step">
          <p className="intake-step-lead">
            Rough numbers are enough. Leave anything you do not know blank.
          </p>
          <div className="intake-grid">
            <IntakeField
              error={errors["floorArea"]}
              id="floorArea"
              label="Approximate floor area (m²)"
              optional
            >
              <input {...field("floorArea")} inputMode="decimal" min={0} step="any" type="number" />
            </IntakeField>
            <IntakeField error={errors["floors"]} id="floors" label="Number of floors" optional>
              <input {...field("floors")} inputMode="numeric" min={1} step={1} type="number" />
            </IntakeField>
            <IntakeField error={errors["units"]} id="units" label="Rooms or units" optional>
              <input {...field("units")} inputMode="numeric" min={1} step={1} type="number" />
            </IntakeField>
            <IntakeField error={errors["siteArea"]} id="siteArea" label="Site area (m²)" optional>
              <input {...field("siteArea")} inputMode="decimal" min={0} step="any" type="number" />
            </IntakeField>
          </div>
          {choice("scaleBand", scaleBands, scaleBandLabels, "Overall scale")}
        </div>
      ) : null}

      {step === "parameters" ? (
        <div className="intake-step">
          <div className="intake-grid">
            <IntakeField
              error={errors["startTiming"]}
              id="startTiming"
              label="When would you like to start?"
              optional
            >
              <input
                {...field("startTiming")}
                maxLength={120}
                placeholder="e.g. early next year"
                type="text"
              />
            </IntakeField>
            <IntakeField
              error={errors["completionTiming"]}
              id="completionTiming"
              label="When would you like it finished?"
              optional
            >
              <input {...field("completionTiming")} maxLength={120} type="text" />
            </IntakeField>
          </div>
          {choice(
            "currentStage",
            currentStages,
            publicCurrentStageLabels,
            "Where the project is today",
          )}
          {choice(
            "budgetPreference",
            budgetPreferences,
            budgetPreferenceLabels,
            "Budget (optional)",
          )}
          {values["budgetPreference"] === "range" ? (
            <div className="intake-grid">
              <IntakeField error={errors["budgetCurrency"]} id="budgetCurrency" label="Currency">
                <select {...field("budgetCurrency")}>
                  <option value="">Choose</option>
                  {budgetCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </IntakeField>
              <IntakeField error={errors["budgetMin"]} id="budgetMin" label="From" optional>
                <input
                  {...field("budgetMin")}
                  inputMode="decimal"
                  min={0}
                  step="any"
                  type="number"
                />
              </IntakeField>
              <IntakeField error={errors["budgetMax"]} id="budgetMax" label="To" optional>
                <input
                  {...field("budgetMax")}
                  inputMode="decimal"
                  min={0}
                  step="any"
                  type="number"
                />
              </IntakeField>
            </div>
          ) : null}
          <IntakeField
            error={errors["specialRequirements"]}
            id="specialRequirements"
            label="Anything else we should know?"
            optional
          >
            <textarea {...field("specialRequirements")} maxLength={2000} rows={3} />
          </IntakeField>
        </div>
      ) : null}

      {step === "material" ? (
        <div className="intake-step">
          <p className="intake-step-lead">
            Optional. Add site photos, sketches, drawings or example images that help us understand
            what you want.
          </p>
          <IntakeUploadField
            attachments={attachments}
            formToken={context.formToken}
            onChange={(nextState) => {
              setAttachments(nextState.attachments);
              setSession(nextState.session);
            }}
            policy={uploadPolicy}
            session={session}
          />
        </div>
      ) : null}

      {step === "contact" ? (
        <div className="intake-step">
          <div className="intake-grid">
            <IntakeField error={errors["fullName"]} id="fullName" label="Full name">
              <input
                {...field("fullName")}
                autoComplete="name"
                maxLength={200}
                required
                type="text"
              />
            </IntakeField>
            <IntakeField error={errors["company"]} id="company" label="Company" optional>
              <input
                {...field("company")}
                autoComplete="organization"
                maxLength={200}
                type="text"
              />
            </IntakeField>
            <IntakeField error={errors["email"]} id="email" label="Email">
              <input
                {...field("email")}
                autoComplete="email"
                inputMode="email"
                maxLength={254}
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
                {...field("phone")}
                aria-describedby={describedBy(
                  "phone",
                  "Email or phone — at least one.",
                  errors["phone"],
                )}
                autoComplete="tel"
                inputMode="tel"
                maxLength={40}
                type="tel"
              />
            </IntakeField>
          </div>
          {choice(
            "preferredContact",
            preferredContacts,
            preferredContactLabels,
            "How should RENZ reply? (optional)",
          )}
        </div>
      ) : null}

      {step === "review" ? (
        <div className="intake-step">
          <p className="intake-step-lead">
            Check your answers. You can change any section before you send.
          </p>
          <dl className="intake-review">
            {summaryRow(
              "What you need",
              publicNeedLabels[values["needKey"] as keyof typeof publicNeedLabels],
              "need",
            )}
            {summaryRow(
              "Project type",
              publicProjectTypeLabels[
                values["projectType"] as keyof typeof publicProjectTypeLabels
              ],
              "context",
            )}
            {summaryRow("Location", values["location"], "context")}
            {summaryRow("On the site now", values["siteState"], "context")}
            {summaryRow("What you want to build", values["description"], "context")}
            {summaryRow(
              "Floor area",
              values["floorArea"] ? `${values["floorArea"]} m²` : null,
              "scale",
            )}
            {summaryRow("Floors", values["floors"], "scale")}
            {summaryRow("Rooms / units", values["units"], "scale")}
            {summaryRow(
              "Site area",
              values["siteArea"] ? `${values["siteArea"]} m²` : null,
              "scale",
            )}
            {summaryRow(
              "Scale",
              scaleBandLabels[values["scaleBand"] as keyof typeof scaleBandLabels],
              "scale",
            )}
            {summaryRow("Start", values["startTiming"], "parameters")}
            {summaryRow("Finish", values["completionTiming"], "parameters")}
            {summaryRow(
              "Current stage",
              publicCurrentStageLabels[
                values["currentStage"] as keyof typeof publicCurrentStageLabels
              ],
              "parameters",
            )}
            {summaryRow("Budget", budgetSummary(), "parameters")}
            {summaryRow("Anything else", values["specialRequirements"], "parameters")}
            {summaryRow(
              "Files",
              attachments.length > 0 ? attachments.map((item) => item.name).join(", ") : "None",
              "material",
            )}
            {summaryRow("Name", values["fullName"], "contact")}
            {summaryRow("Company", values["company"], "contact")}
            {summaryRow("Email", values["email"], "contact")}
            {summaryRow("Phone / WhatsApp", values["phone"], "contact")}
            {summaryRow(
              "How to contact you",
              preferredContactLabels[
                values["preferredContact"] as keyof typeof preferredContactLabels
              ],
              "contact",
            )}
          </dl>
          <PrivacyAcknowledgement error={errors["privacy"]} revision={context.privacyRevision} />
          <TurnstileWidget siteKey={context.turnstileSiteKey} />
        </div>
      ) : null}

      <div className="intake-actions intake-wizard-actions">
        {stepIndex > 0 ? (
          <button className="intake-secondary" onClick={back} type="button">
            Back
          </button>
        ) : (
          <span />
        )}
        {step === "review" ? (
          <button className="intake-submit" disabled={pending} type="submit">
            {pending ? "Sending…" : "Submit project brief"}
          </button>
        ) : (
          <button className="intake-submit" type="submit">
            Continue
          </button>
        )}
      </div>
    </form>
  );
}
