"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

import { analyticsConsentStorageKey } from "@/features/website-analytics/analytics-policy";

export type ThirdPartyAnalytics = Readonly<{
  provider: "plausible" | "umami" | "ga4" | "other";
  siteId: string;
  consentRequired: boolean;
}>;

type Choice = "accepted" | "rejected" | null;

function readChoice(): Choice {
  try {
    const value = window.localStorage.getItem(analyticsConsentStorageKey);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

const consentEvent = "renz:analytics-consent";
let volatileChoice: Choice = null;

function writeChoice(choice: Exclude<Choice, null>): void {
  volatileChoice = choice;
  try {
    window.localStorage.setItem(analyticsConsentStorageKey, choice);
  } catch {
    // Storage unavailable: the choice applies to this page view only.
  }
  window.dispatchEvent(new Event(consentEvent));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(consentEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(consentEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

/** The stored choice as an external store: "pending" during SSR/hydration. */
function useConsentChoice(): Choice | "pending" {
  return useSyncExternalStore(
    subscribe,
    () => readChoice() ?? volatileChoice,
    () => "pending",
  );
}

/**
 * Third-party provider adapter (C9 §56). Loads only a known provider script
 * with the published public site id; "other" has no adapter and loads
 * nothing. Never rendered unless allowed by the consent layer.
 */
function ProviderScript({ provider, siteId }: Readonly<{ provider: string; siteId: string }>) {
  if (provider === "plausible") {
    return (
      <Script
        data-domain={siteId}
        data-testid="analytics-provider"
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
    );
  }
  if (provider === "umami") {
    // siteId is "host/website-id" (public), e.g. analytics.example.com/1a2b-...
    const [host, websiteId] = siteId.split("/", 2);
    if (!host || !websiteId || !/^[a-z0-9.-]+$/iu.test(host)) return null;
    return (
      <Script
        data-testid="analytics-provider"
        data-website-id={websiteId}
        src={`https://${host}/script.js`}
        strategy="afterInteractive"
      />
    );
  }
  if (provider === "ga4") {
    if (!/^G-[A-Z0-9]{4,20}$/u.test(siteId)) return null;
    return (
      <>
        <Script
          data-testid="analytics-provider"
          src={`https://www.googletagmanager.com/gtag/js?id=${siteId}`}
          strategy="afterInteractive"
        />
        <Script id="renz-ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${siteId}',{anonymize_ip:true});`}
        </Script>
      </>
    );
  }
  return null;
}

/**
 * Minimal, accessible consent layer (C9 §57–59): shown only when a
 * third-party provider is enabled AND consent is required AND no choice is
 * stored. Accept and Reject have equal prominence, nothing is preselected,
 * and the website stays fully usable either way. First-party aggregate
 * counters are cookieless and are not gated here.
 */
export function AnalyticsConsent({ analytics }: Readonly<{ analytics: ThirdPartyAnalytics }>) {
  const stored = useConsentChoice();
  const choice: Choice | "pending" = analytics.consentRequired
    ? stored
    : stored === "pending"
      ? "pending"
      : "accepted";

  const decide = (next: Exclude<Choice, null>) => {
    writeChoice(next);
  };

  return (
    <>
      {choice === "accepted" ? (
        <ProviderScript provider={analytics.provider} siteId={analytics.siteId} />
      ) : null}
      {analytics.consentRequired && choice === null ? (
        <section
          aria-describedby="analytics-consent-copy"
          aria-labelledby="analytics-consent-title"
          className="analytics-consent"
          role="region"
        >
          <h2 id="analytics-consent-title">Analytics on this website</h2>
          <p id="analytics-consent-copy">
            RENZ would like to measure how this website is used with{" "}
            {providerName(analytics.provider)}. Your choice is stored in your browser and can be
            changed on the Cookie Notice page. Rejecting does not limit the website.
          </p>
          <div className="analytics-consent-actions">
            <button className="consent-button" onClick={() => decide("accepted")} type="button">
              Accept analytics
            </button>
            <button className="consent-button" onClick={() => decide("rejected")} type="button">
              Reject analytics
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

function providerName(provider: string): string {
  if (provider === "plausible") return "Plausible";
  if (provider === "umami") return "Umami";
  if (provider === "ga4") return "Google Analytics";
  return "an analytics provider";
}

/** "Change preference" control for the Cookie Notice page. */
export function AnalyticsPreferenceControl({
  analytics,
}: Readonly<{ analytics: ThirdPartyAnalytics | null }>) {
  const choice = useConsentChoice();
  if (!analytics || !analytics.consentRequired) {
    return (
      <p className="analytics-preference" role="status">
        No analytics consent is required on this website at the moment.
      </p>
    );
  }
  return (
    <section aria-labelledby="analytics-preference-title" className="analytics-preference">
      <h2 id="analytics-preference-title">Your analytics preference</h2>
      <p role="status">
        {choice === "pending"
          ? "Reading your saved preference…"
          : choice === null
            ? "You have not chosen yet."
            : choice === "accepted"
              ? "Analytics accepted."
              : "Analytics rejected."}
      </p>
      <div className="analytics-consent-actions">
        <button className="consent-button" onClick={() => writeChoice("accepted")} type="button">
          Accept analytics
        </button>
        <button className="consent-button" onClick={() => writeChoice("rejected")} type="button">
          Reject analytics
        </button>
      </div>
      <p className="analytics-preference-note">
        A changed choice applies from the next page you open.
      </p>
    </section>
  );
}
