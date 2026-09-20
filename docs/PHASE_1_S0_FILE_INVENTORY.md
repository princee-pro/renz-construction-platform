# RENZ Phase 1 / S0 File Inventory

**Snapshot:** 30 August 2026, after S0 source reconciliation and primary governance/document corrections, before creation of this manifest and the closeout report
**Root:** `C:\Users\princ\source\repos\C-website`
**Count:** 35 files
**Hash:** SHA-256 over exact file bytes

This is the pre-closeout inventory used to review the Git staging set. It intentionally excludes itself and `PHASE_1_S0_REPORT.md` from the row table to avoid an impossible self-referential checksum. The report records this manifest's final SHA-256 after review; the report's own hash is intentionally external and can be computed with `Get-FileHash -Algorithm SHA256 docs/PHASE_1_S0_REPORT.md`.

Publication values below govern product/public use; they do not prevent normal private repository review.

| Path | Type | Bytes | Dimensions | SHA-256 | Provenance class | Publication status | Allowed use |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| `.gitattributes` | GITATTRIBUTES | 248 | — | `28f94a67d1648f926ddb6e83726c32bc161f495f3febee9d4e81c8b75ced1b69` | Phase 1 S0 governance | Repository control; not public-site content | Git text/binary handling |
| `.gitignore` | GITIGNORE | 946 | — | `dd14476c929a9102f8ca7468e7f30a3eb4d455050239d5fa91ff364460456ee0` | Phase 1 S0 governance | Repository control; not public-site content | Exclude secrets, local state, caches, and output |
| `AGENTS.md` | MD | 2,797 | — | `51fb6722136b7408c46d6c18fc95d322e870cd8bf56af180e468a743e1cc0c13` | Phase 1 S0 governance | Internal/repository guidance | Durable agent instructions |
| `DESIGN.md` | MD | 11,006 | — | `f2288f71bcd1914c99099f591fced8e43f5e9546729660bc8f81cd92216ddac2` | Phase 1 S0 reconstruction from surviving Phase 0 design specification/metadata, revalidated in S0 | Provisional internal design source | Future deterministic token/system input after gate review; no byte-identical original was recovered |
| `design/concepts/01-homepage-hero.png` | PNG | 1,971,230 | 1672×941 | `80a2527510a24a4ba8e815d382d641447fea5df0e8ea3a0f905b90c3cf0e5280` | Phase-0 generated concept | Internal concept only | Composition/art-direction reference; never project proof |
| `design/concepts/02-homepage-expertise.png` | PNG | 1,835,295 | 1536×1024 | `68972d29ffdd5d47401b47befcd7b5440a3508d40addba6a6a21af429ea7df8c` | Phase-0 generated concept | Internal concept only | Composition/art-direction reference; terminology unapproved |
| `design/concepts/03-homepage-selected-projects.png` | PNG | 1,793,013 | 1402×1122 | `22c07b7f19e2cdd0eab9221590f3d53f28175a4ed456624d30e82a4d96f20634` | Phase-0 generated concept | Internal concept only | Composition reference; not the missing AI board or RENZ proof |
| `design/concepts/04-homepage-process.png` | PNG | 1,653,335 | 1717×916 | `4be8dec2aefbaa4f06cc68105bf2f2cc67b312c88cf159e2a3edf856f138f208` | Phase-0 generated concept | Internal concept only | Process-composition reference; process facts unapproved |
| `design/concepts/05-homepage-quality-sustainability-cta.png` | PNG | 1,863,439 | 1536×1024 | `cd0da387c7d869048ca9a721920fa88a531788d8b67226da4805348f122b47cd` | Phase-0 generated concept | Internal concept only | Composition reference; claims must not be published |
| `design/concepts/06-project-detail.png` | PNG | 1,852,453 | 1536×1024 | `b93aa8685cac85a579e787612a80dc41d81633f09e6cd3f997c2aa46b4f14e39` | Phase-0 generated concept | Internal concept only | Case-study structure reference; never RENZ project proof |
| `design/concepts/07-start-a-project-wizard.png` | PNG | 1,363,613 | 1536×1024 | `8ba2c2809ddfed4486c2cc80cda5fa1acdc3eb9c482e5f52f117e91d88342b43` | Phase-0 generated concept | Internal concept only | Intake-flow discussion after privacy/operations gates |
| `design/concepts/08-admin-dashboard.png` | PNG | 1,058,903 | 1672×941 | `00c6fd354a538e2a311209a3754d23fb792801dde3496ac489e3e13764cd2754` | Phase-0 generated concept | Internal concept only | Admin-density discussion; not an approved operating model |
| `design/concepts/09-logo-exploration.png` | PNG | 1,609,712 | 1536×1024 | `a8c290a1cadc1122762aa967be578ff38af7f29d6ef47cdbefc610ebe6bae3ca` | Phase-0 generated concept | Internal identity exploration | Client choice discussion only; no production-logo use |
| `design/concepts/10-logo-structural-fold-refinement.png` | PNG | 1,302,455 | 1536×1024 | `0242814e4d1e035252b1428f56ad7571000ee22225bc5a3d2152aaa4f5908671` | Phase-0 generated concept | Internal identity exploration | Evolution option only; no silent substitution or production use |
| `docs/ADMIN_PRODUCT.md` | MD | 21,353 | — | `48037543feec9eb7244e8d195ce0ab829b5c301f5c7a8d087798fa84e9f6ae82` | Phase 0 planning artifact | Internal recommendation | Future admin planning after G3/G4 |
| `docs/CONTENT_MODEL.md` | MD | 23,655 | — | `390cd1da481d9c05bb05db25af05cc2d743d997aab60b4d97e26ad862cfae56e` | Phase 0 planning artifact + dated S0 update | Internal recommendation | Evidence-aware content planning after gates |
| `docs/DATABASE_ARCHITECTURE.md` | MD | 28,435 | — | `e85dc481d3d1aee61946034c7113758b9780825bb45b58a2d95c96692869ce81` | Phase 0 planning artifact | Internal recommendation | Future local data design after S1/G5; no migration authority |
| `docs/DESIGN_SYSTEM.md` | MD | 16,250 | — | `cf00f855538a01c669c5693d64d3e97c919e1d44b79f448a885e91ca45d46e97` | Phase 0 planning artifact + dated S0 update | Provisional internal design guidance | Future design implementation after identity/evidence gates |
| `docs/IMPLEMENTATION_ROADMAP.md` | MD | 47,227 | — | `0dd7af40dc84efb4fd9fdc234a8924dc9b87ae27752a6f32fbc99c93f7fae427` | Phase 0 roadmap + S0 authority/gate update | Internal delivery contract | Slice sequencing and acceptance boundaries |
| `docs/INFORMATION_ARCHITECTURE.md` | MD | 21,185 | — | `3c2e70922cba2db6b6209414de69acdfe68310a6ca32019d8d825c568c776846` | Phase 0 planning artifact + dated S0 update | Internal recommendation | Navigation/taxonomy planning; labels not public until confirmed |
| `docs/MOTION_SYSTEM.md` | MD | 12,546 | — | `ef3f38de4a1d013880d589207c4c39155c68a2366064cb5b546dbc5b6e207962` | Phase 0 planning artifact | Internal recommendation | Future measured motion contract |
| `docs/PHASE_0_VERIFICATION.md` | MD | 6,727 | — | `9e9097500a46b932998953878ffd825ed29d20c8577b86516d1f60460f69c587` | Phase 0 audit evidence + dated S0 revalidation note | Historical internal evidence | Preserve historical results; use S0 report for current state |
| `docs/PHASE_1_DECISION_REGISTER.md` | MD | 6,392 | — | `7b0c8b143b048edeb3efe7297ca9b2c9e636ef1556fe12b6918e7f4ad16b2e5e` | Phase 1 S0 governance | Internal decision record | Authoritative current gate/safe-omission control |
| `docs/PROJECT_BLUEPRINT.md` | MD | 20,428 | — | `78c2b5ade31d701b329bb52252e30bd2a54081932cd9c2bd32e072f24188d13b` | Phase 0 planning artifact + dated S0 update | Internal product recommendation | Product planning; no fact-publication authority |
| `docs/REPOSITORY_ASSESSMENT.md` | MD | 11,467 | — | `5fb611dbf367b4a21d220cfde1d4cf850d9c61ac657210f99ae1fe0a3c1971a1` | Phase 0 audit + dated S0 current disposition | Internal audit evidence | Repository history/readiness reference |
| `docs/SECURITY_MODEL.md` | MD | 34,127 | — | `098e6ca021b6d57016ef0e4a04c8f2ff224edab0ae206a91d4912cc99a74f466` | Phase 0 planning artifact | Internal security recommendation | Future controls after G3/G4/G5 approval |
| `docs/SEO_STRATEGY.md` | MD | 23,044 | — | `b586235f0a51c0f3d34b05a900f8eee6c2e137d5a2c18785e89a6900d99233f1` | Phase 0 planning artifact + dated S0 update | Internal recommendation | SEO/content planning; no claim or indexing authority |
| `docs/SOURCE_RECOVERY_AND_RECONCILIATION.md` | MD | 10,593 | — | `c6c6a4dbe918c00a4a64de260bb50c850710787b64311a90f431dbc691a26053` | Phase 1 S0 evidence/reconciliation | Internal evidence record | Source handling, brand decision, and service confirmation input |
| `docs/TECHNICAL_ARCHITECTURE.md` | MD | 25,005 | — | `788ebe2001eff03fd4533310dde9ec6ac049d05ecd0d151a4c39a6894eb8cd34` | Phase 0 planning artifact | Internal recommendation | Future technical implementation after slice entry |
| `docs/VISUAL_CONCEPTS.md` | MD | 11,500 | — | `b7aac3e2a2ce681f8a1cf3e27740b2c1ece94a04edf9f59cd7a4fcf1ef315da1` | Phase 0 concept manifest + dated S0 comparison | Internal evidence/creative manifest | Concept interpretation and handling only |
| `premium-audit.json` | JSON | 198 | — | `ce0b58692184e16f1e03369cc919ad4507f4f40e0c6e5af543d945a4c332e319` | Phase 0 machine-generated audit evidence, path- and line-ending-normalized in S0 | Internal historical evidence; no machine-specific path | Preserve semantic findings as historical static-audit evidence; not runtime validation. Original CRLF/absolute-path SHA-256: `41c0b2dcdf9eea120ee0b13aee34921ad1030c7ebbcb010afded46396322c92f` |
| `README.md` | MD | 3,175 | — | `885659fe0a5155bf941307923c3bc659d864f4c315a873b2089ef02ff4d592ce` | Phase 1 S0 governance | Repository documentation; not public-site content | Contributor/readiness orientation |
| `references/client/originals/01-renz-brand-board.png` | PNG | 37,405 | 190×181 | `fe6b0ae0e742ef012a0273f70f676ed838b8f50262fa4d530c941d47361ecdab` | `client-original/source` (payload is monogram; filename misleading) | Not public by default | Internal identity evidence; public/derivative use only after rights and approval |
| `references/client/originals/02-whatsapp-services.png` | PNG | 109,684 | 701×326 | `2ed026d1f5799ef51ba7a28850e7a7f6b9ab1d3fcc70a732b73416a79f3e14b8` | `client-original/source` | Not public by default | Internal wording evidence; public copy only after confirmation/capacity review |
| `UX-CONTRACT.md` | MD | 14,075 | — | `cf4e53fae775b13552451f69548678546c7af509bc888b5efd13c6ae27c2732a` | Phase 0 behavioral contract + S0 source revalidation | Internal product contract | Future behavior implementation after relevant gates |

## Absent expected source

The expected 1402×1122 client-supplied AI/reference board with SHA-256 `010f606a6b41bdfe0dcb2ea27e9f79681f2cb8537bae082697b1d0b3a58582c4` is not a repository file and is therefore not counted above. If recovered later, store it without mutation, classify it as `client-supplied AI/reference`, and never use it as verified business evidence.
