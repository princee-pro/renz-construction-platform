# C7 CONFIGURATION — ARCHITECTURE

Entry point for the Business + Website + System Configuration Center. Read
this first, then `CLAUDE_C7_BUSINESS_SETTINGS.md`,
`CLAUDE_C7_PUBLIC_CONFIGURATION.md`, `CLAUDE_C7_LEGAL_GOVERNANCE.md`,
`CLAUDE_C7_DOCUMENT_DEFAULTS.md` and `CLAUDE_C7_LAUNCH_READINESS.md`.

## What C7 is

C7 moves every hardcoded business, website, legal, document and operational
fact into **typed settings domains** owned by the Admin, without creating a
generic key/value store, without moving secrets into the database, and
without letting a saved draft reach the public site before an explicit
publish.

Settings live under `/admin/settings` in seven pages:

| Route                              | Domains                                                         | Read permission          |
| ---------------------------------- | --------------------------------------------------------------- | ------------------------ |
| `/admin/settings`                  | Overview, publish panel, publish history                        | `settings.business.read` |
| `/admin/settings/business`         | Business profile, contact channels, location, hours, social     | `settings.business.read` |
| `/admin/settings/website`          | Website copy/CTAs, navigation, brand & media, SEO, site mode    | `settings.website.read`  |
| `/admin/settings/legal`            | Privacy / Terms / Cookies drafts and publication                | `settings.legal.read`    |
| `/admin/settings/system`           | Document defaults, operational thresholds, environment presence | `settings.system.read`   |
| `/admin/settings/staff`            | Staff register (existing S3 profiles/roles)                     | `staff.read`             |
| `/admin/settings/launch-readiness` | Launch readiness checklist and client evidence backlog          | `settings.website.read`  |

## Typed domains, not a dumping ground

Every domain is a real table with columns, check constraints and a single
facade per write. Singleton domains are pinned to `id = 1`:

```
business_profile        website_settings        brand_media_settings
business_location       seo_settings            document_defaults
operational_settings
```

List-shaped domains (`contact_channels`, `business_hours`, `social_links`,
`navigation_settings`) carry their optimistic version in
`settings_domain_versions` so two editors of the same list conflict the same
way two editors of one row do. `legal_pages` + `legal_page_revisions` hold
the legal drafts and their published revisions. `public_configuration_snapshots`
is the append-only, exactly-one-current projection the public site reads.

There is no `settings(key, value)` table and no facade that accepts an
arbitrary path or JSON blob. Adding a setting means adding a column, a check
constraint, a parser in `settings-contract.ts` and a field in the form.

## Access path

The C4–C6 pattern continues unchanged:

- Default-deny RLS, `force row level security` and revoked table privileges
  on all 15 C7 tables. The only access path is a `SECURITY DEFINER` facade
  with `set search_path = ''`.
- `private.has_permission(key)` requires AAL2, an active profile and the
  exact permission. Eleven new permissions:
  `settings.business.read/write`, `settings.website.read/write`,
  `settings.legal.read/write/publish`, `settings.system.read/write`,
  `staff.read`, `staff.manage`. Admin and Super Admin get the read/write
  keys; `settings.legal.publish`, `settings.system.write` and `staff.manage`
  are Super Admin only. Changing the site mode additionally requires
  `private.is_current_super_admin()`.
- Every write takes `expected_version`, returns `version_conflict` with the
  `current_version`, audits through `private.s4_audit(...)` and emits a
  value-free `private.emit_realtime_event('settings', <fixed uuid>, ...)`
  pointer. Failures come back as `{ok:false, reasons:[...]}`.
- Anonymous facades are limited to `public_site_configuration()`,
  `public_legal_page(slug)` and `resolve_brand_media_path(slot)`; they read
  only the current snapshot and published revisions.

Execute privileges are revoked by default in this database, so every new
facade is granted explicitly (`authenticated` for admin facades, `anon` for
the public projection).

## Draft → publish

Business, contact, location, hours, social, website, navigation, brand and
SEO edits are **drafts**. `publish_public_configuration(note)` calls
`private.build_public_configuration()`, writes one coherent snapshot,
flips `is_current`, audits `public_configuration.publish` and emits the
`settings … published` pointer. The public site only ever reads
`private.current_public_configuration()`. Legal pages have their own
publish (`publish_legal_page`), and the site mode has its own gated change
(`change_site_mode`); see the sibling docs.

The overview shows which domains changed since the last publish by
comparing the live draft projection with the current snapshot, so the
owner sees exactly what a publish would ship.

## Effects on existing modules

`supabase/migrations/20260914110000_c7_settings_effects.sql` re-creates the
C4/C5/C6 overview and action-queue functions so their thresholds read
`private.operational_setting('<column>')` instead of literals, and
re-creates Quick Find with a `setting` kind (`private.settings_quick_find`)
that resolves to the settings routes through eight fixed uuids. It also adds
`admin_document_defaults()` for the invoice and purchase-order editors.
`private.invoice_issuer_snapshot()` now builds the issuer block from the
published configuration (falling back to the authorized defaults), so new
documents pick up the business identity at issue time and documents already
issued keep their frozen snapshot bytes.

## Frontend

```
src/features/settings/
  settings-contract.ts    vocabularies, zod form parsers, read schemas
  settings-data.ts        loaders (one RPC per page) + environmentPresence()
  settings-guards.ts      requireAnyPermission
  settings-actions.ts     server actions; revalidatePublicSite() after writes
  components/             settings-form (shared shell), publish-panel,
                          business-settings, website-settings, legal-center,
                          system-settings, staff-register, launch-readiness,
                          settings-overview, settings-nav
src/app/admin/(workspace)/settings/**  routes (+ loading skeletons, ?section=)
src/lib/site/public-configuration.ts   getSiteIdentity() for the public site
src/lib/seo/public-metadata.ts         createPublicMetadata(), robotsFor()
```

`SettingsForm` submits with `startTransition(() => formAction(new FormData(form)))`
so a `version_conflict` never wipes the user's edits (React 19 would reset
an uncontrolled `<form action>` on return). The C4 pinned-edit rule holds:
a realtime invalidation while a form is dirty only shows an "outdated" cue
with a Reload-latest control; the form remounts to fresh props only after
its own successful save.

## Secrets boundary

Environment secrets never enter Settings. `environmentPresence()` reports
only names and Configured / Not configured for the Supabase URL, publishable
key, secret key and the site URL; no value is read into the page, the RPC or
the audit trail. Brand media files are served through
`/api/media/brand/[slot]`, which asks the database which storage path is
published and then signs it server-side.

## Performance

The public site makes one anonymous RPC per request (`public_site_configuration`),
memoized with React `cache()` across header, footer, metadata, contact and
structured data. A persistent Next data cache was tried and rejected: the
on-disk fetch cache survived database resets and served stale identity, and
`revalidateTag` with SWR semantics still served one stale render. One RPC
per request is cheaper than the failure mode. Admin pages load one bounded
RPC each (`admin_get_*`), and the staff register is keyset-bounded.

## Verification

- `supabase/tests/database/015_c7_configuration.sql` (115 assertions)
  plus updated inventories `001`, `006`, `007`.
- `scripts/verify-c7.mjs` (`pnpm c7:verify`): captures the settings baseline,
  exercises every write with conflicts, WhatsApp/tel, location omission,
  legal publish, document defaults with byte-identical historical invoice
  and PO snapshots, thresholds read by both React and Postgres, site mode
  gating, negatives for a read-only synthetic role, staff actions, audit
  shape and realtime pointers, then restores the baseline.
- `tests/e2e/c7-settings.spec.ts` (`pnpm test:e2e:c7`): the §67 synthetic
  journey, site-mode transitions, RBAC negatives, public projection and
  responsive/accessibility checks.
- `tests/unit/c7-settings-contracts.test.ts` and updated public metadata /
  control-room unit tests.
