-- RENZ Phase 1 / S4: private Storage RLS boundaries.
--
-- Bucket creation, configuration, upload, copy, move, download, and removal
-- are performed through the supported Storage API. This migration only adds
-- row-level access policy to the provider-managed objects relation. It does
-- not insert, update, or delete rows in storage.objects.

do $$
begin
  if to_regclass('storage.objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'S4 requires the local Supabase Storage API to be enabled before migrations run';
  end if;
end;
$$;

-- Supabase's Storage service owns this provider-managed relation and enables
-- row security before the project migrations run. We deliberately do not try
-- to change ownership or toggle that flag here; this migration only adds the
-- project policies below.
drop policy if exists s4_editorial_objects_select on storage.objects;
drop policy if exists s4_editorial_objects_insert on storage.objects;
drop policy if exists s4_editorial_objects_update on storage.objects;
drop policy if exists s4_editorial_objects_delete on storage.objects;

create policy s4_editorial_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id in ('editorial-originals', 'editorial-derivatives')
  and private.has_permission('media.read')
);

create policy s4_editorial_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('editorial-originals', 'editorial-derivatives')
  and private.has_permission('media.upload')
  and name !~ '(^|/)(\\.\\.?)(/|$)'
  and name !~ '[\\\\]'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
);

create policy s4_editorial_objects_update
on storage.objects
for update
to authenticated
using (
  bucket_id in ('editorial-originals', 'editorial-derivatives')
  and private.has_permission('media.manage')
)
with check (
  bucket_id in ('editorial-originals', 'editorial-derivatives')
  and private.has_permission('media.manage')
  and name !~ '(^|/)(\\.\\.?)(/|$)'
  and name !~ '[\\\\]'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
);

create policy s4_editorial_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('editorial-originals', 'editorial-derivatives')
  and private.has_permission('media.manage')
);

comment on policy s4_editorial_objects_select on storage.objects is
  'S4 keeps editorial buckets private and grants object reads only to active AAL2 staff with media.read.';
comment on policy s4_editorial_objects_insert on storage.objects is
  'S4 accepts only controlled editorial bucket paths rooted at a UUID media asset id.';
