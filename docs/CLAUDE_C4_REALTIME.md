# C4 REALTIME — CONTROL ROOM NOTIFICATIONS

## Principle

**The server/database remains the single source of truth. Realtime is a
notification/invalidation signal, not a second data channel.** The pattern is
always:

```
database mutation → private.s4_audit(...) → private.emit_realtime_event(...)
  → Supabase Realtime broadcast → subscribed client → debounced router.refresh()
  → the browser refetches from the same authorized server code path every
    other request uses
```

No business rule is duplicated in client JavaScript. A realtime message never
authorizes anything by itself — it only tells an already-authorized client
"something changed, go refetch."

## Why a pointer table instead of `postgres_changes` on the real tables

The obvious approach — subscribing directly to `postgres_changes` on
`clients`/`operational_projects` — was rejected. Enabling that would require
loosening those tables' strict default-deny RLS (Realtime's
`postgres_changes` respects RLS, but only if a real `select` policy exists to
respect; these tables intentionally have none), and even with a correct
policy, the websocket payload for an `UPDATE` includes the full new row —
meaning a client's email, phone, and address would ride over the realtime
channel to every subscribed session, RLS or not.

Instead, C4 introduces **`public.realtime_events`**: `id` (bigint identity),
`entity_type` (`client` | `operational_project`), `entity_id`, `action`
(`created` | `updated` | `status_changed` | `phase_changed` |
`priority_changed` | `case_study_linked` | `case_study_unlinked` |
`archived` | `note_created`), `created_at`. **No field values, ever** — just
a pointer saying "this record, this kind of change, right now."

This is the one table in the whole C4 schema that gets a real RLS `select`
policy (`realtime_events_staff_select`) instead of default-deny. Its
predicate is `private.is_active_aal2_staff()` — a SECURITY DEFINER boolean
(`auth.uid() is not null and private.has_aal2() and` an active profile)
granted to `authenticated` in the same style as the S4 `private.is_public_*`
projection helpers. It is deliberately **not** gated on `clients.read` or
`operations.projects.read` specifically, because the table carries no PII
to protect. A subscriber can see that *some* client changed, but resolving
that pointer into an actual name, email, or budget still requires calling
the real RPC, which re-checks the real permission every time. Holding a
realtime subscription grants nothing on its own.

> **Why a dedicated predicate.** The first cut of this policy called
> `private.has_aal2()` inline. That helper is (correctly) revoked from
> `authenticated` since S3, and Realtime evaluates RLS *as the subscriber's
> role* — so under a real `authenticated` session the policy raised
> `permission denied for function has_aal2` and no staff session could ever
> receive a pointer. The negative-test file
> `supabase/tests/database/012_c4_security_negative.sql` caught this the
> first time it selected from the table as `authenticated`; migration
> `20260911120000_harden_c4_realtime_policy_and_reverse_link.sql` re-created
> the policy on the new predicate. The same file now asserts, as a control,
> that an active AAL2 actor *does* see the pointers while AAL1 and disabled
> actors see zero rows.

`private.emit_realtime_event(entity_type, entity_id, action)` is called from
every C4 write RPC after its transactional work succeeds. C5 extended the
vocabulary with the `invoice` entity type and the `issued`, `voided`,
`payment_recorded`, `payment_reversed`, `share_created`, `share_revoked`
actions (see `CLAUDE_C5_FINANCE_ARCHITECTURE.md`); the pointer stays
value-free. The table is added
to the `supabase_realtime` publication, and `[realtime] enabled = true` was
turned on in `supabase/config.toml` (it was `false` before this phase).

## Client-side subscription

`src/features/admin-shared/use-realtime-invalidation.ts` —
`useAdminRealtimeInvalidation(entityTypes)`:

- Reads the current session with `auth.getSession()` and pushes its access
  token to the realtime socket (`client.realtime.setAuth(token)`) **before**
  subscribing. supabase-js only forwards tokens to the socket on
  `SIGNED_IN` / `TOKEN_REFRESHED` / `INITIAL_SESSION`, never after an MFA
  step-up — so a browser client created before verification would otherwise
  hold an AAL1 token on the socket, and the AAL2-gated policy would (again
  correctly) deliver nothing. The verification scripts do the same in
  `scripts/c4-local.mjs` → `signInAndActivate`.
- Subscribes to `realtime_events` `INSERT` via the standard `@supabase/ssr`
  browser client (`getBrowserSupabaseClient()`).
- Filters client-side to the entity types the calling component cares about
  (e.g. Client 360 only cares about `client`).
- Debounces 250ms, then calls `router.refresh()` — a targeted
  Server-Component refetch of the current route, **not** a full page
  reload.
- Exposes `connectionState` (`connecting` | `connected` | `disconnected`)
  and `lastUpdatedAt`.

Two presentations sit on top of the hook:

- **Record pages** (Client 360, Project Command Center) render the
  `.realtime-dot` next to their eyebrow while connected.
- **Server-rendered pages** (Clients register, Projects register, Overview)
  mount `src/features/admin-shared/realtime-refresh.tsx` →
  `<RealtimeRefresh entityTypes={[...]} />` through `PageHeader`'s `status`
  slot. It shows `Live`, flips to `Updated just now` for six seconds after a
  pointer triggers a refresh (the brief's optional §41 collaboration cue),
  and `Live updates paused` when the channel drops.

### Interaction with open edit forms (§39 vs §40)

A realtime refresh re-renders Server Component props *underneath* an open
edit form. If the form's hidden `expected_version` simply followed the
fresh props, another staff member's save would silently advance it while
the visible inputs still carried this actor's stale values — and the next
save would overwrite their work with no conflict at all. C4 therefore pins
the edit session (`src/features/admin-shared/use-pinned-edit.ts`): the
version is captured when **Edit** is clicked and only advances through
**Reload latest**, which re-fetches and remounts the form with the fresh
record. While pinned, a newer record version shows "Another staff member
updated this record while you were editing" above the form. Field values
are held as controlled state (`use-draft-fields.ts`) so React 19's
automatic post-action form reset cannot replace what was typed when a save
is rejected. Quick commands (status/phase/priority/link/unlink/draft/
archive) are explicit intents rather than stale field sets, so they follow
the newest known version instead.

## Degrading without realtime

Per the brief: **realtime is not a hard CRUD requirement.** Every mutation in
C4 goes through an ordinary server request (a Server Action calling an RPC)
regardless of whether the realtime channel is connected. If the websocket is
down, `connectionState` reports `disconnected`, the indicator reads "Live
updates paused", and the Admin keeps working exactly as it would in a build
with no realtime at all — the next manual navigation or page refresh picks
up the latest server state either way. This was exercised for real when the
local `realtime` container could not stay resident on the development
machine during the first C4 pass: the full CRUD flow was verified through a
signed-in browser session with the websocket genuinely failing.

## Anonymous subscribers — what they can and cannot learn

Supabase Realtime cannot refuse a `postgres_changes` subscription outright.
For a role with no `select` privilege on the table (`anon` here) it emits a
frame with **empty** `new`/`old` records and `errors: ["Error 401:
Unauthorized"]`. So an anonymous socket learns that *a row was inserted
somewhere in `realtime_events`* — no entity type, id, action, or value, and
of course nothing from `clients`/`operational_projects`, which are not in
the publication at all. `scripts/verify-c4-realtime.mjs` asserts exactly
this: every anonymous frame is an empty Unauthorized frame. The residual is
a content-free timing signal; closing even that would require moving to
Realtime's private-channel broadcast model, which is out of C4 scope and
documented here rather than glossed over.

## Verification (executed live)

- `pnpm c4:verify:realtime` — `scripts/verify-c4-realtime.mjs`. Two
  synthetic AAL2 admin sessions; A subscribes exactly as the hook does, B
  creates a client and changes a project status; A receives both pointers
  within a 10s window; payload keys are limited to
  `id/entity_type/entity_id/action/created_at`; no record values appear;
  the anonymous subscriber gets only empty Unauthorized frames.
- `pnpm test:e2e:c4` — `tests/e2e/c4-control-room.spec.ts`, test
  "propagates a status change to another session without a manual reload":
  session A holds the Projects register (asserting a window-scoped marker
  survives, i.e. no reload), session B changes the status on the Project
  Command Center, A's row flips to the new status and shows "Updated just
  now". The same test then holds the Overview while B archives the project
  and asserts the "Active projects" count decrements live.
- `supabase/tests/database/012_c4_security_negative.sql` — policy behaviour
  under AAL1, disabled, and active AAL2 actors as the `authenticated` role.

The local stack must be started with realtime included
(`supabase start -x studio,imgproxy,pg_meta,edge-runtime,logflare,vector,pooler,supavisor`
— note `realtime` is *not* in the exclude list). `[realtime] enabled = true`
in `supabase/config.toml`.
