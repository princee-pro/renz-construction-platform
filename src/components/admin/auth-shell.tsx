import type { ReactNode } from "react";

import { PreviewRenzIdentity } from "@/components/site/preview-renz-identity";

type AuthStep = "01" | "02";

type AuthShellProps = Readonly<{
  step: AuthStep;
  stepLabel: string;
  title: string;
  headingId: string;
  intro: string;
  children: ReactNode;
  /** Secondary actions rendered under the form (sign out, help). */
  aside?: ReactNode;
}>;

const modules = [
  ["01", "Projects", "Sites and progress"],
  ["02", "Clients", "CRM and 360 view"],
  ["03", "Finance", "Invoices and payments"],
  ["04", "Delivery", "Contractors and procurement"],
  ["05", "Leads", "Enquiries and pipeline"],
  ["06", "Analytics", "Trends by currency"],
] as const;

/**
 * D1.5 auth shell (§7–§13): a two-zone architectural composition. Left, the
 * form zone — mark, step, title, form, support. Right, the brand panel —
 * ink ground, structural field, Datum R, the Control Room statement and the
 * system modules. Security semantics live in the forms; this is presentation.
 */
export function AuthShell({
  step,
  stepLabel,
  title,
  headingId,
  intro,
  children,
  aside,
}: AuthShellProps) {
  return (
    <main className="auth-shell" data-step={step} id="main-content">
      <section aria-labelledby={headingId} className="auth-form-zone">
        <header className="auth-form-head">
          <div className="auth-brand">
            <PreviewRenzIdentity decorative size={36} tone="light" />
            <span>
              <strong>RENZ</strong>
              <small>Control Room</small>
            </span>
          </div>
          <ol aria-label="Sign-in steps" className="auth-steps">
            <li aria-current={step === "01" ? "step" : undefined} data-done={step === "02"}>
              <span>01</span> Staff access
            </li>
            <li aria-current={step === "02" ? "step" : undefined}>
              <span>02</span> Security verification
            </li>
          </ol>
        </header>
        <div className="auth-form-body">
          <p className="auth-kicker">
            {step} / {stepLabel}
          </p>
          <h1 id={headingId}>{title}</h1>
          <p className="auth-intro">{intro}</p>
          {children}
        </div>
        <footer className="auth-form-foot">
          {aside}
          <p className="auth-support">
            Staff only. Access is granted by the RENZ owner; public visitors never need an account.
            Forgotten your password? The owner can issue you a temporary one.
          </p>
        </footer>
      </section>

      <aside aria-label="About the RENZ Control Room" className="auth-brand-zone">
        <span aria-hidden="true" className="auth-grid" />
        <svg aria-hidden="true" className="auth-drawing" viewBox="0 0 640 400">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path className="auth-line" d="M40 320 H600" />
            <path className="auth-line" d="M120 320 V140 H300 V90 H420 V320" />
            <path className="auth-line" d="M300 140 H420" />
            <path className="auth-line" d="M460 320 V200 H560 V320" />
            <path className="auth-line" d="M150 320 V230 H260 V320" />
            <path className="auth-line" d="M70 60 V340" strokeDasharray="4 6" />
            <path className="auth-line" d="M40 360 H600" strokeDasharray="2 8" />
            <circle className="auth-mark" cx="120" cy="140" r="3" />
            <circle className="auth-mark" cx="420" cy="90" r="3" />
            <circle className="auth-mark" cx="560" cy="200" r="3" />
          </g>
        </svg>
        <div className="auth-brand-copy">
          <PreviewRenzIdentity decorative size={72} tone="dark" />
          <p className="auth-brand-kicker">RENZ Control Room</p>
          <h2>Projects, clients, finance, delivery and site operations — one secure workspace.</h2>
          <p>
            Every record is measured against the same drawings: enquiries become clients, clients
            become projects, projects carry invoices, orders and checkpoints.
          </p>
          <ol className="auth-modules">
            {modules.map(([index, name, note]) => (
              <li key={index}>
                <span>{index}</span>
                <strong>{name}</strong>
                <small>{note}</small>
              </li>
            ))}
          </ol>
          <p className="auth-coordinates">
            <span>Datum</span> KGL · 01°57′S 30°04′E · secure session · two-step access
          </p>
        </div>
      </aside>
    </main>
  );
}
