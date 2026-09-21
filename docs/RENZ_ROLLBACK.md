# RENZ rollback

C10 §148. How to undo a release, in order of preference. Rolling back the
**application** is instant and safe; rolling back the **database** is a
restore and loses data written after the backup, so it is the last resort.

## Decide in one minute

| Symptom | Action |
| --- | --- |
| Public pages or admin broken after an app-only deploy (no migration in the release) | 1. Redeploy the previous app build |
| App broken after a release that included migrations | 2. Redeploy the previous app build — migrations since C4 are additive and forward-compatible, so the old build runs against the new schema. Do not revert the schema. |
| Data corrupted by a bad release or an operator mistake | 3. Restore from backup (`RENZ_BACKUP_RESTORE.md`), then redeploy the matching app build |
| Security incident (leaked key, compromised account) | `RENZ_INCIDENT_RESPONSE.md` first; rollback is rarely the answer |

## 1. Redeploy the previous build

Netlify (owner-approved host): Deploys → the previous successful deploy →
**Publish deploy** (seconds; no build; the site stays locked to that deploy
until unlocked). Then:

- `node scripts/wait-for-server.mjs https://<domain>/api/health`
- open the public home page and `/admin/sign-in` (the owner signs in)
- if the release had republished the public configuration, republish
  from Settings → Website (the snapshot format is backward compatible
  from C9 on, so this is a precaution, not a requirement).

## 2. Migration that must not stay

Migrations are never edited or deleted once applied (audit rule). To undo
one, write a **new** forward migration that reverses its effect
(`drop function …`, `alter table … drop column …`), run `pnpm db:test`
locally with the pgTAP suite updated, then `supabase db push`. Rows that
the bad migration destroyed are recovered only by a restore.

Known one-way migrations at the C10 release candidate (data would be
lost if reversed): none — every C10 migration is additive
(`profiles.must_change_password`, new functions, replaced function bodies).

## 3. Restore from backup

Follow `RENZ_BACKUP_RESTORE.md` § Restore. Before starting:

1. Put the site in **Preview** mode (Settings → Website → Site mode) or,
   if admin is unusable, set the hosting provider's maintenance page.
2. Take a fresh dump of the broken state (`supabase db dump --data-only`)
   — it is the only copy of anything written since the last good backup.
3. Restore, verify counts, sign in, republish, set Live.
4. Tell staff which records were lost (everything between the backup
   timestamp and the incident); leads that arrived in that window are in
   the "broken state" dump and can be re-entered by hand.

## What rollback never does

- It never deletes audit rows (append-only by trigger), payments
  (reversed, never deleted) or media originals.
- It never touches Supabase Auth settings; a rollback cannot lock the
  owner out. If the owner is locked out, `RENZ_INCIDENT_RESPONSE.md`
  § Owner lockout applies.

## Rehearsed / not rehearsed

- App redeploy to a previous build (Netlify "Publish deploy"): **NOT TESTED** — no Netlify site exists yet.
  Locally the equivalent (`git checkout <prev> && pnpm build && pnpm start`)
  is exercised implicitly by every phase's verification.
- Forward migration reversing a previous one: exercised in Phase 1 (S4
  storage kernel fix, C9 contact-log correction) — see the decision register.
- Database restore: **rehearsed locally on 2026-09-20** (evidence in
  `RENZ_BACKUP_RESTORE.md`).
