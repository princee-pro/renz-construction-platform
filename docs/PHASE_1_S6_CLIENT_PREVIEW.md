# RENZ Phase 1 / S6A Local Client Preview

**Status:** local-only, noindex/nofollow, non-production  
**Direct URL:** `http://127.0.0.1:3000`

## What the preview demonstrates

The preview demonstrates the Datum & Mass public system, responsive navigation, evidence-safe empty states, published-projection integration, and future editorial project composition. It does not assert that visual studies are RENZ projects or that empty company/contact/project facts have been approved.

The discreet preview indicator is rendered only when the server-only `RENZ_CLIENT_PREVIEW` flag parses as true. The value is not exposed through a `NEXT_PUBLIC_` variable and the indicator contains no debug or credential information.

## Production-style local run

Prerequisites:

- Docker-compatible engine running only if published local projection data is required;
- repository target Node `24.20.0` (local `24.18.1` is compatible for the current verification but is not the exact pinned target);
- Corepack pnpm `11.25.0`.

For the public experience with intentional empty states, no secret is required:

```powershell
corepack pnpm@11.25.0 install --frozen-lockfile
$env:RENZ_CLIENT_PREVIEW = "true"
corepack pnpm@11.25.0 build
corepack pnpm@11.25.0 start
```

Open `http://127.0.0.1:3000`. Stop the server with `Ctrl+C`; remove the shell variable afterward if desired:

```powershell
Remove-Item Env:RENZ_CLIENT_PREVIEW -ErrorAction SilentlyContinue
```

For local **published-projection** integration, start the local stack and use the deterministic S6A harness:

```powershell
corepack pnpm@11.25.0 db:start
corepack pnpm@11.25.0 s6a:verify
corepack pnpm@11.25.0 db:stop
```

The harness derives local endpoints/credentials privately from `supabase status` and performs two isolated production-browser phases. The first build proves all public routes, the intentional empty-project state, S5A publish/unpublish regression, navigation, keyboard/reduced-motion behavior, axe, and the screenshot/reflow matrix. After that server has stopped, the harness removes only Next's ignored generated data cache, rebuilds against a separately reset evidence-published synthetic project, and proves both its anonymous Projects index entry and server-rendered detail route. Each phase tears down its reserved MFA/content fixtures and the ignored local credential file. A final `finally` cleanup also removes the generated data cache on success or failure, preventing test-only publication state from appearing in a subsequent local preview. Do not paste local status output into documents, screenshots, issues, or chat.

## Preview-off behavior

Unset `RENZ_CLIENT_PREVIEW` or set it to a false value and restart the server. The indicator and geometric project study disappear. Public published data behavior and noindex/nofollow remain unchanged.

## Hard boundaries

- Do not deploy this preview.
- Do not enable indexing or submit a sitemap.
- Do not add real client facts outside the evidence/publication workflow.
- Do not use the concept boards as project evidence or production media.
- Do not add Contact or Start-a-Project submission; S7 owns intake.
- Do not create Vercel/Supabase cloud resources or expose local credentials.
