create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  object_path text not null,
  original_bucket_id text,
  original_object_path text,
  original_filename text,
  mime_type text not null,
  byte_size bigint not null,
  checksum_sha256 text not null,
  width integer,
  height integer,
  processing_status text,
  visibility text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint media_assets_bucket_check
    check (bucket_id = btrim(bucket_id) and bucket_id <> ''),
  constraint media_assets_object_path_check
    check (object_path = btrim(object_path) and object_path <> ''),
  constraint media_assets_original_pair_check
    check ((original_bucket_id is null) = (original_object_path is null)),
  constraint media_assets_original_bucket_check
    check (original_bucket_id is null or (original_bucket_id = btrim(original_bucket_id) and original_bucket_id <> '')),
  constraint media_assets_original_path_check
    check (original_object_path is null or (original_object_path = btrim(original_object_path) and original_object_path <> '')),
  constraint media_assets_filename_check
    check (original_filename is null or (original_filename = btrim(original_filename) and original_filename <> '')),
  constraint media_assets_mime_type_check
    check (mime_type = btrim(mime_type) and mime_type <> ''),
  constraint media_assets_byte_size_check check (byte_size > 0),
  constraint media_assets_checksum_check check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  constraint media_assets_width_check check (width is null or width > 0),
  constraint media_assets_height_check check (height is null or height > 0),
  constraint media_assets_processing_status_check
    check (processing_status is null or (processing_status = btrim(processing_status) and processing_status <> '')),
  constraint media_assets_visibility_check
    check (visibility is null or (visibility = btrim(visibility) and visibility <> '')),
  constraint media_assets_version_check check (version > 0),
  constraint media_assets_bucket_object_key unique (bucket_id, object_path)
);

create trigger media_assets_touch_mutable_row
before update on public.media_assets
for each row execute function private.touch_mutable_row();

comment on table public.media_assets is
  'Metadata only. A row does not prove that a Storage object exists or is publishable.';
