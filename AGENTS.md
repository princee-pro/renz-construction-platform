# RENZ agent instructions

These instructions apply to the entire repository.

## Read before editing

Read `docs/PHASE_1_S0_REPORT.md`, `docs/PHASE_1_DECISION_REGISTER.md`, `DESIGN.md`, `UX-CONTRACT.md`, the relevant domain contracts under `docs/`, and the current slice in `docs/IMPLEMENTATION_ROADMAP.md`. Verify the filesystem directly; do not rely on an old summary when a source file exists.

## Evidence and claims

- Never fabricate or infer business facts, qualifications, services, projects, locations, contacts, team members, statistics, testimonials, credentials, compliance, safety, quality, or sustainability claims.
- Treat `references/client/originals/` as byte-preserved evidence. Do not edit an original in place.
- Treat client-supplied AI references and `design/concepts/` as creative references only. They are not RENZ project evidence and may not seed production content.
- Record provenance, hash, rights/approval state, allowed use, and derivation before promoting an asset.
- Do not silently replace the client monogram with a generated logo.

## Gates and scope

- Respect G0–G6 and every slice dependency. A blocked decision means the capability is omitted, not implemented with a speculative default.
- Stay inside the user-authorized slice. Do not scaffold, install dependencies, create migrations/cloud resources, or start later-slice work unless that slice is explicitly assigned and its entry conditions are met.
- No direct production changes, deployments, destructive data operations, or provider/account creation without explicit approval.
- Preserve dated historical audit statements; append a dated correction or revalidation instead of rewriting history.

## Engineering quality

- Keep server/client boundaries intentional and minimize client JavaScript.
- Use the canonical tokens/components and one source of truth; do not create parallel styling, data, permission, or workflow systems.
- Design to WCAG 2.2 AA with keyboard, touch, reduced motion, 320px reflow, 200% zoom, forced-colors, locale, and poor-network behavior as acceptance criteria.
- Keep secrets out of source, URLs, logs, errors, fixtures, screenshots, and telemetry. Use synthetic data that cannot be mistaken for client facts.
- Before reporting, run applicable format, lint, strict type, test, build, security, link, design-token, and browser checks. State exact commands, results, and any inapplicable checks.
- Review `git diff --check`, staged content, secret-oriented scans, and asset provenance before a commit. Do not invent Git identity.

## Change discipline

Prefer small, coherent changes. Preserve unrelated user work. Update decisions and contracts in the same change when evidence alters behavior. Stop and report when required authority, evidence, or policy is missing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
