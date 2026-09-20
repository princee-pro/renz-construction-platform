-- C7 — Business + Website + System configuration center.
--
-- Typed, owner-managed configuration domains (never a key/value dumping
-- ground), a draft → publish model with coherent public snapshots, a single
-- compact anonymous projection, legal pages with revisions, document and
-- operational defaults, staff visibility, and launch readiness. Secrets never
-- live here. Issued invoices / purchase orders keep their frozen snapshots.

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('settings.business.read', 'Read business settings', 'Read business profile, contact channels, location, hours and social links.', true),
  ('settings.business.write', 'Manage business settings', 'Edit and publish business profile, contact channels, location, hours and social links.', true),
  ('settings.website.read', 'Read website settings', 'Read website, navigation, brand media and SEO configuration.', true),
  ('settings.website.write', 'Manage website settings', 'Edit and publish website, navigation, brand media and SEO configuration.', true),
  ('settings.legal.read', 'Read legal pages', 'Read privacy, terms and cookie drafts and revisions.', true),
  ('settings.legal.write', 'Edit legal drafts', 'Edit privacy, terms and cookie page drafts.', true),
  ('settings.legal.publish', 'Publish legal pages', 'Publish a legal page revision to the public site.', true),
  ('settings.system.read', 'Read system settings', 'Read document defaults, operational thresholds and site mode.', true),
  ('settings.system.write', 'Manage system settings', 'Edit document defaults and operational thresholds.', true),
  ('staff.read', 'Read staff', 'Read the staff register (roles, status, MFA state).', true),
  ('staff.manage', 'Manage staff', 'Change staff roles, disable and reactivate staff accounts.', true)
on conflict (key) do update
set display_name = excluded.display_name, description = excluded.description, is_system = true;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'settings.business.read', 'settings.business.write', 'settings.website.read', 'settings.website.write',
  'settings.legal.read', 'settings.legal.write', 'settings.system.read', 'staff.read'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in ('settings.legal.publish', 'settings.system.write', 'staff.manage')
where roles.key = 'super_admin'
on conflict do nothing;

-- Realtime vocabulary: one settings entity type, existing actions.
alter table public.realtime_events drop constraint if exists realtime_events_entity_type_check;
alter table public.realtime_events add constraint realtime_events_entity_type_check
  check (entity_type in (
    'client', 'operational_project', 'invoice',
    'trade_partner', 'contractor_assignment', 'material', 'material_requirement', 'purchase_order',
    'settings'
  ));

-- ---------------------------------------------------------------------
-- Tables (singletons are pinned to id = 1)
-- ---------------------------------------------------------------------

create table public.business_profile (
  id integer primary key default 1 check (id = 1),
  display_name text not null default 'RENZ Construction Services Ltd',
  legal_name text,
  short_name text not null default 'RENZ',
  public_description text,
  tagline text,
  primary_email text not null default 'renzconstruuction@gmail.com',
  website_url text,
  timezone text not null default 'Africa/Kigali',
  default_locale text not null default 'en',
  country text,
  region text,
  mission_text text,
  approach_text text,
  service_area_text text,
  public_credentials_text text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint business_profile_display_name_check check (btrim(display_name) <> '' and char_length(display_name) <= 200),
  constraint business_profile_short_name_check check (btrim(short_name) <> '' and char_length(short_name) <= 60),
  constraint business_profile_email_check check (primary_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint business_profile_website_check check (website_url is null or website_url ~ '^https?://'),
  constraint business_profile_timezone_check check (timezone ~ '^[A-Za-z_]+(/[A-Za-z_+-]+)*$'),
  constraint business_profile_locale_check check (default_locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);
insert into public.business_profile (id) values (1) on conflict do nothing;

create table public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  channel_type text not null check (channel_type in ('email', 'whatsapp', 'phone', 'address', 'maps', 'website', 'social')),
  label text not null check (btrim(label) <> '' and char_length(label) <= 80),
  value text not null check (btrim(value) <> '' and char_length(value) <= 400),
  purpose text check (purpose is null or char_length(purpose) <= 200),
  is_public boolean not null default true,
  calling_enabled boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.business_location (
  id integer primary key default 1 check (id = 1),
  public_name text,
  street_address text,
  city text,
  region text,
  country text,
  postal_code text,
  latitude numeric(9, 6) check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude numeric(9, 6) check (longitude is null or (longitude >= -180 and longitude <= 180)),
  maps_url text check (maps_url is null or maps_url ~ '^https://'),
  directions_url text check (directions_url is null or directions_url ~ '^https://'),
  service_area_text text,
  publish_location boolean not null default false,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint business_location_coordinates_pair check ((latitude is null) = (longitude is null))
);
insert into public.business_location (id) values (1) on conflict do nothing;

create table public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  opens_at time,
  closes_at time,
  updated_at timestamptz not null default now(),
  constraint business_hours_times check (
    (not is_open and opens_at is null and closes_at is null)
    or (is_open and opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);
insert into public.business_hours (weekday) select generate_series(0, 6) on conflict do nothing;

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'linkedin', 'facebook', 'youtube', 'tiktok', 'x', 'other')),
  label text check (label is null or char_length(label) <= 60),
  url text not null check (url ~ '^https://' and char_length(url) <= 400),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint social_links_platform_unique unique (platform, url)
);

create table public.website_settings (
  id integer primary key default 1 check (id = 1),
  site_mode text not null default 'preview' check (site_mode in ('preview', 'live')),
  site_mode_changed_at timestamptz,
  site_mode_changed_by uuid references public.profiles (id) on delete set null,
  canonical_base_url text check (canonical_base_url is null or canonical_base_url ~ '^https?://[^/\s]+$'),
  homepage_cta_label text not null default 'Start a Project' check (btrim(homepage_cta_label) <> '' and char_length(homepage_cta_label) <= 60),
  homepage_cta_route text not null default 'start-a-project',
  secondary_cta_label text check (secondary_cta_label is null or char_length(secondary_cta_label) <= 60),
  secondary_cta_route text,
  footer_statement text check (footer_statement is null or char_length(footer_statement) <= 300),
  contact_intro text check (contact_intro is null or char_length(contact_intro) <= 1000),
  service_area_wording text check (service_area_wording is null or char_length(service_area_wording) <= 300),
  company_summary text check (company_summary is null or char_length(company_summary) <= 2000),
  announcement_text text check (announcement_text is null or char_length(announcement_text) <= 300),
  announcement_active boolean not null default false,
  analytics_enabled boolean not null default false,
  analytics_provider text check (analytics_provider is null or analytics_provider in ('none', 'plausible', 'umami', 'ga4', 'other')),
  consent_required boolean not null default false,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.website_settings (id) values (1) on conflict do nothing;

create table public.navigation_settings (
  route_key text primary key check (route_key in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')),
  label_override text check (label_override is null or (btrim(label_override) <> '' and char_length(label_override) <= 40)),
  visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.navigation_settings (route_key, sort_order) values
  ('services', 10), ('projects', 20), ('about', 30), ('insights', 40), ('contact', 50), ('start-a-project', 60)
on conflict do nothing;

create table public.brand_media_settings (
  id integer primary key default 1 check (id = 1),
  primary_logo_media_id uuid references public.media_assets (id) on delete set null,
  reversed_logo_media_id uuid references public.media_assets (id) on delete set null,
  favicon_media_id uuid references public.media_assets (id) on delete set null,
  default_og_media_id uuid references public.media_assets (id) on delete set null,
  default_share_media_id uuid references public.media_assets (id) on delete set null,
  default_hero_media_id uuid references public.media_assets (id) on delete set null,
  document_logo_media_id uuid references public.media_assets (id) on delete set null,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.brand_media_settings (id) values (1) on conflict do nothing;

create table public.seo_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'RENZ' check (btrim(site_name) <> '' and char_length(site_name) <= 80),
  title_template text not null default '%s | RENZ' check (position('%s' in title_template) > 0 and char_length(title_template) <= 120),
  meta_description text check (meta_description is null or char_length(meta_description) <= 320),
  organization_name text check (organization_name is null or char_length(organization_name) <= 200),
  organization_url text check (organization_url is null or organization_url ~ '^https?://'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.seo_settings (id) values (1) on conflict do nothing;

create table public.legal_pages (
  slug text primary key check (slug in ('privacy', 'terms', 'cookies')),
  draft_title text not null check (btrim(draft_title) <> '' and char_length(draft_title) <= 200),
  draft_body text not null default '' check (char_length(draft_body) <= 60000),
  draft_is_starter boolean not null default true,
  version integer not null default 1 check (version > 0),
  published_title text,
  published_body text,
  published_revision integer,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.legal_page_revisions (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.legal_pages (slug) on delete cascade,
  revision integer not null,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  constraint legal_page_revisions_unique unique (slug, revision)
);

create table public.document_defaults (
  id integer primary key default 1 check (id = 1),
  default_currency text not null default 'RWF' check (default_currency ~ '^[A-Z]{3}$'),
  allowed_currencies text[] not null default array['RWF', 'USD', 'EUR', 'GBP'],
  invoice_tax_label text not null default 'Tax' check (btrim(invoice_tax_label) <> '' and char_length(invoice_tax_label) <= 40),
  invoice_tax_rate numeric(5, 2) not null default 0 check (invoice_tax_rate >= 0 and invoice_tax_rate <= 100),
  invoice_payment_terms text check (invoice_payment_terms is null or char_length(invoice_payment_terms) <= 4000),
  invoice_due_days integer not null default 14 check (invoice_due_days between 0 and 365),
  po_tax_label text not null default 'Tax' check (btrim(po_tax_label) <> '' and char_length(po_tax_label) <= 40),
  po_tax_rate numeric(5, 2) not null default 0 check (po_tax_rate >= 0 and po_tax_rate <= 100),
  po_terms text check (po_terms is null or char_length(po_terms) <= 4000),
  po_expected_delivery_days integer not null default 7 check (po_expected_delivery_days between 0 and 365),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint document_defaults_allowed_currencies_check check (
    array_length(allowed_currencies, 1) between 1 and 12 and default_currency = any (allowed_currencies)
  )
);
insert into public.document_defaults (id) values (1) on conflict do nothing;

create table public.operational_settings (
  id integer primary key default 1 check (id = 1),
  project_ending_soon_days integer not null default 14 check (project_ending_soon_days between 1 and 120),
  invoice_due_soon_days integer not null default 7 check (invoice_due_soon_days between 1 and 120),
  stale_draft_invoice_days integer not null default 14 check (stale_draft_invoice_days between 1 and 365),
  assignment_ending_soon_days integer not null default 14 check (assignment_ending_soon_days between 1 and 120),
  material_required_soon_days integer not null default 14 check (material_required_soon_days between 1 and 120),
  po_expected_soon_days integer not null default 7 check (po_expected_soon_days between 1 and 120),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.operational_settings (id) values (1) on conflict do nothing;

-- Domain-level versions for list-shaped domains (contact channels, hours,
-- social links, navigation) so two editors of the same list conflict.
create table public.settings_domain_versions (
  domain text primary key check (domain in ('contact_channels', 'business_hours', 'social_links', 'navigation')),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.settings_domain_versions (domain) values ('contact_channels'), ('business_hours'), ('social_links'), ('navigation')
on conflict do nothing;

-- Coherent public configuration snapshots (append-only; exactly one current).
create table public.public_configuration_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot jsonb not null,
  note text check (note is null or char_length(note) <= 300),
  is_current boolean not null default true,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null
);
create unique index public_configuration_snapshots_current_idx
  on public.public_configuration_snapshots (is_current) where is_current;

alter table public.realtime_events drop constraint if exists realtime_events_action_check;
alter table public.realtime_events add constraint realtime_events_action_check
  check (action in (
    'created', 'updated', 'status_changed', 'phase_changed', 'priority_changed',
    'case_study_linked', 'case_study_unlinked', 'archived', 'note_created',
    'issued', 'voided', 'payment_recorded', 'payment_reversed', 'share_created', 'share_revoked',
    'capability_changed', 'adjusted', 'rated', 'approved', 'cancelled', 'closed',
    'receipt_recorded', 'receipt_reversed', 'published'
  ));

-- Profile-reference maintenance indexes (S2 rule: every profile FK is indexed).
create index business_profile_updated_by_idx on public.business_profile (updated_by);
create index contact_channels_updated_by_idx on public.contact_channels (updated_by);
create index business_location_updated_by_idx on public.business_location (updated_by);
create index social_links_updated_by_idx on public.social_links (updated_by);
create index website_settings_updated_by_idx on public.website_settings (updated_by);
create index website_settings_site_mode_changed_by_idx on public.website_settings (site_mode_changed_by);
create index brand_media_settings_updated_by_idx on public.brand_media_settings (updated_by);
create index seo_settings_updated_by_idx on public.seo_settings (updated_by);
create index legal_pages_updated_by_idx on public.legal_pages (updated_by);
create index legal_pages_published_by_idx on public.legal_pages (published_by);
create index legal_page_revisions_published_by_idx on public.legal_page_revisions (published_by);
create index document_defaults_updated_by_idx on public.document_defaults (updated_by);
create index operational_settings_updated_by_idx on public.operational_settings (updated_by);
create index settings_domain_versions_updated_by_idx on public.settings_domain_versions (updated_by);
create index public_configuration_snapshots_published_by_idx on public.public_configuration_snapshots (published_by);

-- Touch triggers
create trigger business_profile_touch before update on public.business_profile for each row execute function private.touch_mutable_row();
create trigger business_location_touch before update on public.business_location for each row execute function private.touch_mutable_row();
create trigger website_settings_touch before update on public.website_settings for each row execute function private.touch_mutable_row();
create trigger brand_media_settings_touch before update on public.brand_media_settings for each row execute function private.touch_mutable_row();
create trigger seo_settings_touch before update on public.seo_settings for each row execute function private.touch_mutable_row();
create trigger document_defaults_touch before update on public.document_defaults for each row execute function private.touch_mutable_row();
create trigger operational_settings_touch before update on public.operational_settings for each row execute function private.touch_mutable_row();

-- Default-deny RLS on everything; facades are the only path.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_profile', 'contact_channels', 'business_location', 'business_hours', 'social_links',
    'website_settings', 'navigation_settings', 'brand_media_settings', 'seo_settings',
    'legal_pages', 'legal_page_revisions', 'document_defaults', 'operational_settings',
    'settings_domain_versions', 'public_configuration_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;

-- Legal starter drafts (DRAFT, not published, marked as starter text).
insert into public.legal_pages (slug, draft_title, draft_body, draft_is_starter) values
  ('privacy', 'Privacy Notice (draft)', E'DRAFT — starter text prepared from the actual behaviour of this application. It is not legal advice and must be reviewed and published by the RENZ owner before it appears publicly.\n\n## What this website collects\n\n- Public pages can be read without an account. No visitor analytics or session replay run at present.\n- Contact happens by email or WhatsApp on the visitor''s own device; the website itself does not send messages.\n- The "Start a Project" form is being prepared; when it goes live, submitted project details and any supporting material will be stored so RENZ can respond.\n\n## Secure document links\n\nRENZ may send clients a private invoice link and suppliers a private purchase order link. Anyone holding a link can view that one document; links can be revoked by RENZ.\n\n## Staff access\n\nStaff sign in with a password and a second factor. Security-relevant staff actions are logged.\n\n## Cookies and local storage\n\nThe public website sets no tracking cookies. The staff area uses session cookies required to stay signed in. If visitor analytics are introduced later, this notice and any consent prompt will be updated first.\n\n## Contact\n\nQuestions about this notice can be sent to the public RENZ email address shown on the Contact page.', true),
  ('terms', 'Terms of Use (draft)', E'DRAFT — starter text prepared from the actual behaviour of this application. It is not legal advice and must be reviewed and published by the RENZ owner before it appears publicly.\n\n## Use of this website\n\nThe content on this website describes RENZ Construction Services Ltd and its services. Project material marked as a concept study is illustrative and not a record of completed client work.\n\n## No offer\n\nInformation on this website is general. Any engagement is governed by the written agreement, quotation, invoice or purchase order issued for that work.\n\n## Documents shared by link\n\nInvoices and purchase orders shared by private link are provided for the recipient named on them. Do not forward links you were not given.\n\n## Changes\n\nRENZ may update these terms. The published version on this page applies.', true),
  ('cookies', 'Cookie Notice (draft)', E'DRAFT — starter text. The public website currently sets no analytics or advertising cookies. The staff area uses strictly necessary session cookies. If analytics are enabled later, this notice will describe them and any consent choices before they run.', true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------

create or replace function private.settings_entity_id(domain text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select ('00000000-0000-4000-8000-0000000000' || lpad(to_hex(abs(hashtext(domain)) % 256), 2, '0'))::uuid;
$$;

create or replace function private.operational_setting(setting_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case setting_key
    when 'project_ending_soon_days' then s.project_ending_soon_days
    when 'invoice_due_soon_days' then s.invoice_due_soon_days
    when 'stale_draft_invoice_days' then s.stale_draft_invoice_days
    when 'assignment_ending_soon_days' then s.assignment_ending_soon_days
    when 'material_required_soon_days' then s.material_required_soon_days
    when 'po_expected_soon_days' then s.po_expected_soon_days
    else null end
  from public.operational_settings as s where s.id = 1;
$$;
revoke all on function private.operational_setting(text) from public, anon, authenticated;

create or replace function private.whatsapp_digits(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when length(regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g')) between 8 and 15
    then regexp_replace(raw, '[^0-9]', '', 'g') else null end;
$$;

create or replace function private.contact_channel_href(channel_type text, value text, calling_enabled boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case channel_type
    when 'email' then 'mailto:' || value
    when 'whatsapp' then case when private.whatsapp_digits(value) is null then null else 'https://wa.me/' || private.whatsapp_digits(value) end
    when 'phone' then case when calling_enabled and private.whatsapp_digits(value) is not null then 'tel:+' || private.whatsapp_digits(value) else null end
    when 'maps' then case when value ~ '^https://' then value else null end
    when 'website' then case when value ~ '^https?://' then value else null end
    when 'social' then case when value ~ '^https://' then value else null end
    else null end;
$$;

create or replace function private.brand_media_public(media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.media_assets
    where id = media_id and storage_state = 'public_eligible'
      and rights_status = 'cleared' and public_use_permission = 'granted'
  );
$$;
revoke all on function private.brand_media_public(uuid) from public, anon, authenticated;

-- Builds the coherent public snapshot from current drafts. Only public
-- fields; private notes, thresholds, document defaults and staff never enter.
create or replace function private.build_public_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile public.business_profile%rowtype;
  location public.business_location%rowtype;
  site public.website_settings%rowtype;
  brand public.brand_media_settings%rowtype;
  seo public.seo_settings%rowtype;
  whatsapp_value text;
begin
  select * into profile from public.business_profile where id = 1;
  select * into location from public.business_location where id = 1;
  select * into site from public.website_settings where id = 1;
  select * into brand from public.brand_media_settings where id = 1;
  select * into seo from public.seo_settings where id = 1;
  select value into whatsapp_value from public.contact_channels
   where channel_type = 'whatsapp' and is_public and active order by sort_order, created_at limit 1;
  return jsonb_strip_nulls(jsonb_build_object(
    'business', jsonb_build_object(
      'display_name', profile.display_name, 'legal_name', profile.legal_name, 'short_name', profile.short_name,
      'description', profile.public_description, 'tagline', profile.tagline, 'primary_email', profile.primary_email,
      'website_url', profile.website_url, 'timezone', profile.timezone, 'default_locale', profile.default_locale,
      'country', profile.country, 'region', profile.region, 'mission', profile.mission_text,
      'approach', profile.approach_text, 'service_area', profile.service_area_text,
      'credentials', profile.public_credentials_text
    ),
    'contact', jsonb_build_object(
      'primary_email', profile.primary_email,
      'whatsapp_digits', private.whatsapp_digits(whatsapp_value),
      'channels', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id, 'type', c.channel_type, 'label', c.label, 'value', c.value,
          'href', private.contact_channel_href(c.channel_type, c.value, c.calling_enabled),
          'calling_enabled', c.channel_type in ('whatsapp', 'phone') and c.calling_enabled,
          'sort_order', c.sort_order
        ) order by c.sort_order, c.created_at)
        from public.contact_channels as c where c.is_public and c.active
      ), '[]'::jsonb)
    ),
    'location', case when location.publish_location and (location.street_address is not null or location.city is not null or location.maps_url is not null) then
      jsonb_build_object(
        'name', location.public_name, 'street', location.street_address, 'city', location.city, 'region', location.region,
        'country', location.country, 'postal_code', location.postal_code, 'latitude', location.latitude, 'longitude', location.longitude,
        'maps_url', location.maps_url, 'directions_url', location.directions_url, 'service_area', location.service_area_text
      ) else null end,
    'hours', case when exists (select 1 from public.business_hours where is_open) then (
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'is_open', h.is_open,
        'opens_at', to_char(h.opens_at, 'HH24:MI'), 'closes_at', to_char(h.closes_at, 'HH24:MI')) order by h.weekday)
      from public.business_hours as h) else null end,
    'social', coalesce((
      select jsonb_agg(jsonb_build_object('platform', s.platform, 'label', s.label, 'url', s.url, 'sort_order', s.sort_order) order by s.sort_order, s.created_at)
      from public.social_links as s where s.active), '[]'::jsonb),
    'website', jsonb_build_object(
      'canonical_base_url', site.canonical_base_url,
      'homepage_cta_label', site.homepage_cta_label, 'homepage_cta_route', site.homepage_cta_route,
      'secondary_cta_label', site.secondary_cta_label, 'secondary_cta_route', site.secondary_cta_route,
      'footer_statement', site.footer_statement, 'contact_intro', site.contact_intro,
      'service_area_wording', site.service_area_wording, 'company_summary', site.company_summary,
      'announcement', case when site.announcement_active then site.announcement_text end,
      'analytics_enabled', site.analytics_enabled, 'analytics_provider', site.analytics_provider,
      'consent_required', site.consent_required
    ),
    'navigation', coalesce((
      select jsonb_agg(jsonb_build_object('route_key', n.route_key, 'label', n.label_override, 'visible', n.visible, 'sort_order', n.sort_order) order by n.sort_order, n.route_key)
      from public.navigation_settings as n), '[]'::jsonb),
    'brand', jsonb_build_object(
      'primary_logo', private.brand_media_public(brand.primary_logo_media_id),
      'reversed_logo', private.brand_media_public(brand.reversed_logo_media_id),
      'favicon', private.brand_media_public(brand.favicon_media_id),
      'default_og', private.brand_media_public(brand.default_og_media_id),
      'default_share', private.brand_media_public(brand.default_share_media_id),
      'default_hero', private.brand_media_public(brand.default_hero_media_id),
      'document_logo', private.brand_media_public(brand.document_logo_media_id)
    ),
    'seo', jsonb_build_object(
      'site_name', seo.site_name, 'title_template', seo.title_template, 'meta_description', seo.meta_description,
      'organization_name', coalesce(seo.organization_name, profile.display_name),
      'organization_url', coalesce(seo.organization_url, site.canonical_base_url)
    )
  ));
end;
$$;
revoke all on function private.build_public_configuration() from public, anon, authenticated;

create or replace function private.current_public_configuration()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.snapshot || jsonb_build_object('published_at', s.published_at, 'snapshot_id', s.id)
       from public.public_configuration_snapshots as s where s.is_current limit 1),
    '{}'::jsonb
  );
$$;
revoke all on function private.current_public_configuration() from public, anon, authenticated;

-- The C5/C6 issuer identity now reads the PUBLISHED business configuration
-- (documents issued earlier keep their own frozen snapshot).
create or replace function private.invoice_issuer_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', coalesce(cfg #>> '{business,display_name}', 'RENZ Construction Services Ltd'),
    'email', coalesce(cfg #>> '{contact,primary_email}', 'renzconstruuction@gmail.com'),
    'whatsapp', case when cfg #>> '{contact,whatsapp_digits}' is not null then '+' || (cfg #>> '{contact,whatsapp_digits}') else '+44 7412 853143' end,
    'website', cfg #>> '{business,website_url}',
    'tax_label', coalesce((select d.invoice_tax_label from public.document_defaults as d where d.id = 1), 'Tax')
  ))
  from (select private.current_public_configuration() as cfg) as c;
$$;
revoke all on function private.invoice_issuer_snapshot() from public, anon, authenticated;

-- Launch readiness: deterministic, READY / WARNING / BLOCKED per check.
create or replace function private.launch_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile public.business_profile%rowtype;
  location public.business_location%rowtype;
  site public.website_settings%rowtype;
  brand public.brand_media_settings%rowtype;
  seo public.seo_settings%rowtype;
  cfg jsonb := private.current_public_configuration();
  checks jsonb := '[]'::jsonb;
  has_whatsapp boolean;
  privacy_published boolean;
  terms_published boolean;
  unpublished_drafts boolean;
begin
  select * into profile from public.business_profile where id = 1;
  select * into location from public.business_location where id = 1;
  select * into site from public.website_settings where id = 1;
  select * into brand from public.brand_media_settings where id = 1;
  select * into seo from public.seo_settings where id = 1;
  has_whatsapp := exists (select 1 from public.contact_channels where channel_type = 'whatsapp' and is_public and active and private.whatsapp_digits(value) is not null);
  privacy_published := exists (select 1 from public.legal_pages where slug = 'privacy' and published_body is not null);
  terms_published := exists (select 1 from public.legal_pages where slug = 'terms' and published_body is not null);
  unpublished_drafts := cfg = '{}'::jsonb or private.build_public_configuration() is distinct from (cfg - 'published_at' - 'snapshot_id');

  checks := checks
    || jsonb_build_object('key', 'business_identity', 'label', 'Business identity configured', 'classification', 'required',
         'state', case when btrim(profile.display_name) <> '' and profile.primary_email is not null then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'public_email', 'label', 'Public email published', 'classification', 'required',
         'state', case when cfg #>> '{contact,primary_email}' is not null then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'whatsapp', 'label', 'WhatsApp channel configured', 'classification', 'required',
         'state', case when has_whatsapp then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'location', 'label', 'Location published', 'classification', 'optional',
         'state', case when location.publish_location then 'ready' else 'warning' end,
         'detail', case when location.publish_location then null else 'Location is omitted from the public site until configured and published.' end)
    || jsonb_build_object('key', 'seo_title', 'label', 'SEO site name and title template', 'classification', 'required',
         'state', case when btrim(seo.site_name) <> '' and seo.title_template like '%\%s%' then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'seo_description', 'label', 'Default meta description', 'classification', 'required',
         'state', case when coalesce(char_length(seo.meta_description), 0) between 40 and 320 then 'ready' when seo.meta_description is null then 'blocked' else 'warning' end)
    || jsonb_build_object('key', 'canonical_url', 'label', 'Canonical site URL', 'classification', 'required',
         'state', case when site.canonical_base_url ~ '^https://' then 'ready' when site.canonical_base_url is not null then 'warning' else 'blocked' end)
    || jsonb_build_object('key', 'og_image', 'label', 'Default social/OG image', 'classification', 'recommended',
         'state', case when private.brand_media_public(coalesce(brand.default_og_media_id, brand.default_share_media_id)) then 'ready' else 'warning' end)
    || jsonb_build_object('key', 'logo', 'label', 'Primary logo media', 'classification', 'recommended',
         'state', case when private.brand_media_public(brand.primary_logo_media_id) then 'ready' else 'warning' end,
         'detail', case when private.brand_media_public(brand.primary_logo_media_id) then null else 'The working RENZ mark renders until a logo asset is selected.' end)
    || jsonb_build_object('key', 'privacy_published', 'label', 'Privacy notice published', 'classification', 'required',
         'state', case when privacy_published then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'terms_published', 'label', 'Terms of use published', 'classification', 'required',
         'state', case when terms_published then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'configuration_published', 'label', 'Public configuration published (no unpublished changes)', 'classification', 'required',
         'state', case when cfg = '{}'::jsonb then 'blocked' when unpublished_drafts then 'warning' else 'ready' end)
    || jsonb_build_object('key', 'site_mode', 'label', 'Site mode', 'classification', 'info',
         'state', case when site.site_mode = 'live' then 'ready' else 'warning' end, 'detail', 'Currently ' || site.site_mode || '.')
    || jsonb_build_object('key', 'start_project', 'label', 'Start-a-Project intake', 'classification', 'recommended',
         'state', 'warning', 'detail', 'Real intake arrives in C8; the current page routes visitors to WhatsApp and email.')
    || jsonb_build_object('key', 'analytics', 'label', 'Analytics', 'classification', 'optional',
         'state', case when site.analytics_enabled then 'warning' else 'ready' end,
         'detail', case when site.analytics_enabled then 'Analytics is flagged on but the provider integration arrives in C9; consent_required = ' || site.consent_required::text else 'No visitor analytics run; no consent prompt is needed.' end);
  return jsonb_build_object(
    'checks', checks,
    'overall', case
      when exists (select 1 from jsonb_array_elements(checks) as c where c ->> 'state' = 'blocked' and c ->> 'classification' = 'required') then 'blocked'
      when exists (select 1 from jsonb_array_elements(checks) as c where c ->> 'state' in ('warning', 'blocked')) then 'warning'
      else 'ready' end,
    'evidence', jsonb_build_array(
      jsonb_build_object('key', 'real_project_evidence', 'label', 'Real project evidence (photos, scope, client permission)', 'classification', 'required',
        'state', case when exists (select 1 from public.projects where private.is_public_content('project', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'testimonials', 'label', 'Approved client testimonials', 'classification', 'recommended',
        'state', case when exists (select 1 from public.testimonials where private.is_public_content('testimonial', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'team_profiles', 'label', 'Team profiles', 'classification', 'optional',
        'state', case when exists (select 1 from public.team_members where private.is_public_content('team_member', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'credentials', 'label', 'Verified credentials / certifications', 'classification', 'recommended',
        'state', case when exists (select 1 from public.credentials where private.is_public_content('credential', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'office_location', 'label', 'Office address / location', 'classification', 'optional',
        'state', case when location.publish_location then 'ready' else 'warning' end),
      jsonb_build_object('key', 'registration_details', 'label', 'Business registration details (legal name, country)', 'classification', 'recommended',
        'state', case when profile.legal_name is not null and profile.country is not null then 'ready' else 'warning' end),
      jsonb_build_object('key', 'tax_details', 'label', 'Tax label / rate confirmed by the owner', 'classification', 'recommended',
        'state', case when (select d.version from public.document_defaults as d where d.id = 1) > 1 then 'ready' else 'warning' end),
      jsonb_build_object('key', 'payment_instructions', 'label', 'Bank / payment instructions for invoices', 'classification', 'recommended',
        'state', case when (select d.invoice_payment_terms from public.document_defaults as d where d.id = 1) is not null then 'ready' else 'warning' end),
      jsonb_build_object('key', 'social_profiles', 'label', 'Social profiles', 'classification', 'optional',
        'state', case when exists (select 1 from public.social_links where active) then 'ready' else 'warning' end)
    )
  );
end;
$$;
revoke all on function private.launch_readiness() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Public projection (anon) — compact, published only
-- ---------------------------------------------------------------------

create or replace function public.public_site_configuration()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_public_configuration()
    || jsonb_build_object(
      'site_mode', (select site_mode from public.website_settings where id = 1),
      'legal', (select coalesce(jsonb_object_agg(slug, jsonb_build_object('published', published_body is not null, 'title', published_title, 'updated_at', published_at)), '{}'::jsonb)
                from public.legal_pages)
    );
$$;
grant execute on function public.public_site_configuration() to anon, authenticated;

create or replace function public.public_legal_page(target_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('slug', slug, 'title', published_title, 'body', published_body, 'revision', published_revision, 'published_at', published_at)
  from public.legal_pages
  where slug = target_slug and published_body is not null;
$$;
grant execute on function public.public_legal_page(text) to anon, authenticated;

create or replace function public.resolve_brand_media_path(target_slot text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  brand public.brand_media_settings%rowtype;
  media_id uuid;
  asset record;
begin
  select * into brand from public.brand_media_settings where id = 1;
  media_id := case target_slot
    when 'primary_logo' then brand.primary_logo_media_id
    when 'reversed_logo' then brand.reversed_logo_media_id
    when 'favicon' then brand.favicon_media_id
    when 'default_og' then brand.default_og_media_id
    when 'default_share' then brand.default_share_media_id
    when 'default_hero' then brand.default_hero_media_id
    when 'document_logo' then brand.document_logo_media_id
    else null end;
  if media_id is null or not private.brand_media_public(media_id) then
    return null;
  end if;
  -- Only the published snapshot exposes a slot publicly; staff may preview.
  if not coalesce((private.current_public_configuration() #> array['brand', target_slot])::boolean, false)
     and not private.has_permission('settings.website.read') then
    return null;
  end if;
  select bucket_id, object_path, mime_type into asset from public.media_assets where id = media_id;
  return jsonb_build_object('bucket_id', asset.bucket_id, 'object_path', asset.object_path, 'mime_type', asset.mime_type);
end;
$$;
grant execute on function public.resolve_brand_media_path(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Admin reads
-- ---------------------------------------------------------------------

create or replace function public.admin_settings_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg jsonb;
  business_ok boolean := private.has_permission('settings.business.read');
  website_ok boolean := private.has_permission('settings.website.read');
  legal_ok boolean := private.has_permission('settings.legal.read');
  system_ok boolean := private.has_permission('settings.system.read');
  staff_ok boolean := private.has_permission('staff.read');
begin
  if not (business_ok or website_ok or legal_ok or system_ok or staff_ok) then
    raise exception using errcode = '42501', message = 'settings overview is not authorized';
  end if;
  cfg := private.current_public_configuration();
  return jsonb_build_object(
    'site_mode', (select site_mode from public.website_settings where id = 1),
    'published_at', cfg ->> 'published_at',
    'has_unpublished_changes', cfg = '{}'::jsonb or private.build_public_configuration() is distinct from (cfg - 'published_at' - 'snapshot_id'),
    'domains', jsonb_build_object(
      'business', case when business_ok then jsonb_build_object(
        'display_name', (select display_name from public.business_profile where id = 1),
        'email', (select primary_email from public.business_profile where id = 1),
        'channel_count', (select count(*) from public.contact_channels where active and is_public),
        'location_published', (select publish_location from public.business_location where id = 1),
        'social_count', (select count(*) from public.social_links where active)) end,
      'website', case when website_ok then jsonb_build_object(
        'canonical_base_url', (select canonical_base_url from public.website_settings where id = 1),
        'seo_site_name', (select site_name from public.seo_settings where id = 1),
        'meta_description_set', (select meta_description is not null from public.seo_settings where id = 1),
        'logo_set', (select private.brand_media_public(primary_logo_media_id) from public.brand_media_settings where id = 1)) end,
      'legal', case when legal_ok then (select jsonb_object_agg(slug, jsonb_build_object('published', published_body is not null, 'starter', draft_is_starter, 'revision', published_revision)) from public.legal_pages) end,
      'system', case when system_ok then jsonb_build_object(
        'default_currency', (select default_currency from public.document_defaults where id = 1),
        'invoice_tax_label', (select invoice_tax_label from public.document_defaults where id = 1)) end,
      'staff', case when staff_ok then jsonb_build_object(
        'active', (select count(*) from public.profiles where account_status = 'active'),
        'disabled', (select count(*) from public.profiles where account_status = 'disabled')) end
    ),
    'readiness', case when website_ok or system_ok then private.launch_readiness() -> 'overall' end
  );
end;
$$;

create or replace function public.admin_get_business_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('settings.business.read') then
    raise exception using errcode = '42501', message = 'business settings are not authorized';
  end if;
  return jsonb_build_object(
    'profile', (select to_jsonb(p) - 'updated_by' from public.business_profile as p where p.id = 1),
    'channels', coalesce((select jsonb_agg(to_jsonb(c) - 'updated_by' order by c.sort_order, c.created_at) from public.contact_channels as c), '[]'::jsonb),
    'location', (select to_jsonb(l) - 'updated_by' from public.business_location as l where l.id = 1),
    'hours', (select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'is_open', h.is_open, 'opens_at', to_char(h.opens_at, 'HH24:MI'), 'closes_at', to_char(h.closes_at, 'HH24:MI')) order by h.weekday) from public.business_hours as h),
    'social', coalesce((select jsonb_agg(to_jsonb(s) - 'updated_by' order by s.sort_order, s.created_at) from public.social_links as s), '[]'::jsonb),
    'domain_versions', (select jsonb_object_agg(domain, version) from public.settings_domain_versions),
    'published', private.current_public_configuration(),
    'preview', private.build_public_configuration()
  );
end;
$$;

create or replace function public.admin_get_website_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('settings.website.read') then
    raise exception using errcode = '42501', message = 'website settings are not authorized';
  end if;
  return jsonb_build_object(
    'website', (select to_jsonb(w) - 'updated_by' - 'site_mode_changed_by' from public.website_settings as w where w.id = 1),
    'navigation', (select jsonb_agg(to_jsonb(n) order by n.sort_order, n.route_key) from public.navigation_settings as n),
    'brand', (select jsonb_build_object(
        'version', b.version,
        'slots', jsonb_build_object(
          'primary_logo', private.brand_media_summary(b.primary_logo_media_id),
          'reversed_logo', private.brand_media_summary(b.reversed_logo_media_id),
          'favicon', private.brand_media_summary(b.favicon_media_id),
          'default_og', private.brand_media_summary(b.default_og_media_id),
          'default_share', private.brand_media_summary(b.default_share_media_id),
          'default_hero', private.brand_media_summary(b.default_hero_media_id),
          'document_logo', private.brand_media_summary(b.document_logo_media_id)))
      from public.brand_media_settings as b where b.id = 1),
    'seo', (select to_jsonb(s) - 'updated_by' from public.seo_settings as s where s.id = 1),
    'domain_versions', (select jsonb_object_agg(domain, version) from public.settings_domain_versions),
    'published', private.current_public_configuration(),
    'preview', private.build_public_configuration(),
    'is_super_admin', private.is_current_super_admin()
  );
end;
$$;

create or replace function private.brand_media_summary(media_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when media_id is null then null else (
    select jsonb_build_object('id', m.id, 'filename', m.original_filename, 'mime_type', m.mime_type, 'width', m.width, 'height', m.height,
      'public_eligible', private.brand_media_public(m.id))
    from public.media_assets as m where m.id = media_id) end;
$$;
revoke all on function private.brand_media_summary(uuid) from public, anon, authenticated;

create or replace function public.admin_list_brand_media_candidates(search_query text default null, limit_count integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('settings.website.read') then
    raise exception using errcode = '42501', message = 'brand media candidates are not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 25 then limit_count := 12; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'filename', m.original_filename, 'mime_type', m.mime_type, 'width', m.width, 'height', m.height))
    from (
      select * from public.media_assets
      where storage_state = 'public_eligible' and rights_status = 'cleared' and public_use_permission = 'granted'
        and mime_type like 'image/%'
        and (normalized is null or original_filename ilike '%' || normalized || '%')
      order by updated_at desc limit limit_count
    ) as m
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_legal_pages()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('settings.legal.read') then
    raise exception using errcode = '42501', message = 'legal pages are not authorized';
  end if;
  return jsonb_build_object(
    'pages', (select jsonb_agg(jsonb_build_object('slug', p.slug, 'draft_title', p.draft_title, 'draft_body', p.draft_body,
        'draft_is_starter', p.draft_is_starter, 'version', p.version, 'published_title', p.published_title,
        'published_body', p.published_body, 'published_revision', p.published_revision, 'published_at', p.published_at,
        'published_by', publisher.display_name, 'updated_at', p.updated_at,
        'has_unpublished_changes', p.published_body is distinct from p.draft_body or p.published_title is distinct from p.draft_title,
        'revisions', coalesce((select jsonb_agg(jsonb_build_object('revision', r.revision, 'published_at', r.published_at, 'published_by', rp.display_name) order by r.revision desc)
          from public.legal_page_revisions as r left join public.profiles as rp on rp.id = r.published_by where r.slug = p.slug), '[]'::jsonb)
      ) order by p.slug)
      from public.legal_pages as p left join public.profiles as publisher on publisher.id = p.published_by),
    'can_publish', private.has_permission('settings.legal.publish')
  );
end;
$$;

create or replace function public.admin_get_system_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('settings.system.read') then
    raise exception using errcode = '42501', message = 'system settings are not authorized';
  end if;
  return jsonb_build_object(
    'document_defaults', (select to_jsonb(d) - 'updated_by' from public.document_defaults as d where d.id = 1),
    'operational', (select to_jsonb(o) - 'updated_by' from public.operational_settings as o where o.id = 1),
    'numbering', jsonb_build_object(
      'invoice_pattern', 'RENZ-YYYY-NNNNNN',
      'purchase_order_pattern', 'RENZ-PO-YYYY-NNNNNN',
      'invoice_counters', coalesce((select jsonb_object_agg(year_key, last_value) from public.invoice_number_counters), '{}'::jsonb),
      'purchase_order_counters', coalesce((select jsonb_object_agg(year_key, last_value) from public.purchase_order_number_counters), '{}'::jsonb)),
    'site_mode', (select site_mode from public.website_settings where id = 1),
    'website_version', (select version from public.website_settings where id = 1),
    'can_write', private.has_permission('settings.system.write'),
    'is_super_admin', private.is_current_super_admin()
  );
end;
$$;

create or replace function public.admin_launch_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('settings.website.read') or private.has_permission('settings.system.read')) then
    raise exception using errcode = '42501', message = 'launch readiness is not authorized';
  end if;
  return private.launch_readiness() || jsonb_build_object(
    'site_mode', (select site_mode from public.website_settings where id = 1),
    'website_version', (select version from public.website_settings where id = 1),
    'is_super_admin', private.is_current_super_admin());
end;
$$;

create or replace function public.admin_list_staff()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('staff.read') then
    raise exception using errcode = '42501', message = 'staff register is not authorized';
  end if;
  return jsonb_build_object(
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'email', u.email, 'account_status', p.account_status,
        'roles', coalesce((select jsonb_agg(r.key order by r.key) from public.user_roles as ur join public.roles as r on r.id = ur.role_id where ur.user_id = p.id), '[]'::jsonb),
        'mfa_enrolled', exists (select 1 from auth.mfa_factors as f where f.user_id = p.id and f.status = 'verified'),
        'last_sign_in_at', u.last_sign_in_at, 'created_at', p.created_at,
        'last_activity_at', (select max(occurred_at) from public.audit_logs as a where a.actor_id = p.id),
        'is_self', p.id = auth.uid()
      ) order by p.display_name, u.email)
      from public.profiles as p join auth.users as u on u.id = p.id), '[]'::jsonb),
    'roles', (select jsonb_agg(key order by key) from public.roles),
    'can_manage', private.has_permission('staff.manage') and private.is_current_super_admin()
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Admin writes (versioned, audited, realtime pointers)
-- ---------------------------------------------------------------------

create or replace function private.settings_touch(domain text, action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.emit_realtime_event('settings', private.settings_entity_id(domain), action);
end;
$$;
revoke all on function private.settings_touch(text, text) from public, anon, authenticated;

create or replace function private.bump_domain_version(target_domain text, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  select version into current_version from public.settings_domain_versions where domain = target_domain for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed these settings first.')));
  end if;
  update public.settings_domain_versions set version = version + 1, updated_at = now(), updated_by = auth.uid() where domain = target_domain;
  return null;
end;
$$;
revoke all on function private.bump_domain_version(text, integer) from public, anon, authenticated;

create or replace function public.update_business_profile(
  expected_version integer, target_display_name text, target_primary_email text, target_short_name text default 'RENZ',
  target_legal_name text default null, target_public_description text default null, target_tagline text default null,
  target_website_url text default null, target_timezone text default 'Africa/Kigali', target_default_locale text default 'en',
  target_country text default null, target_region text default null, target_mission text default null,
  target_approach text default null, target_service_area text default null, target_credentials text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('settings.business.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.business.write is required.')));
  end if;
  select version into current_version from public.business_profile where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the business profile first.')));
  end if;
  if target_website_url is not null and target_website_url !~ '^https?://[^\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'website_url', 'Use an http(s) URL.')));
  end if;
  begin
    update public.business_profile
       set display_name = btrim(target_display_name), primary_email = lower(btrim(target_primary_email)), short_name = btrim(target_short_name),
           legal_name = nullif(btrim(target_legal_name), ''), public_description = nullif(btrim(target_public_description), ''),
           tagline = nullif(btrim(target_tagline), ''), website_url = nullif(btrim(target_website_url), ''),
           timezone = btrim(target_timezone), default_locale = btrim(target_default_locale),
           country = nullif(btrim(target_country), ''), region = nullif(btrim(target_region), ''),
           mission_text = nullif(btrim(target_mission), ''), approach_text = nullif(btrim(target_approach), ''),
           service_area_text = nullif(btrim(target_service_area), ''), public_credentials_text = nullif(btrim(target_credentials), ''),
           updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'profile', 'A business profile field is not admitted: ' || sqlerrm)));
  end;
  perform private.s4_audit('business_profile.update', 'settings', 'business_profile', 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('business', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.upsert_contact_channel(
  expected_version integer, target_channel_type text, target_label text, target_value text,
  target_id uuid default null, target_purpose text default null, target_is_public boolean default true,
  target_calling_enabled boolean default false, target_active boolean default true, target_sort_order integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflict jsonb;
  new_id uuid;
  normalized_value text := btrim(target_value);
begin
  if not private.has_permission('settings.business.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.business.write is required.')));
  end if;
  if target_channel_type not in ('email', 'whatsapp', 'phone', 'address', 'maps', 'website', 'social') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'channel_type', 'Channel type is not admitted.')));
  end if;
  if target_channel_type = 'email' and normalized_value !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'value', 'Enter a valid email address.')));
  end if;
  if target_channel_type in ('whatsapp', 'phone') and private.whatsapp_digits(normalized_value) is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'value', 'Enter a number with 8–15 digits in international format.')));
  end if;
  if target_channel_type in ('maps', 'social') and normalized_value !~ '^https://[^\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'value', 'Use an https:// URL.')));
  end if;
  if target_channel_type = 'website' and normalized_value !~ '^https?://[^\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'value', 'Use an http(s) URL.')));
  end if;
  if normalized_value ~* '^\s*javascript:' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'value', 'Script URLs are not allowed.')));
  end if;
  conflict := private.bump_domain_version('contact_channels', expected_version);
  if conflict is not null then return conflict; end if;
  if target_id is null then
    insert into public.contact_channels (channel_type, label, value, purpose, is_public, calling_enabled, active, sort_order, updated_by)
    values (target_channel_type, btrim(target_label), normalized_value, nullif(btrim(target_purpose), ''), target_is_public,
            target_calling_enabled and target_channel_type in ('whatsapp', 'phone'), target_active, target_sort_order, auth.uid())
    returning id into new_id;
    perform private.s4_audit('contact_channel.create', 'settings', new_id::text, 'success', jsonb_build_object('channel_type', target_channel_type, 'is_public', target_is_public, 'calling_enabled', target_calling_enabled));
  else
    update public.contact_channels
       set channel_type = target_channel_type, label = btrim(target_label), value = normalized_value, purpose = nullif(btrim(target_purpose), ''),
           is_public = target_is_public, calling_enabled = target_calling_enabled and target_channel_type in ('whatsapp', 'phone'),
           active = target_active, sort_order = target_sort_order, updated_at = now(), updated_by = auth.uid()
     where id = target_id;
    if not found then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'channel', 'Contact channel does not exist.')));
    end if;
    new_id := target_id;
    perform private.s4_audit('contact_channel.update', 'settings', new_id::text, 'success', jsonb_build_object('channel_type', target_channel_type, 'is_public', target_is_public, 'calling_enabled', target_calling_enabled, 'active', target_active));
  end if;
  perform private.settings_touch('business', 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_business_location(
  expected_version integer, target_publish boolean, target_public_name text default null, target_street text default null,
  target_city text default null, target_region text default null, target_country text default null, target_postal_code text default null,
  target_latitude numeric default null, target_longitude numeric default null, target_maps_url text default null,
  target_directions_url text default null, target_service_area text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('settings.business.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.business.write is required.')));
  end if;
  select version into current_version from public.business_location where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the location first.')));
  end if;
  if target_publish and nullif(btrim(target_street), '') is null and nullif(btrim(target_city), '') is null and nullif(btrim(target_maps_url), '') is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'publish_location', 'Add an address, city or map link before publishing the location.')));
  end if;
  if (target_maps_url is not null and btrim(target_maps_url) <> '' and btrim(target_maps_url) !~ '^https://[^\s]+$')
     or (target_directions_url is not null and btrim(target_directions_url) <> '' and btrim(target_directions_url) !~ '^https://[^\s]+$') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'maps_url', 'Map and directions links must be https:// URLs.')));
  end if;
  begin
    update public.business_location
       set public_name = nullif(btrim(target_public_name), ''), street_address = nullif(btrim(target_street), ''), city = nullif(btrim(target_city), ''),
           region = nullif(btrim(target_region), ''), country = nullif(btrim(target_country), ''), postal_code = nullif(btrim(target_postal_code), ''),
           latitude = target_latitude, longitude = target_longitude, maps_url = nullif(btrim(target_maps_url), ''),
           directions_url = nullif(btrim(target_directions_url), ''), service_area_text = nullif(btrim(target_service_area), ''),
           publish_location = target_publish, updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'location', 'A location field is not admitted: ' || sqlerrm)));
  end;
  perform private.s4_audit('business_location.update', 'settings', 'business_location', 'success', jsonb_build_object('publish_location', target_publish, 'version', expected_version + 1));
  perform private.settings_touch('business', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_business_hours(expected_version integer, hours jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflict jsonb;
  entry jsonb;
begin
  if not private.has_permission('settings.business.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.business.write is required.')));
  end if;
  if jsonb_typeof(hours) <> 'array' or jsonb_array_length(hours) <> 7 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'hours', 'Provide all seven weekdays.')));
  end if;
  conflict := private.bump_domain_version('business_hours', expected_version);
  if conflict is not null then return conflict; end if;
  begin
    for entry in select * from jsonb_array_elements(hours) loop
      update public.business_hours
         set is_open = coalesce((entry ->> 'is_open')::boolean, false),
             opens_at = case when coalesce((entry ->> 'is_open')::boolean, false) then nullif(entry ->> 'opens_at', '')::time end,
             closes_at = case when coalesce((entry ->> 'is_open')::boolean, false) then nullif(entry ->> 'closes_at', '')::time end,
             updated_at = now()
       where weekday = (entry ->> 'weekday')::integer;
    end loop;
  exception when others then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'hours', 'Opening hours are not valid: closing time must be after opening time.')));
  end;
  perform private.s4_audit('business_hours.update', 'settings', 'business_hours', 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('business', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.upsert_social_link(
  expected_version integer, target_platform text, target_url text, target_id uuid default null,
  target_label text default null, target_active boolean default true, target_sort_order integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflict jsonb;
  new_id uuid;
begin
  if not private.has_permission('settings.business.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.business.write is required.')));
  end if;
  if target_platform not in ('instagram', 'linkedin', 'facebook', 'youtube', 'tiktok', 'x', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'platform', 'Platform is not admitted.')));
  end if;
  if btrim(target_url) !~ '^https://[^\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'url', 'Use an https:// profile URL.')));
  end if;
  conflict := private.bump_domain_version('social_links', expected_version);
  if conflict is not null then return conflict; end if;
  if target_id is null then
    insert into public.social_links (platform, url, label, active, sort_order, updated_by)
    values (target_platform, btrim(target_url), nullif(btrim(target_label), ''), target_active, target_sort_order, auth.uid())
    on conflict (platform, url) do update set active = excluded.active, label = excluded.label, sort_order = excluded.sort_order, updated_at = now(), updated_by = auth.uid()
    returning id into new_id;
    perform private.s4_audit('social_link.create', 'settings', new_id::text, 'success', jsonb_build_object('platform', target_platform));
  else
    update public.social_links
       set platform = target_platform, url = btrim(target_url), label = nullif(btrim(target_label), ''), active = target_active,
           sort_order = target_sort_order, updated_at = now(), updated_by = auth.uid()
     where id = target_id;
    if not found then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'social_link', 'Social link does not exist.')));
    end if;
    new_id := target_id;
    perform private.s4_audit('social_link.update', 'settings', new_id::text, 'success', jsonb_build_object('platform', target_platform, 'active', target_active));
  end if;
  perform private.settings_touch('business', 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_website_settings(
  expected_version integer, target_homepage_cta_label text, target_homepage_cta_route text,
  target_canonical_base_url text default null, target_secondary_cta_label text default null, target_secondary_cta_route text default null,
  target_footer_statement text default null, target_contact_intro text default null, target_service_area_wording text default null,
  target_company_summary text default null, target_announcement_text text default null, target_announcement_active boolean default false,
  target_analytics_enabled boolean default false, target_analytics_provider text default null, target_consent_required boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('settings.website.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write is required.')));
  end if;
  select version into current_version from public.website_settings where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the website settings first.')));
  end if;
  if target_homepage_cta_route not in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')
     or (target_secondary_cta_route is not null and target_secondary_cta_route not in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'homepage_cta_route', 'Choose an approved destination.')));
  end if;
  if target_canonical_base_url is not null and btrim(target_canonical_base_url) <> '' and btrim(target_canonical_base_url) !~ '^https?://[^/\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'canonical_base_url', 'Use an origin like https://www.example.com (no path).')));
  end if;
  begin
    update public.website_settings
       set canonical_base_url = nullif(btrim(target_canonical_base_url), ''), homepage_cta_label = btrim(target_homepage_cta_label),
           homepage_cta_route = target_homepage_cta_route, secondary_cta_label = nullif(btrim(target_secondary_cta_label), ''),
           secondary_cta_route = target_secondary_cta_route, footer_statement = nullif(btrim(target_footer_statement), ''),
           contact_intro = nullif(btrim(target_contact_intro), ''), service_area_wording = nullif(btrim(target_service_area_wording), ''),
           company_summary = nullif(btrim(target_company_summary), ''), announcement_text = nullif(btrim(target_announcement_text), ''),
           announcement_active = target_announcement_active and nullif(btrim(target_announcement_text), '') is not null,
           analytics_enabled = target_analytics_enabled, analytics_provider = nullif(target_analytics_provider, ''),
           consent_required = target_consent_required or target_analytics_enabled,
           updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'website', 'A website field is not admitted: ' || sqlerrm)));
  end;
  perform private.s4_audit('website_settings.update', 'settings', 'website_settings', 'success', jsonb_build_object('version', expected_version + 1, 'analytics_enabled', target_analytics_enabled));
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_navigation_settings(expected_version integer, items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conflict jsonb;
  entry jsonb;
begin
  if not private.has_permission('settings.website.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write is required.')));
  end if;
  if jsonb_typeof(items) <> 'array' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', 'Navigation items must be a list.')));
  end if;
  conflict := private.bump_domain_version('navigation', expected_version);
  if conflict is not null then return conflict; end if;
  begin
    for entry in select * from jsonb_array_elements(items) loop
      update public.navigation_settings
         set label_override = nullif(btrim(entry ->> 'label'), ''), visible = coalesce((entry ->> 'visible')::boolean, true),
             sort_order = coalesce((entry ->> 'sort_order')::integer, sort_order), updated_at = now()
       where route_key = entry ->> 'route_key';
    end loop;
  exception when others then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', 'Navigation items are not valid.')));
  end;
  perform private.s4_audit('navigation_settings.update', 'settings', 'navigation', 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_brand_media_settings(
  expected_version integer, target_primary_logo uuid default null, target_reversed_logo uuid default null, target_favicon uuid default null,
  target_default_og uuid default null, target_default_share uuid default null, target_default_hero uuid default null, target_document_logo uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  candidate uuid;
begin
  if not private.has_permission('settings.website.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write is required.')));
  end if;
  select version into current_version from public.brand_media_settings where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the brand media first.')));
  end if;
  foreach candidate in array array[target_primary_logo, target_reversed_logo, target_favicon, target_default_og, target_default_share, target_default_hero, target_document_logo] loop
    if candidate is not null and not private.brand_media_public(candidate) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'media', 'Only promoted, rights-cleared media can be used as brand media.')));
    end if;
  end loop;
  update public.brand_media_settings
     set primary_logo_media_id = target_primary_logo, reversed_logo_media_id = target_reversed_logo, favicon_media_id = target_favicon,
         default_og_media_id = target_default_og, default_share_media_id = target_default_share, default_hero_media_id = target_default_hero,
         document_logo_media_id = target_document_logo, updated_by = auth.uid(), version = version + 1
   where id = 1;
  perform private.s4_audit('brand_media.update', 'settings', 'brand_media', 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_seo_settings(
  expected_version integer, target_site_name text, target_title_template text, target_meta_description text default null,
  target_organization_name text default null, target_organization_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('settings.website.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write is required.')));
  end if;
  select version into current_version from public.seo_settings where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the SEO settings first.')));
  end if;
  if position('%s' in target_title_template) = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'title_template', 'The title template must contain %s.')));
  end if;
  begin
    update public.seo_settings
       set site_name = btrim(target_site_name), title_template = btrim(target_title_template), meta_description = nullif(btrim(target_meta_description), ''),
           organization_name = nullif(btrim(target_organization_name), ''), organization_url = nullif(btrim(target_organization_url), ''),
           updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'seo', 'An SEO field is not admitted: ' || sqlerrm)));
  end;
  perform private.s4_audit('seo_settings.update', 'settings', 'seo_settings', 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_legal_page_draft(target_slug text, expected_version integer, target_title text, target_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('settings.legal.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.legal.write is required.')));
  end if;
  select version into current_version from public.legal_pages where slug = target_slug for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'slug', 'Legal page does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this draft first.')));
  end if;
  if btrim(target_title) = '' or char_length(target_title) > 200 or char_length(target_body) > 60000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'title', 'Provide a title (≤ 200 characters) and a body (≤ 60,000 characters).')));
  end if;
  update public.legal_pages
     set draft_title = btrim(target_title), draft_body = target_body, draft_is_starter = false, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where slug = target_slug;
  perform private.s4_audit('legal_page.update', 'settings', target_slug, 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('legal', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.publish_legal_page(target_slug text, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  page public.legal_pages%rowtype;
  next_revision integer;
begin
  if not private.has_permission('settings.legal.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.legal.publish is required.')));
  end if;
  select * into page from public.legal_pages where slug = target_slug for update;
  if page.slug is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'slug', 'Legal page does not exist.')));
  end if;
  if page.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', page.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this draft first.')));
  end if;
  if page.draft_is_starter then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'draft', 'Review and save the starter draft before publishing it.')));
  end if;
  if btrim(page.draft_body) = '' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'draft', 'The draft is empty.')));
  end if;
  next_revision := coalesce(page.published_revision, 0) + 1;
  insert into public.legal_page_revisions (slug, revision, title, body, published_by)
  values (page.slug, next_revision, page.draft_title, page.draft_body, auth.uid());
  update public.legal_pages
     set published_title = page.draft_title, published_body = page.draft_body, published_revision = next_revision,
         published_at = now(), published_by = auth.uid(), version = version + 1, updated_at = now(), updated_by = auth.uid()
   where slug = target_slug;
  perform private.s4_audit('legal_page.publish', 'settings', target_slug, 'success', jsonb_build_object('revision', next_revision, 'version', expected_version + 1));
  perform private.settings_touch('legal', 'published');
  return jsonb_build_object('ok', true, 'version', expected_version + 1, 'revision', next_revision);
end;
$$;

create or replace function public.update_document_defaults(
  expected_version integer, target_default_currency text, target_allowed_currencies text[], target_invoice_tax_label text,
  target_invoice_tax_rate numeric, target_invoice_due_days integer, target_po_tax_label text, target_po_tax_rate numeric,
  target_po_expected_delivery_days integer, target_invoice_payment_terms text default null, target_po_terms text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  normalized_allowed text[];
begin
  if not private.has_permission('settings.system.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.system.write is required.')));
  end if;
  select version into current_version from public.document_defaults where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the document defaults first.')));
  end if;
  select array_agg(distinct upper(btrim(c))) into normalized_allowed from unnest(target_allowed_currencies) as c where btrim(c) ~* '^[a-z]{3}$';
  if normalized_allowed is null or not (upper(btrim(target_default_currency)) = any (normalized_allowed)) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'default_currency', 'The default currency must be one of the allowed 3-letter currencies.')));
  end if;
  begin
    update public.document_defaults
       set default_currency = upper(btrim(target_default_currency)), allowed_currencies = normalized_allowed,
           invoice_tax_label = btrim(target_invoice_tax_label), invoice_tax_rate = round(target_invoice_tax_rate, 2),
           invoice_payment_terms = nullif(btrim(target_invoice_payment_terms), ''), invoice_due_days = target_invoice_due_days,
           po_tax_label = btrim(target_po_tax_label), po_tax_rate = round(target_po_tax_rate, 2), po_terms = nullif(btrim(target_po_terms), ''),
           po_expected_delivery_days = target_po_expected_delivery_days, updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'document_defaults', 'A document default is out of range: ' || sqlerrm)));
  end;
  perform private.s4_audit('document_defaults.update', 'settings', 'document_defaults', 'success',
    jsonb_build_object('version', expected_version + 1, 'default_currency', upper(btrim(target_default_currency)), 'invoice_tax_rate', round(target_invoice_tax_rate, 2), 'po_tax_rate', round(target_po_tax_rate, 2)));
  perform private.settings_touch('system', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

create or replace function public.update_operational_settings(
  expected_version integer, target_project_ending_soon_days integer, target_invoice_due_soon_days integer, target_stale_draft_invoice_days integer,
  target_assignment_ending_soon_days integer, target_material_required_soon_days integer, target_po_expected_soon_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('settings.system.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.system.write is required.')));
  end if;
  select version into current_version from public.operational_settings where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the operational settings first.')));
  end if;
  begin
    update public.operational_settings
       set project_ending_soon_days = target_project_ending_soon_days, invoice_due_soon_days = target_invoice_due_soon_days,
           stale_draft_invoice_days = target_stale_draft_invoice_days, assignment_ending_soon_days = target_assignment_ending_soon_days,
           material_required_soon_days = target_material_required_soon_days, po_expected_soon_days = target_po_expected_soon_days,
           updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'operational', 'Thresholds must be whole days within the admitted range.')));
  end;
  perform private.s4_audit('operational_settings.update', 'settings', 'operational_settings', 'success', jsonb_build_object('version', expected_version + 1));
  perform private.settings_touch('system', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;

-- Atomic publish of the coherent public configuration.
create or replace function public.publish_public_configuration(note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  new_id uuid;
begin
  if not (private.has_permission('settings.business.write') or private.has_permission('settings.website.write')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.business.write or settings.website.write is required.')));
  end if;
  perform 1 from public.website_settings where id = 1 for update;
  snapshot := private.build_public_configuration();
  if snapshot #>> '{business,display_name}' is null or snapshot #>> '{contact,primary_email}' is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'business', 'A display name and primary email are required before publishing.')));
  end if;
  update public.public_configuration_snapshots set is_current = false where is_current;
  insert into public.public_configuration_snapshots (snapshot, note, published_by) values (snapshot, nullif(btrim(note), ''), auth.uid()) returning id into new_id;
  perform private.s4_audit('public_configuration.publish', 'settings', new_id::text, 'success', jsonb_build_object('snapshot_id', new_id));
  perform private.settings_touch('public_configuration', 'published');
  return jsonb_build_object('ok', true, 'id', new_id, 'published_at', now());
end;
$$;

create or replace function public.admin_list_configuration_snapshots(limit_count integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('settings.business.read') or private.has_permission('settings.website.read')) then
    raise exception using errcode = '42501', message = 'configuration history is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 50 then limit_count := 10; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'published_at', s.published_at, 'note', s.note, 'is_current', s.is_current, 'published_by', p.display_name) order by s.published_at desc)
    from (select * from public.public_configuration_snapshots order by published_at desc limit limit_count) as s
    left join public.profiles as p on p.id = s.published_by
  ), '[]'::jsonb);
end;
$$;

-- Site mode: Super Admin only; going live requires the readiness gate.
create or replace function public.change_site_mode(expected_version integer, next_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  current_mode text;
  readiness jsonb;
begin
  if not private.has_permission('settings.website.write') or not private.is_current_super_admin() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only a Super Admin with settings.website.write can change the site mode.')));
  end if;
  if next_mode not in ('preview', 'live') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'site_mode', 'Site mode must be preview or live.')));
  end if;
  select version, site_mode into current_version, current_mode from public.website_settings where id = 1 for update;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the website settings first.')));
  end if;
  if next_mode = 'live' then
    readiness := private.launch_readiness();
    if readiness ->> 'overall' = 'blocked' then
      return jsonb_build_object('ok', false, 'readiness', readiness,
        'reasons', jsonb_build_array(private.failure('launch_blocked', 'site_mode', 'Required launch checks are not satisfied. Resolve the blocked items first.')));
    end if;
  end if;
  update public.website_settings
     set site_mode = next_mode, site_mode_changed_at = now(), site_mode_changed_by = auth.uid(), updated_by = auth.uid(), version = version + 1
   where id = 1;
  perform private.s4_audit('site_mode.change', 'settings', 'website_settings', 'success', jsonb_build_object('from', current_mode, 'to', next_mode, 'version', expected_version + 1));
  perform private.settings_touch('website', 'published');
  return jsonb_build_object('ok', true, 'version', expected_version + 1, 'site_mode', next_mode);
end;
$$;

-- Staff: reactivation (disable_user / assign_user_role / remove_user_role exist since S3).
create or replace function public.reactivate_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('staff.manage') or not private.is_current_super_admin() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only a Super Admin with staff.manage can reactivate staff.')));
  end if;
  update public.profiles set account_status = 'active', version = version + 1, updated_at = now() where id = target_user_id and account_status = 'disabled';
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'account_status', 'Only a disabled account can be reactivated.')));
  end if;
  perform private.s4_audit('staff.reactivate', 'profile', target_user_id::text, 'success', '{}'::jsonb);
  perform private.settings_touch('staff', 'updated');
  return jsonb_build_object('ok', true, 'id', target_user_id);
end;
$$;

create or replace function public.set_staff_role(target_user_id uuid, requested_role_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing text;
begin
  if not private.has_permission('staff.manage') or not private.is_current_super_admin() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only a Super Admin with staff.manage can change roles.')));
  end if;
  if requested_role_key not in ('admin', 'super_admin') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'role', 'Role is not admitted.')));
  end if;
  if target_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'role', 'Ask another Super Admin to change your own role.')));
  end if;
  for existing in select r.key from public.user_roles as ur join public.roles as r on r.id = ur.role_id where ur.user_id = target_user_id loop
    if existing <> requested_role_key then
      perform public.remove_user_role(target_user_id, existing);
    end if;
  end loop;
  if not exists (select 1 from public.user_roles as ur join public.roles as r on r.id = ur.role_id where ur.user_id = target_user_id and r.key = requested_role_key) then
    perform public.assign_user_role(target_user_id, requested_role_key);
  end if;
  perform private.s4_audit('staff.role_change', 'profile', target_user_id::text, 'success', jsonb_build_object('role', requested_role_key));
  perform private.settings_touch('staff', 'updated');
  return jsonb_build_object('ok', true, 'id', target_user_id, 'role', requested_role_key);
end;
$$;

-- Quick Find gains SETTING entries (static, permission-gated, no values).
create or replace function private.settings_quick_find(search_query text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'setting', 'id', entry.id, 'label', entry.label, 'detail', entry.detail)), '[]'::jsonb)
  from (values
    ('00000000-0000-4000-8000-0000000000a1'::uuid, 'Business Profile', 'Settings · identity, contact, location', 'settings.business.read', 'business'),
    ('00000000-0000-4000-8000-0000000000a2'::uuid, 'Contact Channels', 'Settings · email, WhatsApp, address', 'settings.business.read', 'business'),
    ('00000000-0000-4000-8000-0000000000a3'::uuid, 'Website Settings', 'Settings · CTA, footer, navigation, site mode', 'settings.website.read', 'website'),
    ('00000000-0000-4000-8000-0000000000a4'::uuid, 'SEO', 'Settings · site name, description, canonical URL', 'settings.website.read', 'website'),
    ('00000000-0000-4000-8000-0000000000a5'::uuid, 'Legal Center', 'Settings · privacy, terms, cookies', 'settings.legal.read', 'legal'),
    ('00000000-0000-4000-8000-0000000000a6'::uuid, 'Document Defaults', 'Settings · currency, tax, terms', 'settings.system.read', 'system'),
    ('00000000-0000-4000-8000-0000000000a7'::uuid, 'Launch Readiness', 'Settings · can we go live?', 'settings.website.read', 'launch-readiness'),
    ('00000000-0000-4000-8000-0000000000a8'::uuid, 'Staff & Access', 'Settings · roles, status, MFA', 'staff.read', 'staff')
  ) as entry(id, label, detail, permission, slug)
  where private.has_permission(entry.permission)
    and (entry.label ilike '%' || search_query || '%' or entry.detail ilike '%' || search_query || '%' or 'settings' ilike '%' || search_query || '%');
$$;
revoke all on function private.settings_quick_find(text) from public, anon, authenticated;

create or replace function public.admin_setting_href(target_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select case target_id::text
    when '00000000-0000-4000-8000-0000000000a1' then '/admin/settings/business'
    when '00000000-0000-4000-8000-0000000000a2' then '/admin/settings/business?section=contact'
    when '00000000-0000-4000-8000-0000000000a3' then '/admin/settings/website'
    when '00000000-0000-4000-8000-0000000000a4' then '/admin/settings/website?section=seo'
    when '00000000-0000-4000-8000-0000000000a5' then '/admin/settings/legal'
    when '00000000-0000-4000-8000-0000000000a6' then '/admin/settings/system'
    when '00000000-0000-4000-8000-0000000000a7' then '/admin/settings/launch-readiness'
    when '00000000-0000-4000-8000-0000000000a8' then '/admin/settings/staff'
    else '/admin/settings' end;
$$;
