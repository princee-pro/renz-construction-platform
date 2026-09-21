-- R1 (owner decisions, 2026-09-21) — official slogan.
--
-- "Brick by Brick." is the company slogan; "From land to landmark." stays a
-- homepage / campaign headline (owner-editable page copy). The slogan lives
-- in the one owner-editable place it already had — Settings → Business
-- (business_profile.tagline, published with the public configuration) —
-- and the site reads it from the published identity; nothing hard-codes
-- it. This seeds the approved value once; the owner may change it.

update public.business_profile
   set tagline = 'Brick by Brick.',
       version = version + 1
 where id = 1
   and (tagline is null or btrim(tagline) = '' or tagline in ('From land to landmark', 'From land to landmark.'));

comment on column public.business_profile.tagline is
  'Official slogan (owner-editable, Settings → Business → Slogan). Shown in the brand opener and the footer through the published public configuration.';
