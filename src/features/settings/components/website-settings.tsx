"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { SettingsForm } from "@/features/settings/components/settings-form";
import {
  changeSiteModeAction,
  searchBrandMediaAction,
  updateBrandMediaAction,
  updateNavigationSettingsAction,
  updateSeoSettingsAction,
  updateWebsiteSettingsAction,
} from "@/features/settings/settings-actions";
import {
  approvedRouteLabels,
  approvedRoutes,
  navigationRouteLabel,
  brandSlotLabels,
  brandSlots,
  type BrandCandidate,
  type WebsiteSettings,
} from "@/features/settings/settings-contract";

type Section = "website" | "navigation" | "brand" | "seo" | "mode";

export function WebsiteSettingsView({
  data,
  canWrite,
  initialSection,
  customPages = [],
}: Readonly<{
  data: WebsiteSettings;
  canWrite: boolean;
  initialSection?: string | undefined;
  /** Published custom / content pages that may be linked from the navigation. */
  customPages?: readonly Readonly<{ key: string; title: string; path: string }>[] | undefined;
}>) {
  const { connectionState } = useAdminRealtimeInvalidation(["settings"]);
  const sections: readonly Section[] = ["website", "navigation", "brand", "seo", "mode"];
  const [section, setSection] = useState<Section>(
    sections.find((name) => name === initialSection) ?? "website",
  );
  const site = data.website;
  const readOnly = !canWrite;

  return (
    <div className="settings-view">
      <nav aria-label="Website sections" className="record-tabs">
        {sections.map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tab === "website"
              ? "Website"
              : tab === "navigation"
                ? "Navigation"
                : tab === "brand"
                  ? "Brand & media"
                  : tab === "seo"
                    ? "SEO"
                    : "Site mode"}
          </button>
        ))}
        {connectionState === "connected" ? (
          <span className="realtime-dot" title="Live updates connected" />
        ) : null}
      </nav>

      {section === "website" ? (
        <SettingsForm
          action={updateWebsiteSettingsAction}
          description="Structured public copy and calls to action. Not a page builder: destinations are the approved public routes."
          submitLabel="Save draft"
          title="Website settings"
          version={site.version}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              <Field
                error={state.fieldErrors["canonicalBaseUrl"]}
                hint="Origin only, e.g. https://www.renzconstruction.example — required before going live."
                id="canonicalBaseUrl"
                label="Canonical site URL"
              >
                <input
                  defaultValue={site.canonical_base_url ?? ""}
                  id="canonicalBaseUrl"
                  inputMode="url"
                  name="canonicalBaseUrl"
                  type="url"
                />
              </Field>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["homepageCtaLabel"]}
                  id="homepageCtaLabel"
                  label="Primary CTA label"
                >
                  <input
                    defaultValue={site.homepage_cta_label}
                    id="homepageCtaLabel"
                    maxLength={60}
                    name="homepageCtaLabel"
                    required
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["homepageCtaRoute"]}
                  id="homepageCtaRoute"
                  label="Primary CTA destination"
                >
                  <select
                    defaultValue={site.homepage_cta_route}
                    id="homepageCtaRoute"
                    name="homepageCtaRoute"
                  >
                    {approvedRoutes.map((route) => (
                      <option key={route} value={route}>
                        {approvedRouteLabels[route]} (/{route})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["secondaryCtaLabel"]}
                  id="secondaryCtaLabel"
                  label="Secondary CTA label (optional)"
                >
                  <input
                    defaultValue={site.secondary_cta_label ?? ""}
                    id="secondaryCtaLabel"
                    maxLength={60}
                    name="secondaryCtaLabel"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["secondaryCtaRoute"]}
                  id="secondaryCtaRoute"
                  label="Secondary CTA destination"
                >
                  <select
                    defaultValue={site.secondary_cta_route ?? ""}
                    id="secondaryCtaRoute"
                    name="secondaryCtaRoute"
                  >
                    <option value="">None</option>
                    {approvedRoutes.map((route) => (
                      <option key={route} value={route}>
                        {approvedRouteLabels[route]} (/{route})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                error={state.fieldErrors["footerStatement"]}
                id="footerStatement"
                label="Footer statement"
              >
                <input
                  defaultValue={site.footer_statement ?? ""}
                  id="footerStatement"
                  maxLength={300}
                  name="footerStatement"
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["contactIntro"]}
                id="contactIntro"
                label="Contact page intro"
              >
                <textarea
                  defaultValue={site.contact_intro ?? ""}
                  id="contactIntro"
                  maxLength={1000}
                  name="contactIntro"
                  rows={2}
                />
              </Field>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["serviceAreaWording"]}
                  id="serviceAreaWording"
                  label="Service-area wording"
                >
                  <input
                    defaultValue={site.service_area_wording ?? ""}
                    id="serviceAreaWording"
                    maxLength={300}
                    name="serviceAreaWording"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["announcementText"]}
                  id="announcementText"
                  label="Site announcement (optional)"
                >
                  <input
                    defaultValue={site.announcement_text ?? ""}
                    id="announcementText"
                    maxLength={300}
                    name="announcementText"
                    type="text"
                  />
                </Field>
              </div>
              <Field
                error={state.fieldErrors["companySummary"]}
                id="companySummary"
                label="Public company summary"
              >
                <textarea
                  defaultValue={site.company_summary ?? ""}
                  id="companySummary"
                  maxLength={2000}
                  name="companySummary"
                  rows={3}
                />
              </Field>
              <div className="check-row">
                <label>
                  <input
                    defaultChecked={site.announcement_active}
                    name="announcementActive"
                    type="checkbox"
                  />{" "}
                  Show announcement
                </label>
              </div>
              <h3>Website analytics</h3>
              <p className="field-help">
                First-party analytics counts page views and interactions as daily totals — no
                cookies, no identifiers, no IP addresses. A third-party provider is optional; a
                cookie-setting provider (GA4 / other) always requires consent before it loads.
                Publish the privacy notice describing analytics before going live.
              </p>
              <div className="field-grid field-grid-two">
                <div className="check-row">
                  <label>
                    <input
                      defaultChecked={site.first_party_analytics_enabled}
                      name="firstPartyAnalyticsEnabled"
                      type="checkbox"
                    />{" "}
                    First-party analytics (privacy-safe daily aggregates)
                  </label>
                  <label>
                    <input
                      defaultChecked={site.analytics_enabled}
                      name="analyticsEnabled"
                      type="checkbox"
                    />{" "}
                    Third-party analytics provider enabled
                  </label>
                  <label>
                    <input
                      defaultChecked={site.consent_required}
                      name="consentRequired"
                      type="checkbox"
                    />{" "}
                    Consent required before the provider loads
                  </label>
                </div>
                <Field
                  error={state.fieldErrors["analyticsProvider"]}
                  id="analyticsProvider"
                  label="Third-party provider"
                >
                  <select
                    defaultValue={site.analytics_provider ?? ""}
                    id="analyticsProvider"
                    name="analyticsProvider"
                  >
                    <option value="">Not chosen</option>
                    <option value="none">None</option>
                    <option value="plausible">Plausible (cookieless)</option>
                    <option value="umami">Umami (cookieless)</option>
                    <option value="ga4">Google Analytics 4 (consent required)</option>
                    <option value="other">Other (no adapter)</option>
                  </select>
                </Field>
                <Field
                  error={state.fieldErrors["analyticsSiteId"]}
                  hint="Public value only: Plausible domain, Umami website id or GA4 measurement id. Secrets stay in environment variables."
                  id="analyticsSiteId"
                  label="Provider site id (public)"
                >
                  <input
                    defaultValue={site.analytics_site_id ?? ""}
                    id="analyticsSiteId"
                    maxLength={200}
                    name="analyticsSiteId"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["analyticsRetentionDays"]}
                  hint="Daily aggregates older than this are deleted (30–1100 days)."
                  id="analyticsRetentionDays"
                  label="Analytics retention (days)"
                >
                  <input
                    defaultValue={site.analytics_retention_days}
                    id="analyticsRetentionDays"
                    max={1100}
                    min={30}
                    name="analyticsRetentionDays"
                    type="number"
                  />
                </Field>
              </div>
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      {section === "navigation" ? (
        <SettingsForm
          action={updateNavigationSettingsAction}
          description="Labels, visibility and order for the approved public destinations, plus any published custom pages you want in the menu. Core routes stay canonical; no arbitrary URLs."
          submitLabel="Save navigation"
          title="Navigation"
          version={data.domain_versions.navigation}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              {state.fieldErrors["items"] ? (
                <p className="field-error">{state.fieldErrors["items"]}</p>
              ) : null}
              <input
                name="custom_pages"
                type="hidden"
                value={customPages.map((page) => page.key).join(",")}
              />
              <ol className="navigation-editor">
                {[...data.navigation]
                  .filter((item) => !item.route_key.startsWith("page:"))
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <li key={item.route_key}>
                      <strong>
                        {navigationRouteLabel(item.route_key)} <code>/{item.route_key}</code>
                      </strong>
                      <label htmlFor={`label_${item.route_key}`}>
                        <span className="field-label">Label override</span>
                        <input
                          defaultValue={item.label_override ?? ""}
                          id={`label_${item.route_key}`}
                          maxLength={40}
                          name={`label_${item.route_key}`}
                          type="text"
                        />
                      </label>
                      <label htmlFor={`sort_${item.route_key}`}>
                        <span className="field-label">Order</span>
                        <input
                          defaultValue={item.sort_order}
                          id={`sort_${item.route_key}`}
                          min={0}
                          name={`sort_${item.route_key}`}
                          type="number"
                        />
                      </label>
                      <label className="checkbox-row" htmlFor={`visible_${item.route_key}`}>
                        <input
                          defaultChecked={item.visible}
                          id={`visible_${item.route_key}`}
                          name={`visible_${item.route_key}`}
                          type="checkbox"
                        />
                        <span>Visible</span>
                      </label>
                    </li>
                  ))}
              </ol>
              {customPages.length > 0 ? (
                <>
                  <p className="field-label">Custom pages</p>
                  <p className="field-help">
                    Tick a published page to add it to the menu. Unpublish the page later and the
                    link is removed with it, never left broken.
                  </p>
                  <ol className="navigation-editor navigation-editor-custom">
                    {customPages.map((page) => {
                      const existing = data.navigation.find((item) => item.route_key === page.key);
                      return (
                        <li key={page.key}>
                          <label className="checkbox-row" htmlFor={`include_${page.key}`}>
                            <input
                              defaultChecked={Boolean(existing)}
                              id={`include_${page.key}`}
                              name={`include_${page.key}`}
                              type="checkbox"
                            />
                            <span>
                              <strong>{page.title}</strong> <code>{page.path}</code>
                            </span>
                          </label>
                          <label htmlFor={`label_${page.key}`}>
                            <span className="field-label">Label</span>
                            <input
                              defaultValue={existing?.label_override ?? page.title}
                              id={`label_${page.key}`}
                              maxLength={40}
                              name={`label_${page.key}`}
                              type="text"
                            />
                          </label>
                          <label htmlFor={`sort_${page.key}`}>
                            <span className="field-label">Order</span>
                            <input
                              defaultValue={existing?.sort_order ?? 900}
                              id={`sort_${page.key}`}
                              min={0}
                              name={`sort_${page.key}`}
                              type="number"
                            />
                          </label>
                          <label className="checkbox-row" htmlFor={`visible_${page.key}`}>
                            <input
                              defaultChecked={existing?.visible ?? true}
                              id={`visible_${page.key}`}
                              name={`visible_${page.key}`}
                              type="checkbox"
                            />
                            <span>Visible</span>
                          </label>
                        </li>
                      );
                    })}
                  </ol>
                </>
              ) : null}
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      {section === "brand" ? <BrandMediaForm data={data} readOnly={readOnly} /> : null}

      {section === "seo" ? (
        <SettingsForm
          action={updateSeoSettingsAction}
          description="Global metadata. Structured data is generated only from these public facts; no JSON-LD is accepted from forms."
          submitLabel="Save draft"
          title="SEO"
          version={data.seo.version}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              <div className="field-grid field-grid-two">
                <Field error={state.fieldErrors["siteName"]} id="siteName" label="Site name">
                  <input
                    defaultValue={data.seo.site_name}
                    id="siteName"
                    maxLength={80}
                    name="siteName"
                    required
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["titleTemplate"]}
                  hint="Must contain %s, e.g. %s | RENZ"
                  id="titleTemplate"
                  label="Title template"
                >
                  <input
                    defaultValue={data.seo.title_template}
                    id="titleTemplate"
                    maxLength={120}
                    name="titleTemplate"
                    required
                    type="text"
                  />
                </Field>
              </div>
              <Field
                error={state.fieldErrors["metaDescription"]}
                hint="40–160 characters recommended (max 320)."
                id="metaDescription"
                label="Default meta description"
              >
                <textarea
                  defaultValue={data.seo.meta_description ?? ""}
                  id="metaDescription"
                  maxLength={320}
                  name="metaDescription"
                  rows={2}
                />
              </Field>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["organizationName"]}
                  hint="Defaults to the business display name."
                  id="organizationName"
                  label="Organization name"
                >
                  <input
                    defaultValue={data.seo.organization_name ?? ""}
                    id="organizationName"
                    maxLength={200}
                    name="organizationName"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["organizationUrl"]}
                  hint="Defaults to the canonical site URL."
                  id="organizationUrl"
                  label="Organization URL"
                >
                  <input
                    defaultValue={data.seo.organization_url ?? ""}
                    id="organizationUrl"
                    inputMode="url"
                    name="organizationUrl"
                    type="url"
                  />
                </Field>
              </div>
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      {section === "mode" ? (
        <SiteModePanel
          canSwitch={canWrite && data.is_super_admin}
          siteMode={site.site_mode}
          version={site.version}
        />
      ) : null}
    </div>
  );
}

function BrandMediaForm({
  data,
  readOnly,
}: Readonly<{ data: WebsiteSettings; readOnly: boolean }>) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<readonly BrandCandidate[]>([]);
  const [, startTransition] = useTransition();
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        setCandidates(await searchBrandMediaAction(query));
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <SettingsForm
      action={updateBrandMediaAction}
      description="Select existing promoted, rights-cleared media for each slot. No new binary storage; the working RENZ mark renders until a logo is chosen. The mark is a working identity, not a verified trademark."
      submitLabel="Save brand media"
      title="Brand & media"
      version={data.brand.version}
    >
      {(state) => (
        <fieldset className="settings-fieldset" disabled={readOnly}>
          <Field
            hint="Filter promoted image media by filename."
            id="brandSearch"
            label="Find media"
          >
            <input
              id="brandSearch"
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              value={query}
            />
          </Field>
          {state.fieldErrors["media"] ? (
            <p className="field-error">{state.fieldErrors["media"]}</p>
          ) : null}
          <div className="field-grid field-grid-two">
            {brandSlots.map((slot) => {
              const current = data.brand.slots[slot] ?? null;
              return (
                <Field
                  hint={
                    current
                      ? `${current.filename ?? current.id}${current.public_eligible ? "" : " — no longer public"}`
                      : "Not set"
                  }
                  id={`slot_${slot}`}
                  key={slot}
                  label={brandSlotLabels[slot]}
                >
                  <select defaultValue={current?.id ?? ""} id={`slot_${slot}`} name={slot}>
                    <option value="">None</option>
                    {current && !candidates.some((c) => c.id === current.id) ? (
                      <option value={current.id}>{current.filename ?? current.id}</option>
                    ) : null}
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.filename ?? candidate.id}
                        {candidate.width && candidate.height
                          ? ` (${candidate.width}×${candidate.height})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              );
            })}
          </div>
        </fieldset>
      )}
    </SettingsForm>
  );
}

export function SiteModePanel({
  siteMode,
  version,
  canSwitch,
}: Readonly<{ siteMode: "preview" | "live"; version: number; canSwitch: boolean }>) {
  const [state, action, pending] = useActionState(
    guardAction(changeSiteModeAction),
    initialAdminActionState,
  );
  const [confirming, setConfirming] = useState(false);
  const next = siteMode === "live" ? "preview" : "live";
  return (
    <section
      aria-labelledby="site-mode-heading"
      className="admin-panel settings-panel settings-panel-danger"
    >
      <div className="section-heading-row section-heading-compact">
        <div>
          <h2 id="site-mode-heading">Site mode</h2>
          <p className="panel-copy">
            Preview keeps the whole site <code>noindex</code>. Live allows normal indexing, robots
            and the sitemap. Going live is Super Admin only and refused while required launch checks
            are blocked.
          </p>
        </div>
        <StatusBadge tone={siteMode === "live" ? "ready" : "review"}>
          {siteMode === "live" ? "LIVE" : "PREVIEW"}
        </StatusBadge>
      </div>
      {state.status === "error" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
          {state.detail === "launch_blocked" ? (
            <Link className="button button-secondary" href="/admin/settings/launch-readiness">
              Open Launch Readiness
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {state.status === "conflict" ? (
        <Alert live tone="warning">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      {state.status === "success" ? (
        <Alert live tone="success">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      {canSwitch ? (
        confirming ? (
          <form action={action} className="admin-form">
            <input name="expectedVersion" type="hidden" value={state.currentVersion ?? version} />
            <input name="nextMode" type="hidden" value={next} />
            <p>
              {next === "live"
                ? "Switch the public site to LIVE? Search engines may index it after this."
                : "Switch the public site back to PREVIEW? It becomes noindex again."}
            </p>
            <div className="form-actions">
              <Button onClick={() => setConfirming(false)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={pending} tone="danger" type="submit">
                {pending ? "Switching…" : `Confirm: go ${next}`}
              </Button>
            </div>
          </form>
        ) : (
          <div className="form-actions form-actions-start">
            <Button onClick={() => setConfirming(true)} tone="danger" type="button">
              {next === "live" ? "Go live" : "Return to preview"}
            </Button>
          </div>
        )
      ) : (
        <p className="quiet-empty">
          Only a Super Admin with website settings access can change the site mode.
        </p>
      )}
    </section>
  );
}
