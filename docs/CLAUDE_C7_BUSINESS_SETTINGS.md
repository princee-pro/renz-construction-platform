# C7 — BUSINESS SETTINGS

`/admin/settings/business` (permission `settings.business.read` to view,
`settings.business.write` to change). Five sections, each a separate
draft with its own version: Profile, Contact, Location, Hours, Social.

## Seeded facts

Only the two authorized values are seeded: `display_name =
'RENZ Construction Services Ltd'` and `primary_email =
'renzconstruuction@gmail.com'` (plus the technical defaults `short_name =
'RENZ'`, `timezone = 'Africa/Kigali'`, `default_locale = 'en'`). Legal name,
description, tagline, website, country, region, mission, approach, service
area and credentials are `null` until the owner writes them. Nothing about
registration, tax status, founding year, staff count or awards exists in the
schema at all.

## Profile

`update_business_profile(expected_version, …)` validates every column
(non-empty display and short names, email shape, `https?://` website URL,
IANA-shaped timezone, `xx` / `xx-XX` locale) and audits
`business_profile.update` with the changed column names — never the
values.

## Contact channels

`contact_channels` is typed: `email`, `whatsapp`, `phone`, `address`,
`maps`, `website`, `social`. Each channel has a label, value, private
`purpose` (never projected), `is_public`, `active`, `sort_order` and
`calling_enabled`.

**The WhatsApp rule.** `+44 7412 853143` is a texting number. The
projection (`private.contact_channel_href`) renders a WhatsApp channel as
`https://wa.me/<digits>` and renders `tel:` **only** for a `whatsapp` or
`phone` channel whose `calling_enabled` flag the owner explicitly turned
on. `upsert_contact_channel` forces `calling_enabled = false` for any other
channel type, requires a parseable number for `whatsapp` / `phone`, an email
shape for `email` and an `https://` URL for `maps` / `website` / `social`.
The public site (`siteIdentityFrom`) derives `telHref` only from a channel
with `calling_enabled` and an `href` starting with `tel:`; the floating
WhatsApp button and the contact page use `wa.me` links exclusively.

No channel is seeded. Until the owner adds and publishes one, the public
site uses the static authorized fallback in `src/lib/site/contact-details.ts`
(the same email and WhatsApp number). Launch readiness marks "WhatsApp
channel configured" as required so the owner confirms the number before
going live.

## Location

`business_location` holds a public name, street address, city, region,
country, postal code, `latitude` / `longitude` (either both or neither,
range-checked), `https://` `maps_url` and `directions_url`, service-area
text and `publish_location`. Nothing is seeded: no Kigali address, no
coordinates. The projection emits `location` only when `publish_location`
is true, and the Contact page omits the map / address card entirely
otherwise. The invoice issuer snapshot uses the published address only when
it exists.

## Business hours

Seven `business_hours` rows (weekday 0–6) default to closed with no times.
The owner can open days with `opens_at < closes_at` (checked in Postgres and
in `businessHoursInput`), and the projection includes `hours` only when at
least one day is open, so the site never shows fabricated opening times.

## Social links

`social_links` are typed by platform (`instagram`, `linkedin`, `facebook`,
`youtube`, `tiktok`, `x`, `other`) with `https://` URLs only, an optional
label, `active` and `sort_order`; `(platform, url)` is unique. The footer
and the contact page render active links; nothing is seeded.

## Versioning and concurrency

Singleton rows carry `version`; the four list domains bump
`settings_domain_versions` on every change. A stale `expected_version`
returns `version_conflict` with `current_version`; the form keeps the
user's edits, shows the conflict and offers Reload latest. Realtime
invalidation while the form is dirty only marks it outdated.

## Audit

`business_profile.update`, `contact_channel.create` / `.update`,
`business_location.update`, `business_hours.update`, `social_link.create` /
`.update`, each with entity type `settings`, the fixed domain uuid and a
metadata list of changed columns or the channel/link id. Private `purpose`
notes and full values are never written to the audit trail.
