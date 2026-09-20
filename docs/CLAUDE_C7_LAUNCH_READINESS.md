# C7 — LAUNCH READINESS

`/admin/settings/launch-readiness` (`settings.website.read`). The page is
the gate between Preview and Live and the single place that tells the owner
what the site still needs.

## Checks

`private.launch_readiness()` returns `{overall, checks[], evidence[]}`.
Each check has a key, label, classification and state (`ready`, `warning`,
`blocked`) with an optional detail sentence.

| Key                     | Classification | Ready when                                                          |
| ----------------------- | -------------- | ------------------------------------------------------------------- |
| business_identity       | required       | Display name and primary email set                                  |
| public_email            | required       | The published snapshot carries a contact email                      |
| whatsapp                | required       | A public, active WhatsApp channel with a valid number               |
| location                | optional       | Location published (omitted from the site otherwise, by design)     |
| seo_title               | required       | Site name and a `%s` title template                                 |
| seo_description         | required       | Meta description 40–320 chars (blocked when missing, warning if out of range) |
| canonical_url           | required       | `https://` canonical base URL (warning when `http://`)              |
| og_image                | recommended    | Default OG or share slot published                                  |
| logo                    | recommended    | Primary logo slot published (the working mark renders until then)   |
| privacy_published       | required       | Privacy page has a published revision                               |
| terms_published         | required       | Terms page has a published revision                                 |
| configuration_published | required       | A snapshot exists (blocked otherwise); warning while drafts differ  |
| site_mode               | info           | Current mode                                                        |
| start_project           | recommended    | Always a warning until C8 delivers real intake                      |
| analytics_configuration | optional/required | C9: ready while off; blocked when a provider is enabled without a provider; warning without site id / `other` |
| analytics_privacy       | required when on | C9: blocked while analytics runs but the published privacy notice does not describe it |
| consent_mode            | required when on | C9: blocked for a cookie-setting provider without consent; warning when the cookie notice is silent |
| notification_sweep      | recommended    | C9: warning until a timed sweep finished within 26 h (scheduler is a C10 task) |
| notification_task_token | recommended    | C9 (environment): warning while `RENZ_TASK_TOKEN` is unset |

`overall` is `blocked` when any required check is blocked, `warning` when
any check is open, otherwise `ready`.

## Client evidence backlog

The `evidence` list restates what only the client can supply, so it is never
invented on the site: real project evidence (photos, scope, permission —
required; ready when a project is public), approved testimonials
(recommended), team profiles (optional), verified credentials /
certifications (recommended), office address (optional), business
registration details — legal name and country (recommended), tax label /
rate confirmed by the owner (recommended; ready once document defaults were
saved at least once), and bank / payment instructions for invoices
(recommended). It mirrors `docs/CLIENT_EVIDENCE_BACKLOG.md`.

## Gate

`change_site_mode('live', expected_version)` calls the same function and
fails with `launch_blocked` (readiness embedded in the failure) while any
required check is blocked. The Website page's Site Mode panel links to the
readiness page from that failure. The change requires
`settings.website.write` plus Super Admin, a second confirmation click, is
audited (`site_mode.change` with from/to) and emits the settings realtime
pointer so every open Admin refreshes.

Live → Preview always succeeds so the owner can pull the site back at any
time.

## What "live" changes

Only indexability and the header label: `robots` metadata, `/robots.txt`,
`/sitemap.xml` and the "Preview" label. Content, contact and legal pages
render identically in both modes; the gate exists so search engines only
ever index a site whose identity, contact and legal pages are complete.

## C8 additions

Database checks added by `20260915100000_establish_c8_leads.sql`:
`start_project` now reflects real intake, `intake_enabled` (info),
`privacy_covers_intake` (required while intake is enabled — the published
privacy body must contain the "Enquiries and project submissions" section
shipped as a DRAFT revision), `upload_policy` (images-only / disabled are
ready; images-and-pdf warns until a scanner exists), `public_contact`.
Environment checks merged by the Next server (`intakeEnvironmentChecks`):
`intake_rate_limit_secret` (required), `turnstile` (recommended),
`intake_test_bypass` (recommended), `intake_scanner` (info). The site-mode
switch applies the same environment gate before calling the database.
