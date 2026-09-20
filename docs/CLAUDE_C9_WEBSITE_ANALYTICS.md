# C9 WEBSITE ANALYTICS

Privacy-safe, first-party, aggregate only. Page views are site events, not
guaranteed unique humans; bots may be included. No unique-visitor, user or
people claims are made anywhere.

## What is stored

One table, `public.website_analytics_daily`, with **daily counters** only:

```
(day, event_type, path_key, dimension, device_class) → hit_count
```

There are no event rows, no visitor identifier, no IP, no user agent, no
session id, no cookies, no query strings and no timestamps finer than the
business-timezone day. The table is default-deny (no anon/authenticated
grant); only the server credential writes through
`public.website_analytics_record(events jsonb)` and only staff with
`analytics.read` + `analytics.website.read` read through
`admin_analytics_website`.

## Vocabulary

Browser-reported (`src/features/website-analytics/analytics-policy.ts`, re-validated in SQL):
`page_view`, `cta_click`, `service_view`, `case_study_view`,
`project_intake_start`, `service_enquiry_start`.

Server-recorded from the real C8 lead insert (trigger
`leads_record_submission_analytics`, so submissions are never double
counted): `contact_submit`, `project_intake_submit`,
`service_enquiry_submit`, `material_enquiry_submit`.

Dimensions are bounded: CTA keys `start_project | whatsapp | email |
service_enquiry | view_project | contact | material_enquiry`; service /
case-study slug must equal the slug in the path; device class
`mobile | tablet | desktop | unknown` (viewport width buckets).

## Path safety

`canonicalPathKey()` (TS) and `private.website_path_key()` (SQL) both:
lower-case, strip query string and fragment, drop the trailing slash,
reject `/admin`, `/api`, `/i/…` (invoice links), `/po/…` (PO links), `/_next`,
`/auth`, and accept only the approved public routes plus
`/services|projects|insights|expertise/<slug>` with `[a-z0-9-]{1,80}`.
Anything else is discarded (counted as rejected, never stored).

## Beacon

`WebsiteAnalytics` (`src/features/website-analytics/components/website-analytics.tsx`)
is mounted by the public layout only when the **published** configuration has
`first_party_analytics_enabled`. It honours Do Not Track / Global Privacy
Control, batches ≤ 20 events, sends with `navigator.sendBeacon` to
`POST /api/analytics/events`, and records interactions only where markup
declares them: `data-analytics-cta="…"`, `data-analytics-event="…"`,
`data-analytics-form="project_intake_start|service_enquiry_start"` (first
focus). Destinations, form contents and identifiers are never read.

## Endpoint

`/api/analytics/events`: same-origin check, 4 KB body limit, strict zod
schema (fixed vocabulary, no extra fields), path canonicalisation, HMAC
identity rate limit (`intake_rate_limit_hit`, scope `analytics`, 120 hits /
hour; the hash lives only in the short-lived limiter table, never with the
counters), then the service RPC. Responses are empty (204/400/403/413/429).

## Retention

`website_settings.analytics_retention_days` (30–1100, default 400). Every
recording call runs `private.purge_website_analytics()` which deletes
counters older than the retention window; there is no scheduler dependency.
Retention here covers analytics only — Lead / Client / Finance / audit
lifecycle is a C10 item.

## Configuration (Settings → Website)

- First-party analytics on/off (`first_party_analytics_enabled`).
- Third-party provider enabled (`analytics_enabled`) + provider
  (`plausible | umami | ga4 | other`) + public site id
  (`analytics_site_id`: Plausible domain, `host/website-id` for Umami, GA4
  `G-…`). Secrets stay in environment variables (none are needed).
- Consent required (`consent_required`); forced on for cookie-setting
  providers (`ga4`, `other`).
- Retention days.

All of it is part of the published public configuration snapshot
(`build_public_configuration` → `website.first_party_analytics_enabled`,
`analytics_site_id`), so changes take effect on **Publish**. Existing
snapshots therefore show "unpublished changes" once C9 is deployed until the
owner republishes.

## Consent

`AnalyticsConsent` renders only when a third-party provider is published
**and** consent is required **and** no choice is stored. Accept / Reject are
equally prominent, nothing is preselected, the site is never blocked. The
choice is kept in `localStorage` (`renz-analytics-consent`) and can be changed
on the Cookie Notice page (`AnalyticsPreferenceControl`). The provider adapter
loads a known script only after acceptance (or immediately for cookieless
providers when consent is not required); `other` has no adapter and loads
nothing. First-party counters are cookieless and are not gated by consent.
With analytics off nothing renders — no useless banner.

## Launch readiness

`analytics_configuration` (provider missing → blocked, site id missing /
`other` → warning), `analytics_privacy` (analytics on but the published
privacy notice does not describe "website analytics" → blocked),
`consent_mode` (cookie-setting provider without consent → blocked; consent
required but published cookie notice silent → warning). The privacy and
cookie DRAFTS were rewritten to describe the implemented behaviour and are
never auto-published.

## Tests

- pgTAP `017`: recorder accepts/rejects, query strings stripped, no
  identifier columns, no PII patterns, submission trigger, retention no-op
  while off, readiness states.
- `scripts/verify-c9.mjs`: service-role-only recorder, privacy scan as real roles.
- `tests/e2e/c9-intelligence.spec.ts`: off by default (no banner, no
  provider, inert beacon, arbitrary events refused), anonymous journey
  (Home → Services → Design → CTA → Start-a-Project → contact submission)
  counted with only approved keys, consent reject/accept behaviour.
