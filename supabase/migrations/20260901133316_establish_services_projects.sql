create table public.services (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  sort_order integer not null default 0,
  featured boolean not null default false,
  hero_asset_id uuid references public.media_assets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint services_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint services_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint services_sort_order_check check (sort_order >= 0),
  constraint services_version_check check (version > 0)
);

create table public.service_localizations (
  service_id uuid not null references public.services (id) on delete cascade,
  locale text not null,
  slug text not null,
  name text not null,
  summary text,
  body_blocks jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (service_id, locale),
  constraint service_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint service_localizations_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint service_localizations_name_check
    check (name = btrim(name) and name <> ''),
  constraint service_localizations_summary_check
    check (summary is null or (summary = btrim(summary) and summary <> '')),
  constraint service_localizations_blocks_check
    check (jsonb_typeof(body_blocks) = 'array'),
  constraint service_localizations_schema_version_check check (schema_version > 0),
  constraint service_localizations_version_check check (version > 0),
  constraint service_localizations_locale_slug_key unique (locale, slug)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  public_location text,
  project_type text,
  start_year smallint,
  completion_year smallint,
  delivery_status text,
  sort_order integer not null default 0,
  featured boolean not null default false,
  hero_asset_id uuid references public.media_assets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint projects_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint projects_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint projects_location_check
    check (public_location is null or (public_location = btrim(public_location) and public_location <> '')),
  constraint projects_type_check
    check (project_type is null or (project_type = btrim(project_type) and project_type <> '')),
  constraint projects_start_year_check check (start_year is null or start_year between 1800 and 2500),
  constraint projects_completion_year_check
    check (completion_year is null or completion_year between 1800 and 2500),
  constraint projects_year_order_check
    check (start_year is null or completion_year is null or completion_year >= start_year),
  constraint projects_delivery_status_check
    check (delivery_status is null or (delivery_status = btrim(delivery_status) and delivery_status <> '')),
  constraint projects_sort_order_check check (sort_order >= 0),
  constraint projects_version_check check (version > 0)
);

create table public.project_localizations (
  project_id uuid not null references public.projects (id) on delete cascade,
  locale text not null,
  slug text not null,
  title text not null,
  summary text,
  challenge text,
  approach text,
  solution text,
  outcomes text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (project_id, locale),
  constraint project_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint project_localizations_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint project_localizations_title_check
    check (title = btrim(title) and title <> ''),
  constraint project_localizations_summary_check
    check (summary is null or (summary = btrim(summary) and summary <> '')),
  constraint project_localizations_version_check check (version > 0),
  constraint project_localizations_locale_slug_key unique (locale, slug)
);

create table public.project_categories (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint project_categories_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint project_categories_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint project_categories_sort_order_check check (sort_order >= 0),
  constraint project_categories_version_check check (version > 0)
);

create table public.project_category_localizations (
  category_id uuid not null references public.project_categories (id) on delete cascade,
  locale text not null,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (category_id, locale),
  constraint project_category_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint project_category_localizations_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint project_category_localizations_name_check
    check (name = btrim(name) and name <> ''),
  constraint project_category_localizations_version_check check (version > 0),
  constraint project_category_localizations_locale_slug_key unique (locale, slug)
);

create table public.project_category_assignments (
  project_id uuid not null references public.projects (id) on delete cascade,
  category_id uuid not null references public.project_categories (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (project_id, category_id),
  constraint project_category_assignments_sort_order_check check (sort_order >= 0)
);

create table public.project_services (
  project_id uuid not null references public.projects (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  sort_order integer not null default 0,
  scope_label text,
  primary key (project_id, service_id),
  constraint project_services_sort_order_check check (sort_order >= 0),
  constraint project_services_scope_label_check
    check (scope_label is null or (scope_label = btrim(scope_label) and scope_label <> ''))
);

create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  stage_date date,
  stage_status text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint project_stages_title_check check (title = btrim(title) and title <> ''),
  constraint project_stages_description_check
    check (description is null or (description = btrim(description) and description <> '')),
  constraint project_stages_status_check
    check (stage_status is null or (stage_status = btrim(stage_status) and stage_status <> '')),
  constraint project_stages_sort_order_check check (sort_order >= 0),
  constraint project_stages_version_check check (version > 0),
  constraint project_stages_id_project_key unique (id, project_id)
);

create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  stage_id uuid,
  role text not null,
  phase text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint project_media_stage_fk
    foreign key (stage_id, project_id)
    references public.project_stages (id, project_id)
    on delete restrict,
  constraint project_media_role_check check (role = btrim(role) and role <> ''),
  constraint project_media_phase_check
    check (phase is null or (phase = btrim(phase) and phase <> '')),
  constraint project_media_sort_order_check check (sort_order >= 0),
  constraint project_media_version_check check (version > 0)
);

create table public.project_media_localizations (
  project_media_id uuid not null references public.project_media (id) on delete cascade,
  locale text not null,
  alt_text text,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (project_media_id, locale),
  constraint project_media_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint project_media_localizations_alt_text_check
    check (alt_text is null or alt_text = btrim(alt_text)),
  constraint project_media_localizations_caption_check
    check (caption is null or (caption = btrim(caption) and caption <> '')),
  constraint project_media_localizations_version_check check (version > 0)
);

create trigger services_touch_mutable_row before update on public.services
for each row execute function private.touch_mutable_row();
create trigger service_localizations_touch_mutable_row before update on public.service_localizations
for each row execute function private.touch_mutable_row();
create trigger projects_touch_mutable_row before update on public.projects
for each row execute function private.touch_mutable_row();
create trigger project_localizations_touch_mutable_row before update on public.project_localizations
for each row execute function private.touch_mutable_row();
create trigger project_categories_touch_mutable_row before update on public.project_categories
for each row execute function private.touch_mutable_row();
create trigger project_category_localizations_touch_mutable_row before update on public.project_category_localizations
for each row execute function private.touch_mutable_row();
create trigger project_stages_touch_mutable_row before update on public.project_stages
for each row execute function private.touch_mutable_row();
create trigger project_media_touch_mutable_row before update on public.project_media
for each row execute function private.touch_mutable_row();
create trigger project_media_localizations_touch_mutable_row before update on public.project_media_localizations
for each row execute function private.touch_mutable_row();
