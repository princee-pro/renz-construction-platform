# RENZ S9A-P Provisional Brand Mark

**Status date:** 8 September 2026  
**Classification:** preview-only derivative; **not an approved identity master**  
**Gate:** G1 remains **PARTIAL**

## Source and integrity

| Property | Record |
| --- | --- |
| Preserved source | `references/client/originals/01-renz-brand-board.png` |
| Actual payload | Client-supplied 190 × 181 raster monogram despite the historical filename |
| Bytes | 37,405 |
| SHA-256 | `FE6B0AE0E742EF012A0273F70F676ED838B8F50262FA4D530C941D47361ECDAB` |
| Mutation | None; the source remains byte-preserved |
| Rights/approval | Not established for production use |
| Missing | Authoritative vector master, construction grid, clear-space/minimum-size rules, wordmark master, color specification, ownership/rights record, and written brand-owner approval |

S9A-P does not silently replace the client monogram. `ProvisionalRenzMark` is a careful, code-native approximation used only inside the server-gated, noindex client preview. Its geometry preserves the recognizable navy R, grey twin mass, gold roof/diagonal/datum, and four-window cues without claiming to be a faithful vector recovery.

## Derivative construction

The derivative is implemented as one semantic SVG component in `src/components/site/provisional-renz-mark.tsx`. It contains no remote asset, embedded bitmap, external font, or runtime drawing library. The source raster was inspected visually and hashed before work; it was never traced into or written over the original file.

The derivative deliberately simplifies at small scale:

- full, horizontal, reversed, and one-color versions retain the window register;
- compact and micro versions remove the four small windows before they become visual noise;
- the micro version also consolidates the left mass;
- horizontal and reversed variants add a text lockup using the existing system-font preview stack;
- one-color inherits the surrounding foreground color so forced-colors and simple production tests remain possible.

## Variant register

| Variant | Intended preview use | Detail posture |
| --- | --- | --- |
| `full` | Opener and larger identity moments | Complete provisional symbol |
| `compact` | Public header | Windows removed |
| `micro` | Favicon-scale and constrained UI evaluation | Windows removed; left mass consolidated |
| `horizontal` | Light-background horizontal lockup evaluation | Full symbol plus RENZ wordmark |
| `reversed` | Menu and footer on navy | Light R/wordmark; gold datum retained |
| `one-color` | Forced-color, print, and single-ink evaluation | Every mark element inherits one color |

## Size and context verification

The component contract admits 16, 24, 32, 40, 48, 64, and 96 pixel symbol sizes. Component tests render every required S9A-P variant at 16, 24, 32, 40, and 48 pixels—30 combinations—and verify that compact/micro windows are absent. Browser review covers the 40-pixel compact header at desktop and mobile, the reversed 40-pixel menu use, the reversed 64-pixel footer use, and the 96-pixel opener use.

These checks establish preview legibility only. They do not establish production minimum size, trademark distinctiveness, embroidery/signage suitability, color tolerances, print trapping, or a production favicon package.

## Approval and rollback boundary

`RENZ_CLIENT_PREVIEW=false` removes every runtime instance of the derivative from the public experience. The ordinary non-preview identity remains unchanged. Production promotion requires all of the following:

1. brand-owner confirmation that the source may be evolved;
2. an authoritative vector or an explicitly commissioned redraw;
3. written selection of symbol and lockups;
4. rights and ownership records;
5. approved palette and typography licenses;
6. minimum-size, clear-space, contrast, monochrome, reversed, print, helmet, vehicle, signage, and favicon tests;
7. removal of the `provisional` classification only after approval.

Until then, this derivative is a reversible client-review instrument and G1 cannot pass.
