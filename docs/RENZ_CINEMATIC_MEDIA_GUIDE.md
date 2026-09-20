# RENZ Cinematic Media Guide

Direction, sizes and rules for the images and short videos that open the
public pages (D1.6 landing system). For the owner, a media producer, and
whoever operates a generative tool (Higgsfield or equivalent) when one is
connected.

## Provenance first

Every generated image or clip is a **Generated concept visual**. It is
uploaded as such in Website → Media (rights class "Generated concept
visual"), labelled on the page, and never described as completed RENZ work.
Real project photography enters as "RENZ provided" or "Licensed" and needs
the owner's rights confirmation. Nothing skips the Media library.

## Image direction

- Physically plausible architecture: concrete, stone, timber, glass, steel,
  warm plaster. Natural vegetation, highland / East African atmosphere.
- Editorial architectural photography, 35–50 mm feel, restrained grade, soft
  light (early morning, late afternoon, dusk). Subtle imperfections.
- No fake signage, no RENZ logos, no identifiable faces. If workers appear,
  they are distant, in correct PPE, in context, and never presented as RENZ staff.
- Reject: warped railings, impossible cantilevers, floating stairs, distorted
  windows, plastic textures, HDR halos, orange/teal grade, science-fiction
  buildings, duplicated people, strange hands, unreal construction sequences.

## Video direction

- Purpose: atmosphere behind the words, never information. Copy and buttons
  must stay readable (the landing draws its own wash over the media).
- Length 5–8 s, seamless loop, muted, no titles, no fast cuts, no zoom bursts.
  One slow camera move or one slow change of light.
- Poster first: every video has a still (the same frame, or a matching image)
  chosen as the **Hero image** on the page. The video is optional on top.

## Sizes and formats

| Asset | Format | Target |
| --- | --- | --- |
| Hero image / poster | WebP (or JPEG) | 2400 px on the long edge, ≤ 450 KB |
| Card / thumbnail | WebP | 1200 px, ≤ 150 KB |
| Desktop loop | WebM (VP8/VP9) — MP4 (H.264) fallback when an encoder is available | 1280×720 or 1920×1080, ≤ 3 MB, 24 fps |
| Mobile loop (optional) | same, 720×1280 or 960×540 | ≤ 1.5 MB |

Uploads: images up to 20 MB, videos up to 12 MB (`/api/admin/media`). Keep
file names descriptive: `home-land-to-landmark.webm`, `…-poster.webp`.

## How the site plays video (so you know what to expect)

- The poster paints first and is the page's largest image (LCP).
- The video element is only created after the page settles, and only if the
  visitor has **not** asked for reduced motion or reduced data and is not on
  a 2G-class connection. Phones keep the poster unless a mobile source exists.
- It loads when it is on screen, fades in when it can play, loops, and
  pauses when scrolled away or when the tab is hidden.
- Nothing preloads for other routes.

## Producing a loop without a generative tool

`node scripts/d16-render-loop.mjs <image.webp> <out.webm> [seconds] [w] [h]`
renders a "living still" (slow drift + light sweep + haze) from a concept
image with Chromium and encodes VP8/WebM with the ffmpeg bundled by
Playwright. This is how `public/media/renz/heroes/home-land-to-landmark.webm`
was made. It also writes a poster and a small JSON manifest.

## Attaching media to a page

Website → Pages → *page* → the opening section: **Hero image (also the
video poster)** and **Hero video (optional)**. The picker only lists videos
for the video field. Publish to make it live; Revision History keeps the
previous media. `node scripts/website-seed-content.mjs --heroes` does the
same for a fresh deployment from the files under `public/media/renz/heroes`.

## Prompt principles (for Higgsfield / equivalent)

- Say the place, the light, the material and the lens: "Hillside residence,
  board-marked concrete and timber screens, late afternoon, 35 mm, editorial
  architecture photograph, natural vegetation, soft haze, no people."
- Ask for a static or slow-moving camera. Forbid text, logos and signage.
- Generate stills first (round 1), pick, then animate the chosen stills
  (round 2). Only then produce the secondary routes (round 3).
- Review every result at full size against the rejection list before upload.

## Rejection checklist

Structure impossible? Signage or logo? Face recognisable? Texture plastic?
Grade extreme? Loop seam visible? Text hard to read over it? Any yes → reject.
