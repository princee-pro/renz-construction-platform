-- S4 senior-review correction: storage identity and admitted MIME/kind rules
-- apply to every provenance class. Synthetic fixtures are not a reason to
-- weaken metadata invariants; they must use the same safe shape as real rows.

create or replace function private.validate_media_asset_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.object_path !~ (
    '^' || new.id::text || '/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  ) then
    raise check_violation using message = 'media object path must be immutable, UUID-rooted, and traversal-free';
  end if;

  if new.mime_type not in (
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm'
  ) then
    raise check_violation using message = 'editorial media MIME type is not admitted';
  end if;

  if (new.media_kind = 'image' and new.mime_type not like 'image/%')
     or (new.media_kind = 'video' and new.mime_type not like 'video/%') then
    raise check_violation using message = 'media kind must match the admitted MIME family';
  end if;

  if new.provenance_class in ('concept_demo', 'generated_reference', 'synthetic_test')
     and new.storage_state = 'public_eligible' then
    raise check_violation using message = 'concept, generated, and synthetic media cannot be public evidence';
  end if;

  if new.storage_state = 'public_eligible'
     and (
       new.bucket_id <> 'editorial-derivatives'
       or new.rights_status <> 'cleared'
       or new.public_use_permission <> 'granted'
       or new.rights_reviewer_id is null
       or new.rights_verified_at is null
       or (new.rights_review_due_at is not null and new.rights_review_due_at < now())
       or (new.consent_required and new.consent_state <> 'granted')
     ) then
    raise check_violation using message = 'public media requires current rights, consent, and a derivative';
  end if;

  if new.credit is not null and not private.safe_public_text(new.credit) then
    raise check_violation using message = 'media credit must be plain safe text';
  end if;

  return new;
end;
$$;

comment on function private.validate_media_asset_trigger() is
  'S4 owner-evaluated media guard: UUID-rooted path, admitted MIME/kind, provenance, rights, consent, derivative, and safe credit are mandatory.';
