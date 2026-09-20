-- CR1 — Owner Website Control System: typed page CMS.
--
-- Owner-editable public pages (system, content, custom and global "pages")
-- composed of typed sections, with a draft → preview → publish model that
-- freezes a coherent revision snapshot on publish (C7 pattern), revision
-- history with non-destructive restore, route aliases for slug changes,
-- reserved-route protection and a single anonymous projection RPC.
--
-- The application validates every section configuration against a typed
-- schema before it reaches these facades; the database re-checks the content
-- is data (no executable or raw markup), that the section type is in the
-- approved registry, and that ordering, versions and permissions hold.

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('website.read', 'Read website content', 'Read public page drafts, revisions and the website control center.', true),
  ('website.pages.write', 'Edit website pages', 'Create and edit page drafts and their sections.', true),
  ('website.layout.write', 'Arrange website sections', 'Add, reorder, hide, duplicate and remove page sections.', true),
  ('website.publish', 'Publish website pages', 'Publish, unpublish and restore page revisions to the public website.', true),
  ('website.navigation.write', 'Manage navigation and footer', 'Edit header navigation, footer groups and global calls to action.', true),
  ('website.seo.write', 'Manage page SEO', 'Edit page titles, descriptions, social images and indexing.', true)
on conflict (key) do update
set display_name = excluded.display_name, description = excluded.description, is_system = true;

-- Editors (admin role) may read, write, arrange and manage SEO; publishing is
-- a Super Admin / owner right so an editor can prepare without going live.
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'website.read', 'website.pages.write', 'website.layout.write', 'website.seo.write'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in ('website.publish', 'website.navigation.write')
where roles.key = 'super_admin'
on conflict do nothing;

-- Realtime vocabulary: one website entity type.
alter table public.realtime_events drop constraint if exists realtime_events_entity_type_check;
alter table public.realtime_events add constraint realtime_events_entity_type_check
  check (entity_type in (
    'client', 'operational_project', 'invoice',
    'trade_partner', 'contractor_assignment', 'material', 'material_requirement', 'purchase_order',
    'settings', 'lead', 'notification', 'website_page'
  ));

alter table public.realtime_events drop constraint if exists realtime_events_action_check;
alter table public.realtime_events add constraint realtime_events_action_check
  check (action in (
    'created', 'updated', 'status_changed', 'phase_changed', 'priority_changed',
    'case_study_linked', 'case_study_unlinked', 'archived', 'note_created',
    'issued', 'voided', 'payment_recorded', 'payment_reversed', 'share_created', 'share_revoked',
    'capability_changed', 'adjusted', 'rated', 'approved', 'cancelled', 'closed',
    'receipt_recorded', 'receipt_reversed', 'published',
    'submitted', 'assigned', 'contact_logged', 'converted',
    'unpublished', 'restored'
  ));

-- ---------------------------------------------------------------------
-- Media library metadata (owner alt text, caption, focal point)
-- ---------------------------------------------------------------------

alter table public.media_assets
  add column if not exists alt_text text,
  add column if not exists caption text,
  add column if not exists focal_x numeric(4,3) not null default 0.5,
  add column if not exists focal_y numeric(4,3) not null default 0.5,
  add column if not exists archived_at timestamptz;

alter table public.media_assets
  drop constraint if exists media_assets_alt_text_check,
  add constraint media_assets_alt_text_check
    check (alt_text is null or (alt_text = btrim(alt_text) and char_length(alt_text) between 1 and 300)),
  drop constraint if exists media_assets_caption_check,
  add constraint media_assets_caption_check
    check (caption is null or (caption = btrim(caption) and char_length(caption) between 1 and 600)),
  drop constraint if exists media_assets_focal_check,
  add constraint media_assets_focal_check
    check (focal_x between 0 and 1 and focal_y between 0 and 1);

-- ---------------------------------------------------------------------
-- Navigation: approved routes plus owner-created custom pages (page:<slug>)
-- ---------------------------------------------------------------------

alter table public.navigation_settings drop constraint if exists navigation_settings_route_key_check;
alter table public.navigation_settings add constraint navigation_settings_route_key_check
  check (
    route_key in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')
    or route_key ~ '^page:[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

-- ---------------------------------------------------------------------
-- Section type registry (curated; the renderer map is static in code)
-- ---------------------------------------------------------------------

create table public.website_section_types (
  key text primary key,
  display_name text not null,
  scope text not null default 'any',
  system_module boolean not null default false,
  enabled boolean not null default true,
  schema_version integer not null default 1,
  constraint website_section_types_key_check check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint website_section_types_display_name_check check (display_name = btrim(display_name) and display_name <> ''),
  constraint website_section_types_scope_check check (scope in ('any', 'system', 'global')),
  constraint website_section_types_schema_version_check check (schema_version > 0)
);

insert into public.website_section_types (key, display_name, scope, system_module) values
  ('hero', 'Hero', 'any', false),
  ('masthead', 'Page masthead', 'any', false),
  ('editorial_intro', 'Editorial intro', 'any', false),
  ('rich_text', 'Rich text', 'any', false),
  ('text_media', 'Text + media', 'any', false),
  ('full_media', 'Full-width media', 'any', false),
  ('feature_grid', 'Feature grid', 'any', false),
  ('service_showcase', 'Service showcase', 'any', false),
  ('project_showcase', 'Project showcase', 'any', false),
  ('process', 'Process / steps', 'any', false),
  ('material_detail', 'Material detail', 'any', false),
  ('gallery', 'Gallery', 'any', false),
  ('faq', 'FAQ', 'any', false),
  ('insight_feed', 'Insight feed', 'any', false),
  ('cta', 'Call to action', 'any', false),
  ('contact_strip', 'Contact strip', 'any', false),
  ('whatsapp_cta', 'WhatsApp call to action', 'any', false),
  ('quote', 'Quote', 'any', false),
  ('testimonial', 'Testimonial', 'any', false),
  ('marquee', 'Marquee', 'any', false),
  ('divider', 'Divider / transition', 'any', false),
  ('services_navigator', 'Services navigator (system)', 'system', true),
  ('projects_index', 'Projects index (system)', 'system', true),
  ('insights_index', 'Insights index (system)', 'system', true),
  ('contact_form', 'Contact form (system)', 'system', true),
  ('contact_channels', 'Contact channels (system)', 'system', true),
  ('start_project_wizard', 'Start a Project wizard (system)', 'system', true),
  ('service_enquiry_form', 'Service enquiry form (system)', 'system', true),
  ('material_enquiry_form', 'Material enquiry form (system)', 'system', true),
  ('global_copy', 'Global copy', 'global', true),
  ('process_steps', 'Process steps', 'global', true),
  ('footer_groups', 'Footer link groups', 'global', true),
  ('footer_options', 'Footer options', 'global', true)
on conflict (key) do update
set display_name = excluded.display_name, scope = excluded.scope, system_module = excluded.system_module, enabled = true;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.website_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  page_type text not null,
  path text not null,
  title text not null,
  status text not null default 'draft',
  seo_title text,
  seo_description text,
  og_media_id uuid references public.media_assets (id) on delete set null,
  noindex boolean not null default false,
  published_revision_id uuid,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint website_pages_page_key_unique unique (page_key),
  constraint website_pages_path_unique unique (path),
  constraint website_pages_page_key_check check (page_key ~ '^[a-z][a-z0-9-]{0,79}$'),
  constraint website_pages_page_type_check check (page_type in ('system', 'content', 'custom', 'global')),
  constraint website_pages_path_check check (
    (page_type = 'global' and path ~ '^/_[a-z][a-z0-9-]{0,79}$')
    or (page_type <> 'global' and (path = '/' or path ~ '^/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?$'))
  ),
  constraint website_pages_title_check check (title = btrim(title) and char_length(title) between 1 and 160),
  constraint website_pages_status_check check (status in ('draft', 'published', 'archived')),
  constraint website_pages_seo_title_check check (seo_title is null or char_length(seo_title) <= 160),
  constraint website_pages_seo_description_check check (seo_description is null or char_length(seo_description) <= 320),
  constraint website_pages_published_pair_check check ((status = 'published') = (published_revision_id is not null)),
  constraint website_pages_version_check check (version > 0)
);

create table public.website_page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.website_pages (id) on delete cascade,
  section_type text not null references public.website_section_types (key) on delete restrict,
  variant text not null default 'default',
  tone text not null default 'paper',
  spacing text not null default 'standard',
  motion text not null default 'standard',
  hidden boolean not null default false,
  locked boolean not null default false,
  label text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint website_page_sections_variant_check check (variant ~ '^[a-z][a-z0-9_]{0,31}$'),
  constraint website_page_sections_tone_check check (tone in (
    'paper', 'limestone', 'ink', 'concrete', 'charcoal', 'material',
    'survey_field', 'plan_field', 'structure_field', 'datum_field', 'quiet_field'
  )),
  constraint website_page_sections_spacing_check check (spacing in ('compact', 'standard', 'generous')),
  constraint website_page_sections_motion_check check (motion in ('standard', 'quiet', 'none')),
  constraint website_page_sections_label_check check (label is null or (label = btrim(label) and char_length(label) between 1 and 80)),
  constraint website_page_sections_config_object check (jsonb_typeof(config) = 'object'),
  constraint website_page_sections_sort_order_check check (sort_order >= 0),
  constraint website_page_sections_version_check check (version > 0),
  constraint website_page_sections_page_order_unique unique (page_id, sort_order) deferrable initially immediate
);

create table public.website_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.website_pages (id) on delete cascade,
  revision_no integer not null,
  kind text not null,
  summary text,
  snapshot jsonb not null,
  media_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint website_page_revisions_no_unique unique (page_id, revision_no),
  constraint website_page_revisions_no_check check (revision_no > 0),
  constraint website_page_revisions_kind_check check (kind in ('published', 'restore_point')),
  constraint website_page_revisions_summary_check check (summary is null or char_length(summary) <= 300),
  constraint website_page_revisions_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

alter table public.website_pages
  add constraint website_pages_published_revision_fk
  foreign key (published_revision_id) references public.website_page_revisions (id) on delete restrict
  deferrable initially deferred;

create table public.website_route_aliases (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  target_path text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint website_route_aliases_source_unique unique (source_path),
  constraint website_route_aliases_source_check check (source_path ~ '^/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?$'),
  constraint website_route_aliases_target_check check (target_path ~ '^/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?$'),
  constraint website_route_aliases_not_self check (source_path <> target_path),
  constraint website_route_aliases_entity_check check (entity_type in ('page', 'project', 'service', 'post'))
);

create index website_pages_status_idx on public.website_pages (status, page_type);
create index website_pages_og_media_idx on public.website_pages (og_media_id);
create index website_pages_published_revision_idx on public.website_pages (published_revision_id);
create index website_pages_created_by_idx on public.website_pages (created_by);
create index website_pages_updated_by_idx on public.website_pages (updated_by);
create index website_pages_published_by_idx on public.website_pages (published_by);
create index website_page_sections_page_idx on public.website_page_sections (page_id, sort_order);
create index website_page_sections_created_by_idx on public.website_page_sections (created_by);
create index website_page_sections_updated_by_idx on public.website_page_sections (updated_by);
create index website_page_revisions_page_idx on public.website_page_revisions (page_id, revision_no desc);
create index website_page_revisions_media_idx on public.website_page_revisions using gin (media_ids);
create index website_page_revisions_created_by_idx on public.website_page_revisions (created_by);
create index website_route_aliases_entity_idx on public.website_route_aliases (entity_type, entity_id);
create index website_route_aliases_created_by_idx on public.website_route_aliases (created_by);

create trigger website_pages_touch before update on public.website_pages
for each row execute function private.touch_mutable_row();
create trigger website_page_sections_touch before update on public.website_page_sections
for each row execute function private.touch_mutable_row();

-- Section safety: registry membership and data-only configuration.
create or replace function private.validate_website_section_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  type_scope text;
  target_page_type text;
begin
  select scope into type_scope from public.website_section_types where key = new.section_type and enabled;
  if type_scope is null then
    raise check_violation using message = 'website section type is not in the approved registry';
  end if;
  select page_type into target_page_type from public.website_pages where id = new.page_id;
  if type_scope = 'global' and target_page_type <> 'global' then
    raise check_violation using message = 'global section types belong only to global pages';
  end if;
  if type_scope <> 'global' and target_page_type = 'global' then
    raise check_violation using message = 'page section types cannot be placed on global pages';
  end if;
  if not private.content_json_is_safe(new.config) then
    raise check_violation using message = 'website section configuration contains executable or raw markup';
  end if;
  return new;
end;
$$;

create trigger website_page_sections_registry_guard
before insert or update on public.website_page_sections
for each row execute function private.validate_website_section_trigger();

-- Default-deny RLS; facades are the only path.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'website_section_types', 'website_pages', 'website_page_sections', 'website_page_revisions', 'website_route_aliases'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------

-- Routes the framework or a domain owns. A custom page can never claim them.
create or replace function private.website_reserved_slugs()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'admin', 'api', 'services', 'projects', 'insights', 'about', 'contact', 'start-a-project',
    'enquire', 'privacy', 'terms', 'cookies', 'i', 'po', 'brand-study', 'expertise', 'media',
    'preview', 'assets', 'static', 'fonts', 'images', 'icons', 'sitemap', 'robots', 'favicon',
    'manifest', 'opengraph-image', 'twitter-image', 'icon', 'apple-icon', 'sign-in', 'login',
    'logout', 'search', 'feed', 'rss', 'share', 'invoice', 'invoices', 'order', 'orders',
    'lead', 'leads', 'client', 'clients', 'staff', 'settings', 'analytics', 'notifications',
    'null', 'undefined', 'index', 'home', 'page', 'pages', 'website', 'globals', 'footer'
  ];
$$;

create or replace function private.website_custom_slug_is_admitted(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate is not null
    and candidate ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(candidate) between 2 and 80
    and candidate !~ '\.'
    and not (candidate = any (private.website_reserved_slugs()))
    and candidate !~ '^_';
$$;

create or replace function private.website_touch(target_page_id uuid, action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.emit_realtime_event('website_page', target_page_id, action);
end;
$$;
revoke all on function private.website_touch(uuid, text) from public, anon, authenticated;

-- Collect every media id referenced by a section configuration (keys that end
-- in media_id, plus media arrays of { media_id }).
create or replace function private.website_config_media_ids(payload jsonb)
returns uuid[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  found uuid[] := '{}'::uuid[];
  entry record;
  scalar text;
begin
  if payload is null then
    return found;
  end if;
  if jsonb_typeof(payload) = 'object' then
    for entry in select key, value from jsonb_each(payload) loop
      if entry.key ~ 'media_id$' and jsonb_typeof(entry.value) = 'string' then
        scalar := entry.value #>> '{}';
        if scalar ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          found := found || scalar::uuid;
        end if;
      else
        found := found || private.website_config_media_ids(entry.value);
      end if;
    end loop;
  elsif jsonb_typeof(payload) = 'array' then
    for entry in select value from jsonb_array_elements(payload) loop
      found := found || private.website_config_media_ids(entry.value);
    end loop;
  end if;
  return found;
end;
$$;

-- Draft snapshot of a page: the exact shape a revision freezes.
create or replace function private.website_page_snapshot(target_page_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'page', jsonb_build_object(
      'id', page.id,
      'page_key', page.page_key,
      'page_type', page.page_type,
      'path', page.path,
      'title', page.title,
      'seo', jsonb_build_object(
        'title', page.seo_title,
        'description', page.seo_description,
        'og_media_id', page.og_media_id,
        'noindex', page.noindex
      )
    ),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', section.id,
        'type', section.section_type,
        'variant', section.variant,
        'tone', section.tone,
        'spacing', section.spacing,
        'motion', section.motion,
        'hidden', section.hidden,
        'locked', section.locked,
        'label', section.label,
        'config', section.config
      ) order by section.sort_order)
      from public.website_page_sections as section
      where section.page_id = page.id
    ), '[]'::jsonb)
  )
  from public.website_pages as page
  where page.id = target_page_id;
$$;
revoke all on function private.website_page_snapshot(uuid) from public, anon, authenticated;

create or replace function private.website_snapshot_media_ids(snapshot jsonb)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select array(
    select distinct unnest(
      private.website_config_media_ids(snapshot -> 'sections')
      || case
        when snapshot #>> '{page,seo,og_media_id}' ~* '^[0-9a-f-]{36}$'
        then array[(snapshot #>> '{page,seo,og_media_id}')::uuid]
        else '{}'::uuid[]
      end
    )
  );
$$;

-- Website media eligibility: a finalized derivative with cleared rights.
-- Concept / generated imagery is admitted for page illustration (the renderer
-- labels it); synthetic test media never is. Evidence media on real projects
-- keeps the stricter private.public_media_is_current rule.
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
      and asset.mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
      and asset.rights_status = 'cleared'
      and asset.public_use_permission = 'granted'
      and asset.rights_reviewer_id is not null
      and asset.rights_verified_at is not null
      and (asset.rights_review_due_at is null or asset.rights_review_due_at >= now())
      and (not asset.consent_required or asset.consent_state = 'granted')
  );
$$;

-- Does a published, current revision reference this media asset?
create or replace function private.website_media_is_published(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.website_pages as page
    join public.website_page_revisions as revision on revision.id = page.published_revision_id
    where page.status = 'published'
      and target_id = any (revision.media_ids)
  );
$$;
revoke all on function private.website_media_is_published(uuid) from public, anon, authenticated;

-- Is the draft different from the published revision? Ids are ignored so a
-- restored revision with identical content reads as "no draft changes".
create or replace function private.website_snapshot_fingerprint(snapshot jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'page', (snapshot -> 'page') - 'id',
    'sections', coalesce((select jsonb_agg(section - 'id') from jsonb_array_elements(snapshot -> 'sections') as section), '[]'::jsonb)
  );
$$;

create or replace function private.website_page_has_draft_changes(target_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when page.published_revision_id is null then true
    else private.website_snapshot_fingerprint(private.website_page_snapshot(page.id))
      <> private.website_snapshot_fingerprint(revision.snapshot)
  end
  from public.website_pages as page
  left join public.website_page_revisions as revision on revision.id = page.published_revision_id
  where page.id = target_page_id;
$$;
revoke all on function private.website_page_has_draft_changes(uuid) from public, anon, authenticated;

-- Content health warnings for one page (owner language, no schema jargon).
create or replace function private.website_page_health(target_page_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page public.website_pages%rowtype;
  warnings jsonb := '[]'::jsonb;
  snapshot jsonb;
  media_id uuid;
  has_cta boolean;
  has_heading boolean;
begin
  select * into page from public.website_pages where id = target_page_id;
  if not found then
    return warnings;
  end if;
  if page.page_type = 'global' then
    return warnings;
  end if;
  snapshot := private.website_page_snapshot(page.id);
  if nullif(btrim(coalesce(page.seo_title, '')), '') is null then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'seo_title_missing', 'severity', 'warning', 'message', 'No SEO title. The page title is used instead.'));
  end if;
  if nullif(btrim(coalesce(page.seo_description, '')), '') is null then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'seo_description_missing', 'severity', 'warning', 'message', 'No meta description.'));
  end if;
  if page.og_media_id is null then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'og_image_missing', 'severity', 'info', 'message', 'No social sharing image. The site default is used.'));
  end if;
  if jsonb_array_length(snapshot -> 'sections') = 0 then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'no_sections', 'severity', 'error', 'message', 'The page has no sections.'));
  end if;
  select bool_or(section ->> 'type' in ('hero', 'masthead') and coalesce(section ->> 'hidden', 'false') <> 'true'),
         bool_or(section ->> 'type' in ('cta', 'whatsapp_cta', 'contact_strip', 'hero', 'masthead', 'start_project_wizard', 'contact_form') and coalesce(section ->> 'hidden', 'false') <> 'true')
    into has_heading, has_cta
  from jsonb_array_elements(snapshot -> 'sections') as section;
  if page.page_type <> 'global' and coalesce(has_heading, false) = false then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'no_title_section', 'severity', 'warning', 'message', 'No hero or masthead section: visitors see no page title.'));
  end if;
  if coalesce(has_cta, false) = false then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'no_cta', 'severity', 'info', 'message', 'The page has no call to action.'));
  end if;
  foreach media_id in array private.website_snapshot_media_ids(snapshot) loop
    if not private.website_media_is_current(media_id) then
      warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'media_not_ready', 'severity', 'error', 'message', 'A referenced image is not ready for public use (rights not confirmed or upload not finalized).', 'media_id', media_id));
    elsif not exists (
      select 1 from public.media_assets as asset
      where asset.id = media_id and nullif(btrim(coalesce(asset.alt_text, '')), '') is not null
    ) then
      warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'alt_missing', 'severity', 'warning', 'message', 'A referenced image has no alt text.', 'media_id', media_id));
    end if;
  end loop;
  if page.page_type = 'custom' and page.status = 'published' and not exists (
    select 1 from public.navigation_settings as nav
    where nav.route_key = 'page:' || ltrim(page.path, '/') and nav.visible
  ) then
    warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'not_in_navigation', 'severity', 'info', 'message', 'This page is published but not linked from the navigation.'));
  end if;
  return warnings;
end;
$$;
revoke all on function private.website_page_health(uuid) from public, anon, authenticated;

-- Navigation / CTA dependencies that would break if this page disappeared.
create or replace function private.website_page_dependencies(target_page_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'navigation', 'label', coalesce(nav.label_override, nav.route_key)))
    from public.navigation_settings as nav
    join public.website_pages as page on page.id = target_page_id
    where nav.route_key = 'page:' || ltrim(page.path, '/')
  ), '[]'::jsonb)
  || coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'section_link', 'label', other.title || ' (' || other.path || ')'))
    from public.website_pages as page
    join public.website_page_sections as section on true
    join public.website_pages as other on other.id = section.page_id and other.id <> page.id
    where page.id = target_page_id
      and section.config::text like '%"' || page.path || '"%'
  ), '[]'::jsonb);
$$;
revoke all on function private.website_page_dependencies(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Admin reads
-- ---------------------------------------------------------------------

create or replace function public.admin_list_website_pages()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('website.read') then
    raise exception using errcode = '42501', message = 'website pages are not authorized';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', page.id,
      'page_key', page.page_key,
      'page_type', page.page_type,
      'path', page.path,
      'title', page.title,
      'status', page.status,
      'noindex', page.noindex,
      'seo_complete', nullif(btrim(coalesce(page.seo_title, '')), '') is not null and nullif(btrim(coalesce(page.seo_description, '')), '') is not null,
      'has_draft_changes', private.website_page_has_draft_changes(page.id),
      'published_at', page.published_at,
      'published_by', publisher.display_name,
      'updated_at', page.updated_at,
      'updated_by', editor.display_name,
      'version', page.version,
      'section_count', (select count(*) from public.website_page_sections as s where s.page_id = page.id),
      'health', private.website_page_health(page.id)
    ) order by
      case page.page_type when 'system' then 0 when 'content' then 1 when 'custom' then 2 else 3 end,
      case page.path when '/' then 0 else 1 end,
      page.path)
    from public.website_pages as page
    left join public.profiles as publisher on publisher.id = page.published_by
    left join public.profiles as editor on editor.id = page.updated_by
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_website_page(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('website.read') then
    raise exception using errcode = '42501', message = 'website page is not authorized';
  end if;
  select jsonb_build_object(
    'page', jsonb_build_object(
      'id', page.id,
      'page_key', page.page_key,
      'page_type', page.page_type,
      'path', page.path,
      'title', page.title,
      'status', page.status,
      'seo_title', page.seo_title,
      'seo_description', page.seo_description,
      'og_media_id', page.og_media_id,
      'noindex', page.noindex,
      'published_revision_id', page.published_revision_id,
      'published_revision_no', revision.revision_no,
      'published_at', page.published_at,
      'published_by', publisher.display_name,
      'archived_at', page.archived_at,
      'updated_at', page.updated_at,
      'updated_by', editor.display_name,
      'version', page.version,
      'has_draft_changes', private.website_page_has_draft_changes(page.id)
    ),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', section.id,
        'type', section.section_type,
        'variant', section.variant,
        'tone', section.tone,
        'spacing', section.spacing,
        'motion', section.motion,
        'hidden', section.hidden,
        'locked', section.locked,
        'label', section.label,
        'config', section.config,
        'sort_order', section.sort_order,
        'version', section.version,
        'updated_at', section.updated_at
      ) order by section.sort_order)
      from public.website_page_sections as section
      where section.page_id = page.id
    ), '[]'::jsonb),
    'revisions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'revision_no', r.revision_no,
        'kind', r.kind,
        'summary', r.summary,
        'created_at', r.created_at,
        'created_by', author.display_name,
        'is_current', r.id = page.published_revision_id
      ) order by r.revision_no desc)
      from (
        select * from public.website_page_revisions as inner_r
        where inner_r.page_id = page.id
        order by inner_r.revision_no desc
        limit 40
      ) as r
      left join public.profiles as author on author.id = r.created_by
    ), '[]'::jsonb),
    'health', private.website_page_health(page.id),
    'dependencies', private.website_page_dependencies(page.id),
    'permissions', jsonb_build_object(
      'can_write', private.has_permission('website.pages.write'),
      'can_layout', private.has_permission('website.layout.write'),
      'can_publish', private.has_permission('website.publish'),
      'can_seo', private.has_permission('website.seo.write')
    )
  )
  into result
  from public.website_pages as page
  left join public.website_page_revisions as revision on revision.id = page.published_revision_id
  left join public.profiles as publisher on publisher.id = page.published_by
  left join public.profiles as editor on editor.id = page.updated_by
  where page.id = target_id;
  return result;
end;
$$;

create or replace function public.admin_get_website_page_revision(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('website.read') then
    raise exception using errcode = '42501', message = 'website revision is not authorized';
  end if;
  select jsonb_build_object(
    'id', r.id,
    'page_id', r.page_id,
    'revision_no', r.revision_no,
    'kind', r.kind,
    'summary', r.summary,
    'created_at', r.created_at,
    'created_by', author.display_name,
    'snapshot', r.snapshot
  )
  into result
  from public.website_page_revisions as r
  left join public.profiles as author on author.id = r.created_by
  where r.id = target_id;
  return result;
end;
$$;

-- Draft preview: the same shape as the public projection but from the draft.
create or replace function public.admin_preview_website_page(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not private.has_permission('website.read') then
    raise exception using errcode = '42501', message = 'website preview is not authorized';
  end if;
  snapshot := private.website_page_snapshot(target_id);
  if snapshot is null then
    return null;
  end if;
  return snapshot || jsonb_build_object(
    'revision', jsonb_build_object('no', null, 'published_at', null, 'preview', true),
    'status', (select status from public.website_pages where id = target_id)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Admin commands
-- ---------------------------------------------------------------------

create or replace function public.create_website_page(
  target_slug text,
  target_title text,
  target_page_type text default 'custom'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  new_path text;
  new_key text;
begin
  if not private.has_permission('website.pages.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.pages.write is required.')));
  end if;
  if target_page_type <> 'custom' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_page_type', 'page_type', 'Only custom pages can be created here; system pages are provisioned.')));
  end if;
  if not private.website_custom_slug_is_admitted(target_slug) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('reserved_route', 'slug', 'This address is reserved or not a valid slug (lowercase letters, numbers and hyphens).')));
  end if;
  if target_title is null or btrim(target_title) = '' or char_length(btrim(target_title)) > 160 or not private.safe_public_text(btrim(target_title)) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_title', 'title', 'A title up to 160 characters is required.')));
  end if;
  new_path := '/' || target_slug;
  new_key := target_slug;
  if exists (select 1 from public.website_pages where path = new_path or page_key = new_key)
     or exists (select 1 from public.website_route_aliases where source_path = new_path) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_route', 'slug', 'Another page or redirect already uses this address.')));
  end if;
  insert into public.website_pages (page_key, page_type, path, title, status, created_by, updated_by)
  values (new_key, 'custom', new_path, btrim(target_title), 'draft', auth.uid(), auth.uid())
  returning id into new_id;
  insert into public.website_page_sections (page_id, section_type, tone, config, sort_order, created_by, updated_by)
  values (new_id, 'masthead', 'paper', jsonb_build_object('eyebrow', btrim(target_title), 'title', btrim(target_title), 'summary', ''), 0, auth.uid(), auth.uid());
  perform private.s4_audit('page.create', 'website_page', new_id::text, 'success', jsonb_build_object('path', new_path));
  perform private.website_touch(new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'path', new_path, 'version', 1);
end;
$$;

create or replace function public.update_website_page(
  target_id uuid,
  expected_version integer,
  target_title text,
  target_slug text,
  target_seo_title text,
  target_seo_description text,
  target_og_media_id uuid,
  target_noindex boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  page public.website_pages%rowtype;
  next_path text;
  can_seo boolean := private.has_permission('website.seo.write');
begin
  if not private.has_permission('website.pages.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.pages.write is required.')));
  end if;
  select * into page from public.website_pages where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'page', 'Page does not exist.')));
  end if;
  if page.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', page.version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member saved this page first. Reload to see their changes.')));
  end if;
  if page.status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'Archived pages cannot be edited.')));
  end if;
  if target_title is null or btrim(target_title) = '' or char_length(btrim(target_title)) > 160 or not private.safe_public_text(btrim(target_title)) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_title', 'title', 'A title up to 160 characters is required.')));
  end if;
  if (target_seo_title is not null and (char_length(target_seo_title) > 160 or not private.safe_public_text(btrim(target_seo_title))))
     or (target_seo_description is not null and (char_length(target_seo_description) > 320 or not private.safe_public_text(btrim(target_seo_description)))) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_seo', 'seo', 'SEO title (160) and description (320) must be plain text.')));
  end if;
  next_path := page.path;
  if page.page_type = 'custom' and target_slug is not null and ('/' || target_slug) <> page.path then
    if not private.website_custom_slug_is_admitted(target_slug) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('reserved_route', 'slug', 'This address is reserved or not a valid slug.')));
    end if;
    next_path := '/' || target_slug;
    if exists (select 1 from public.website_pages where path = next_path and id <> page.id)
       or exists (select 1 from public.website_route_aliases where source_path = next_path and entity_id is distinct from page.id) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_route', 'slug', 'Another page or redirect already uses this address.')));
    end if;
  elsif page.page_type <> 'custom' and target_slug is not null and ('/' || target_slug) <> page.path then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'slug', 'System and content page addresses are fixed.')));
  end if;
  if target_og_media_id is not null and not exists (select 1 from public.media_assets where id = target_og_media_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'og_media_id', 'The social image does not exist.')));
  end if;
  update public.website_pages
     set title = btrim(target_title),
         path = next_path,
         page_key = case when page_type = 'custom' then ltrim(next_path, '/') else page_key end,
         seo_title = case when can_seo then nullif(btrim(coalesce(target_seo_title, '')), '') else seo_title end,
         seo_description = case when can_seo then nullif(btrim(coalesce(target_seo_description, '')), '') else seo_description end,
         og_media_id = case when can_seo then target_og_media_id else og_media_id end,
         noindex = case when can_seo then coalesce(target_noindex, false) else noindex end,
         updated_by = auth.uid(),
         version = version + 1
   where id = page.id;
  if next_path <> page.path then
    -- Keep old links working: old path → new path, and drop an alias that
    -- would now point at itself.
    delete from public.website_route_aliases where source_path = next_path;
    insert into public.website_route_aliases (source_path, target_path, entity_type, entity_id, created_by)
    values (page.path, next_path, 'page', page.id, auth.uid())
    on conflict (source_path) do update set target_path = excluded.target_path, entity_id = excluded.entity_id;
    update public.website_route_aliases set target_path = next_path where entity_type = 'page' and entity_id = page.id;
    update public.navigation_settings set route_key = 'page:' || ltrim(next_path, '/') where route_key = 'page:' || ltrim(page.path, '/');
  end if;
  perform private.s4_audit('page.update', 'website_page', page.id::text, 'success', jsonb_build_object('path', next_path, 'version', expected_version + 1));
  perform private.website_touch(page.id, 'updated');
  return jsonb_build_object('ok', true, 'id', page.id, 'path', next_path, 'version', expected_version + 1);
end;
$$;

-- Section ordering helper: compact sort orders to 0..n-1 in the given id order.
create or replace function private.website_apply_section_order(target_page_id uuid, ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  set constraints public.website_page_sections_page_order_unique deferred;
  update public.website_page_sections as section
     set sort_order = ordered.position - 1,
         version = section.version + 1
    from unnest(ordered_ids) with ordinality as ordered(id, position)
   where section.id = ordered.id
     and section.page_id = target_page_id
     and section.sort_order <> ordered.position - 1;
end;
$$;
revoke all on function private.website_apply_section_order(uuid, uuid[]) from public, anon, authenticated;

-- Row lock + version check shared by every page command.
create type private.website_page_lock as (page public.website_pages, failure jsonb);

create or replace function private.website_lock_page(target_page_id uuid, expected_page_version integer)
returns private.website_page_lock
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked private.website_page_lock;
  row_page public.website_pages%rowtype;
begin
  select * into row_page from public.website_pages where id = target_page_id for update;
  locked.page := row_page;
  if not found then
    locked.failure := jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'page', 'Page does not exist.')));
    return locked;
  end if;
  if (locked.page).version <> expected_page_version then
    locked.failure := jsonb_build_object('ok', false, 'current_version', (locked.page).version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this page first. Reload to continue.')));
    return locked;
  end if;
  if (locked.page).status = 'archived' then
    locked.failure := jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'Archived pages cannot be edited.')));
    return locked;
  end if;
  locked.failure := null;
  return locked;
end;
$$;
revoke all on function private.website_lock_page(uuid, integer) from public, anon, authenticated;

create or replace function public.create_website_section(
  target_page_id uuid,
  expected_page_version integer,
  target_section_type text,
  target_config jsonb default '{}'::jsonb,
  target_variant text default 'default',
  target_tone text default 'paper',
  target_spacing text default 'standard',
  target_position integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  new_id uuid;
  ordered uuid[];
  type_row public.website_section_types%rowtype;
begin
  if not private.has_permission('website.layout.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.layout.write is required.')));
  end if;
  locked := private.website_lock_page(target_page_id, expected_page_version);
  if locked.failure is not null then return locked.failure; end if;
  select * into type_row from public.website_section_types where key = target_section_type and enabled;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsupported_block', 'section_type', 'This section type is not available.')));
  end if;
  if type_row.system_module then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'section_type', 'System modules are provisioned with their page and cannot be added.')));
  end if;
  if target_config is null or jsonb_typeof(target_config) <> 'object' or not private.content_json_is_safe(target_config) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsafe_content', 'config', 'Section content must be plain data.')));
  end if;
  if (select count(*) from public.website_page_sections where page_id = target_page_id) >= 40 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('limit_reached', 'sections', 'A page holds at most 40 sections.')));
  end if;
  insert into public.website_page_sections (page_id, section_type, variant, tone, spacing, config, sort_order, created_by, updated_by)
  values (
    target_page_id, target_section_type, coalesce(target_variant, 'default'), coalesce(target_tone, 'paper'), coalesce(target_spacing, 'standard'),
    target_config,
    coalesce((select max(sort_order) + 1 from public.website_page_sections where page_id = target_page_id), 0),
    auth.uid(), auth.uid()
  )
  returning id into new_id;
  if target_position is not null then
    ordered := array(select id from public.website_page_sections where page_id = target_page_id and id <> new_id order by sort_order);
    ordered := ordered[1:greatest(least(target_position, coalesce(array_length(ordered, 1), 0)), 0)] || new_id || ordered[greatest(least(target_position, coalesce(array_length(ordered, 1), 0)), 0) + 1:];
    perform private.website_apply_section_order(target_page_id, ordered);
  end if;
  update public.website_pages set version = version + 1, updated_by = auth.uid() where id = target_page_id;
  perform private.s4_audit('section.create', 'website_page', target_page_id::text, 'success', jsonb_build_object('section_id', new_id, 'section_type', target_section_type));
  perform private.website_touch(target_page_id, 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'page_version', expected_page_version + 1);
end;
$$;

create or replace function public.update_website_section(
  target_section_id uuid,
  expected_section_version integer,
  target_config jsonb,
  target_variant text,
  target_tone text,
  target_spacing text,
  target_motion text,
  target_hidden boolean,
  target_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  section public.website_page_sections%rowtype;
  page_status text;
  page_version integer;
begin
  if not private.has_permission('website.pages.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.pages.write is required.')));
  end if;
  select * into section from public.website_page_sections where id = target_section_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'section', 'Section does not exist.')));
  end if;
  select status into page_status from public.website_pages where id = section.page_id for update;
  if page_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'Archived pages cannot be edited.')));
  end if;
  if section.version <> expected_section_version then
    return jsonb_build_object('ok', false, 'current_version', section.version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member saved this section first. Reload to see their changes.')));
  end if;
  if target_config is null or jsonb_typeof(target_config) <> 'object' or not private.content_json_is_safe(target_config) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsafe_content', 'config', 'Section content must be plain data.')));
  end if;
  if section.locked and coalesce(target_hidden, false) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'hidden', 'This section is a required module of the page and cannot be hidden.')));
  end if;
  if target_label is not null and (char_length(btrim(target_label)) > 80 or not private.safe_public_text(btrim(target_label))) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_label', 'label', 'Labels are plain text up to 80 characters.')));
  end if;
  update public.website_page_sections
     set config = target_config,
         variant = coalesce(target_variant, variant),
         tone = coalesce(target_tone, tone),
         spacing = coalesce(target_spacing, spacing),
         motion = coalesce(target_motion, motion),
         hidden = coalesce(target_hidden, hidden),
         label = nullif(btrim(coalesce(target_label, '')), ''),
         updated_by = auth.uid(),
         version = version + 1
   where id = section.id;
  update public.website_pages set updated_by = auth.uid(), version = version + 1 where id = section.page_id returning version into page_version;
  perform private.s4_audit('section.update', 'website_page', section.page_id::text, 'success', jsonb_build_object('section_id', section.id, 'section_type', section.section_type));
  perform private.website_touch(section.page_id, 'updated');
  return jsonb_build_object('ok', true, 'id', section.id, 'version', expected_section_version + 1, 'page_version', page_version);
end;
$$;

create or replace function public.reorder_website_sections(
  target_page_id uuid,
  expected_page_version integer,
  ordered_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  ids uuid[];
  existing uuid[];
begin
  if not private.has_permission('website.layout.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.layout.write is required.')));
  end if;
  locked := private.website_lock_page(target_page_id, expected_page_version);
  if locked.failure is not null then return locked.failure; end if;
  if ordered_ids is null or jsonb_typeof(ordered_ids) <> 'array' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_order', 'ordered_ids', 'An ordered list of section ids is required.')));
  end if;
  begin
    ids := array(select (value #>> '{}')::uuid from jsonb_array_elements(ordered_ids));
  exception when others then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_order', 'ordered_ids', 'Section ids are not valid.')));
  end;
  existing := array(select id from public.website_page_sections where page_id = target_page_id order by sort_order);
  if array_length(ids, 1) is distinct from array_length(existing, 1)
     or exists (select 1 from unnest(ids) as candidate where not (candidate = any (existing)))
     or (select count(distinct candidate) from unnest(ids) as candidate) <> coalesce(array_length(ids, 1), 0) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_order', 'ordered_ids', 'The order must include every section of this page exactly once.')));
  end if;
  perform private.website_apply_section_order(target_page_id, ids);
  update public.website_pages set version = version + 1, updated_by = auth.uid() where id = target_page_id;
  perform private.s4_audit('section.reorder', 'website_page', target_page_id::text, 'success', jsonb_build_object('count', array_length(ids, 1)));
  perform private.website_touch(target_page_id, 'updated');
  return jsonb_build_object('ok', true, 'page_version', expected_page_version + 1);
end;
$$;

create or replace function public.move_website_section(
  target_section_id uuid,
  expected_page_version integer,
  direction text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  section public.website_page_sections%rowtype;
  ordered uuid[];
  position integer;
  swap integer;
  moved uuid;
begin
  if not private.has_permission('website.layout.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.layout.write is required.')));
  end if;
  select * into section from public.website_page_sections where id = target_section_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'section', 'Section does not exist.')));
  end if;
  if direction not in ('up', 'down') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_order', 'direction', 'Direction must be up or down.')));
  end if;
  ordered := array(select id from public.website_page_sections where page_id = section.page_id order by sort_order);
  position := array_position(ordered, section.id);
  swap := case when direction = 'up' then position - 1 else position + 1 end;
  if swap < 1 or swap > array_length(ordered, 1) then
    return jsonb_build_object('ok', true, 'page_version', expected_page_version, 'unchanged', true);
  end if;
  moved := ordered[swap];
  ordered[swap] := ordered[position];
  ordered[position] := moved;
  return public.reorder_website_sections(section.page_id, expected_page_version, to_jsonb(ordered));
end;
$$;

create or replace function public.duplicate_website_section(
  target_section_id uuid,
  expected_page_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  section public.website_page_sections%rowtype;
  locked record;
  new_id uuid;
  ordered uuid[];
  position integer;
begin
  if not private.has_permission('website.layout.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.layout.write is required.')));
  end if;
  select * into section from public.website_page_sections where id = target_section_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'section', 'Section does not exist.')));
  end if;
  locked := private.website_lock_page(section.page_id, expected_page_version);
  if locked.failure is not null then return locked.failure; end if;
  if section.locked or exists (select 1 from public.website_section_types where key = section.section_type and system_module) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'section', 'System modules cannot be duplicated.')));
  end if;
  if (select count(*) from public.website_page_sections where page_id = section.page_id) >= 40 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('limit_reached', 'sections', 'A page holds at most 40 sections.')));
  end if;
  insert into public.website_page_sections (page_id, section_type, variant, tone, spacing, motion, hidden, label, config, sort_order, created_by, updated_by)
  values (section.page_id, section.section_type, section.variant, section.tone, section.spacing, section.motion, section.hidden, section.label, section.config,
          (select max(sort_order) + 1 from public.website_page_sections where page_id = section.page_id), auth.uid(), auth.uid())
  returning id into new_id;
  ordered := array(select id from public.website_page_sections where page_id = section.page_id and id <> new_id order by sort_order);
  position := array_position(ordered, section.id);
  ordered := ordered[1:position] || new_id || ordered[position + 1:];
  perform private.website_apply_section_order(section.page_id, ordered);
  update public.website_pages set version = version + 1, updated_by = auth.uid() where id = section.page_id;
  perform private.s4_audit('section.create', 'website_page', section.page_id::text, 'success', jsonb_build_object('section_id', new_id, 'duplicated_from', section.id));
  perform private.website_touch(section.page_id, 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'page_version', expected_page_version + 1);
end;
$$;

create or replace function public.delete_website_section(
  target_section_id uuid,
  expected_page_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  section public.website_page_sections%rowtype;
  locked record;
  ordered uuid[];
begin
  if not private.has_permission('website.layout.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.layout.write is required.')));
  end if;
  select * into section from public.website_page_sections where id = target_section_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'section', 'Section does not exist.')));
  end if;
  locked := private.website_lock_page(section.page_id, expected_page_version);
  if locked.failure is not null then return locked.failure; end if;
  if section.locked then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'section', 'This section is a required module of the page and cannot be removed.')));
  end if;
  delete from public.website_page_sections where id = section.id;
  ordered := array(select id from public.website_page_sections where page_id = section.page_id order by sort_order);
  perform private.website_apply_section_order(section.page_id, ordered);
  update public.website_pages set version = version + 1, updated_by = auth.uid() where id = section.page_id;
  perform private.s4_audit('section.remove', 'website_page', section.page_id::text, 'success', jsonb_build_object('section_id', section.id, 'section_type', section.section_type));
  perform private.website_touch(section.page_id, 'updated');
  return jsonb_build_object('ok', true, 'page_version', expected_page_version + 1);
end;
$$;

-- Publish: freeze the draft as a coherent revision and make it current.
create or replace function public.publish_website_page(
  target_id uuid,
  expected_version integer,
  summary text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  snapshot jsonb;
  media uuid[];
  media_id uuid;
  next_no integer;
  new_revision uuid;
  blocking jsonb := '[]'::jsonb;
begin
  if not private.has_permission('website.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.publish is required.')));
  end if;
  locked := private.website_lock_page(target_id, expected_version);
  if locked.failure is not null then return locked.failure; end if;
  snapshot := private.website_page_snapshot(target_id);
  if (locked.page).page_type <> 'global' and jsonb_array_length(snapshot -> 'sections') = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'sections', 'Add at least one section before publishing.')));
  end if;
  media := private.website_snapshot_media_ids(snapshot);
  foreach media_id in array media loop
    if not private.website_media_is_current(media_id) then
      blocking := blocking || jsonb_build_array(private.failure('media_not_ready', 'media', 'An image on this page is not ready for public use. Confirm its rights in the Media library first.'));
      exit;
    end if;
  end loop;
  if (locked.page).page_type = 'custom' and (locked.page).noindex = false and (
       nullif(btrim(coalesce((locked.page).seo_description, '')), '') is null
     ) then
    -- A soft requirement: custom pages ship with a description so search
    -- snippets are never blank. System pages fall back to the site default.
    blocking := blocking || jsonb_build_array(private.failure('seo_incomplete', 'seo_description', 'Add a meta description before publishing this page (or mark it noindex).'));
  end if;
  if blocking <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'reasons', blocking);
  end if;
  select coalesce(max(revision_no), 0) + 1 into next_no from public.website_page_revisions where page_id = target_id;
  insert into public.website_page_revisions (page_id, revision_no, kind, summary, snapshot, media_ids, created_by)
  values (target_id, next_no, 'published', nullif(btrim(coalesce(summary, '')), ''), snapshot, media, auth.uid())
  returning id into new_revision;
  update public.website_pages
     set status = 'published',
         published_revision_id = new_revision,
         published_at = now(),
         published_by = auth.uid(),
         archived_at = null,
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('page.publish', 'website_page', target_id::text, 'success', jsonb_build_object('revision_no', next_no, 'revision_id', new_revision, 'path', (locked.page).path));
  perform private.website_touch(target_id, 'published');
  return jsonb_build_object('ok', true, 'id', target_id, 'revision_id', new_revision, 'revision_no', next_no, 'version', expected_version + 1, 'published_at', now());
end;
$$;

create or replace function public.unpublish_website_page(
  target_id uuid,
  expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  dependencies jsonb;
begin
  if not private.has_permission('website.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.publish is required.')));
  end if;
  locked := private.website_lock_page(target_id, expected_version);
  if locked.failure is not null then return locked.failure; end if;
  if (locked.page).page_type in ('system', 'global') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'page_type', 'System pages stay published; edit and republish them instead.')));
  end if;
  if (locked.page).status <> 'published' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'The page is not published.')));
  end if;
  dependencies := private.website_page_dependencies(target_id);
  if jsonb_array_length(dependencies) > 0 then
    return jsonb_build_object('ok', false, 'dependencies', dependencies, 'reasons', jsonb_build_array(private.failure('dependency_blocked', 'navigation', 'This page is linked from the navigation or another page. Remove those links first so nothing on the site breaks.')));
  end if;
  update public.website_pages
     set status = 'draft', published_revision_id = null, updated_by = auth.uid(), version = version + 1
   where id = target_id;
  perform private.s4_audit('page.unpublish', 'website_page', target_id::text, 'success', jsonb_build_object('path', (locked.page).path));
  perform private.website_touch(target_id, 'unpublished');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.archive_website_page(
  target_id uuid,
  expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
begin
  if not private.has_permission('website.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.publish is required.')));
  end if;
  locked := private.website_lock_page(target_id, expected_version);
  if locked.failure is not null then return locked.failure; end if;
  if (locked.page).page_type <> 'custom' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'page_type', 'Only custom pages can be archived.')));
  end if;
  if (locked.page).status = 'published' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'Unpublish the page before archiving it.')));
  end if;
  update public.website_pages set status = 'archived', archived_at = now(), updated_by = auth.uid(), version = version + 1 where id = target_id;
  perform private.s4_audit('page.archive', 'website_page', target_id::text, 'success', jsonb_build_object('path', (locked.page).path));
  perform private.website_touch(target_id, 'archived');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- Restore a revision as the new draft. History is never destroyed: the
-- current draft is kept as a restore point first.
create or replace function public.restore_website_page_revision(
  target_id uuid,
  expected_version integer,
  target_revision_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked record;
  revision public.website_page_revisions%rowtype;
  current_snapshot jsonb;
  next_no integer;
  section jsonb;
  index integer := 0;
begin
  if not private.has_permission('website.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.publish is required.')));
  end if;
  locked := private.website_lock_page(target_id, expected_version);
  if locked.failure is not null then return locked.failure; end if;
  select * into revision from public.website_page_revisions where id = target_revision_id and page_id = target_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'revision', 'Revision does not exist for this page.')));
  end if;
  current_snapshot := private.website_page_snapshot(target_id);
  select coalesce(max(revision_no), 0) + 1 into next_no from public.website_page_revisions where page_id = target_id;
  insert into public.website_page_revisions (page_id, revision_no, kind, summary, snapshot, media_ids, created_by)
  values (target_id, next_no, 'restore_point', 'Draft before restoring revision ' || revision.revision_no, current_snapshot, private.website_snapshot_media_ids(current_snapshot), auth.uid());
  delete from public.website_page_sections where page_id = target_id;
  for section in select value from jsonb_array_elements(revision.snapshot -> 'sections') loop
    insert into public.website_page_sections (page_id, section_type, variant, tone, spacing, motion, hidden, locked, label, config, sort_order, created_by, updated_by)
    values (
      target_id,
      section ->> 'type',
      coalesce(section ->> 'variant', 'default'),
      coalesce(section ->> 'tone', 'paper'),
      coalesce(section ->> 'spacing', 'standard'),
      coalesce(section ->> 'motion', 'standard'),
      coalesce((section ->> 'hidden')::boolean, false),
      coalesce((section ->> 'locked')::boolean, false),
      section ->> 'label',
      coalesce(section -> 'config', '{}'::jsonb),
      index, auth.uid(), auth.uid()
    );
    index := index + 1;
  end loop;
  update public.website_pages
     set title = coalesce(revision.snapshot #>> '{page,title}', title),
         seo_title = revision.snapshot #>> '{page,seo,title}',
         seo_description = revision.snapshot #>> '{page,seo,description}',
         og_media_id = case when (revision.snapshot #>> '{page,seo,og_media_id}') is null then null else (revision.snapshot #>> '{page,seo,og_media_id}')::uuid end,
         noindex = coalesce((revision.snapshot #>> '{page,seo,noindex}')::boolean, false),
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('revision.restore', 'website_page', target_id::text, 'success', jsonb_build_object('revision_no', revision.revision_no, 'restore_point_no', next_no));
  perform private.website_touch(target_id, 'restored');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'restored_revision_no', revision.revision_no);
end;
$$;

-- ---------------------------------------------------------------------
-- Public projection (anonymous, published only)
-- ---------------------------------------------------------------------

create or replace function public.public_website_page(target_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page public.website_pages%rowtype;
  revision public.website_page_revisions%rowtype;
begin
  if target_path is null or char_length(target_path) > 200 then
    return null;
  end if;
  select * into page from public.website_pages where path = target_path and status = 'published';
  if not found then
    return null;
  end if;
  select * into revision from public.website_page_revisions where id = page.published_revision_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'page', revision.snapshot -> 'page',
    'sections', coalesce((
      select jsonb_agg(section - 'locked' - 'hidden')
      from jsonb_array_elements(revision.snapshot -> 'sections') as section
      where coalesce((section ->> 'hidden')::boolean, false) = false
    ), '[]'::jsonb),
    'revision', jsonb_build_object('no', revision.revision_no, 'published_at', page.published_at, 'preview', false)
  );
end;
$$;

-- Published custom / content pages for the sitemap and navigation resolution.
create or replace function public.public_website_pages()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object('path', page.path, 'title', page.title, 'page_type', page.page_type, 'noindex', page.noindex, 'published_at', page.published_at) order by page.path)
    from public.website_pages as page
    where page.status = 'published' and page.page_type <> 'global'
  ), '[]'::jsonb);
$$;

create or replace function public.public_website_route_alias(source text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select alias.target_path
  from public.website_route_aliases as alias
  where alias.source_path = source
  limit 1;
$$;

-- Website media delivery: eligible when a published revision references the
-- asset (public), or an authorized staff reader previews a draft.
create or replace function public.resolve_website_media_path(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  asset record;
  eligible boolean;
begin
  if target_id is null then
    return null;
  end if;
  eligible := private.website_media_is_current(target_id) and private.website_media_is_published(target_id);
  if not eligible and not (private.has_permission('website.read') or private.has_permission('content.read')) then
    return null;
  end if;
  select bucket_id, object_path, mime_type into asset from public.media_assets where id = target_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object('bucket_id', asset.bucket_id, 'object_path', asset.object_path, 'mime_type', asset.mime_type);
end;
$$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

revoke all on function public.admin_list_website_pages() from public, anon, authenticated;
revoke all on function public.admin_get_website_page(uuid) from public, anon, authenticated;
revoke all on function public.admin_get_website_page_revision(uuid) from public, anon, authenticated;
revoke all on function public.admin_preview_website_page(uuid) from public, anon, authenticated;
revoke all on function public.create_website_page(text, text, text) from public, anon, authenticated;
revoke all on function public.update_website_page(uuid, integer, text, text, text, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.create_website_section(uuid, integer, text, jsonb, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.update_website_section(uuid, integer, jsonb, text, text, text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.reorder_website_sections(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.move_website_section(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.duplicate_website_section(uuid, integer) from public, anon, authenticated;
revoke all on function public.delete_website_section(uuid, integer) from public, anon, authenticated;
revoke all on function public.publish_website_page(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.unpublish_website_page(uuid, integer) from public, anon, authenticated;
revoke all on function public.archive_website_page(uuid, integer) from public, anon, authenticated;
revoke all on function public.restore_website_page_revision(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.public_website_page(text) from public, anon, authenticated;
revoke all on function public.public_website_pages() from public, anon, authenticated;
revoke all on function public.public_website_route_alias(text) from public, anon, authenticated;
revoke all on function public.resolve_website_media_path(uuid) from public, anon, authenticated;

grant execute on function public.admin_list_website_pages() to authenticated;
grant execute on function public.admin_get_website_page(uuid) to authenticated;
grant execute on function public.admin_get_website_page_revision(uuid) to authenticated;
grant execute on function public.admin_preview_website_page(uuid) to authenticated;
grant execute on function public.create_website_page(text, text, text) to authenticated;
grant execute on function public.update_website_page(uuid, integer, text, text, text, text, uuid, boolean) to authenticated;
grant execute on function public.create_website_section(uuid, integer, text, jsonb, text, text, text, integer) to authenticated;
grant execute on function public.update_website_section(uuid, integer, jsonb, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.reorder_website_sections(uuid, integer, jsonb) to authenticated;
grant execute on function public.move_website_section(uuid, integer, text) to authenticated;
grant execute on function public.duplicate_website_section(uuid, integer) to authenticated;
grant execute on function public.delete_website_section(uuid, integer) to authenticated;
grant execute on function public.publish_website_page(uuid, integer, text) to authenticated;
grant execute on function public.unpublish_website_page(uuid, integer) to authenticated;
grant execute on function public.archive_website_page(uuid, integer) to authenticated;
grant execute on function public.restore_website_page_revision(uuid, integer, uuid) to authenticated;
grant execute on function public.public_website_page(text) to anon, authenticated;
grant execute on function public.public_website_pages() to anon, authenticated;
grant execute on function public.public_website_route_alias(text) to anon, authenticated;
grant execute on function public.resolve_website_media_path(uuid) to anon, authenticated;

comment on table public.website_pages is
  'CR1 owner-managed public pages. Drafts live in website_pages/website_page_sections; the public reads the current published revision snapshot only.';
comment on table public.website_page_revisions is
  'CR1 page revisions: structured snapshots (content, ordering, SEO, media ids — never binary media). Restore never deletes history.';

-- ---------------------------------------------------------------------
-- Navigation: custom page links (extends the C7 facade in place)
-- ---------------------------------------------------------------------

-- Approved routes are updated; `page:<slug>` items are inserted, updated or
-- removed to match the submitted list. A custom page can only be linked
-- while it is published, so navigation never points at a missing page.
create or replace function public.update_navigation_settings(expected_version integer, items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflict jsonb;
  entry jsonb;
  key text;
  submitted text[] := '{}'::text[];
begin
  if not (private.has_permission('settings.website.write') or private.has_permission('website.navigation.write')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write or website.navigation.write is required.')));
  end if;
  if jsonb_typeof(items) <> 'array' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', 'Navigation items must be a list.')));
  end if;
  for entry in select * from jsonb_array_elements(items) loop
    key := entry ->> 'route_key';
    if key like 'page:%' and not exists (
      select 1 from public.website_pages as page
      where page.path = '/' || substr(key, 6) and page.status = 'published' and page.page_type in ('custom', 'content')
    ) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('dependency_blocked', 'items', 'Only published pages can be added to the navigation.')));
    end if;
  end loop;
  conflict := private.bump_domain_version('navigation', expected_version);
  if conflict is not null then return conflict; end if;
  begin
    for entry in select * from jsonb_array_elements(items) loop
      key := entry ->> 'route_key';
      submitted := submitted || key;
      if key like 'page:%' then
        insert into public.navigation_settings (route_key, label_override, visible, sort_order)
        values (key, nullif(btrim(entry ->> 'label'), ''), coalesce((entry ->> 'visible')::boolean, true), coalesce((entry ->> 'sort_order')::integer, 900))
        on conflict (route_key) do update
          set label_override = excluded.label_override, visible = excluded.visible, sort_order = excluded.sort_order, updated_at = now();
      else
        update public.navigation_settings
           set label_override = nullif(btrim(entry ->> 'label'), ''), visible = coalesce((entry ->> 'visible')::boolean, true),
               sort_order = coalesce((entry ->> 'sort_order')::integer, sort_order), updated_at = now()
         where route_key = key;
      end if;
    end loop;
    delete from public.navigation_settings where route_key like 'page:%' and not (route_key = any (submitted));
  exception when others then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', 'Navigation items are not valid.')));
  end;
  perform private.s4_audit('navigation.update', 'settings', 'navigation', 'success', jsonb_build_object('version', expected_version + 1, 'count', array_length(submitted, 1)));
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;
