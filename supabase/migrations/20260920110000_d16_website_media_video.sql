-- D1.6 — Website media: admit short video loops (blocker fix, function only).
--
-- Justification (functional freeze, docs/RENZ_FUNCTIONAL_FREEZE.md): the
-- client-directed D1.6 landing system attaches an optional muted hero loop
-- to a page opening through the Owner CMS. The S4 media contract already
-- admits `video/mp4` and `video/webm` with media_kind = 'video'
-- (20260905162000), but the CR1 publication gate for website media was
-- written image-only, so a rights-cleared video asset blocked
-- publish_website_page with "media_not_ready". This restates the gate to
-- admit the two video MIME types under exactly the same rights, storage,
-- provenance, reviewer and consent conditions. No table, policy, grant or
-- permission changes; evidence media on real projects keeps the stricter
-- private.public_media_is_current rule untouched.

create or replace function private.website_media_is_current(target_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.media_assets as asset
    where asset.id = target_id
      and asset.bucket_id = 'editorial-derivatives'
      and asset.storage_state in ('ready_private', 'promotion_pending', 'public_eligible')
      and asset.provenance_class <> 'synthetic_test'
      and asset.mime_type in (
        'image/jpeg', 'image/png', 'image/webp', 'image/avif',
        'video/mp4', 'video/webm'
      )
      and asset.rights_status = 'cleared'
      and asset.public_use_permission = 'granted'
      and asset.rights_reviewer_id is not null
      and asset.rights_verified_at is not null
      and (asset.rights_review_due_at is null or asset.rights_review_due_at >= now())
      and (not asset.consent_required or asset.consent_state = 'granted')
  );
$$;
