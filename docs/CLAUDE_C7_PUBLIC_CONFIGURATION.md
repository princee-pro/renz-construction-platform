# C7 — PUBLIC CONFIGURATION

> **Website logo update — 25 September 2026:** The user approved the Figma R as the website source of truth. Operational symbols, the favicon and the organization-schema logo now use the versioned repository asset and its derived favicon, superseding the historical conditional logo/favicons described below for these consumers. CMS media storage, rights checks, API slots and document/share assets are unchanged. See [RENZ_LOGO_INTEGRATION.md](./RENZ_LOGO_INTEGRATION.md).

How Admin settings reach the public site, and what can never reach it.

## The projection

`private.build_public_configuration()` composes one JSON document from the
drafts (`jsonb_strip_nulls`, so absent facts are absent, not empty):

```
business   display_name, legal_name, short_name, tagline, description, primary_email,
           website_url, timezone, locale, country, region, mission, approach,
           service_area, credentials (all optional except name/email)
contact    primary_email, whatsapp_digits, channels[] (public + active only;
           the private `purpose` column is never included)
location   only when publish_location and an address/city/map exists
hours      only when at least one weekday is open
social     active links (platform, label, url)
website    CTAs (approved route keys), footer statement, contact intro, service
           area wording, company summary, announcement (only while active),
           canonical_base_url, analytics flags
navigation route_key, label, visible, sort_order for the six approved routes
brand      slot → boolean "a published, rights-cleared asset exists"
seo        site_name, title_template, meta_description, organization_name/url
```

`publish_public_configuration(note)` stores that document in
`public_configuration_snapshots` and marks it current. The anonymous facade
`public_site_configuration()` returns the current snapshot plus two live
facts that are governed by their own gates: `site_mode` and the `legal`
slug → published map. The public site never reads draft tables.

## Public loader

`src/lib/site/public-configuration.ts` — `getSiteIdentity()` runs one RPC
per request (React `cache()` memoization) and normalizes it with
`siteIdentityFrom(config)`. Any RPC error, parse error or missing client
yields the static authorized fallback (`AUTHORIZED_CONTACT`), so a settings
outage degrades to the pre-C7 site instead of an error page. Server actions
call `revalidatePublicSite()` after a publish so the next request renders
the new snapshot.

Consumers: `src/app/layout.tsx` (`generateMetadata`: title template,
description, `metadataBase`, favicon slot), `src/app/(public)/layout.tsx`
(header, footer, floating WhatsApp, announcement bar, organization
structured data), `/contact`, `/privacy`, `/terms`, `/cookies`, `robots.ts`,
`sitemap.ts`.

## Site mode

`website_settings.site_mode` is `preview` or `live`.

- **preview**: every public page carries `robots: noindex, nofollow`,
  `/robots.txt` is `Disallow: /`, the sitemap is empty, and the header
  shows a small "Preview" label.
- **live**: pages are indexable, `/robots.txt` allows the site but always
  disallows `/admin`, `/i/`, `/po/` and `/api/`, and `/sitemap.xml` lists
  the approved public routes plus published projects, services and
  insights. Token routes, previews and staff routes never appear.

`change_site_mode(target, expected_version)` requires
`settings.website.write` **and** `private.is_current_super_admin()`,
requires a confirmation in the UI, is audited (`site_mode.change`) and —
for Preview → Live — is refused with `launch_blocked` (carrying the
readiness result) while any **required** launch check is blocked. Live →
Preview is always allowed.

## Navigation and CTAs

`navigation_settings` holds exactly the six approved routes (`home`,
`about`, `services`, `projects`, `insights`, `contact`) with an optional
label override, visibility and sort order. CTAs reference route keys from
the same approved list (`start-a-project` included). There is no free URL
field anywhere in the public configuration; the public menu and footer are
data-driven from the projection and fall back to the approved defaults when
nothing is published.

## Brand & media

`brand_media_settings` references existing `media_assets` rows for seven
slots (primary logo, reversed logo, favicon, default OG, default share,
default hero, document logo). No binary is duplicated. A slot is only
published when the asset's storage state is `public_eligible` and its
rights are cleared or granted (`private.brand_media_public`). Files are
served through `/api/media/brand/[slot]`, which resolves the published
storage path via `resolve_brand_media_path(slot)` and signs it server-side.
The Datum R mark remains a working identity — it is not presented as a
registered trademark anywhere.

## SEO and structured data

`seo_settings` is structured: site name, title template (`%s` required),
default meta description, organization name / URL. Admins cannot enter
JSON-LD. `OrganizationStructuredData` emits an `Organization` object built
only from the published business name, URL, email, WhatsApp contact point
(`contactType: customer service`), published social links (`sameAs`) and,
when published, the postal address. It never emits founding date, employee
counts, ratings, reviews, awards or registration numbers because the
schema has no fields for them.

## Dev copy removal

The public experience no longer carries "preview only", "awaiting approval",
"placeholder", "client preview" or similar working notes; it renders the
published identity. The honest **CONCEPT STUDY** labels on concept projects
remain and cannot be removed through Settings.

## Legal on the public site

`/privacy`, `/terms` and `/cookies` render `public_legal_page(slug)`: the
published revision only. Unpublished pages show a short "not yet published"
notice with the contact email, never a draft.

## Analytics preparation

`analytics_enabled`, `analytics_provider` and `consent_required` are flags
only. Nothing loads a script, sets a cookie or shows a banner; the cookie
notice says the site collects no information yet. C9 implements the
provider.


## Approved silver architectural identity — 28 September 2026

The user explicitly revoked the terracotta/brick R direction and approved the attached black-and-silver RENZ CONSTRUCTION twin-tower logo as the new website source of truth. This decision supersedes the 25 September identity decision for all operational logo uses. The original is byte-preserved at `references/client/originals/03-renz-construction-silver-reference.png`; faithful vector derivatives, allowed use, hashes and checks are recorded in [RENZ_SILVER_BRAND.md](./RENZ_SILVER_BRAND.md). The opening and loading screens use the large stacked lockup on black; the responsive header uses a compact silver lockup linked to `/`. The approved opener now applies to the public homepage independently of preview mode, retaining its session, skip, reduced-motion, forced-colors and Save-Data bypasses. Existing business facts, historical audit records and unrelated UI colors remain under their existing contracts. This is source implementation authority, not deployment or general release approval.


## Orange identity clarification — 28 September 2026 (superseding update)

The user resolved the conflicting brief by explicitly selecting the orange curved R with the two-line Renz Construction wordmark. This later instruction supersedes the silver tower identity above for operational website branding. The supplied composition and traced lettering are retained in transparent SVGs; the full opening/loading logo appears on white, the responsive header logo links to the homepage, and existing shared identity placements and app icons use the same source. Provenance, preparation and current verification are recorded in [RENZ_ORANGE_BRAND.md](./RENZ_ORANGE_BRAND.md). Earlier dated decisions and checks remain historical; this bounded correction does not authorize deployment or change business facts.
