# Third-party notices and media provenance

Reviewed **29 October 2026** for the authorized RENZ source-code handover.
This document records third-party components and existing asset provenance. It
does not add an open-source licence to the RENZ application, identify an
unverified copyright holder, or assign copyright. `package.json` remains
`UNLICENSED`; public GitHub access and repository ownership are separate matters.

## Application dependencies

The following versions and licence identifiers were checked against the installed
packages corresponding to the committed manifest and lockfile. These packages
retain their upstream licences; they are not owned by RENZ merely because the
application uses them.

| Package                 | Version | Upstream licence |
| ----------------------- | ------- | ---------------- |
| `@supabase/ssr`         | 0.12.6  | MIT              |
| `@supabase/supabase-js` | 2.115.0 | MIT              |
| `motion`                | 13.2.0  | MIT              |
| `next`                  | 16.4.1  | MIT              |
| `pdfkit`                | 0.20.2  | MIT              |
| `react`, `react-dom`    | 19.2.8  | MIT              |
| `server-only`           | 0.0.1   | MIT              |
| `zod`                   | 4.6.6   | MIT              |

## Development dependencies

| Package                     | Version | Upstream licence                                    |
| --------------------------- | ------- | --------------------------------------------------- |
| `@axe-core/playwright`      | 4.13.0  | MPL-2.0                                             |
| `@eslint/js`                | 10.0.1  | MIT                                                 |
| `@google/design.md`         | 0.4.0   | Apache-2.0; checked in the package's `LICENSE` file |
| `@next/eslint-plugin-next`  | 16.4.1  | MIT                                                 |
| `@playwright/test`          | 1.63.0  | Apache-2.0                                          |
| `@tailwindcss/postcss`      | 4.3.3   | MIT                                                 |
| `@testing-library/dom`      | 10.4.1  | MIT                                                 |
| `@testing-library/react`    | 16.3.3  | MIT                                                 |
| `@types/node`               | 24.13.3 | MIT                                                 |
| `@types/pdfkit`             | 0.17.6  | MIT                                                 |
| `@types/react`              | 19.2.18 | MIT                                                 |
| `@types/react-dom`          | 19.2.5  | MIT                                                 |
| `eslint`                    | 10.10.0 | MIT                                                 |
| `eslint-plugin-react-hooks` | 7.1.1   | MIT                                                 |
| `globals`                   | 17.11.0 | MIT                                                 |
| `jsdom`                     | 30.0.1  | MIT                                                 |
| `postcss`                   | 8.5.26  | MIT                                                 |
| `prettier`                  | 3.9.6   | MIT                                                 |
| `sharp`                     | 0.35.5  | Apache-2.0                                          |
| `supabase`                  | 2.116.0 | MIT                                                 |
| `tailwindcss`               | 4.3.3   | MIT                                                 |
| `typescript`                | 6.0.3   | Apache-2.0                                          |
| `typescript-eslint`         | 8.68.0  | MIT                                                 |
| `vitest`                    | 4.1.12  | MIT                                                 |

The source archive does not bundle `node_modules`, browser runtimes, Supabase
executables or Sharp/libvips binaries. `pnpm install --frozen-lockfile` restores
the dependency graph and its package notices. Keep upstream copyright, licence
and applicable NOTICE files with any future redistribution of those packages or
binary builds. Transitive components and optional native binaries can carry
additional notices; this table is the direct-dependency inventory, not a complete
licence inventory for a future compiled distribution.

## Self-hosted fonts

The three committed fonts are distributed under **SIL Open Font License 1.1**.
Keep the full licence texts and notices with font copies:

- [Manrope OFL notice](src/fonts/manrope-OFL.txt): Copyright 2018 The Manrope
  Project Authors (`googlefonts/manrope`). The committed binary additionally
  embeds **Copyright 2019 The Manrope Project Authors
  (https://github.com/sharanda/manrope)**, version 4.504. Both attributions are
  retained here. Its 24,836 bytes exactly match the official
  [Google Fonts v19 Manrope WOFF2](https://fonts.gstatic.com/s/manrope/v19/xn7gYHE41ni1AdIRggexSg.woff2),
  SHA-256 `a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972`.
- [IBM Plex Mono OFL notice](src/fonts/ibmplexmono-OFL.txt): Copyright © 2017
  IBM Corp., with Reserved Font Name **Plex**. The regular and medium binaries
  identify version 2.3 and embed the IBM copyright and OFL 1.1 statement.
  The [font source record](src/fonts/LICENSES.md) identifies Google Fonts;
  [upstream IBM Plex](https://github.com/IBM/plex) maintains the family.

No font binary was modified for this handover. Future font modifications must
follow OFL conditions, including applicable Reserved Font Name requirements;
do not remove licence notices or sell a font by itself. The project licence
status does not replace the font licences. Font checksums are retained in the
[asset register](docs/ASSET_AND_LICENSE_REGISTER.md).

## Client identity and generated project media

The owner explicitly authorized public sharing of the website project on
29 October 2026. The supplied logos and their faithful derivatives remain client
identity material, with source hashes and preparation recorded in
[the orange identity record](docs/RENZ_ORANGE_BRAND.md) and the asset register.
This authorization is not a claim that a copyright assignment or trademark
registration has occurred. Historical client references are preserved as source
context, not promoted to completed-project evidence.

The media review found project-generated concept material and programmatic
diagrams, rather than a third-party stock-photograph collection:

- [Phase 0 boards](docs/VISUAL_CONCEPTS.md) record built-in OpenAI Image Gen,
  generated for this project's written brief. OpenAI's
  [Terms of Use, Content](https://openai.com/policies/terms-of-use/) describe
  users' rights in outputs as between the user and OpenAI; they do not guarantee
  exclusivity or transfer third-party rights.
- The [C2 media manifest](docs/RENZ_C2_MEDIA_MANIFEST.md) records the earlier
  seven images as owned, project-generated concept studies. It does not identify
  a separate stock-photo licensor.
- The [D1.7 record](docs/RENZ_D17_OWNER_PORTFOLIO_REPORT.md) and
  [generation manifest](public/media/renz-preview/projects/d17-generation-manifest.json)
  identify Higgsfield/Seedream 5.0 Lite outputs and original scripted diagrams.
  Higgsfield's [Terms of Use §4.4](https://higgsfield.ai/terms-of-use-agreement)
  permit commercial output use and transfer/sublicensing of output rights to
  clients. Its [official ownership guidance](https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially)
  states that commercial output use applies to all users, without a separate
  commercial licence purchase. The documented free-credit generation does not
  itself prevent this client source handover.
- The concept video and its poster derive from the Ridge Residence concept
  image through the committed rendering script, as recorded in the
  [hero contact sheet](docs/RENZ_HERO_MEDIA_CONTACT_SHEET.md).

Retain **Generated concept visual / not RENZ project evidence** labels. These
images do not establish real commissions, buildings, clients or photographs.
Do not use provider names to imply endorsement. The focused review identified
no third-party stock asset requiring removal; no image, logo, video or font
bytes were removed or replaced for this handover. Public access does not grant
an unrestricted licence to reuse client identity or third-party components.

## Files outside the source archive

Production credentials, real customer records, private database backups,
authenticator/session material and private Supabase Storage bytes are not
third-party source assets and must remain outside Git. See the
[client download guide](docs/RENZ_CLIENT_DOWNLOAD_AND_OWNERSHIP_GUIDE.md) for the
source/operational-backup distinction.
