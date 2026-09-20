create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  template_key text not null,
  publication_status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint site_pages_page_key_not_blank check (page_key = btrim(page_key) and page_key <> ''),
  constraint site_pages_template_key_not_blank check (
    template_key = btrim(template_key) and template_key <> ''
  ),
  constraint site_pages_publication_status_valid check (
    publication_status in ('draft', 'published', 'archived')
  ),
  constraint site_pages_published_at_required check (
    publication_status <> 'published' or published_at is not null
  ),
  constraint site_pages_version_positive check (version > 0),
  constraint site_pages_page_key_unique unique (page_key)
);

create table public.page_localizations (
  page_id uuid not null references public.site_pages (id) on delete cascade,
  locale text not null,
  path text not null,
  title text not null,
  summary text,
  body_blocks jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  seo_title text,
  seo_description text,
  canonical_override text,
  social_image_id uuid references public.media_assets (id) on delete restrict,
  noindex boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (page_id, locale),
  constraint page_localizations_locale_bounded check (
    locale = btrim(locale) and char_length(locale) between 2 and 35
  ),
  constraint page_localizations_path_not_blank check (path = btrim(path) and path <> ''),
  constraint page_localizations_title_not_blank check (title = btrim(title) and title <> ''),
  constraint page_localizations_body_blocks_array check (jsonb_typeof(body_blocks) = 'array'),
  constraint page_localizations_schema_version_positive check (schema_version > 0),
  constraint page_localizations_version_positive check (version > 0),
  constraint page_localizations_locale_path_unique unique (locale, path)
);

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.site_pages (id) on delete cascade,
  section_type text not null,
  schema_version integer not null default 1,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint page_sections_section_type_not_blank check (
    section_type = btrim(section_type) and section_type <> ''
  ),
  constraint page_sections_schema_version_positive check (schema_version > 0),
  constraint page_sections_config_object check (jsonb_typeof(config) = 'object'),
  constraint page_sections_sort_order_nonnegative check (sort_order >= 0),
  constraint page_sections_version_positive check (version > 0),
  constraint page_sections_page_order_unique unique (page_id, sort_order)
);

create table public.page_section_projects (
  section_id uuid not null references public.page_sections (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (section_id, project_id),
  constraint page_section_projects_sort_order_nonnegative check (sort_order >= 0),
  constraint page_section_projects_section_order_unique unique (section_id, sort_order)
);

create table public.page_section_services (
  section_id uuid not null references public.page_sections (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (section_id, service_id),
  constraint page_section_services_sort_order_nonnegative check (sort_order >= 0),
  constraint page_section_services_section_order_unique unique (section_id, sort_order)
);

create table public.page_section_media (
  section_id uuid not null references public.page_sections (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  role text,
  sort_order integer not null default 0,
  primary key (section_id, media_asset_id),
  constraint page_section_media_role_not_blank check (
    role is null or (role = btrim(role) and role <> '')
  ),
  constraint page_section_media_sort_order_nonnegative check (sort_order >= 0),
  constraint page_section_media_section_order_unique unique (section_id, sort_order)
);

create table public.navigation_menus (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint navigation_menus_key_not_blank check (key = btrim(key) and key <> ''),
  constraint navigation_menus_version_positive check (version > 0),
  constraint navigation_menus_key_unique unique (key)
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.navigation_menus (id) on delete restrict,
  parent_id uuid,
  sort_order integer not null default 0,
  link_type text not null,
  internal_path text,
  external_url text,
  visibility text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint navigation_items_id_menu_unique unique (id, menu_id),
  constraint navigation_items_parent_same_menu foreign key (parent_id, menu_id)
    references public.navigation_items (id, menu_id) on delete restrict,
  constraint navigation_items_not_self_parent check (parent_id is null or parent_id <> id),
  constraint navigation_items_sort_order_nonnegative check (sort_order >= 0),
  constraint navigation_items_link_type_valid check (link_type in ('internal', 'external')),
  constraint navigation_items_link_target_valid check (
    (
      link_type = 'internal'
      and internal_path is not null
      and internal_path = btrim(internal_path)
      and internal_path <> ''
      and external_url is null
    )
    or
    (
      link_type = 'external'
      and external_url is not null
      and external_url = btrim(external_url)
      and external_url <> ''
      and internal_path is null
    )
  ),
  constraint navigation_items_visibility_not_blank check (
    visibility is null or (visibility = btrim(visibility) and visibility <> '')
  ),
  constraint navigation_items_version_positive check (version > 0)
);

create table public.navigation_item_localizations (
  navigation_item_id uuid not null references public.navigation_items (id) on delete cascade,
  locale text not null,
  label text not null,
  accessibility_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (navigation_item_id, locale),
  constraint navigation_item_localizations_locale_bounded check (
    locale = btrim(locale) and char_length(locale) between 2 and 35
  ),
  constraint navigation_item_localizations_label_not_blank check (
    label = btrim(label) and label <> ''
  ),
  constraint navigation_item_localizations_accessibility_text_not_blank check (
    accessibility_text is null
    or (accessibility_text = btrim(accessibility_text) and accessibility_text <> '')
  ),
  constraint navigation_item_localizations_version_positive check (version > 0)
);

create table public.public_site_settings (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  key text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint public_site_settings_namespace_not_blank check (
    namespace = btrim(namespace) and namespace <> ''
  ),
  constraint public_site_settings_key_not_blank check (key = btrim(key) and key <> ''),
  constraint public_site_settings_version_positive check (version > 0),
  constraint public_site_settings_namespace_key_unique unique (namespace, key)
);

create trigger site_pages_touch_mutable_row
before update on public.site_pages
for each row execute function private.touch_mutable_row();

create trigger page_localizations_touch_mutable_row
before update on public.page_localizations
for each row execute function private.touch_mutable_row();

create trigger page_sections_touch_mutable_row
before update on public.page_sections
for each row execute function private.touch_mutable_row();

create trigger navigation_menus_touch_mutable_row
before update on public.navigation_menus
for each row execute function private.touch_mutable_row();

create trigger navigation_items_touch_mutable_row
before update on public.navigation_items
for each row execute function private.touch_mutable_row();

create trigger navigation_item_localizations_touch_mutable_row
before update on public.navigation_item_localizations
for each row execute function private.touch_mutable_row();

create trigger public_site_settings_touch_mutable_row
before update on public.public_site_settings
for each row execute function private.touch_mutable_row();

comment on table public.page_sections is
  'Constrained page composition. S2 deliberately does not encode a section-type registry.';

comment on table public.navigation_items is
  'Bounded internal/external navigation tree. Visibility vocabulary is deferred.';

comment on table public.public_site_settings is
  'Future allow-listed public settings only. Secrets and provider credentials are prohibited.';
