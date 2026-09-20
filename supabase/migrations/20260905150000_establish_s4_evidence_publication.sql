-- S4: evidence-safe content, media governance, and publication commands.
-- This migration extends the structural S2 content model without rewriting it.
-- It contains no RENZ business facts or client assets.

-- ---------------------------------------------------------------------------
-- Controlled registries
-- ---------------------------------------------------------------------------

create table public.content_section_registry (
  key text primary key,
  scope text not null,
  display_name text not null,
  schema_version integer not null default 1,
  enabled boolean not null default true,
  constraint content_section_registry_key_check
    check (key = btrim(key) and key ~ '^[a-z][a-z0-9_]*$'),
  constraint content_section_registry_scope_check
    check (scope in ('homepage', 'page', 'any')),
  constraint content_section_registry_display_name_check
    check (display_name = btrim(display_name) and display_name <> ''),
  constraint content_section_registry_schema_version_check check (schema_version > 0)
);

insert into public.content_section_registry (key, scope, display_name)
values
  ('hero', 'homepage', 'Hero'),
  ('proposition', 'homepage', 'Proposition'),
  ('expertise', 'homepage', 'Expertise'),
  ('selected_projects', 'homepage', 'Selected projects'),
  ('audiences', 'homepage', 'Audiences'),
  ('process', 'homepage', 'Process'),
  ('quality_responsibility', 'homepage', 'Quality and responsibility'),
  ('proof', 'homepage', 'Proof'),
  ('insights', 'homepage', 'Insights'),
  ('final_cta', 'homepage', 'Final call to action'),
  ('rich_text', 'page', 'Rich text'),
  ('contact_details', 'page', 'Contact details'),
  ('legal_content', 'page', 'Legal content')
on conflict (key) do update
set scope = excluded.scope,
    display_name = excluded.display_name,
    schema_version = excluded.schema_version,
    enabled = excluded.enabled;

create table public.public_setting_registry (
  namespace text not null,
  key text not null,
  value_type text not null,
  public_allowed boolean not null default false,
  requires_evidence boolean not null default true,
  display_name text not null,
  primary key (namespace, key),
  constraint public_setting_registry_namespace_check
    check (namespace = btrim(namespace) and namespace ~ '^[a-z][a-z0-9_.-]*$'),
  constraint public_setting_registry_key_check
    check (key = btrim(key) and key ~ '^[a-z][a-z0-9_.-]*$'),
  constraint public_setting_registry_value_type_check
    check (value_type in ('string', 'url', 'boolean', 'number', 'json')),
  constraint public_setting_registry_display_name_check
    check (display_name = btrim(display_name) and display_name <> '')
);

insert into public.public_setting_registry (
  namespace, key, value_type, public_allowed, requires_evidence, display_name
)
values
  ('brand.public', 'display_name', 'string', true, true, 'Public display name'),
  ('brand.public', 'descriptor', 'string', true, true, 'Public descriptor'),
  ('contact.public', 'email', 'string', true, true, 'Public email'),
  ('contact.public', 'phone', 'string', true, true, 'Public phone'),
  ('contact.public', 'whatsapp', 'string', true, true, 'Public WhatsApp'),
  ('contact.public', 'hours', 'string', true, true, 'Public hours'),
  ('contact.public', 'address', 'string', true, true, 'Public address'),
  ('contact.public', 'directions_url', 'url', true, true, 'Public directions URL'),
  ('social.public', 'instagram', 'url', true, true, 'Instagram profile'),
  ('social.public', 'linkedin', 'url', true, true, 'LinkedIn profile'),
  ('website.public', 'default_locale', 'string', true, false, 'Default locale'),
  ('website.public', 'site_title', 'string', true, true, 'Site title'),
  ('website.public', 'site_description', 'string', true, true, 'Site description')
on conflict (namespace, key) do update
set value_type = excluded.value_type,
    public_allowed = excluded.public_allowed,
    requires_evidence = excluded.requires_evidence,
    display_name = excluded.display_name;

-- ---------------------------------------------------------------------------
-- Evidence and typed relationships
-- ---------------------------------------------------------------------------

create table public.evidence_records (
  id uuid primary key default gen_random_uuid(),
  fact_claim text not null,
  source_type text not null,
  source_reference text not null,
  internal_notes text,
  owner_id uuid references public.profiles (id) on delete set null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  verification_state text not null default 'unverified',
  verified_at timestamptz,
  review_due_at timestamptz,
  approved_public_wording text,
  sensitivity text not null default 'private',
  consent_required boolean not null default false,
  consent_state text not null default 'not_required',
  consent_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint evidence_records_fact_claim_check
    check (fact_claim = btrim(fact_claim) and fact_claim <> ''),
  constraint evidence_records_source_type_check check (
    source_type in (
      'client_supplied', 'client_confirmation', 'contract_document',
      'project_document', 'media_metadata', 'credential_document',
      'testimonial_consent', 'public_authoritative_source',
      'internal_record', 'other_reviewed_source'
    )
  ),
  constraint evidence_records_source_reference_check
    check (source_reference = btrim(source_reference) and source_reference <> ''),
  constraint evidence_records_verification_state_check
    check (verification_state in ('unverified', 'in_review', 'verified', 'expired', 'rejected')),
  constraint evidence_records_verified_fields_check
    check (verification_state <> 'verified' or (reviewer_id is not null and verified_at is not null)),
  constraint evidence_records_sensitivity_check check (sensitivity in ('public', 'private')),
  constraint evidence_records_consent_state_check
    check (consent_state in ('not_required', 'unknown', 'pending', 'granted', 'revoked')),
  constraint evidence_records_consent_pair_check
    check (consent_required or consent_state = 'not_required'),
  constraint evidence_records_version_check check (version > 0)
);

create table public.service_evidence (
  service_id uuid not null references public.services (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (service_id, evidence_id),
  constraint service_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.project_evidence (
  project_id uuid not null references public.projects (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (project_id, evidence_id),
  constraint project_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.post_evidence (
  post_id uuid not null references public.posts (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (post_id, evidence_id),
  constraint post_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.page_evidence (
  page_id uuid not null references public.site_pages (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (page_id, evidence_id),
  constraint page_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.team_member_evidence (
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (team_member_id, evidence_id),
  constraint team_member_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.testimonial_evidence (
  testimonial_id uuid not null references public.testimonials (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (testimonial_id, evidence_id),
  constraint testimonial_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.credential_evidence (
  credential_id uuid not null references public.credentials (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (credential_id, evidence_id),
  constraint credential_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.navigation_evidence (
  navigation_menu_id uuid not null references public.navigation_menus (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (navigation_menu_id, evidence_id),
  constraint navigation_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.setting_evidence (
  namespace text not null,
  key text not null,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  purpose text,
  primary key (namespace, key, evidence_id),
  foreign key (namespace, key)
    references public.public_setting_registry (namespace, key) on delete restrict,
  constraint setting_evidence_purpose_check
    check (purpose is null or (purpose = btrim(purpose) and purpose <> ''))
);

create table public.material_claims (
  id uuid primary key default gen_random_uuid(),
  claim_type text not null,
  claim_text text not null,
  approved_public_wording text,
  verification_state text not null default 'unverified',
  reviewer_id uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint material_claims_type_check check (
    claim_type in (
      'metric', 'savings', 'time', 'performance', 'compliance',
      'safety', 'sustainability', 'outcome', 'credential', 'other'
    )
  ),
  constraint material_claims_text_check
    check (claim_text = btrim(claim_text) and claim_text <> ''),
  constraint material_claims_state_check
    check (verification_state in ('unverified', 'in_review', 'verified', 'expired', 'rejected')),
  constraint material_claims_verified_fields_check
    check (verification_state <> 'verified' or (reviewer_id is not null and verified_at is not null)),
  constraint material_claims_version_check check (version > 0)
);

create table public.claim_evidence (
  claim_id uuid not null references public.material_claims (id) on delete cascade,
  evidence_id uuid not null references public.evidence_records (id) on delete restrict,
  required boolean not null default true,
  primary key (claim_id, evidence_id)
);

create table public.project_claims (
  project_id uuid not null references public.projects (id) on delete cascade,
  claim_id uuid not null references public.material_claims (id) on delete restrict,
  required boolean not null default false,
  primary key (project_id, claim_id)
);

create table public.service_claims (
  service_id uuid not null references public.services (id) on delete cascade,
  claim_id uuid not null references public.material_claims (id) on delete restrict,
  required boolean not null default false,
  primary key (service_id, claim_id)
);

create table public.post_claims (
  post_id uuid not null references public.posts (id) on delete cascade,
  claim_id uuid not null references public.material_claims (id) on delete restrict,
  required boolean not null default false,
  primary key (post_id, claim_id)
);

create table public.page_claims (
  page_id uuid not null references public.site_pages (id) on delete cascade,
  claim_id uuid not null references public.material_claims (id) on delete restrict,
  required boolean not null default false,
  primary key (page_id, claim_id)
);

create table public.team_member_claims (
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  claim_id uuid not null references public.material_claims (id) on delete restrict,
  required boolean not null default false,
  primary key (team_member_id, claim_id)
);

create table public.credential_claims (
  credential_id uuid not null references public.credentials (id) on delete cascade,
  claim_id uuid not null references public.material_claims (id) on delete restrict,
  required boolean not null default false,
  primary key (credential_id, claim_id)
);

-- ---------------------------------------------------------------------------
-- S4 fields added to the S2 structural tables
-- ---------------------------------------------------------------------------

alter table public.media_assets
  add column if not exists media_kind text not null default 'image',
  add column if not exists provenance_class text not null default 'synthetic_test',
  add column if not exists source_asset_id uuid references public.media_assets (id) on delete restrict,
  add column if not exists storage_state text not null default 'registered',
  add column if not exists rights_status text not null default 'unknown',
  add column if not exists rights_holder text,
  add column if not exists rights_source text,
  add column if not exists public_use_permission text not null default 'not_granted',
  add column if not exists rights_reviewer_id uuid references public.profiles (id) on delete set null,
  add column if not exists rights_verified_at timestamptz,
  add column if not exists rights_review_due_at timestamptz,
  add column if not exists rights_notes text,
  add column if not exists credit text,
  add column if not exists consent_required boolean not null default true,
  add column if not exists consent_state text not null default 'unknown',
  add column if not exists consent_reference text,
  add column if not exists base_alt_text text,
  add column if not exists is_decorative boolean not null default false;

alter table public.services
  add constraint services_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.projects
  add column if not exists renz_role text,
  add column if not exists project_scope text,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists public_location_granularity text;
alter table public.projects
  add constraint projects_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.posts
  add column if not exists publication_date date,
  add column if not exists is_time_sensitive boolean not null default false,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_due_at timestamptz;
alter table public.posts
  add constraint posts_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.team_members
  add column if not exists consent_state text not null default 'unknown',
  add column if not exists consent_reference text,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_due_at timestamptz;
alter table public.team_members
  add constraint team_members_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.testimonials
  drop constraint if exists testimonials_s2_claim_publication_guard,
  add column if not exists attribution_mode text not null default 'named',
  add column if not exists consent_state text not null default 'unknown',
  add column if not exists attribution_approved boolean not null default false,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_due_at timestamptz;
alter table public.testimonials
  add constraint testimonials_attribution_mode_check
  check (attribution_mode in ('named', 'anonymous')),
  add constraint testimonials_consent_state_check
  check (consent_state in ('unknown', 'pending', 'granted', 'revoked'));
alter table public.testimonials
  add constraint testimonials_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.credentials
  drop constraint if exists credentials_s2_claim_publication_guard,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_due_at timestamptz;
alter table public.credentials
  add constraint credentials_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.site_pages
  add constraint site_pages_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.navigation_menus
  add column if not exists publication_status text not null default 'draft',
  add column if not exists published_at timestamptz;
alter table public.navigation_menus
  add constraint navigation_menus_publication_status_check
  check (publication_status in ('draft', 'published', 'archived')),
  add constraint navigation_menus_published_at_check
  check (publication_status <> 'published' or published_at is not null),
  add constraint navigation_menus_s4_publication_guard
  check (publication_status <> 'published' or coalesce(current_setting('renz.s4.publication_command', true), '') = '1');

alter table public.project_media
  add column if not exists public_status text not null default 'private',
  add column if not exists decorative boolean not null default false,
  add column if not exists credit text,
  add column if not exists focal_point jsonb;
alter table public.project_media
  add constraint project_media_public_status_check
  check (public_status in ('private', 'eligible', 'archived')),
  add constraint project_media_focal_point_check
  check (focal_point is null or jsonb_typeof(focal_point) = 'object');

alter table public.testimonial_verifications
  add column if not exists verification_state text not null default 'unverified',
  add column if not exists consent_required boolean not null default true,
  add column if not exists consent_state text not null default 'unknown',
  add column if not exists consent_reference text,
  add column if not exists approved_quote text,
  add column if not exists review_due_at timestamptz;
alter table public.testimonial_verifications
  add constraint testimonial_verifications_state_check
  check (verification_state in ('unverified', 'in_review', 'verified', 'expired', 'rejected')),
  add constraint testimonial_verifications_consent_state_check
  check (consent_state in ('not_required', 'unknown', 'pending', 'granted', 'revoked')),
  add constraint testimonial_verifications_consent_pair_check
  check (consent_required or consent_state = 'not_required');

create table public.credential_verifications (
  credential_id uuid primary key references public.credentials (id) on delete restrict,
  source_reference text not null,
  verification_state text not null default 'unverified',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  approved_public_wording text,
  internal_notes text,
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint credential_verifications_source_check
    check (source_reference = btrim(source_reference) and source_reference <> ''),
  constraint credential_verifications_state_check
    check (verification_state in ('unverified', 'in_review', 'verified', 'expired', 'rejected')),
  constraint credential_verifications_verified_fields_check
    check (verification_state <> 'verified' or (verified_by is not null and verified_at is not null)),
  constraint credential_verifications_version_check check (version > 0)
);

alter table public.public_site_settings
  add column if not exists public_status text not null default 'private',
  add column if not exists evidence_id uuid references public.evidence_records (id) on delete restrict,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_due_at timestamptz;
alter table public.public_site_settings
  add constraint public_site_settings_public_status_check
  check (public_status in ('private', 'eligible', 'archived'));

alter table public.service_localizations
  add column if not exists scope text,
  add column if not exists deliverables text,
  add column if not exists exclusions text,
  add column if not exists client_inputs text,
  add column if not exists delivery_wording text,
  add column if not exists professional_terminology text;

-- ---------------------------------------------------------------------------
-- Safe structured content, URL, and media metadata guards
-- ---------------------------------------------------------------------------

create or replace function private.content_json_is_safe(payload jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  entry record;
  scalar text;
begin
  if payload is null then
    return true;
  end if;

  if jsonb_typeof(payload) = 'object' then
    for entry in select key, value from jsonb_each(payload)
    loop
      if lower(entry.key) in (
        'html', 'raw_html', 'script', 'javascript', 'css', 'style',
        'onclick', 'onload', 'onerror', 'srcdoc', 'innerhtml'
      ) or lower(entry.key) like 'on%' then
        return false;
      end if;
      if not private.content_json_is_safe(entry.value) then
        return false;
      end if;
    end loop;
    return true;
  end if;

  if jsonb_typeof(payload) = 'array' then
    for entry in select value from jsonb_array_elements(payload)
    loop
      if not private.content_json_is_safe(entry.value) then
        return false;
      end if;
    end loop;
    return true;
  end if;

  if jsonb_typeof(payload) = 'string' then
    scalar := payload #>> '{}';
    return scalar !~* '<\s*(script|iframe|object|embed|svg|style)(\s|>)'
      and scalar !~* 'javascript\s*:'
      and scalar !~* 'data\s*:\s*text/html'
      and scalar !~* 'on[a-z]+\s*=';
  end if;

  return true;
end;
$$;

create or replace function private.safe_public_text(value text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select value is null or (
    value = btrim(value)
    and value !~ '[<>]'
    and value !~* 'javascript\s*:'
    and value !~* 'data\s*:'
  );
$$;

create or replace function private.validate_content_json_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.content_json_is_safe(new.body_blocks) then
    raise check_violation using message = 'structured content contains executable or raw markup';
  end if;
  return new;
end;
$$;

create trigger service_localizations_safe_content
before insert or update of body_blocks on public.service_localizations
for each row execute function private.validate_content_json_trigger();

create trigger post_localizations_safe_content
before insert or update of body_blocks on public.post_localizations
for each row execute function private.validate_content_json_trigger();

create trigger page_localizations_safe_content
before insert or update of body_blocks on public.page_localizations
for each row execute function private.validate_content_json_trigger();

create or replace function private.validate_page_section_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  page_scope text;
begin
  select registry.scope
    into page_scope
    from public.content_section_registry as registry
   where registry.key = new.section_type
     and registry.enabled;

  if page_scope is null then
    raise check_violation using message = 'page section type is not in the approved registry';
  end if;

  select site_pages.template_key
    into page_scope
    from public.site_pages
   where site_pages.id = new.page_id;

  if new.section_type in (
    'hero', 'proposition', 'expertise', 'selected_projects', 'audiences',
    'process', 'quality_responsibility', 'proof', 'insights', 'final_cta'
  ) and page_scope <> 'home' then
    raise check_violation using message = 'homepage section types belong only to the home template';
  end if;

  if not private.content_json_is_safe(new.config) then
    raise check_violation using message = 'page section configuration contains executable or raw markup';
  end if;

  return new;
end;
$$;

alter table public.page_sections
  drop constraint if exists page_sections_s2_enablement_guard;

create trigger page_sections_s4_registry_guard
before insert or update on public.page_sections
for each row execute function private.validate_page_section_trigger();

create or replace function private.validate_navigation_item_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.link_type = 'internal' then
    if new.internal_path !~ '^/(?!/)[^\s<>]*$'
       or new.internal_path ~* '^(//|/admin(?:/|$))'
       or new.internal_path ~* 'javascript\s*:' then
      raise check_violation using message = 'internal navigation path is unsafe';
    end if;
  elsif new.link_type = 'external' then
    if new.external_url !~* '^https://[^\s/@]+(?:/[^\s<>]*)?$'
       or new.external_url ~* '^(javascript|data|file):'
       or new.external_url ~ '[<>]' then
      raise check_violation using message = 'external navigation URL must be HTTPS and safe';
    end if;
  end if;
  return new;
end;
$$;

create trigger navigation_items_s4_url_guard
before insert or update on public.navigation_items
for each row execute function private.validate_navigation_item_trigger();

create or replace function private.validate_navigation_localization_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.safe_public_text(new.label)
     or not private.safe_public_text(new.accessibility_text) then
    raise check_violation using message = 'navigation labels must be plain safe text';
  end if;
  return new;
end;
$$;

create trigger navigation_item_localizations_s4_text_guard
before insert or update on public.navigation_item_localizations
for each row execute function private.validate_navigation_localization_trigger();

create or replace function private.validate_public_setting_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  registry public.public_setting_registry%rowtype;
begin
  select * into registry
  from public.public_setting_registry
  where namespace = new.namespace and key = new.key;

  if new.public_status = 'eligible' then
    if not found or not registry.public_allowed then
      raise check_violation using message = 'setting is not allow-listed for public exposure';
    end if;
    if registry.requires_evidence and (new.evidence_id is null or new.reviewed_by is null or new.reviewed_at is null) then
      raise check_violation using message = 'public setting requires verified evidence and review';
    end if;
    if registry.value_type = 'url' and (
      jsonb_typeof(new.value) <> 'string'
      or (new.value #>> '{}') !~* '^https://[^\s<>]+$'
    ) then
      raise check_violation using message = 'public URL setting must use HTTPS';
    end if;
  end if;

  if not private.content_json_is_safe(new.value) then
    raise check_violation using message = 'setting contains executable or raw markup';
  end if;
  return new;
end;
$$;

create trigger public_site_settings_s4_allowlist_guard
before insert or update on public.public_site_settings
for each row execute function private.validate_public_setting_trigger();

create or replace function private.validate_media_asset_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.object_path ~ '(^|/)(\.\.?)(/|$)'
     or new.object_path ~ '[\\\x00-\x1F]'
     or new.object_path ~ '^/'
     or new.object_path !~ ('(^|/)' || new.id::text || '(/|$)') then
    if new.provenance_class <> 'synthetic_test' then
      raise check_violation using message = 'media object path must be immutable and UUID-based';
    end if;
  end if;

  if new.provenance_class <> 'synthetic_test'
     and new.mime_type not in (
       'image/jpeg', 'image/png', 'image/webp', 'image/avif',
       'video/mp4', 'video/webm'
     ) then
    raise check_violation using message = 'editorial media MIME type is not admitted';
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

create trigger media_assets_s4_metadata_guard
before insert or update on public.media_assets
for each row execute function private.validate_media_asset_trigger();

create or replace function private.prevent_direct_project_media_promotion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.public_status = 'eligible'
     and coalesce(current_setting('renz.s4.media_command', true), '') <> '1' then
    raise check_violation using message = 'project media promotion must use the reviewed media command';
  end if;
  return new;
end;
$$;

create trigger project_media_s4_promotion_guard
before insert or update on public.project_media
for each row execute function private.prevent_direct_project_media_promotion();

-- ---------------------------------------------------------------------------
-- Eligibility helpers and readiness checks
-- ---------------------------------------------------------------------------

create or replace function private.evidence_is_current(target_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.evidence_records as evidence
    where evidence.id = target_id
      and evidence.verification_state = 'verified'
      and evidence.reviewer_id is not null
      and evidence.verified_at is not null
      and (evidence.review_due_at is null or evidence.review_due_at >= now())
      and (not evidence.consent_required or evidence.consent_state = 'granted')
  );
$$;

create or replace function private.claim_is_current(target_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.material_claims as claim
    where claim.id = target_id
      and claim.verification_state = 'verified'
      and claim.reviewer_id is not null
      and claim.verified_at is not null
      and (claim.review_due_at is null or claim.review_due_at >= now())
      and exists (
        select 1
        from public.claim_evidence as link
        where link.claim_id = claim.id
          and (not link.required or private.evidence_is_current(link.evidence_id))
      )
  );
$$;

create or replace function private.public_media_is_current(target_id uuid)
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
      and asset.storage_state = 'public_eligible'
      and asset.bucket_id = 'editorial-derivatives'
      and asset.provenance_class not in ('concept_demo', 'generated_reference', 'synthetic_test')
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
      and (asset.source_asset_id is null or exists (
        select 1 from public.media_assets as source where source.id = asset.source_asset_id
      ))
  );
$$;

create or replace function private.failure(code text, field_name text, detail text)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_build_object('code', code, 'field', field_name, 'detail', detail);
$$;

create or replace function private.required_evidence_failures(
  relation_table text,
  target_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  has_link boolean := false;
  row_data record;
begin
  if relation_table = 'service_evidence' then
    for row_data in
      select evidence.id, evidence.verification_state
      from public.service_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.service_id = target_id and link.required
    loop
      has_link := true;
      if row_data.verification_state in ('expired', 'rejected') then
        failures := failures || jsonb_build_array(
          private.failure('evidence_' || row_data.verification_state, 'evidence', 'Required service evidence is not current.')
        );
      elsif not private.evidence_is_current(row_data.id) then
        failures := failures || jsonb_build_array(
          private.failure('missing_verification', 'evidence', 'Required service evidence is not verified, reviewed, or consented.')
        );
      end if;
    end loop;
  elsif relation_table = 'project_evidence' then
    for row_data in
      select evidence.id, evidence.verification_state
      from public.project_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.project_id = target_id and link.required
    loop
      has_link := true;
      if row_data.verification_state in ('expired', 'rejected') then
        failures := failures || jsonb_build_array(
          private.failure('evidence_' || row_data.verification_state, 'evidence', 'Required project evidence is not current.')
        );
      elsif not private.evidence_is_current(row_data.id) then
        failures := failures || jsonb_build_array(
          private.failure('missing_verification', 'evidence', 'Required project evidence is not verified, reviewed, or consented.')
        );
      end if;
    end loop;
  elsif relation_table = 'post_evidence' then
    for row_data in
      select evidence.id, evidence.verification_state
      from public.post_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.post_id = target_id and link.required
    loop
      has_link := true;
      if row_data.verification_state in ('expired', 'rejected') then
        failures := failures || jsonb_build_array(
          private.failure('evidence_' || row_data.verification_state, 'evidence', 'Required post evidence is not current.')
        );
      elsif not private.evidence_is_current(row_data.id) then
        failures := failures || jsonb_build_array(
          private.failure('missing_verification', 'evidence', 'Required post evidence is not verified, reviewed, or consented.')
        );
      end if;
    end loop;
  elsif relation_table = 'page_evidence' then
    for row_data in
      select evidence.id, evidence.verification_state
      from public.page_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.page_id = target_id and link.required
    loop
      has_link := true;
      if row_data.verification_state in ('expired', 'rejected') then
        failures := failures || jsonb_build_array(
          private.failure('evidence_' || row_data.verification_state, 'evidence', 'Required page evidence is not current.')
        );
      elsif not private.evidence_is_current(row_data.id) then
        failures := failures || jsonb_build_array(
          private.failure('missing_verification', 'evidence', 'Required page evidence is not verified, reviewed, or consented.')
        );
      end if;
    end loop;
  elsif relation_table = 'team_member_evidence' then
    for row_data in
      select evidence.id, evidence.verification_state
      from public.team_member_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.team_member_id = target_id and link.required
    loop
      has_link := true;
      if row_data.verification_state in ('expired', 'rejected') then
        failures := failures || jsonb_build_array(
          private.failure('evidence_' || row_data.verification_state, 'evidence', 'Required team evidence is not current.')
        );
      elsif not private.evidence_is_current(row_data.id) then
        failures := failures || jsonb_build_array(
          private.failure('missing_verification', 'evidence', 'Required team evidence is not verified, reviewed, or consented.')
        );
      end if;
    end loop;
  elsif relation_table = 'credential_evidence' then
    for row_data in
      select evidence.id, evidence.verification_state
      from public.credential_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.credential_id = target_id and link.required
    loop
      has_link := true;
      if row_data.verification_state in ('expired', 'rejected') then
        failures := failures || jsonb_build_array(
          private.failure('evidence_' || row_data.verification_state, 'evidence', 'Required credential evidence is not current.')
        );
      elsif not private.evidence_is_current(row_data.id) then
        failures := failures || jsonb_build_array(
          private.failure('missing_verification', 'evidence', 'Required credential evidence is not verified, reviewed, or consented.')
        );
      end if;
    end loop;
  end if;

  if not has_link then
    failures := failures || jsonb_build_array(
      private.failure('missing_verification', 'evidence', 'At least one required reviewed evidence record is needed.')
    );
  end if;
  return failures;
end;
$$;

create or replace function private.service_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  localization public.service_localizations%rowtype;
  asset_id uuid;
begin
  if not exists (select 1 from public.services where id = target_id) then
    return jsonb_build_array(private.failure('not_found', 'service', 'Service does not exist.'));
  end if;

  select * into localization
  from public.service_localizations
  where service_id = target_id and locale = 'en';

  if not found then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'localization', 'An English localization is required.'));
  else
    if localization.name is null or btrim(localization.name) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'name', 'A canonical public name is required.'));
    end if;
    if localization.summary is null or char_length(btrim(localization.summary)) < 20 then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'summary', 'A meaningful overview is required.'));
    end if;
    if localization.scope is null or btrim(localization.scope) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'scope', 'Service scope is required.'));
    end if;
    if localization.deliverables is null or btrim(localization.deliverables) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'deliverables', 'Service deliverables are required.'));
    end if;
    if localization.exclusions is null or btrim(localization.exclusions) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'exclusions', 'Service exclusions are required.'));
    end if;
    if localization.delivery_wording is null or btrim(localization.delivery_wording) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'delivery_wording', 'Delivery wording is required.'));
    end if;
    if localization.seo_title is null or btrim(localization.seo_title) = ''
       or localization.seo_description is null or btrim(localization.seo_description) = '' then
      failures := failures || jsonb_build_array(private.failure('seo_incomplete', 'seo', 'SEO title and description are required.'));
    end if;
    if localization.body_blocks = '[]'::jsonb then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'body_blocks', 'Structured service content is required.'));
    end if;
    if localization.professional_terminology ~* '(engineering|quantity\s+surveying|licensed|certified|registered)' then
      if not exists (
        select 1 from public.service_evidence as link
        where link.service_id = target_id and link.required and private.evidence_is_current(link.evidence_id)
      ) then
        failures := failures || jsonb_build_array(private.failure('missing_verification', 'professional_terminology', 'Professional-capacity wording requires current evidence.'));
      end if;
    end if;
  end if;

  failures := failures || private.required_evidence_failures('service_evidence', target_id);

  select hero_asset_id into asset_id from public.services where id = target_id;
  if asset_id is not null and not private.public_media_is_current(asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The service hero media is not public-eligible.'));
  end if;

  return failures;
end;
$$;

create or replace function private.project_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  localization public.project_localizations%rowtype;
  project_row public.projects%rowtype;
  media_row record;
  asset_row public.media_assets%rowtype;
  asset_id uuid;
begin
  select * into project_row from public.projects where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.'));
  end if;

  select * into localization from public.project_localizations
  where project_id = target_id and locale = 'en';
  if not found then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'localization', 'An English localization is required.'));
  else
    if localization.title is null or btrim(localization.title) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'title', 'A public project title is required.'));
    end if;
    if localization.summary is null or btrim(localization.summary) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'summary', 'A public project summary is required.'));
    end if;
    if localization.seo_title is null or localization.seo_description is null
       or btrim(localization.seo_title) = '' or btrim(localization.seo_description) = '' then
      failures := failures || jsonb_build_array(private.failure('seo_incomplete', 'seo', 'SEO title and description are required.'));
    end if;
    if not private.content_json_is_safe(to_jsonb(localization)) then
      failures := failures || jsonb_build_array(private.failure('unsafe_content', 'localization', 'Project content contains unsafe markup.'));
    end if;
  end if;

  if project_row.public_location is null or project_row.public_location_granularity is null then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'public_location', 'A public-safe location granularity is required.'));
  end if;
  if project_row.project_type is null then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'project_type', 'Project type is required.'));
  end if;
  if project_row.project_scope is null or btrim(project_row.project_scope) = '' then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'project_scope', 'Project scope is required.'));
  end if;
  if project_row.renz_role is null or btrim(project_row.renz_role) = '' then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'renz_role', 'RENZ role is required.'));
  end if;
  if project_row.reviewed_by is null or project_row.reviewed_at is null then
    failures := failures || jsonb_build_array(private.failure('missing_verification', 'review', 'Project factual review is required.'));
  end if;

  if not exists (
    select 1 from public.project_services as relation
    join public.services as service on service.id = relation.service_id
    where relation.project_id = target_id
      and service.publication_status = 'published'
      and service.published_at is not null
      and service.published_at <= now()
      and private.is_public_content('service', service.id)
  ) then
    failures := failures || jsonb_build_array(private.failure('missing_related_service', 'project_services', 'A related publishable service is required.'));
  end if;

  failures := failures || private.required_evidence_failures('project_evidence', target_id);

  select hero_asset_id into asset_id from public.projects where id = target_id;
  if asset_id is not null and not private.public_media_is_current(asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The project hero media is not public-eligible.'));
  end if;

  for media_row in
    select media.id, media.media_asset_id, media.public_status, media.decorative
    from public.project_media as media
    where media.project_id = target_id and media.public_status = 'eligible'
  loop
    select * into asset_row from public.media_assets where id = media_row.media_asset_id;
    if asset_row.provenance_class in ('concept_demo', 'generated_reference', 'synthetic_test') then
      failures := failures || jsonb_build_array(private.failure('invalid_media_classification', 'project_media', 'Concept, generated, or synthetic media cannot be completed-project evidence.'));
    elsif asset_row.rights_status in ('unknown', 'in_review') or asset_row.public_use_permission <> 'granted' then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'project_media', 'Project media rights are not cleared for public use.'));
    elsif asset_row.rights_status in ('expired', 'rejected') then
      failures := failures || jsonb_build_array(private.failure('rights_expired', 'project_media', 'Project media rights are expired or rejected.'));
    elsif not private.public_media_is_current(media_row.media_asset_id) then
      failures := failures || jsonb_build_array(private.failure('media_not_ready', 'project_media', 'Project media is not finalized for public delivery.'));
    end if;
    if not media_row.decorative and not exists (
      select 1 from public.project_media_localizations as text
      where text.project_media_id = media_row.id
        and text.locale = 'en'
        and text.alt_text is not null
        and char_length(btrim(text.alt_text)) > 0
    ) then
      failures := failures || jsonb_build_array(private.failure('missing_alt_text', 'project_media', 'Public project media needs contextual English alt text.'));
    end if;
  end loop;

  for asset_id in
    select relation.claim_id from public.project_claims as relation
    where relation.project_id = target_id and relation.required
  loop
    if not private.claim_is_current(asset_id) then
      failures := failures || jsonb_build_array(private.failure('missing_verification', 'claim', 'A required project claim is not current.'));
    end if;
  end loop;

  return failures;
end;
$$;

create or replace function private.post_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  localization public.post_localizations%rowtype;
  post_row public.posts%rowtype;
  asset_id uuid;
begin
  select * into post_row from public.posts where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'post', 'Insight does not exist.'));
  end if;
  select * into localization from public.post_localizations where post_id = target_id and locale = 'en';
  if not found then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'localization', 'An English localization is required.'));
  else
    if localization.title is null or btrim(localization.title) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'title', 'An insight title is required.'));
    end if;
    if localization.excerpt is null or btrim(localization.excerpt) = '' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'excerpt', 'An insight summary is required.'));
    end if;
    if localization.body_blocks = '[]'::jsonb then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'body_blocks', 'An insight body is required.'));
    end if;
    if localization.seo_title is null or localization.seo_description is null
       or btrim(localization.seo_title) = '' or btrim(localization.seo_description) = '' then
      failures := failures || jsonb_build_array(private.failure('seo_incomplete', 'seo', 'SEO title and description are required.'));
    end if;
  end if;
  if post_row.publication_date is null then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'publication_date', 'Insight date metadata is required.'));
  end if;
  if post_row.reviewed_by is null or post_row.reviewed_at is null then
    failures := failures || jsonb_build_array(private.failure('missing_verification', 'review', 'Insight review metadata is required.'));
  end if;
  if post_row.is_time_sensitive then
    failures := failures || private.required_evidence_failures('post_evidence', target_id);
  end if;
  select hero_asset_id into asset_id from public.posts where id = target_id;
  if asset_id is not null and not private.public_media_is_current(asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The insight hero media is not public-eligible.'));
  end if;
  return failures;
end;
$$;

create or replace function private.page_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  localization public.page_localizations%rowtype;
  page_row public.site_pages%rowtype;
  section_row record;
  asset_id uuid;
begin
  select * into page_row from public.site_pages where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'page', 'Page does not exist.'));
  end if;
  if page_row.template_key not in ('about', 'contact', 'privacy', 'terms', 'general', 'home') then
    failures := failures || jsonb_build_array(private.failure('unsupported_template', 'template_key', 'Page template is not approved.'));
  end if;
  select * into localization from public.page_localizations where page_id = target_id and locale = 'en';
  if not found then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'localization', 'An English localization is required.'));
  else
    if localization.title is null or btrim(localization.title) = '' or localization.path !~ '^/(?!/)[^\s<>]*$' then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'path', 'A safe public page path and title are required.'));
    end if;
    if localization.body_blocks = '[]'::jsonb then
      failures := failures || jsonb_build_array(private.failure('missing_required_field', 'body_blocks', 'Page content is required.'));
    end if;
    if localization.seo_title is null or localization.seo_description is null
       or btrim(localization.seo_title) = '' or btrim(localization.seo_description) = '' then
      failures := failures || jsonb_build_array(private.failure('seo_incomplete', 'seo', 'SEO title and description are required.'));
    end if;
    if localization.noindex then
      failures := failures || jsonb_build_array(private.failure('indexability_disabled', 'noindex', 'A publishable page cannot remain noindex.'));
    end if;
  end if;
  for section_row in select * from public.page_sections where page_id = target_id and enabled loop
    if not exists (
      select 1 from public.content_section_registry as registry
      where registry.key = section_row.section_type and registry.enabled
    ) then
      failures := failures || jsonb_build_array(private.failure('unsupported_block', 'page_sections', 'Page contains a section outside the approved registry.'));
    end if;
  end loop;
  select social_image_id into asset_id from public.page_localizations where page_id = target_id and locale = 'en';
  if asset_id is not null and not private.public_media_is_current(asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'social_image_id', 'The social image is not public-eligible.'));
  end if;
  failures := failures || private.required_evidence_failures('page_evidence', target_id);
  return failures;
end;
$$;

create or replace function private.team_member_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  localization public.team_member_localizations%rowtype;
  member public.team_members%rowtype;
begin
  select * into member from public.team_members where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'team_member', 'Team member does not exist.'));
  end if;
  select * into localization from public.team_member_localizations where team_member_id = target_id and locale = 'en';
  if not found or localization.name is null or localization.role_label is null then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'localization', 'Approved public name and role are required.'));
  end if;
  if member.consent_state <> 'granted' or member.reviewed_by is null or member.reviewed_at is null then
    failures := failures || jsonb_build_array(private.failure('consent_missing', 'consent', 'Team publication consent and review are required.'));
  end if;
  if member.portrait_asset_id is not null and not private.public_media_is_current(member.portrait_asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'portrait_asset_id', 'The portrait is not public-eligible.'));
  end if;
  failures := failures || private.required_evidence_failures('team_member_evidence', target_id);
  return failures;
end;
$$;

create or replace function private.testimonial_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  testimonial public.testimonials%rowtype;
  localization public.testimonial_localizations%rowtype;
  verification public.testimonial_verifications%rowtype;
begin
  select * into testimonial from public.testimonials where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'testimonial', 'Testimonial does not exist.'));
  end if;
  select * into localization from public.testimonial_localizations where testimonial_id = target_id and locale = 'en';
  if not found or localization.quote is null or btrim(localization.quote) = '' then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'quote', 'The exact approved quote is required.'));
  end if;
  if testimonial.consent_state <> 'granted' or not testimonial.attribution_approved
     or testimonial.reviewed_by is null or testimonial.reviewed_at is null
     or (testimonial.review_due_at is not null and testimonial.review_due_at < now()) then
    failures := failures || jsonb_build_array(private.failure('consent_missing', 'consent', 'Testimonial consent, attribution approval, and factual review are required.'));
  end if;
  select * into verification from public.testimonial_verifications where testimonial_id = target_id;
  if not found or verification.source_reference is null then
    failures := failures || jsonb_build_array(private.failure('missing_verification', 'source_reference', 'A testimonial source is required.'));
  else
    if verification.verification_state in ('expired', 'rejected') then
      failures := failures || jsonb_build_array(private.failure('evidence_' || verification.verification_state, 'verification', 'Testimonial verification is not current.'));
    elsif verification.verification_state <> 'verified' or verification.verified_by is null or verification.verified_at is null then
      failures := failures || jsonb_build_array(private.failure('missing_verification', 'verification', 'Testimonial verification is incomplete.'));
    end if;
    if verification.consent_required and verification.consent_state <> 'granted' then
      failures := failures || jsonb_build_array(private.failure('consent_missing', 'consent', 'Testimonial consent is required.'));
    end if;
    if verification.approved_quote is null or verification.approved_quote <> localization.quote then
      failures := failures || jsonb_build_array(private.failure('approved_wording_missing', 'quote', 'The public quote must equal the exact approved wording.'));
    end if;
    if verification.review_due_at is not null and verification.review_due_at < now() then
      failures := failures || jsonb_build_array(private.failure('evidence_expired', 'review_due_at', 'Testimonial review is expired.'));
    end if;
  end if;
  if testimonial.attribution_mode = 'named' and (testimonial.attribution_name is null or btrim(testimonial.attribution_name) = '') then
    failures := failures || jsonb_build_array(private.failure('missing_attribution', 'attribution_name', 'Named testimonial attribution is required.'));
  elsif testimonial.attribution_mode = 'anonymous' and (localization.attribution_presentation is null or btrim(localization.attribution_presentation) = '') then
    failures := failures || jsonb_build_array(private.failure('missing_attribution', 'attribution_presentation', 'Approved anonymous attribution is required.'));
  end if;
  return failures;
end;
$$;

create or replace function private.credential_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  credential public.credentials%rowtype;
  localization public.credential_localizations%rowtype;
  verification public.credential_verifications%rowtype;
begin
  select * into credential from public.credentials where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'credential', 'Credential does not exist.'));
  end if;
  select * into localization from public.credential_localizations where credential_id = target_id and locale = 'en';
  if not found or localization.name is null or btrim(localization.name) = '' then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'credential_identity', 'Exact credential identity is required.'));
  end if;
  if credential.issuer is null and credential.reference is null then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'issuer', 'Credential issuer or reference is required.'));
  end if;
  select * into verification from public.credential_verifications where credential_id = target_id;
  if not found or verification.verification_state <> 'verified' or verification.verified_by is null or verification.verified_at is null then
    failures := failures || jsonb_build_array(private.failure('missing_verification', 'verification', 'Credential verification is required.'));
  elsif verification.review_due_at is not null and verification.review_due_at < now() then
    failures := failures || jsonb_build_array(private.failure('evidence_expired', 'review_due_at', 'Credential review is expired.'));
  end if;
  if not found or verification.approved_public_wording is null or btrim(verification.approved_public_wording) = '' then
    failures := failures || jsonb_build_array(private.failure('approved_wording_missing', 'approved_public_wording', 'Approved public credential wording is required.'));
  end if;
  if credential.valid_to is not null and credential.valid_to < current_date then
    failures := failures || jsonb_build_array(private.failure('credential_expired', 'valid_to', 'Credential validity has expired.'));
  end if;
  failures := failures || private.required_evidence_failures('credential_evidence', target_id);
  return failures;
end;
$$;

create or replace function private.publication_failures(content_type text, target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  case content_type
    when 'service' then return private.service_publication_failures(target_id);
    when 'project' then return private.project_publication_failures(target_id);
    when 'post' then return private.post_publication_failures(target_id);
    when 'page' then return private.page_publication_failures(target_id);
    when 'team_member' then return private.team_member_publication_failures(target_id);
    when 'testimonial' then return private.testimonial_publication_failures(target_id);
    when 'credential' then return private.credential_publication_failures(target_id);
    else return jsonb_build_array(private.failure('unsupported_content_type', 'content_type', 'Content type is not admitted.'));
  end case;
end;
$$;

create or replace function private.is_public_content(content_type text, target_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  status_value text;
  published_value timestamptz;
begin
  case content_type
    when 'service' then select publication_status, published_at into status_value, published_value from public.services where id = target_id;
    when 'project' then select publication_status, published_at into status_value, published_value from public.projects where id = target_id;
    when 'post' then select publication_status, published_at into status_value, published_value from public.posts where id = target_id;
    when 'page' then select publication_status, published_at into status_value, published_value from public.site_pages where id = target_id;
    when 'team_member' then select publication_status, published_at into status_value, published_value from public.team_members where id = target_id;
    when 'testimonial' then select publication_status, published_at into status_value, published_value from public.testimonials where id = target_id;
    when 'credential' then select publication_status, published_at into status_value, published_value from public.credentials where id = target_id;
    else return false;
  end case;
  return status_value = 'published'
    and published_value is not null
    and published_value <= now()
    and private.publication_failures(content_type, target_id) = '[]'::jsonb;
end;
$$;

create or replace function private.is_public_media_usage(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_media as usage
    where usage.id = target_id
      and usage.public_status = 'eligible'
      and private.public_media_is_current(usage.media_asset_id)
      and (
        usage.decorative
        or exists (
          select 1 from public.project_media_localizations as localization
          where localization.project_media_id = usage.id
            and localization.locale = 'en'
            and localization.alt_text is not null
            and btrim(localization.alt_text) <> ''
        )
      )
  );
$$;

create or replace function private.s4_audit(
  event_action text,
  event_entity_type text,
  event_entity_id text,
  event_outcome text,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, outcome, metadata)
  values (
    auth.uid(), btrim(event_action), btrim(event_entity_type), btrim(event_entity_id),
    btrim(event_outcome),
    case when jsonb_typeof(event_metadata) = 'object' then event_metadata else '{}'::jsonb end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Evidence/media commands and publication commands
-- ---------------------------------------------------------------------------

create or replace function public.create_evidence_record(
  fact_claim text,
  source_type text,
  source_reference text,
  sensitivity text default 'private',
  consent_required boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_id uuid;
begin
  if not private.has_permission('content.write') then
    raise exception using errcode = '42501', message = 'evidence creation is not authorized';
  end if;
  insert into public.evidence_records (
    fact_claim, source_type, source_reference, sensitivity,
    consent_required, owner_id, created_by, updated_by
  )
  values (
    btrim(fact_claim), source_type, btrim(source_reference), sensitivity,
    consent_required, auth.uid(), auth.uid(), auth.uid()
  )
  returning id into evidence_id;
  perform private.s4_audit(
    'evidence.create', 'evidence', evidence_id::text, 'success',
    jsonb_build_object('source_type', source_type, 'sensitivity', sensitivity)
  );
  return evidence_id;
end;
$$;

create or replace function public.transition_evidence(
  target_id uuid,
  expected_version integer,
  next_state text,
  next_approved_public_wording text default null,
  next_consent_state text default null,
  next_review_due_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  old_state text;
begin
  if not private.has_permission('claims.verify') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'claims.verify is required.')));
  end if;
  if next_state not in ('unverified', 'in_review', 'verified', 'expired', 'rejected') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'next_state', 'Evidence state is not admitted.')));
  end if;
  select version, verification_state into current_version, old_state
  from public.evidence_records where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Evidence does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Evidence changed before this command completed.')));
  end if;
  if old_state = 'verified' and next_state = 'unverified' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state_transition', 'next_state', 'Verified evidence cannot return to unverified.')));
  end if;
  perform set_config('renz.s4.evidence_command', '1', true);
  update public.evidence_records
     set verification_state = next_state,
         approved_public_wording = coalesce(next_approved_public_wording, evidence_records.approved_public_wording),
         consent_state = coalesce(next_consent_state, evidence_records.consent_state),
         review_due_at = next_review_due_at,
         reviewer_id = case when next_state in ('verified', 'expired', 'rejected') then auth.uid() else reviewer_id end,
         verified_at = case when next_state = 'verified' then statement_timestamp() else verified_at end,
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit(
    'claim.' || case when next_state = 'verified' then 'verify' else next_state end,
    'evidence', target_id::text, 'success', jsonb_build_object('from', old_state, 'to', next_state)
  );
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', next_state);
end;
$$;

create or replace function public.register_media_asset(
  target_id uuid,
  target_bucket_id text,
  target_object_path text,
  target_media_kind text,
  target_mime_type text,
  target_byte_size bigint,
  target_checksum_sha256 text,
  target_provenance_class text,
  target_original_filename text default null,
  target_width integer default null,
  target_height integer default null,
  target_source_asset_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('media.upload') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.upload is required.')));
  end if;
  if target_bucket_id not in ('editorial-originals', 'editorial-derivatives') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_bucket', 'target_bucket_id', 'Only the two private editorial buckets are admitted.')));
  end if;
  if target_byte_size <= 0 or target_byte_size > 26214400 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('file_too_large', 'target_byte_size', 'Editorial media is limited to 25 MiB in the local foundation.')));
  end if;
  if target_media_kind not in ('image', 'video') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_media_kind', 'target_media_kind', 'Only image and video media are admitted.')));
  end if;
  if target_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_mime', 'target_mime_type', 'The declared MIME type is not admitted.')));
  end if;
  if target_checksum_sha256 !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_checksum', 'target_checksum_sha256', 'A SHA-256 checksum is required.')));
  end if;
  if target_object_path !~ ('^' || target_id::text || '/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_object_path', 'target_object_path', 'Object paths must be rooted at the immutable media UUID.')));
  end if;
  if target_source_asset_id is not null and target_bucket_id <> 'editorial-derivatives' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_derivative', 'target_source_asset_id', 'A derivative must be stored in editorial-derivatives.')));
  end if;
  insert into public.media_assets (
    id, bucket_id, object_path, mime_type, byte_size, checksum_sha256,
    media_kind, provenance_class, original_filename, width, height,
    source_asset_id, created_by, updated_by
  )
  values (
    target_id, target_bucket_id, target_object_path, target_mime_type,
    target_byte_size, lower(target_checksum_sha256), target_media_kind,
    target_provenance_class, target_original_filename, target_width, target_height,
    target_source_asset_id, auth.uid(), auth.uid()
  );
  perform private.s4_audit(
    'media.register', 'media', target_id::text, 'success',
    jsonb_build_object('media_kind', target_media_kind, 'provenance_class', target_provenance_class)
  );
  return jsonb_build_object('ok', true, 'id', target_id, 'state', 'registered');
exception when unique_violation then
  return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_media', 'object_path', 'The media identity or object path already exists.')));
end;
$$;

create or replace function public.update_media_rights(
  target_id uuid,
  expected_version integer,
  next_rights_status text,
  next_public_use_permission text,
  next_consent_state text,
  next_rights_holder text default null,
  next_rights_source text default null,
  next_credit text default null,
  next_review_due_at timestamptz default null,
  next_rights_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  select version into current_version from public.media_assets where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before this command completed.')));
  end if;
  if next_rights_status not in ('unknown', 'in_review', 'cleared', 'expired', 'rejected')
     or next_public_use_permission not in ('not_granted', 'pending', 'granted', 'revoked')
     or next_consent_state not in ('not_required', 'unknown', 'pending', 'granted', 'revoked') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_rights_state', 'rights', 'Rights state is not admitted.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set rights_status = next_rights_status,
         public_use_permission = next_public_use_permission,
         consent_state = next_consent_state,
         rights_holder = next_rights_holder,
         rights_source = next_rights_source,
         credit = next_credit,
         rights_review_due_at = next_review_due_at,
         rights_notes = next_rights_notes,
         rights_reviewer_id = auth.uid(),
         rights_verified_at = case when next_rights_status = 'cleared' then statement_timestamp() else rights_verified_at end,
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit(
    'media.rights.update', 'media', target_id::text, 'success',
    jsonb_build_object('rights_status', next_rights_status, 'public_use_permission', next_public_use_permission)
  );
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.promote_media_asset(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  asset public.media_assets%rowtype;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  select * into asset from public.media_assets where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  current_version := asset.version;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before promotion.')));
  end if;
  if asset.provenance_class in ('concept_demo', 'generated_reference', 'synthetic_test') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_media_classification', 'provenance_class', 'This media class cannot be promoted to public evidence.')));
  end if;
  if asset.bucket_id <> 'editorial-derivatives' or asset.storage_state not in ('ready_private', 'promotion_pending') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('media_not_ready', 'storage_state', 'A finalized derivative is required before promotion.')));
  end if;
  if asset.rights_status <> 'cleared' or asset.public_use_permission <> 'granted'
     or asset.rights_reviewer_id is null or asset.rights_verified_at is null
     or (asset.rights_review_due_at is not null and asset.rights_review_due_at < now())
     or (asset.consent_required and asset.consent_state <> 'granted') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('rights_unknown', 'rights', 'Current rights and consent are required before promotion.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set storage_state = 'public_eligible',
         visibility = 'public_eligible',
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('media.promote', 'media', target_id::text, 'success', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', 'public_eligible');
end;
$$;

create or replace function public.promote_project_media(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  media_asset_id uuid;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  select version, project_media.media_asset_id into current_version, media_asset_id
  from public.project_media where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project_media', 'Project media usage does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Project media changed before promotion.')));
  end if;
  if not private.public_media_is_current(media_asset_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('rights_unknown', 'media_asset_id', 'The media asset is not current and public-eligible.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.project_media
     set public_status = 'eligible', updated_by = auth.uid(), version = version + 1
   where id = target_id;
  perform private.s4_audit('media.promote', 'project_media', target_id::text, 'success', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', 'eligible');
end;
$$;

create or replace function public.archive_media_asset(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  usage_count integer;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;

  select version into current_version
  from public.media_assets
  where id = target_id
  for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before archival.')));
  end if;

  select count(*)::integer into usage_count
  from (
    select 1 from public.services where hero_asset_id = target_id
    union all select 1 from public.projects where hero_asset_id = target_id
    union all select 1 from public.posts where hero_asset_id = target_id
    union all select 1 from public.team_members where portrait_asset_id = target_id
    union all select 1 from public.page_localizations where social_image_id = target_id
    union all select 1 from public.project_media where media_asset_id = target_id
    union all select 1 from public.page_section_media where media_asset_id = target_id
    union all select 1 from public.media_assets where source_asset_id = target_id
  ) as usages;
  if usage_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('media_in_use', 'media', 'Replace or explicitly review every media usage before archival.'))
    );
  end if;

  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set storage_state = 'archived',
         visibility = 'private',
         processing_status = 'archived',
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('media.archive', 'media', target_id::text, 'success', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', 'archived');
end;
$$;

create or replace function public.replace_project_media_asset(
  target_id uuid,
  expected_version integer,
  replacement_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  previous_asset_id uuid;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  if target_id = replacement_asset_id then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_replacement', 'replacement_asset_id', 'A replacement must be a different media asset.')));
  end if;

  select version, media_asset_id into current_version, previous_asset_id
  from public.project_media
  where id = target_id
  for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project_media', 'Project media usage does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Project media changed before replacement.')));
  end if;
  if not private.public_media_is_current(replacement_asset_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('rights_unknown', 'replacement_asset_id', 'The replacement asset is not current and public-eligible.')));
  end if;

  perform set_config('renz.s4.media_command', '1', true);
  update public.project_media
     set media_asset_id = replacement_asset_id,
         public_status = 'private',
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit(
    'media.replace', 'project_media', target_id::text, 'success',
    jsonb_build_object('previous_asset_id', previous_asset_id, 'replacement_asset_id', replacement_asset_id)
  );
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', 'private');
end;
$$;

create or replace function private.publish_record(content_type text, target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  failures jsonb;
  current_version integer;
begin
  if not private.has_permission('content.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.publish is required.')));
  end if;
  case content_type
    when 'service' then select version into current_version from public.services where id = target_id for update;
    when 'project' then select version into current_version from public.projects where id = target_id for update;
    when 'post' then select version into current_version from public.posts where id = target_id for update;
    when 'page' then select version into current_version from public.site_pages where id = target_id for update;
    when 'team_member' then select version into current_version from public.team_members where id = target_id for update;
    when 'testimonial' then select version into current_version from public.testimonials where id = target_id for update;
    when 'credential' then select version into current_version from public.credentials where id = target_id for update;
    else return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsupported_content_type', 'content_type', 'Content type is not admitted.')));
  end case;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'content', 'Content record does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Content changed before publication.')));
  end if;
  failures := private.publication_failures(content_type, target_id);
  if failures <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'reasons', failures);
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  case content_type
    when 'service' then
      update public.services set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'project' then
      update public.projects set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'post' then
      update public.posts set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'page' then
      update public.site_pages set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'team_member' then
      update public.team_members set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'testimonial' then
      update public.testimonials set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'credential' then
      update public.credentials set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
  end case;
  perform private.s4_audit('content.publish', content_type, target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  return jsonb_build_object('ok', true, 'content_type', content_type, 'id', target_id, 'version', expected_version + 1, 'publication_status', 'published');
end;
$$;

create or replace function public.publish_content(content_type text, target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$
  select private.publish_record(content_type, target_id, expected_version);
$$;

create or replace function public.publish_service(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('service', target_id, expected_version); $$;
create or replace function public.publish_project(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('project', target_id, expected_version); $$;
create or replace function public.publish_post(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('post', target_id, expected_version); $$;
create or replace function public.publish_page(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('page', target_id, expected_version); $$;
create or replace function public.publish_team_member(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('team_member', target_id, expected_version); $$;
create or replace function public.publish_testimonial(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('testimonial', target_id, expected_version); $$;
create or replace function public.publish_credential(target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select private.publish_record('credential', target_id, expected_version); $$;

create or replace function public.check_publication_readiness(content_type text, target_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('content.read') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.read is required.'))
    );
  end if;
  return jsonb_build_object(
    'ok', private.publication_failures(content_type, target_id) = '[]'::jsonb,
    'reasons', private.publication_failures(content_type, target_id)
  );
end;
$$;

create or replace function public.change_content_publication(
  content_type text,
  target_id uuid,
  expected_version integer,
  operation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if operation not in ('unpublish', 'archive') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_operation', 'operation', 'Publication operation is not admitted.')));
  end if;
  if (operation = 'archive' and not private.has_permission('content.archive'))
     or (operation = 'unpublish' and not private.has_permission('content.publish')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'The required publication permission is missing.')));
  end if;
  case content_type
    when 'service' then select version into current_version from public.services where id = target_id for update;
    when 'project' then select version into current_version from public.projects where id = target_id for update;
    when 'post' then select version into current_version from public.posts where id = target_id for update;
    when 'page' then select version into current_version from public.site_pages where id = target_id for update;
    when 'team_member' then select version into current_version from public.team_members where id = target_id for update;
    when 'testimonial' then select version into current_version from public.testimonials where id = target_id for update;
    when 'credential' then select version into current_version from public.credentials where id = target_id for update;
    else return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsupported_content_type', 'content_type', 'Content type is not admitted.')));
  end case;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'content', 'Content record does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Content changed before this command completed.')));
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  case content_type
    when 'service' then update public.services set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'project' then update public.projects set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'post' then update public.posts set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'page' then update public.site_pages set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'team_member' then update public.team_members set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'testimonial' then update public.testimonials set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'credential' then update public.credentials set publication_status = case when operation = 'archive' then 'archived' else 'draft' end, published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
  end case;
  perform private.s4_audit('content.' || operation, content_type, target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  return jsonb_build_object('ok', true, 'content_type', content_type, 'id', target_id, 'version', expected_version + 1, 'publication_status', case when operation = 'archive' then 'archived' else 'draft' end);
end;
$$;

create or replace function public.unpublish_content(content_type text, target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select public.change_content_publication(content_type, target_id, expected_version, 'unpublish'); $$;
create or replace function public.archive_content(content_type text, target_id uuid, expected_version integer)
returns jsonb language sql security definer set search_path = '' as $$ select public.change_content_publication(content_type, target_id, expected_version, 'archive'); $$;

-- Navigation is a separate bounded website operation.
create or replace function private.navigation_publication_failures(target_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  failures jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.navigation_menus where id = target_id) then
    return jsonb_build_array(private.failure('not_found', 'navigation_menu', 'Navigation menu does not exist.'));
  end if;
  if not exists (
    select 1 from public.navigation_items as item
    join public.navigation_item_localizations as localization on localization.navigation_item_id = item.id
    where item.menu_id = target_id and localization.locale = 'en'
  ) then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'navigation_items', 'A public navigation menu needs reviewed English items.'));
  end if;
  if exists (
    select 1 from public.navigation_items as item
    where item.menu_id = target_id
      and (
        (item.link_type = 'external' and item.external_url !~* '^https://')
        or (item.link_type = 'internal' and item.internal_path ~* '^/(admin|preview)(/|$)')
      )
  ) then
    failures := failures || jsonb_build_array(private.failure('invalid_url', 'navigation_items', 'Navigation contains an unsafe or private target.'));
  end if;
  if exists (
    select 1 from public.navigation_evidence as link
    where link.navigation_menu_id = target_id and link.required and not private.evidence_is_current(link.evidence_id)
  ) or not exists (select 1 from public.navigation_evidence where navigation_menu_id = target_id and required) then
    failures := failures || jsonb_build_array(private.failure('missing_verification', 'evidence', 'Navigation publication requires reviewed evidence.'));
  end if;
  return failures;
end;
$$;

create or replace function public.publish_navigation_menu(target_id uuid, expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_version integer;
  failures jsonb;
begin
  if not private.has_permission('website.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.manage is required.')));
  end if;
  select version into current_version from public.navigation_menus where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'navigation_menu', 'Navigation menu does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Navigation changed before publication.')));
  end if;
  failures := private.navigation_publication_failures(target_id);
  if failures <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'reasons', failures);
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  update public.navigation_menus set publication_status = 'published', published_at = coalesce(published_at, statement_timestamp()), updated_by = auth.uid(), version = version + 1 where id = target_id;
  perform private.s4_audit('navigation.update', 'navigation_menu', target_id::text, 'success', jsonb_build_object('publication_status', 'published'));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.unpublish_navigation_menu(target_id uuid, expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_version integer;
begin
  if not private.has_permission('website.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.manage is required.')));
  end if;
  select version into current_version from public.navigation_menus where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'navigation_menu', 'Navigation menu does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Navigation changed before unpublication.')));
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  update public.navigation_menus set publication_status = 'draft', published_at = null, updated_by = auth.uid(), version = version + 1 where id = target_id;
  perform private.s4_audit('navigation.update', 'navigation_menu', target_id::text, 'success', jsonb_build_object('publication_status', 'draft'));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- Optimistic concurrency must remain explicit for S4 updates.
create trigger evidence_records_touch_mutable_row before update on public.evidence_records
for each row execute function private.touch_mutable_row();
create trigger material_claims_touch_mutable_row before update on public.material_claims
for each row execute function private.touch_mutable_row();
create trigger credential_verifications_touch_mutable_row before update on public.credential_verifications
for each row execute function private.touch_mutable_row();

-- ---------------------------------------------------------------------------
-- Indexes and default-deny posture for S4 tables
-- ---------------------------------------------------------------------------

create index evidence_records_state_due_idx on public.evidence_records (verification_state, review_due_at);
create index service_evidence_evidence_service_idx on public.service_evidence (evidence_id, service_id);
create index project_evidence_evidence_project_idx on public.project_evidence (evidence_id, project_id);
create index post_evidence_evidence_post_idx on public.post_evidence (evidence_id, post_id);
create index page_evidence_evidence_page_idx on public.page_evidence (evidence_id, page_id);
create index team_member_evidence_evidence_member_idx on public.team_member_evidence (evidence_id, team_member_id);
create index testimonial_evidence_evidence_testimonial_idx on public.testimonial_evidence (evidence_id, testimonial_id);
create index credential_evidence_evidence_credential_idx on public.credential_evidence (evidence_id, credential_id);
create index material_claims_state_due_idx on public.material_claims (verification_state, review_due_at);
create index claim_evidence_evidence_claim_idx on public.claim_evidence (evidence_id, claim_id);
create index project_claims_claim_project_idx on public.project_claims (claim_id, project_id);
create index service_claims_claim_service_idx on public.service_claims (claim_id, service_id);
create index post_claims_claim_post_idx on public.post_claims (claim_id, post_id);
create index page_claims_claim_page_idx on public.page_claims (claim_id, page_id);
create index team_member_claims_claim_member_idx on public.team_member_claims (claim_id, team_member_id);
create index credential_claims_claim_credential_idx on public.credential_claims (claim_id, credential_id);
create index media_assets_provenance_state_idx on public.media_assets (provenance_class, storage_state);
create index media_assets_rights_due_idx on public.media_assets (rights_status, rights_review_due_at);
create index media_assets_source_idx on public.media_assets (source_asset_id) where source_asset_id is not null;
create index evidence_records_owner_idx on public.evidence_records (owner_id) where owner_id is not null;
create index evidence_records_reviewer_idx on public.evidence_records (reviewer_id) where reviewer_id is not null;
create index evidence_records_created_by_idx on public.evidence_records (created_by) where created_by is not null;
create index evidence_records_updated_by_idx on public.evidence_records (updated_by) where updated_by is not null;
create index material_claims_reviewer_idx on public.material_claims (reviewer_id) where reviewer_id is not null;
create index material_claims_created_by_idx on public.material_claims (created_by) where created_by is not null;
create index material_claims_updated_by_idx on public.material_claims (updated_by) where updated_by is not null;
create index media_assets_rights_reviewer_idx on public.media_assets (rights_reviewer_id) where rights_reviewer_id is not null;
create index project_media_public_status_idx on public.project_media (project_id, public_status, sort_order);
create index public_site_settings_public_status_idx on public.public_site_settings (namespace, key, public_status);
create index navigation_menus_publication_idx on public.navigation_menus (key, publication_status);
create index projects_reviewed_by_idx on public.projects (reviewed_by) where reviewed_by is not null;
create index posts_reviewed_by_idx on public.posts (reviewed_by) where reviewed_by is not null;
create index team_members_reviewed_by_idx on public.team_members (reviewed_by) where reviewed_by is not null;
create index testimonials_reviewed_by_idx on public.testimonials (reviewed_by) where reviewed_by is not null;
create index credentials_reviewed_by_idx on public.credentials (reviewed_by) where reviewed_by is not null;
create index public_site_settings_reviewed_by_idx on public.public_site_settings (reviewed_by) where reviewed_by is not null;
create index credential_verifications_verified_by_idx on public.credential_verifications (verified_by) where verified_by is not null;

alter table public.content_section_registry enable row level security;
alter table public.public_setting_registry enable row level security;
alter table public.evidence_records enable row level security;
alter table public.service_evidence enable row level security;
alter table public.project_evidence enable row level security;
alter table public.post_evidence enable row level security;
alter table public.page_evidence enable row level security;
alter table public.team_member_evidence enable row level security;
alter table public.testimonial_evidence enable row level security;
alter table public.credential_evidence enable row level security;
alter table public.navigation_evidence enable row level security;
alter table public.setting_evidence enable row level security;
alter table public.material_claims enable row level security;
alter table public.claim_evidence enable row level security;
alter table public.project_claims enable row level security;
alter table public.service_claims enable row level security;
alter table public.post_claims enable row level security;
alter table public.page_claims enable row level security;
alter table public.team_member_claims enable row level security;
alter table public.credential_claims enable row level security;
alter table public.credential_verifications enable row level security;

revoke all privileges on table
  public.content_section_registry, public.public_setting_registry,
  public.evidence_records, public.service_evidence, public.project_evidence,
  public.post_evidence, public.page_evidence, public.team_member_evidence,
  public.testimonial_evidence, public.credential_evidence,
  public.navigation_evidence, public.setting_evidence, public.material_claims,
  public.claim_evidence, public.project_claims, public.service_claims,
  public.post_claims, public.page_claims, public.team_member_claims,
  public.credential_claims, public.credential_verifications
from public, anon, authenticated;

revoke all privileges on all sequences in schema public from public, anon, authenticated;
revoke all privileges on all functions in schema public from public, anon, authenticated;

-- S4 has explicit function-only mutations. The browser never receives generic
-- INSERT/UPDATE/DELETE on content, evidence, claims, or media rows.
grant execute on function public.create_evidence_record(text, text, text, text, boolean) to authenticated;
grant execute on function public.transition_evidence(uuid, integer, text, text, text, timestamptz) to authenticated;
grant execute on function public.register_media_asset(uuid, text, text, text, text, bigint, text, text, text, integer, integer, uuid) to authenticated;
grant execute on function public.update_media_rights(uuid, integer, text, text, text, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.promote_media_asset(uuid, integer) to authenticated;
grant execute on function public.promote_project_media(uuid, integer) to authenticated;
grant execute on function public.archive_media_asset(uuid, integer) to authenticated;
grant execute on function public.replace_project_media_asset(uuid, integer, uuid) to authenticated;
grant execute on function public.publish_content(text, uuid, integer) to authenticated;
grant execute on function public.publish_service(uuid, integer) to authenticated;
grant execute on function public.publish_project(uuid, integer) to authenticated;
grant execute on function public.publish_post(uuid, integer) to authenticated;
grant execute on function public.publish_page(uuid, integer) to authenticated;
grant execute on function public.publish_team_member(uuid, integer) to authenticated;
grant execute on function public.publish_testimonial(uuid, integer) to authenticated;
grant execute on function public.publish_credential(uuid, integer) to authenticated;
grant execute on function public.check_publication_readiness(text, uuid) to authenticated;
grant execute on function public.change_content_publication(text, uuid, integer, text) to authenticated;
grant execute on function public.unpublish_content(text, uuid, integer) to authenticated;
grant execute on function public.archive_content(text, uuid, integer) to authenticated;
grant execute on function public.publish_navigation_menu(uuid, integer) to authenticated;
grant execute on function public.unpublish_navigation_menu(uuid, integer) to authenticated;

comment on table public.evidence_records is
  'S4 evidence governance. Verification state is independent from content publication status.';
comment on table public.material_claims is
  'Material claims/outcomes are stored and reviewed independently from decorative copy.';
comment on table public.media_assets is
  'Metadata only. Storage objects are managed through the supported Storage API; public_eligible means finalized for later public delivery, not an anonymous bucket URL.';
comment on table public.content_section_registry is
  'Bounded section registry for the curated composer; arbitrary HTML, CSS, and JavaScript are not supported.';
comment on table public.public_setting_registry is
  'Allow-list for public settings. Registry rows are not public values and do not contain secrets.';
