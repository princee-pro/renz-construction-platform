# RENZ Source Recovery and Reconciliation

**Status:** Phase 1 / S0 evidence record
**Reviewed:** 30 August 2026
**Scope:** Client visual/service sources, Phase 0 concepts, brand disposition, and service wording

## 1. Provenance classes and handling

| Class | Meaning | Publication status | Allowed use |
| --- | --- | --- | --- |
| `client-original/source` | Byte-preserved material supplied by the client/user or recovered from its known source location | Not public by default | Internal evidence and reconciliation; public use only after rights and exact use are approved |
| `client-supplied AI/reference` | AI-generated creative/reference material supplied by the client/user | Not business evidence; not public by default | Mood, composition, and discussion only; no facts, contacts, projects, statistics, or identity approval may be derived from it |
| `Phase-0 generated concept` | Internal design exploration generated during Phase 0 | Internal concept only | Composition, interaction, and identity-option discussion; never RENZ project proof or production identity |
| `future approved derivative` | A changed asset derived from an identified approved source | Pending until individually approved | Named uses only, with source link, change log, owner, rights, and approval |
| `future production asset` | Rights-cleared, reviewed asset prepared for release | Public/operational only after publish gate | Only the approved channels, crops, locales, and lifecycle recorded for the asset |

Client originals are immutable. A filename is not proof of the payload's identity; hash, dimensions, visual inspection, and provenance control the classification.

## 2. Recovery result

| Actual repository path | Payload | Type | Bytes | Dimensions | SHA-256 | Provenance | Publication / allowed use |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| `references/client/originals/01-renz-brand-board.png` | RENZ monogram raster; the historical filename is misleading | PNG | 37,405 | 190×181 | `fe6b0ae0e742ef012a0273f70f676ed838b8f50262fa4d530c941d47361ecdab` | `client-original/source`; byte-identical source at `C:\Users\princ\OneDrive\Pictures\Screenshots 1\Screenshot 2026-08-27 160559.png` | Internal identity evidence only; no production-logo use until rights, reconstruction, testing, and approval pass |
| `references/client/originals/02-whatsapp-services.png` | WhatsApp screenshot listing seven service phrases | PNG | 109,684 | 701×326 | `2ed026d1f5799ef51ba7a28850e7a7f6b9ab1d3fcc70a732b73416a79f3e14b8` | `client-original/source`; byte-identical source at `C:\Users\princ\OneDrive\Pictures\Screenshots 1\Screenshot 2026-08-25 234300.png` | Internal wording evidence; publication requires client confirmation and regulated-capacity review |
| Expected `references/client/renz-ai-brand-board-reference.png` | Client-supplied AI brand/reference board | PNG expected | Not recovered | 1402×1122 expected | `010f606a6b41bdfe0dcb2ea27e9f79681f2cb8537bae082697b1d0b3a58582c4` expected | `client-supplied AI/reference`; **absent** after exact-hash and dimension search | Creative reference only if recovered; never business evidence |

The two present repository files already match their source bytes, so they were not duplicated or renamed. The third expected hash was not found in the repository, Downloads, Codex attachments, the Windows-known-folder Desktop, or 857 PNG files under the Windows-known-folder Pictures location. `design/concepts/03-homepage-selected-projects.png` also measures 1402×1122 but has a different hash and is not the missing board.

## 3. Brand comparison

### Recognizable equity to preserve

The authenticated monogram combines a dominant uppercase `R`, deep navy and gold, a tall vertical structural mass, a navy upper bowl/fold, and a gold roof/load-path gesture. Grey tower elements and a small house/window cue make the construction/building association literal. The `R`, navy/gold relationship, vertical mass, and architectural diagonal are the strongest transferable equity.

### Current raster limitations

- At only 190×181 pixels with a white baked background, it is not a vector master or a reliable production source.
- Four-color construction, narrow counters, the tiny window, and central joins collapse at small sizes.
- The grey twin-tower, roof, and window make the mark literal and residential/real-estate leaning.
- Stroke, mass, curve, and junction logic are inconsistent, reducing reproduction quality.
- No wordmark/lockup family, clear space, minimum size, exact color standard, monochrome/reverse artwork, font/license record, ownership record, or usage rules were supplied.

### Phase 0 contribution

`design/concepts/09-logo-exploration.png` explores three directions; it is divergence, not validation. `design/concepts/10-logo-structural-fold-refinement.png` is the clearest flat hypothesis. Across the Phase 0 system, flat geometry, color economy, lockup thinking, reproduction intent, and the relationship between identity and `Datum & Mass` improve substantially. The boards nevertheless remain raster presentations; their small-size, one-color, stencil, embroidery, helmet, print, and signage depictions are not physical or production tests, and the wordmark typography is unapproved.

The ten boards form a coherent navy/white/gold editorial direction, but their logo and wordmark treatment changes across screens. Static desktop boards also do not prove 320px reflow, 200% zoom, focus, contrast, touch, or reduced-motion behavior.

### Disposition of Structural Fold R

The Structural Fold R is a plausible **evolution option**, not a safe automatic refinement. It retains the `R`, vertical mass, navy upper form, and gold diagonal, but removes the source mark's curved bowl, grey twin tower, roof apex/house, and window—much of the original gestalt. It is therefore too substantial for silent substitution.

Present three client choices before production identity work: retain and technically refine the source mark; develop a closer hybrid; or adopt a more substantial Structural Fold R evolution. `Datum & Mass` may remain the provisional product/editorial system independently because it is compatible with the source navy/gold architectural equity.

### Final-identity blockers

1. recover the AI reference board while keeping it non-evidentiary, or obtain written confirmation that it is omitted from the creative record;
2. obtain a vector master or approve a faithful vector reconstruction from the raster;
3. establish ownership, usage rights, and appropriate trademark/distinctiveness review;
4. select and approve symbol, horizontal, stacked, and company-name lockups;
5. approve exact colors, wordmark typeface, font files, and licenses;
6. define clear space, minimum sizes, exclusions, and background behavior;
7. complete real monochrome, reverse, 16/24/32px, stencil, vinyl, print, embroidery, helmet, vehicle, and signage tests;
8. make optical corrections from those tests and obtain written client approval.

No generated mark may replace the client mark before these blockers are resolved.

## 4. Service-source reconciliation

The WhatsApp screenshot directly supports seven general phrases: `consulting`, `house plan`, `land survey`, `interior design`, `structure design`, `construction`, and `costing`. It does not establish licenses, qualifications, delivery model, scope, geographic coverage, proof, or final marketing wording.

| Source wording | Proposed canonical wording | Lifecycle group | Regulated / qualification risk | Client confirmation required | Proposed public status |
| --- | --- | --- | --- | --- | --- |
| `consulting` | Construction Consultancy | Cost & Manage | Medium–high: responsibility, advice scope, and accountable professional are undefined | Yes | `draft` |
| `house plan` | House Plans; add “Architecture &” only after delivery capacity is verified | Plan & Design | High: architecture terminology and responsible/licensed delivery may be regulated | Yes | `blocked` |
| `land survey` | Land Surveying | Plan & Design | High: responsible surveyor, instruments, outputs, and service area are unverified | Yes | `blocked` |
| `interior design` | Interior Design; add “& Fit-Out” only if delivery is confirmed | Plan & Design | Medium: fit-out delivery and exclusions are unsupported | Yes | `publishable after confirmation` for “Interior Design” only |
| `structure design` | Structural Design | Plan & Design | High: professional engineering responsibility and sign-off are unverified | Yes | `blocked` |
| `construction` | Building Construction | Build & Improve | Medium–high: contractor capacity, licensing, project types, geography, and proof are unverified | Yes | `publishable after confirmation` |
| `costing` | Cost Planning & Estimation | Cost & Manage | Medium–high: scope and accountable professional are undefined; do not imply Quantity Surveying | Yes | `draft` |
| No direct source term | Project Management & Supervision | Cost & Manage | High: supervision duty, authority, and accountability are unsupported | Yes; evidence required | `blocked` |
| No direct source term | Renovation & Remodeling | Build & Improve | Medium: capability, scope, and proof are unsupported | Yes; evidence required | `blocked` |
| No direct source term | Civil Works & Infrastructure | Build & Improve | High: capability, licensing, project class, and proof are unsupported | Yes; evidence required | `blocked` |

Until confirmation, avoid `Structural Engineering`, `Quantity Surveying`, or other wording that implies a qualification or regulated professional capacity. The Phase 0 ten-item taxonomy remains an information-architecture proposal, not publishable proof.

## 5. External inspiration boundary

The two client-referenced sites were inspected as inspiration on 30 August 2026. MES suggests categories of trust information that construction buyers may look for; Interior Space Design demonstrates an editorial, image-led service presentation. No code, layout, text, branding, images, distinctive expression, business fact, number, or claim from either source is adopted here. RENZ may publish analogous categories only from its own verified evidence.

## 6. Next evidence request

Ask the client for the missing AI reference file, original/vector identity package, font and rights records, written identity disposition, approved service wording and delivery model, legal/public name, verified contacts/service area, and rights-cleared project/proof material. Record each item in the decision register before public implementation.
