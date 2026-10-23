# Contributing to RENZ

This private project uses reviewable, bounded changes. Start with
[the handoff](docs/HANDOFF_START_HERE.md), [AGENTS.md](AGENTS.md), `DESIGN.md`,
`UX-CONTRACT.md`, the decision register and relevant domain contracts.

1. Create `codex/<short-description>` or a descriptive feature/fix branch
   from current `main`. Preserve unrelated local work and dated audit records.
2. Keep changes small. Use the pinned Node/pnpm and frozen lockfile. Do not
   upgrade frameworks, redesign stable modules or create cloud resources as
   incidental cleanup.
3. Run `pnpm verify`. For database/security/workflow changes run the appropriate
   isolated database and browser gates in the QA guide; resets destroy local
   fixtures. Record exact commands and failures, including unavailable checks.
4. Add forward, ordered SQL migrations. Never edit an applied migration,
   rely on dashboard-only schema changes or use destructive automatic down
   migrations. Keep grants, RLS negatives, optimistic concurrency, audit and
   generated types consistent. Inspect all SECURITY DEFINER boundaries.
5. Preserve CMS snapshots, section schemas, aliases, public/private separation
   and backwards compatibility. Test old content when modifying a renderer.
6. Record original/derivative hashes, provenance, allowed use and approval for
   assets. Originals remain immutable; concepts never become real project proof.
7. Before committing inspect staged paths/diffs, `git diff --check`,
   `git diff --cached --check`, secret scanning and file sizes. Never commit
   local Auth fixtures, backups, `.env.local`, `.local`, `.playwright` or logs.
8. Open a PR with behavior, scope, validation and remaining risks. Update
   decisions/contracts when behavior changes. Do not claim unavailable tests
   passed or activate production capabilities through a documentation change.

Security issues follow [SECURITY.md](SECURITY.md). Regressions should identify
the commit, command, synthetic reproduction, expected/actual behavior and
sanitized evidence. Never paste customer records or credentials into GitHub.

Code publication is separate from deployment, migration application, business
content approval and indexing. Each requires its own applicable authority.
