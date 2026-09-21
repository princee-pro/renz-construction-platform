"use client";

import { useState } from "react";

import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { useAdminRealtimeInvalidation } from "@/features/admin-shared/use-realtime-invalidation";
import { SettingsForm } from "@/features/settings/components/settings-form";
import {
  updateBusinessHoursAction,
  updateBusinessLocationAction,
  updateBusinessProfileAction,
  upsertContactChannelAction,
  upsertSocialLinkAction,
} from "@/features/settings/settings-actions";
import {
  channelTypeLabels,
  channelTypes,
  socialPlatformLabels,
  socialPlatforms,
  weekdayLabels,
  type BusinessSettings,
  type ContactChannel,
  type SocialLink,
} from "@/features/settings/settings-contract";

type Section = "profile" | "contact" | "location" | "hours" | "social";

export function BusinessSettingsView({
  data,
  canWrite,
  initialSection,
}: Readonly<{ data: BusinessSettings; canWrite: boolean; initialSection?: string | undefined }>) {
  const { connectionState } = useAdminRealtimeInvalidation(["settings"]);
  const sections: readonly Section[] = ["profile", "contact", "location", "hours", "social"];
  const [section, setSection] = useState<Section>(
    sections.find((name) => name === initialSection) ?? "profile",
  );
  const profile = data.profile;
  const location = data.location;
  const [editingChannel, setEditingChannel] = useState<ContactChannel | "new" | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialLink | "new" | null>(null);
  const readOnly = !canWrite;

  return (
    <div className="settings-view">
      <nav aria-label="Business sections" className="record-tabs">
        {sections.map((tab) => (
          <button
            aria-current={section === tab ? "page" : undefined}
            className={section === tab ? "record-tab record-tab-current" : "record-tab"}
            key={tab}
            onClick={() => setSection(tab)}
            type="button"
          >
            {tab === "profile"
              ? "Business profile"
              : tab === "contact"
                ? "Contact channels"
                : tab === "location"
                  ? "Location"
                  : tab === "hours"
                    ? "Business hours"
                    : "Social links"}
          </button>
        ))}
        {connectionState === "connected" ? (
          <span className="realtime-dot" title="Live updates connected" />
        ) : null}
      </nav>

      {section === "profile" ? (
        <SettingsForm
          action={updateBusinessProfileAction}
          description="Identity shown on the public site and used as the issuer of new invoices and purchase orders. Documents already issued keep their frozen snapshot."
          submitLabel="Save draft"
          title="Business profile"
          version={profile.version}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["displayName"]}
                  id="displayName"
                  label="Display name"
                >
                  <input
                    defaultValue={profile.display_name}
                    id="displayName"
                    maxLength={200}
                    name="displayName"
                    required
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["legalName"]}
                  hint="Only when verified — leave blank otherwise."
                  id="legalName"
                  label="Legal / registered name"
                >
                  <input
                    defaultValue={profile.legal_name ?? ""}
                    id="legalName"
                    maxLength={200}
                    name="legalName"
                    type="text"
                  />
                </Field>
              </div>
              <div className="field-grid field-grid-three">
                <Field error={state.fieldErrors["shortName"]} id="shortName" label="Short name">
                  <input
                    defaultValue={profile.short_name}
                    id="shortName"
                    maxLength={60}
                    name="shortName"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["primaryEmail"]}
                  id="primaryEmail"
                  label="Primary email"
                >
                  <input
                    defaultValue={profile.primary_email}
                    id="primaryEmail"
                    inputMode="email"
                    name="primaryEmail"
                    required
                    type="email"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["websiteUrl"]}
                  id="websiteUrl"
                  label="Public website URL"
                >
                  <input
                    defaultValue={profile.website_url ?? ""}
                    id="websiteUrl"
                    inputMode="url"
                    name="websiteUrl"
                    placeholder="https://"
                    type="url"
                  />
                </Field>
              </div>
              <Field
                error={state.fieldErrors["tagline"]}
                hint="The official slogan, shown in the site opener and the footer once published."
                id="tagline"
                label="Slogan"
              >
                <input
                  defaultValue={profile.tagline ?? ""}
                  id="tagline"
                  maxLength={200}
                  name="tagline"
                  type="text"
                />
              </Field>
              <Field
                error={state.fieldErrors["publicDescription"]}
                id="publicDescription"
                label="Public description"
              >
                <textarea
                  defaultValue={profile.public_description ?? ""}
                  id="publicDescription"
                  maxLength={2000}
                  name="publicDescription"
                  rows={3}
                />
              </Field>
              <div className="field-grid field-grid-two">
                <Field error={state.fieldErrors["timezone"]} id="timezone" label="Timezone">
                  <input
                    defaultValue={profile.timezone}
                    id="timezone"
                    name="timezone"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["defaultLocale"]}
                  id="defaultLocale"
                  label="Default locale"
                >
                  <input
                    defaultValue={profile.default_locale}
                    id="defaultLocale"
                    name="defaultLocale"
                    type="text"
                  />
                </Field>
              </div>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["country"]}
                  hint="Only when verified."
                  id="country"
                  label="Country"
                >
                  <input
                    defaultValue={profile.country ?? ""}
                    id="country"
                    maxLength={80}
                    name="country"
                    type="text"
                  />
                </Field>
                <Field error={state.fieldErrors["region"]} id="region" label="Region">
                  <input
                    defaultValue={profile.region ?? ""}
                    id="region"
                    maxLength={120}
                    name="region"
                    type="text"
                  />
                </Field>
              </div>
              <h3>About page hooks</h3>
              <Field
                error={state.fieldErrors["mission"]}
                id="mission"
                label="Company introduction / mission"
              >
                <textarea
                  defaultValue={profile.mission_text ?? ""}
                  id="mission"
                  maxLength={2000}
                  name="mission"
                  rows={3}
                />
              </Field>
              <Field error={state.fieldErrors["approach"]} id="approach" label="Approach">
                <textarea
                  defaultValue={profile.approach_text ?? ""}
                  id="approach"
                  maxLength={2000}
                  name="approach"
                  rows={3}
                />
              </Field>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["serviceArea"]}
                  id="serviceArea"
                  label="Service area"
                >
                  <input
                    defaultValue={profile.service_area_text ?? ""}
                    id="serviceArea"
                    maxLength={400}
                    name="serviceArea"
                    type="text"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["credentials"]}
                  hint="Only supplied, verified credentials. Nothing is invented."
                  id="credentials"
                  label="Public credentials"
                >
                  <input
                    defaultValue={profile.public_credentials_text ?? ""}
                    id="credentials"
                    maxLength={2000}
                    name="credentials"
                    type="text"
                  />
                </Field>
              </div>
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      {section === "contact" ? (
        <section aria-labelledby="channels-heading" className="admin-panel settings-panel">
          <div className="section-heading-row section-heading-compact">
            <div>
              <h2 id="channels-heading">Contact channels</h2>
              <p className="panel-copy">
                Typed public channels. WhatsApp numbers are published as wa.me texting links; a{" "}
                <code>tel:</code> link appears only when calling is explicitly enabled.
              </p>
            </div>
            {canWrite ? (
              <button
                className="button button-secondary"
                onClick={() => setEditingChannel("new")}
                type="button"
              >
                Add channel
              </button>
            ) : null}
          </div>
          {data.channels.length === 0 ? (
            <p className="quiet-empty">
              No channels yet. The public site falls back to the authorized email and WhatsApp until
              channels are configured and published.
            </p>
          ) : (
            <ol className="settings-list">
              {data.channels.map((channel) => (
                <li key={channel.id}>
                  <div>
                    <strong>
                      {channel.label} · {channelTypeLabels[channel.channel_type]}
                    </strong>
                    <span>{channel.value}</span>
                    {channel.purpose ? <span>{channel.purpose}</span> : null}
                  </div>
                  <span className="badge-stack">
                    <StatusBadge tone={channel.is_public ? "ready" : "neutral"}>
                      {channel.is_public ? "Public" : "Private"}
                    </StatusBadge>
                    {!channel.active ? <StatusBadge tone="archived">Inactive</StatusBadge> : null}
                    {channel.channel_type === "phone" || channel.channel_type === "whatsapp" ? (
                      <StatusBadge tone={channel.calling_enabled ? "review" : "neutral"}>
                        {channel.calling_enabled ? "Calling enabled" : "Texting only"}
                      </StatusBadge>
                    ) : null}
                  </span>
                  {canWrite ? (
                    <button
                      className="button button-quiet"
                      onClick={() => setEditingChannel(channel)}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {editingChannel ? (
            <SettingsForm
              action={upsertContactChannelAction}
              hidden={editingChannel === "new" ? {} : { channelId: editingChannel.id }}
              submitLabel={editingChannel === "new" ? "Add channel" : "Save channel"}
              title={editingChannel === "new" ? "New contact channel" : "Edit contact channel"}
              version={data.domain_versions.contact_channels}
            >
              {(state) => {
                const current = editingChannel === "new" ? null : editingChannel;
                return (
                  <>
                    <div className="field-grid field-grid-three">
                      <Field error={state.fieldErrors["channelType"]} id="channelType" label="Type">
                        <select
                          defaultValue={current?.channel_type ?? "email"}
                          id="channelType"
                          name="channelType"
                        >
                          {channelTypes.map((type) => (
                            <option key={type} value={type}>
                              {channelTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field error={state.fieldErrors["label"]} id="channelLabel" label="Label">
                        <input
                          defaultValue={current?.label ?? ""}
                          id="channelLabel"
                          maxLength={80}
                          name="label"
                          required
                          type="text"
                        />
                      </Field>
                      <Field error={state.fieldErrors["sortOrder"]} id="channelSort" label="Order">
                        <input
                          defaultValue={current?.sort_order ?? 0}
                          id="channelSort"
                          min={0}
                          name="sortOrder"
                          type="number"
                        />
                      </Field>
                    </div>
                    <Field
                      error={state.fieldErrors["value"]}
                      hint="Email address, international number (+44…), postal address, or https:// link."
                      id="channelValue"
                      label="Value"
                    >
                      <input
                        defaultValue={current?.value ?? ""}
                        id="channelValue"
                        maxLength={400}
                        name="value"
                        required
                        type="text"
                      />
                    </Field>
                    <Field
                      error={state.fieldErrors["purpose"]}
                      id="channelPurpose"
                      label="Internal purpose (optional, never published)"
                    >
                      <input
                        defaultValue={current?.purpose ?? ""}
                        id="channelPurpose"
                        maxLength={200}
                        name="purpose"
                        type="text"
                      />
                    </Field>
                    <div className="check-row">
                      <label>
                        <input
                          defaultChecked={current?.is_public ?? true}
                          name="isPublic"
                          type="checkbox"
                        />{" "}
                        Public
                      </label>
                      <label>
                        <input
                          defaultChecked={current?.calling_enabled ?? false}
                          name="callingEnabled"
                          type="checkbox"
                        />{" "}
                        Calling enabled (renders tel: — phone/WhatsApp only)
                      </label>
                      <label>
                        <input
                          defaultChecked={current ? !current.active : false}
                          name="active"
                          type="checkbox"
                          value="off"
                        />{" "}
                        Inactive
                      </label>
                    </div>
                    <button
                      className="button button-quiet"
                      onClick={() => setEditingChannel(null)}
                      type="button"
                    >
                      Close editor
                    </button>
                  </>
                );
              }}
            </SettingsForm>
          ) : null}
        </section>
      ) : null}

      {section === "location" ? (
        <SettingsForm
          action={updateBusinessLocationAction}
          description="Nothing here is invented. The public Contact page omits the location entirely until it is configured, marked publishable, and the public configuration is published."
          submitLabel="Save location"
          title="Location"
          version={location.version}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["publicName"]}
                  id="publicName"
                  label="Public location name"
                >
                  <input
                    defaultValue={location.public_name ?? ""}
                    id="publicName"
                    maxLength={120}
                    name="publicName"
                    type="text"
                  />
                </Field>
                <Field error={state.fieldErrors["street"]} id="street" label="Street address">
                  <input
                    defaultValue={location.street_address ?? ""}
                    id="street"
                    maxLength={200}
                    name="street"
                    type="text"
                  />
                </Field>
              </div>
              <div className="field-grid field-grid-three">
                <Field error={state.fieldErrors["city"]} id="city" label="City">
                  <input
                    defaultValue={location.city ?? ""}
                    id="city"
                    maxLength={120}
                    name="city"
                    type="text"
                  />
                </Field>
                <Field error={state.fieldErrors["region"]} id="locationRegion" label="Region">
                  <input
                    defaultValue={location.region ?? ""}
                    id="locationRegion"
                    maxLength={120}
                    name="region"
                    type="text"
                  />
                </Field>
                <Field error={state.fieldErrors["country"]} id="locationCountry" label="Country">
                  <input
                    defaultValue={location.country ?? ""}
                    id="locationCountry"
                    maxLength={80}
                    name="country"
                    type="text"
                  />
                </Field>
              </div>
              <div className="field-grid field-grid-three">
                <Field error={state.fieldErrors["postalCode"]} id="postalCode" label="Postal code">
                  <input
                    defaultValue={location.postal_code ?? ""}
                    id="postalCode"
                    maxLength={20}
                    name="postalCode"
                    type="text"
                  />
                </Field>
                <Field error={state.fieldErrors["latitude"]} id="latitude" label="Latitude">
                  <input
                    defaultValue={location.latitude === null ? "" : String(location.latitude)}
                    id="latitude"
                    inputMode="decimal"
                    name="latitude"
                    type="text"
                  />
                </Field>
                <Field error={state.fieldErrors["longitude"]} id="longitude" label="Longitude">
                  <input
                    defaultValue={location.longitude === null ? "" : String(location.longitude)}
                    id="longitude"
                    inputMode="decimal"
                    name="longitude"
                    type="text"
                  />
                </Field>
              </div>
              <div className="field-grid field-grid-two">
                <Field
                  error={state.fieldErrors["mapsUrl"]}
                  hint="https:// map link (View on Map)."
                  id="mapsUrl"
                  label="Maps URL"
                >
                  <input
                    defaultValue={location.maps_url ?? ""}
                    id="mapsUrl"
                    inputMode="url"
                    name="mapsUrl"
                    type="url"
                  />
                </Field>
                <Field
                  error={state.fieldErrors["directionsUrl"]}
                  hint="https:// directions link (Get Directions)."
                  id="directionsUrl"
                  label="Directions URL"
                >
                  <input
                    defaultValue={location.directions_url ?? ""}
                    id="directionsUrl"
                    inputMode="url"
                    name="directionsUrl"
                    type="url"
                  />
                </Field>
              </div>
              <Field
                error={state.fieldErrors["serviceArea"]}
                id="locationServiceArea"
                label="Service area text"
              >
                <input
                  defaultValue={location.service_area_text ?? ""}
                  id="locationServiceArea"
                  maxLength={400}
                  name="serviceArea"
                  type="text"
                />
              </Field>
              <Field error={state.fieldErrors["publish"]} id="publishLocation" label="Publication">
                <label className="checkbox-row" htmlFor="publishLocation">
                  <input
                    defaultChecked={location.publish_location}
                    id="publishLocation"
                    name="publish"
                    type="checkbox"
                  />
                  <span>Publish this location on the public site (after the next publish)</span>
                </label>
              </Field>
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      {section === "hours" ? (
        <SettingsForm
          action={updateBusinessHoursAction}
          description="Optional. Days left closed are not shown; nothing is fabricated when hours are omitted."
          submitLabel="Save hours"
          title="Business hours"
          version={data.domain_versions.business_hours}
        >
          {(state) => (
            <fieldset className="settings-fieldset" disabled={readOnly}>
              {state.fieldErrors["hours"] ? (
                <p className="field-error">{state.fieldErrors["hours"]}</p>
              ) : null}
              <ol className="hours-editor">
                {data.hours.map((day) => (
                  <li key={day.weekday}>
                    <label className="checkbox-row" htmlFor={`open_${day.weekday}`}>
                      <input
                        defaultChecked={day.is_open}
                        id={`open_${day.weekday}`}
                        name={`open_${day.weekday}`}
                        type="checkbox"
                      />
                      <span>{weekdayLabels[day.weekday]}</span>
                    </label>
                    <label htmlFor={`opens_${day.weekday}`}>
                      <span className="visually-hidden">{weekdayLabels[day.weekday]} opens</span>
                      <input
                        defaultValue={day.opens_at ?? ""}
                        id={`opens_${day.weekday}`}
                        name={`opens_${day.weekday}`}
                        type="time"
                      />
                    </label>
                    <label htmlFor={`closes_${day.weekday}`}>
                      <span className="visually-hidden">{weekdayLabels[day.weekday]} closes</span>
                      <input
                        defaultValue={day.closes_at ?? ""}
                        id={`closes_${day.weekday}`}
                        name={`closes_${day.weekday}`}
                        type="time"
                      />
                    </label>
                  </li>
                ))}
              </ol>
            </fieldset>
          )}
        </SettingsForm>
      ) : null}

      {section === "social" ? (
        <section aria-labelledby="social-heading" className="admin-panel settings-panel">
          <div className="section-heading-row section-heading-compact">
            <div>
              <h2 id="social-heading">Social links</h2>
              <p className="panel-copy">
                Verified https:// profiles only. Empty or inactive links stay hidden.
              </p>
            </div>
            {canWrite ? (
              <button
                className="button button-secondary"
                onClick={() => setEditingSocial("new")}
                type="button"
              >
                Add link
              </button>
            ) : null}
          </div>
          {data.social.length === 0 ? (
            <p className="quiet-empty">No social profiles configured.</p>
          ) : (
            <ol className="settings-list">
              {data.social.map((link) => (
                <li key={link.id}>
                  <div>
                    <strong>
                      {socialPlatformLabels[link.platform]}
                      {link.label ? ` · ${link.label}` : ""}
                    </strong>
                    <span>{link.url}</span>
                  </div>
                  <span className="badge-stack">
                    <StatusBadge tone={link.active ? "ready" : "archived"}>
                      {link.active ? "Active" : "Hidden"}
                    </StatusBadge>
                  </span>
                  {canWrite ? (
                    <button
                      className="button button-quiet"
                      onClick={() => setEditingSocial(link)}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {editingSocial ? (
            <SettingsForm
              action={upsertSocialLinkAction}
              hidden={editingSocial === "new" ? {} : { linkId: editingSocial.id }}
              submitLabel={editingSocial === "new" ? "Add link" : "Save link"}
              title={editingSocial === "new" ? "New social link" : "Edit social link"}
              version={data.domain_versions.social_links}
            >
              {(state) => {
                const current = editingSocial === "new" ? null : editingSocial;
                return (
                  <>
                    <div className="field-grid field-grid-three">
                      <Field error={state.fieldErrors["platform"]} id="platform" label="Platform">
                        <select
                          defaultValue={current?.platform ?? "instagram"}
                          id="platform"
                          name="platform"
                        >
                          {socialPlatforms.map((platform) => (
                            <option key={platform} value={platform}>
                              {socialPlatformLabels[platform]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        error={state.fieldErrors["label"]}
                        id="socialLabel"
                        label="Label (optional)"
                      >
                        <input
                          defaultValue={current?.label ?? ""}
                          id="socialLabel"
                          maxLength={60}
                          name="label"
                          type="text"
                        />
                      </Field>
                      <Field error={state.fieldErrors["sortOrder"]} id="socialSort" label="Order">
                        <input
                          defaultValue={current?.sort_order ?? 0}
                          id="socialSort"
                          min={0}
                          name="sortOrder"
                          type="number"
                        />
                      </Field>
                    </div>
                    <Field error={state.fieldErrors["url"]} id="socialUrl" label="Profile URL">
                      <input
                        defaultValue={current?.url ?? ""}
                        id="socialUrl"
                        inputMode="url"
                        name="url"
                        placeholder="https://"
                        required
                        type="url"
                      />
                    </Field>
                    <div className="check-row">
                      <label>
                        <input
                          defaultChecked={current ? !current.active : false}
                          name="active"
                          type="checkbox"
                          value="off"
                        />{" "}
                        Hidden
                      </label>
                    </div>
                    <button
                      className="button button-quiet"
                      onClick={() => setEditingSocial(null)}
                      type="button"
                    >
                      Close editor
                    </button>
                  </>
                );
              }}
            </SettingsForm>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
