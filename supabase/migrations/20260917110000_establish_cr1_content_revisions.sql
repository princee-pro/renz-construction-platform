-- CR1 — Content revisions for the domain-managed public content
-- (Services, Projects, Insights) plus the owner-facing schema extensions.
--
-- Before CR1 the public projections read the live draft rows and a published
-- row was immutable, so the owner had to unpublish (a public gap) to change
-- a live service or project. CR1 introduces content_publications: every
-- publish freezes a structured snapshot; the public projections read the
-- current snapshot; drafts stay private until "Publish changes"; revisions
-- can be restored as a new draft. The S4 evidence, rights, claims and
-- review discipline is unchanged — it is evaluated at publish time and the
-- live-state parts (evidence currency, media rights, claims) keep gating the
-- projection at read time.

-- ---------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------

-- Services: the client-approved five-category shape (positioning, sub-services,
-- use cases, process, coordination, FAQ) becomes owner-editable data.
alter table public.service_localizations
  add column if not exists positioning text,
  add column if not exists sub_services jsonb not null default '[]'::jsonb,
  add column if not exists use_cases jsonb not null default '[]'::jsonb,
  add column if not exists process_steps jsonb not null default '[]'::jsonb,
  add column if not exists coordination text,
  add column if not exists faqs jsonb not null default '[]'::jsonb;

alter table public.service_localizations
  drop constraint if exists service_localizations_positioning_check,
  add constraint service_localizations_positioning_check
    check (positioning is null or (positioning = btrim(positioning) and char_length(positioning) between 1 and 300)),
  drop constraint if exists service_localizations_coordination_check,
  add constraint service_localizations_coordination_check
    check (coordination is null or (coordination = btrim(coordination) and char_length(coordination) between 1 and 1000)),
  drop constraint if exists service_localizations_lists_check,
  add constraint service_localizations_lists_check
    check (
      jsonb_typeof(sub_services) = 'array' and jsonb_array_length(sub_services) <= 24
      and jsonb_typeof(use_cases) = 'array' and jsonb_array_length(use_cases) <= 24
      and jsonb_typeof(process_steps) = 'array' and jsonb_array_length(process_steps) <= 24
      and jsonb_typeof(faqs) = 'array' and jsonb_array_length(faqs) <= 24
    );

create or replace function private.validate_service_detail_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.content_json_is_safe(new.sub_services)
     or not private.content_json_is_safe(new.use_cases)
     or not private.content_json_is_safe(new.process_steps)
     or not private.content_json_is_safe(new.faqs) then
    raise check_violation using message = 'service detail content contains executable or raw markup';
  end if;
  return new;
end;
$$;

drop trigger if exists service_localizations_detail_safe on public.service_localizations;
create trigger service_localizations_detail_safe
before insert or update of sub_services, use_cases, process_steps, faqs on public.service_localizations
for each row execute function private.validate_service_detail_trigger();

-- Projects: explicit evidence class, auto-layout hint, home feature, materials, tags.
alter table public.projects
  add column if not exists evidence_class text not null default 'real_project',
  add column if not exists layout_hint text not null default 'auto',
  add column if not exists home_featured boolean not null default false,
  add column if not exists materials text,
  add column if not exists tags jsonb not null default '[]'::jsonb;

alter table public.projects
  drop constraint if exists projects_evidence_class_check,
  add constraint projects_evidence_class_check
    check (evidence_class in ('real_project', 'concept_study', 'experience_study')),
  drop constraint if exists projects_layout_hint_check,
  add constraint projects_layout_hint_check
    check (layout_hint in ('auto', 'monument', 'portrait', 'landscape', 'technical', 'strip', 'wide')),
  drop constraint if exists projects_materials_check,
  add constraint projects_materials_check
    check (materials is null or (materials = btrim(materials) and char_length(materials) between 1 and 300)),
  drop constraint if exists projects_tags_check,
  add constraint projects_tags_check
    check (jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 12);

-- Insights: topic, related service and placement controls.
alter table public.posts
  add column if not exists topic text,
  add column if not exists related_service_id uuid references public.services (id) on delete set null,
  add column if not exists featured boolean not null default false,
  add column if not exists pinned boolean not null default false,
  add column if not exists sort_priority integer not null default 0;

alter table public.posts
  drop constraint if exists posts_topic_check,
  add constraint posts_topic_check
    check (topic is null or (topic = btrim(topic) and char_length(topic) between 1 and 80)),
  drop constraint if exists posts_sort_priority_check,
  add constraint posts_sort_priority_check check (sort_priority between 0 and 100000);

create index if not exists posts_related_service_idx on public.posts (related_service_id);

-- ---------------------------------------------------------------------
-- content_publications: frozen snapshots per publish
-- ---------------------------------------------------------------------

create table public.content_publications (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  target_id uuid not null,
  revision_no integer not null,
  kind text not null default 'published',
  summary text,
  snapshot jsonb not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint content_publications_type_check check (content_type in ('service', 'project', 'post')),
  constraint content_publications_kind_check check (kind in ('published', 'restore_point')),
  constraint content_publications_summary_check check (summary is null or char_length(summary) <= 300),
  constraint content_publications_snapshot_check check (jsonb_typeof(snapshot) = 'object'),
  constraint content_publications_revision_unique unique (content_type, target_id, revision_no)
);
create unique index content_publications_current_idx
  on public.content_publications (content_type, target_id) where is_current;
create index content_publications_created_by_idx on public.content_publications (created_by);

alter table public.content_publications enable row level security;
alter table public.content_publications force row level security;
revoke all on public.content_publications from public, anon, authenticated;

-- Structured snapshot builders (media ids and relationship ids, never bytes).
create or replace function private.content_snapshot(content_type text, target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if content_type = 'service' then
    select jsonb_build_object(
      'service', jsonb_build_object(
        'id', service.id, 'sort_order', service.sort_order, 'featured', service.featured, 'hero_asset_id', service.hero_asset_id
      ),
      'localization', jsonb_build_object(
        'locale', l.locale, 'slug', l.slug, 'name', l.name, 'summary', l.summary, 'body_blocks', l.body_blocks,
        'schema_version', l.schema_version, 'seo_title', l.seo_title, 'seo_description', l.seo_description,
        'scope', l.scope, 'deliverables', l.deliverables, 'exclusions', l.exclusions, 'client_inputs', l.client_inputs,
        'delivery_wording', l.delivery_wording, 'professional_terminology', l.professional_terminology,
        'positioning', l.positioning, 'sub_services', l.sub_services, 'use_cases', l.use_cases,
        'process_steps', l.process_steps, 'coordination', l.coordination, 'faqs', l.faqs
      )
    )
    into result
    from public.services as service
    join public.service_localizations as l on l.service_id = service.id and l.locale = 'en'
    where service.id = target_id;
  elsif content_type = 'project' then
    select jsonb_build_object(
      'project', jsonb_build_object(
        'id', project.id, 'sort_order', project.sort_order, 'featured', project.featured, 'home_featured', project.home_featured,
        'hero_asset_id', project.hero_asset_id, 'public_location', project.public_location,
        'public_location_granularity', project.public_location_granularity, 'project_type', project.project_type,
        'project_scope', project.project_scope, 'renz_role', project.renz_role, 'start_year', project.start_year,
        'completion_year', project.completion_year, 'delivery_status', project.delivery_status,
        'evidence_class', project.evidence_class, 'layout_hint', project.layout_hint, 'materials', project.materials, 'tags', project.tags
      ),
      'localization', jsonb_build_object(
        'locale', l.locale, 'slug', l.slug, 'title', l.title, 'summary', l.summary, 'challenge', l.challenge,
        'approach', l.approach, 'solution', l.solution, 'outcomes', l.outcomes, 'seo_title', l.seo_title, 'seo_description', l.seo_description
      ),
      'media', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', usage.id, 'media_asset_id', usage.media_asset_id, 'role', usage.role, 'phase', usage.phase, 'stage_id', usage.stage_id,
          'sort_order', usage.sort_order, 'decorative', usage.decorative, 'credit', usage.credit, 'focal_point', usage.focal_point,
          'alt_text', text.alt_text, 'caption', text.caption
        ) order by usage.sort_order, usage.id)
        from public.project_media as usage
        left join public.project_media_localizations as text on text.project_media_id = usage.id and text.locale = 'en'
        where usage.project_id = project.id
      ), '[]'::jsonb),
      'services', coalesce((
        select jsonb_agg(jsonb_build_object('service_id', relation.service_id, 'scope_label', relation.scope_label, 'sort_order', relation.sort_order) order by relation.sort_order, relation.service_id)
        from public.project_services as relation where relation.project_id = project.id
      ), '[]'::jsonb),
      'stages', coalesce((
        select jsonb_agg(jsonb_build_object('id', stage.id, 'title', stage.title, 'description', stage.description, 'sort_order', stage.sort_order) order by stage.sort_order, stage.id)
        from public.project_stages as stage where stage.project_id = project.id
      ), '[]'::jsonb)
    )
    into result
    from public.projects as project
    join public.project_localizations as l on l.project_id = project.id and l.locale = 'en'
    where project.id = target_id;
  elsif content_type = 'post' then
    select jsonb_build_object(
      'post', jsonb_build_object(
        'id', post.id, 'publication_date', post.publication_date, 'author_id', post.author_id, 'hero_asset_id', post.hero_asset_id,
        'topic', post.topic, 'related_service_id', post.related_service_id, 'featured', post.featured, 'pinned', post.pinned,
        'sort_priority', post.sort_priority, 'is_time_sensitive', post.is_time_sensitive
      ),
      'localization', jsonb_build_object(
        'locale', l.locale, 'slug', l.slug, 'title', l.title, 'excerpt', l.excerpt, 'body_blocks', l.body_blocks,
        'schema_version', l.schema_version, 'seo_title', l.seo_title, 'seo_description', l.seo_description
      )
    )
    into result
    from public.posts as post
    join public.post_localizations as l on l.post_id = post.id and l.locale = 'en'
    where post.id = target_id;
  end if;
  return result;
end;
$$;
revoke all on function private.content_snapshot(text, uuid) from public, anon, authenticated;

create or replace function private.content_snapshot_fingerprint(snapshot jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    select jsonb_object_agg(entry.key, case
      when entry.key = 'media' then (select coalesce(jsonb_agg(item - 'id'), '[]'::jsonb) from jsonb_array_elements(entry.value) as item)
      when entry.key = 'stages' then (select coalesce(jsonb_agg(item - 'id'), '[]'::jsonb) from jsonb_array_elements(entry.value) as item)
      else entry.value
    end)
    from jsonb_each(snapshot) as entry
  ), '{}'::jsonb);
$$;

create or replace function private.capture_content_publication(content_type text, target_id uuid, summary text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  next_no integer;
  new_id uuid;
begin
  snapshot := private.content_snapshot(content_type, target_id);
  if snapshot is null then
    return null;
  end if;
  select coalesce(max(revision_no), 0) + 1 into next_no
  from public.content_publications where content_publications.content_type = capture_content_publication.content_type and content_publications.target_id = capture_content_publication.target_id;
  update public.content_publications set is_current = false
   where content_publications.content_type = capture_content_publication.content_type and content_publications.target_id = capture_content_publication.target_id and is_current;
  insert into public.content_publications (content_type, target_id, revision_no, kind, summary, snapshot, is_current, created_by)
  values (content_type, target_id, next_no, 'published', nullif(btrim(coalesce(summary, '')), ''), snapshot, true, auth.uid())
  returning id into new_id;
  return jsonb_build_object('revision_id', new_id, 'revision_no', next_no);
end;
$$;
revoke all on function private.capture_content_publication(text, uuid, text) from public, anon, authenticated;


-- Every transition into 'published' freezes a snapshot, whichever guarded
-- path performed it (publish command, or a synthetic fixture insert).
create or replace function private.capture_on_publish_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind text := case tg_table_name when 'services' then 'service' when 'projects' then 'project' else 'post' end;
begin
  if new.publication_status = 'published' and (tg_op = 'INSERT' or old.publication_status is distinct from 'published') then
    perform private.capture_content_publication(kind, new.id, null);
  end if;
  return null;
end;
$$;
revoke all on function private.capture_on_publish_trigger() from public, anon, authenticated;

drop trigger if exists services_capture_on_publish on public.services;
create trigger services_capture_on_publish after insert or update of publication_status on public.services
for each row execute function private.capture_on_publish_trigger();
drop trigger if exists projects_capture_on_publish on public.projects;
create trigger projects_capture_on_publish after insert or update of publication_status on public.projects
for each row execute function private.capture_on_publish_trigger();
drop trigger if exists posts_capture_on_publish on public.posts;
create trigger posts_capture_on_publish after insert or update of publication_status on public.posts
for each row execute function private.capture_on_publish_trigger();

create or replace function private.content_has_draft_changes(content_type text, target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.content_publications as cp
      where cp.content_type = content_has_draft_changes.content_type and cp.target_id = content_has_draft_changes.target_id and cp.is_current
    ) then true
    else private.content_snapshot_fingerprint(private.content_snapshot(content_type, target_id)) <> (
      select private.content_snapshot_fingerprint(cp.snapshot) from public.content_publications as cp
      where cp.content_type = content_has_draft_changes.content_type and cp.target_id = content_has_draft_changes.target_id and cp.is_current
    )
  end;
$$;
revoke all on function private.content_has_draft_changes(text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Live-state gate: what keeps gating a published snapshot at read time
-- ---------------------------------------------------------------------

-- Evidence currency, claims, hero rights and (for projects) class-appropriate
-- media rules. Draft field completeness is enforced at publish time only, so
-- an in-progress draft edit can never hide or change the live page.
create or replace function private.content_live_failures(content_type text, target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
  asset_id uuid;
  class text;
  claim_id uuid;
  time_sensitive boolean;
begin
  if content_type = 'service' then
    failures := failures || private.required_evidence_failures('service_evidence', target_id);
    select hero_asset_id into asset_id from public.services where id = target_id;
    if asset_id is not null and not private.public_media_is_current(asset_id) and not private.website_media_is_current(asset_id) then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The service hero media is not public-eligible.'));
    end if;
  elsif content_type = 'project' then
    select evidence_class, hero_asset_id into class, asset_id from public.projects where id = target_id;
    if class = 'real_project' then
      failures := failures || private.required_evidence_failures('project_evidence', target_id);
      if asset_id is not null and not private.public_media_is_current(asset_id) then
        failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The project hero media is not public-eligible.'));
      end if;
    elsif asset_id is not null and not private.website_media_is_current(asset_id) then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The project hero media is not ready for public use.'));
    end if;
    -- Eligible media whose rights are no longer current withdraws the project
    -- (S4 rule kept): the public never sees a case study with unsafe media.
    if exists (
      select 1 from public.project_media as usage
      join public.media_assets as asset on asset.id = usage.media_asset_id
      where usage.project_id = target_id and usage.public_status = 'eligible'
        and (
          (class = 'real_project' and not private.public_media_is_current(usage.media_asset_id))
          or (class <> 'real_project' and not private.website_media_is_current(usage.media_asset_id))
        )
    ) then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'project_media', 'Project media rights are not current for public use.'));
    end if;
    for claim_id in
      select relation.claim_id from public.project_claims as relation where relation.project_id = target_id and relation.required
    loop
      if not private.claim_is_current(claim_id) then
        failures := failures || jsonb_build_array(private.failure('missing_verification', 'claim', 'A required project claim is not current.'));
      end if;
    end loop;
  elsif content_type = 'post' then
    select is_time_sensitive, hero_asset_id into time_sensitive, asset_id from public.posts where id = target_id;
    if coalesce(time_sensitive, false) then
      failures := failures || private.required_evidence_failures('post_evidence', target_id);
    end if;
    if asset_id is not null and not private.public_media_is_current(asset_id) and not private.website_media_is_current(asset_id) then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The insight hero media is not public-eligible.'));
    end if;
  end if;
  return failures;
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
  if status_value is distinct from 'published' or published_value is null or published_value > now() then
    return false;
  end if;
  if content_type in ('service', 'project', 'post') then
    return exists (
      select 1 from public.content_publications as cp
      where cp.content_type = is_public_content.content_type and cp.target_id = is_public_content.target_id and cp.is_current
    ) and private.content_live_failures(content_type, target_id) = '[]'::jsonb;
  end if;
  return private.publication_failures(content_type, target_id) = '[]'::jsonb;
end;
$$;

-- Concept / experience studies: no evidence records are required and
-- rights-cleared concept imagery may illustrate them (the renderer always
-- labels the provenance). Real RENZ projects keep the full S4 gate.
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
  is_real boolean;
begin
  select * into project_row from public.projects where id = target_id;
  if not found then
    return jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.'));
  end if;
  is_real := project_row.evidence_class = 'real_project';

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

  if is_real and (project_row.public_location is null or project_row.public_location_granularity is null) then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'public_location', 'A public-safe location granularity is required.'));
  end if;
  if project_row.project_type is null then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'project_type', 'Project type is required.'));
  end if;
  if is_real and (project_row.project_scope is null or btrim(project_row.project_scope) = '') then
    failures := failures || jsonb_build_array(private.failure('missing_required_field', 'project_scope', 'Project scope is required.'));
  end if;
  if is_real and (project_row.renz_role is null or btrim(project_row.renz_role) = '') then
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

  if is_real then
    failures := failures || private.required_evidence_failures('project_evidence', target_id);
  end if;

  select hero_asset_id into asset_id from public.projects where id = target_id;
  if asset_id is not null then
    if is_real and not private.public_media_is_current(asset_id) then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The project hero media is not public-eligible.'));
    elsif not is_real and not private.website_media_is_current(asset_id) then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The project hero media is not ready for public use.'));
    end if;
  end if;

  for media_row in
    select media.id, media.media_asset_id, media.public_status, media.decorative
    from public.project_media as media
    where media.project_id = target_id and media.public_status = 'eligible'
  loop
    select * into asset_row from public.media_assets where id = media_row.media_asset_id;
    if is_real and asset_row.provenance_class in ('concept_demo', 'generated_reference', 'synthetic_test') then
      failures := failures || jsonb_build_array(private.failure('invalid_media_classification', 'project_media', 'Concept, generated, or synthetic media cannot be completed-project evidence.'));
    elsif asset_row.rights_status in ('unknown', 'in_review') or asset_row.public_use_permission <> 'granted' then
      failures := failures || jsonb_build_array(private.failure('rights_unknown', 'project_media', 'Project media rights are not cleared for public use.'));
    elsif asset_row.rights_status in ('expired', 'rejected') then
      failures := failures || jsonb_build_array(private.failure('rights_expired', 'project_media', 'Project media rights are expired or rejected.'));
    elsif is_real and not private.public_media_is_current(media_row.media_asset_id) then
      failures := failures || jsonb_build_array(private.failure('media_not_ready', 'project_media', 'Project media is not finalized for public delivery.'));
    elsif not is_real and not private.website_media_is_current(media_row.media_asset_id) then
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

-- Media usage gate: real projects keep the S4 rule; concept / experience
-- studies may deliver rights-cleared concept imagery.
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
    join public.projects as project on project.id = usage.project_id
    where usage.id = target_id
      and usage.public_status = 'eligible'
      and (
        private.public_media_is_current(usage.media_asset_id)
        or (project.evidence_class <> 'real_project' and private.website_media_is_current(usage.media_asset_id))
      )
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

-- ---------------------------------------------------------------------
-- Public projections now read the current published snapshot
-- ---------------------------------------------------------------------

drop view if exists public.published_project_services;
drop view if exists public.published_project_media;
drop view if exists public.published_services;
drop view if exists public.published_projects;
drop view if exists public.published_posts;

create view public.published_services with (security_barrier = true) as
select
  service.id,
  (cp.snapshot #>> '{localization,locale}') as locale,
  (cp.snapshot #>> '{localization,slug}') as slug,
  (cp.snapshot #>> '{localization,name}') as name,
  (cp.snapshot #>> '{localization,summary}') as summary,
  (cp.snapshot #>> '{localization,scope}') as scope,
  (cp.snapshot #>> '{localization,deliverables}') as deliverables,
  (cp.snapshot #>> '{localization,exclusions}') as exclusions,
  (cp.snapshot #>> '{localization,client_inputs}') as client_inputs,
  (cp.snapshot #>> '{localization,delivery_wording}') as delivery_wording,
  coalesce(cp.snapshot #> '{localization,body_blocks}', '[]'::jsonb) as body_blocks,
  coalesce((cp.snapshot #>> '{localization,schema_version}')::integer, 1) as schema_version,
  (cp.snapshot #>> '{localization,seo_title}') as seo_title,
  (cp.snapshot #>> '{localization,seo_description}') as seo_description,
  coalesce((cp.snapshot #>> '{service,sort_order}')::integer, 0) as sort_order,
  coalesce((cp.snapshot #>> '{service,featured}')::boolean, false) as featured,
  service.published_at,
  (cp.snapshot #>> '{localization,positioning}') as positioning,
  coalesce(cp.snapshot #> '{localization,sub_services}', '[]'::jsonb) as sub_services,
  coalesce(cp.snapshot #> '{localization,use_cases}', '[]'::jsonb) as use_cases,
  coalesce(cp.snapshot #> '{localization,process_steps}', '[]'::jsonb) as process_steps,
  (cp.snapshot #>> '{localization,coordination}') as coordination,
  coalesce(cp.snapshot #> '{localization,faqs}', '[]'::jsonb) as faqs,
  case when (cp.snapshot #>> '{service,hero_asset_id}') is null then null else (cp.snapshot #>> '{service,hero_asset_id}')::uuid end as hero_asset_id,
  cp.revision_no
from public.services as service
join public.content_publications as cp on cp.content_type = 'service' and cp.target_id = service.id and cp.is_current
where private.is_public_content('service', service.id);

create view public.published_projects with (security_barrier = true) as
select
  project.id,
  (cp.snapshot #>> '{localization,locale}') as locale,
  (cp.snapshot #>> '{localization,slug}') as slug,
  (cp.snapshot #>> '{localization,title}') as title,
  (cp.snapshot #>> '{localization,summary}') as summary,
  (cp.snapshot #>> '{localization,challenge}') as challenge,
  (cp.snapshot #>> '{localization,approach}') as approach,
  (cp.snapshot #>> '{localization,solution}') as solution,
  (cp.snapshot #>> '{localization,outcomes}') as outcomes,
  (cp.snapshot #>> '{localization,seo_title}') as seo_title,
  (cp.snapshot #>> '{localization,seo_description}') as seo_description,
  (cp.snapshot #>> '{project,public_location}') as public_location,
  (cp.snapshot #>> '{project,public_location_granularity}') as public_location_granularity,
  (cp.snapshot #>> '{project,project_type}') as project_type,
  (cp.snapshot #>> '{project,project_scope}') as project_scope,
  (cp.snapshot #>> '{project,renz_role}') as renz_role,
  (cp.snapshot #>> '{project,start_year}')::smallint as start_year,
  (cp.snapshot #>> '{project,completion_year}')::smallint as completion_year,
  (cp.snapshot #>> '{project,delivery_status}') as delivery_status,
  coalesce((cp.snapshot #>> '{project,sort_order}')::integer, 0) as sort_order,
  coalesce((cp.snapshot #>> '{project,featured}')::boolean, false) as featured,
  project.published_at,
  coalesce(cp.snapshot #>> '{project,evidence_class}', 'real_project') as evidence_class,
  coalesce(cp.snapshot #>> '{project,layout_hint}', 'auto') as layout_hint,
  coalesce((cp.snapshot #>> '{project,home_featured}')::boolean, false) as home_featured,
  (cp.snapshot #>> '{project,materials}') as materials,
  coalesce(cp.snapshot #> '{project,tags}', '[]'::jsonb) as tags,
  case when (cp.snapshot #>> '{project,hero_asset_id}') is null then null else (cp.snapshot #>> '{project,hero_asset_id}')::uuid end as hero_asset_id,
  coalesce(cp.snapshot #> '{stages}', '[]'::jsonb) as stages,
  cp.revision_no
from public.projects as project
join public.content_publications as cp on cp.content_type = 'project' and cp.target_id = project.id and cp.is_current
where private.is_public_content('project', project.id);

create view public.published_project_media with (security_barrier = true) as
select
  usage.id,
  usage.project_id,
  usage.media_asset_id,
  coalesce(item.value ->> 'role', usage.role) as role,
  coalesce(item.value ->> 'phase', usage.phase) as phase,
  coalesce((item.value ->> 'sort_order')::integer, usage.sort_order) as sort_order,
  coalesce((item.value ->> 'decorative')::boolean, usage.decorative) as decorative,
  coalesce(item.value ->> 'credit', usage.credit) as credit,
  coalesce(item.value -> 'focal_point', usage.focal_point) as focal_point,
  asset.mime_type,
  asset.width,
  asset.height,
  'en'::text as locale,
  coalesce(item.value ->> 'alt_text', localization.alt_text) as alt_text,
  coalesce(item.value ->> 'caption', localization.caption) as caption,
  asset.focal_x,
  asset.focal_y,
  asset.provenance_class
from public.projects as project
join public.content_publications as cp on cp.content_type = 'project' and cp.target_id = project.id and cp.is_current
join lateral jsonb_array_elements(coalesce(cp.snapshot -> 'media', '[]'::jsonb)) as item on true
join public.project_media as usage on usage.id = (item.value ->> 'id')::uuid and usage.project_id = project.id
join public.media_assets as asset on asset.id = usage.media_asset_id
left join public.project_media_localizations as localization on localization.project_media_id = usage.id and localization.locale = 'en'
where private.is_public_content('project', project.id) and private.is_public_media_usage(usage.id);

create view public.published_project_services with (security_barrier = true) as
select
  project.id as project_id,
  (item.value ->> 'service_id')::uuid as service_id,
  item.value ->> 'scope_label' as scope_label,
  coalesce((item.value ->> 'sort_order')::integer, 0) as sort_order
from public.projects as project
join public.content_publications as cp on cp.content_type = 'project' and cp.target_id = project.id and cp.is_current
join lateral jsonb_array_elements(coalesce(cp.snapshot -> 'services', '[]'::jsonb)) as item on true
where private.is_public_content('project', project.id)
  and private.is_public_content('service', (item.value ->> 'service_id')::uuid);

create view public.published_posts with (security_barrier = true) as
select
  post.id,
  (cp.snapshot #>> '{localization,locale}') as locale,
  (cp.snapshot #>> '{localization,slug}') as slug,
  (cp.snapshot #>> '{localization,title}') as title,
  (cp.snapshot #>> '{localization,excerpt}') as excerpt,
  coalesce(cp.snapshot #> '{localization,body_blocks}', '[]'::jsonb) as body_blocks,
  coalesce((cp.snapshot #>> '{localization,schema_version}')::integer, 1) as schema_version,
  (cp.snapshot #>> '{localization,seo_title}') as seo_title,
  (cp.snapshot #>> '{localization,seo_description}') as seo_description,
  (cp.snapshot #>> '{post,publication_date}')::date as publication_date,
  post.published_at,
  (cp.snapshot #>> '{post,topic}') as topic,
  case when (cp.snapshot #>> '{post,related_service_id}') is null then null else (cp.snapshot #>> '{post,related_service_id}')::uuid end as related_service_id,
  coalesce((cp.snapshot #>> '{post,featured}')::boolean, false) as featured,
  coalesce((cp.snapshot #>> '{post,pinned}')::boolean, false) as pinned,
  coalesce((cp.snapshot #>> '{post,sort_priority}')::integer, 0) as sort_priority,
  case when (cp.snapshot #>> '{post,hero_asset_id}') is null then null else (cp.snapshot #>> '{post,hero_asset_id}')::uuid end as hero_asset_id,
  cp.revision_no
from public.posts as post
join public.content_publications as cp on cp.content_type = 'post' and cp.target_id = post.id and cp.is_current
where private.is_public_content('post', post.id);

grant select on public.published_services, public.published_projects, public.published_project_media,
  public.published_project_services, public.published_posts to anon, authenticated;

-- Public media delivery for hero assets referenced by a published snapshot
-- (service / post heroes and concept-class project heroes go through here).
create or replace function private.content_media_is_published(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.published_services as s where s.hero_asset_id = target_id
  ) or exists (
    select 1 from public.published_posts as p where p.hero_asset_id = target_id
  ) or exists (
    select 1 from public.published_projects as p where p.hero_asset_id = target_id
  );
$$;
revoke all on function private.content_media_is_published(uuid) from public, anon, authenticated;

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
  eligible := private.website_media_is_current(target_id)
    and (private.website_media_is_published(target_id) or private.content_media_is_published(target_id));
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
-- Publication commands: capture a snapshot on publish; republish changes
-- ---------------------------------------------------------------------

create or replace function private.publish_record(content_type text, target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  failures jsonb;
  current_version integer;
  captured jsonb;
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
  if content_type in ('service', 'project', 'post') then
    select jsonb_build_object('revision_id', cp.id, 'revision_no', cp.revision_no) into captured
    from public.content_publications as cp
    where cp.content_type = publish_record.content_type and cp.target_id = publish_record.target_id and cp.is_current;
  end if;
  perform private.s4_audit('content.publish', content_type, target_id::text, 'success', jsonb_build_object('version', expected_version + 1) || coalesce(captured, '{}'::jsonb));
  return jsonb_build_object('ok', true, 'content_type', content_type, 'id', target_id, 'version', expected_version + 1, 'publication_status', 'published') || coalesce(captured, '{}'::jsonb);
end;
$$;

-- "Publish changes": a published entity gets a new current snapshot after the
-- same readiness gate; the public sees the whole change at once.
create or replace function public.republish_content(
  content_type text,
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
  failures jsonb;
  current_version integer;
  current_status text;
  captured jsonb;
begin
  if not private.has_permission('content.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.publish is required.')));
  end if;
  if content_type not in ('service', 'project', 'post') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsupported_content_type', 'content_type', 'Content type is not admitted.')));
  end if;
  case content_type
    when 'service' then select version, publication_status into current_version, current_status from public.services where id = target_id for update;
    when 'project' then select version, publication_status into current_version, current_status from public.projects where id = target_id for update;
    when 'post' then select version, publication_status into current_version, current_status from public.posts where id = target_id for update;
  end case;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'content', 'Content record does not exist.')));
  end if;
  if current_status <> 'published' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only published content can have changes published; publish it first.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Content changed before publication.')));
  end if;
  failures := private.publication_failures(content_type, target_id);
  if failures <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'reasons', failures);
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  case content_type
    when 'service' then update public.services set updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'project' then update public.projects set updated_by = auth.uid(), version = version + 1 where id = target_id;
    when 'post' then update public.posts set updated_by = auth.uid(), version = version + 1 where id = target_id;
  end case;
  captured := private.capture_content_publication(content_type, target_id, summary);
  perform private.s4_audit(content_type || '.publish', content_type, target_id::text, 'success', jsonb_build_object('version', expected_version + 1, 'republish', true) || coalesce(captured, '{}'::jsonb));
  return jsonb_build_object('ok', true, 'content_type', content_type, 'id', target_id, 'version', expected_version + 1, 'publication_status', 'published') || coalesce(captured, '{}'::jsonb);
end;
$$;

create or replace function public.admin_list_content_revisions(content_type text, target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('content.read') then
    raise exception using errcode = '42501', message = 'content revisions are not authorized';
  end if;
  return jsonb_build_object(
    'has_draft_changes', private.content_has_draft_changes(content_type, target_id),
    'revisions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cp.id, 'revision_no', cp.revision_no, 'kind', cp.kind, 'summary', cp.summary,
        'created_at', cp.created_at, 'created_by', author.display_name, 'is_current', cp.is_current
      ) order by cp.revision_no desc)
      from (
        select * from public.content_publications as inner_cp
        where inner_cp.content_type = admin_list_content_revisions.content_type and inner_cp.target_id = admin_list_content_revisions.target_id
        order by inner_cp.revision_no desc limit 40
      ) as cp
      left join public.profiles as author on author.id = cp.created_by
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_content_revision(target_revision_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('content.read') then
    raise exception using errcode = '42501', message = 'content revision is not authorized';
  end if;
  select jsonb_build_object(
    'id', cp.id, 'content_type', cp.content_type, 'target_id', cp.target_id, 'revision_no', cp.revision_no,
    'kind', cp.kind, 'summary', cp.summary, 'created_at', cp.created_at, 'created_by', author.display_name,
    'is_current', cp.is_current, 'snapshot', cp.snapshot
  )
  into result
  from public.content_publications as cp
  left join public.profiles as author on author.id = cp.created_by
  where cp.id = target_revision_id;
  return result;
end;
$$;

-- Restore a revision into the draft (text, settings and relationships).
-- Project media attachments are not rewound (they carry rights state); the
-- restore point keeps the pre-restore draft.
create or replace function public.restore_content_revision(
  content_type text,
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
  revision public.content_publications%rowtype;
  current_version integer;
  current_status text;
  next_no integer;
  snap jsonb;
  loc jsonb;
  item jsonb;
  index integer := 0;
  next_slug text;
  current_slug text;
begin
  if not private.has_permission('content.publish') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.publish is required.')));
  end if;
  select * into revision from public.content_publications as cp
   where cp.id = target_revision_id and cp.content_type = restore_content_revision.content_type and cp.target_id = restore_content_revision.target_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'revision', 'Revision does not exist for this record.')));
  end if;
  case content_type
    when 'service' then select version, publication_status into current_version, current_status from public.services where id = target_id for update;
    when 'project' then select version, publication_status into current_version, current_status from public.projects where id = target_id for update;
    when 'post' then select version, publication_status into current_version, current_status from public.posts where id = target_id for update;
    else return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('unsupported_content_type', 'content_type', 'Content type is not admitted.')));
  end case;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'content', 'Content record does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Content changed before this restore.')));
  end if;
  if current_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived content cannot be restored into.')));
  end if;
  -- Keep the current draft as a restore point.
  select coalesce(max(revision_no), 0) + 1 into next_no from public.content_publications as cp
   where cp.content_type = restore_content_revision.content_type and cp.target_id = restore_content_revision.target_id;
  insert into public.content_publications (content_type, target_id, revision_no, kind, summary, snapshot, is_current, created_by)
  values (content_type, target_id, next_no, 'restore_point', 'Draft before restoring revision ' || revision.revision_no, private.content_snapshot(content_type, target_id), false, auth.uid());

  snap := revision.snapshot;
  loc := snap -> 'localization';
  perform set_config('renz.s4.publication_command', '1', true);
  if content_type = 'service' then
    select slug into current_slug from public.service_localizations where service_id = target_id and locale = 'en';
    next_slug := loc ->> 'slug';
    if exists (select 1 from public.service_localizations where slug = next_slug and locale = 'en' and service_id <> target_id) then
      next_slug := current_slug;
    end if;
    update public.services set sort_order = coalesce((snap #>> '{service,sort_order}')::integer, sort_order), featured = coalesce((snap #>> '{service,featured}')::boolean, featured),
      updated_by = auth.uid(), version = version + 1 where id = target_id;
    update public.service_localizations set
      slug = next_slug, name = coalesce(loc ->> 'name', name), summary = loc ->> 'summary', body_blocks = coalesce(loc -> 'body_blocks', '[]'::jsonb),
      seo_title = loc ->> 'seo_title', seo_description = loc ->> 'seo_description', scope = loc ->> 'scope', deliverables = loc ->> 'deliverables',
      exclusions = loc ->> 'exclusions', client_inputs = loc ->> 'client_inputs', delivery_wording = loc ->> 'delivery_wording',
      professional_terminology = loc ->> 'professional_terminology', positioning = loc ->> 'positioning',
      sub_services = coalesce(loc -> 'sub_services', '[]'::jsonb), use_cases = coalesce(loc -> 'use_cases', '[]'::jsonb),
      process_steps = coalesce(loc -> 'process_steps', '[]'::jsonb), coordination = loc ->> 'coordination', faqs = coalesce(loc -> 'faqs', '[]'::jsonb),
      updated_by = auth.uid(), version = version + 1
    where service_id = target_id and locale = 'en';
  elsif content_type = 'project' then
    select slug into current_slug from public.project_localizations where project_id = target_id and locale = 'en';
    next_slug := loc ->> 'slug';
    if exists (select 1 from public.project_localizations where slug = next_slug and locale = 'en' and project_id <> target_id) then
      next_slug := current_slug;
    end if;
    update public.projects set
      sort_order = coalesce((snap #>> '{project,sort_order}')::integer, sort_order), featured = coalesce((snap #>> '{project,featured}')::boolean, featured),
      home_featured = coalesce((snap #>> '{project,home_featured}')::boolean, home_featured),
      public_location = snap #>> '{project,public_location}', public_location_granularity = snap #>> '{project,public_location_granularity}',
      project_type = snap #>> '{project,project_type}', project_scope = snap #>> '{project,project_scope}', renz_role = snap #>> '{project,renz_role}',
      start_year = (snap #>> '{project,start_year}')::smallint, completion_year = (snap #>> '{project,completion_year}')::smallint,
      delivery_status = snap #>> '{project,delivery_status}', evidence_class = coalesce(snap #>> '{project,evidence_class}', evidence_class),
      layout_hint = coalesce(snap #>> '{project,layout_hint}', layout_hint), materials = snap #>> '{project,materials}', tags = coalesce(snap -> '{project,tags}', snap #> '{project,tags}', '[]'::jsonb),
      updated_by = auth.uid(), version = version + 1
    where id = target_id;
    update public.project_localizations set
      slug = next_slug, title = coalesce(loc ->> 'title', title), summary = loc ->> 'summary', challenge = loc ->> 'challenge', approach = loc ->> 'approach',
      solution = loc ->> 'solution', outcomes = loc ->> 'outcomes', seo_title = loc ->> 'seo_title', seo_description = loc ->> 'seo_description',
      updated_by = auth.uid(), version = version + 1
    where project_id = target_id and locale = 'en';
    delete from public.project_services where project_id = target_id;
    for item in select value from jsonb_array_elements(coalesce(snap -> 'services', '[]'::jsonb)) loop
      if exists (select 1 from public.services where id = (item ->> 'service_id')::uuid) then
        insert into public.project_services (project_id, service_id, scope_label, sort_order)
        values (target_id, (item ->> 'service_id')::uuid, item ->> 'scope_label', coalesce((item ->> 'sort_order')::integer, 0))
        on conflict do nothing;
      end if;
    end loop;
    if not exists (select 1 from public.project_media where project_id = target_id and stage_id is not null) then
      delete from public.project_stages where project_id = target_id;
      for item in select value from jsonb_array_elements(coalesce(snap -> 'stages', '[]'::jsonb)) loop
        insert into public.project_stages (project_id, title, description, sort_order, created_by, updated_by)
        values (target_id, item ->> 'title', item ->> 'description', index, auth.uid(), auth.uid());
        index := index + 1;
      end loop;
    end if;
  elsif content_type = 'post' then
    select slug into current_slug from public.post_localizations where post_id = target_id and locale = 'en';
    next_slug := loc ->> 'slug';
    if exists (select 1 from public.post_localizations where slug = next_slug and locale = 'en' and post_id <> target_id) then
      next_slug := current_slug;
    end if;
    update public.posts set
      publication_date = (snap #>> '{post,publication_date}')::date, topic = snap #>> '{post,topic}',
      related_service_id = case when (snap #>> '{post,related_service_id}') is null then null else (snap #>> '{post,related_service_id}')::uuid end,
      featured = coalesce((snap #>> '{post,featured}')::boolean, featured), pinned = coalesce((snap #>> '{post,pinned}')::boolean, pinned),
      sort_priority = coalesce((snap #>> '{post,sort_priority}')::integer, sort_priority),
      updated_by = auth.uid(), version = version + 1
    where id = target_id;
    update public.post_localizations set
      slug = next_slug, title = coalesce(loc ->> 'title', title), excerpt = loc ->> 'excerpt', body_blocks = coalesce(loc -> 'body_blocks', '[]'::jsonb),
      seo_title = loc ->> 'seo_title', seo_description = loc ->> 'seo_description', updated_by = auth.uid(), version = version + 1
    where post_id = target_id and locale = 'en';
  end if;
  perform private.s4_audit('revision.restore', content_type, target_id::text, 'success', jsonb_build_object('revision_no', revision.revision_no, 'restore_point_no', next_no));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'restored_revision_no', revision.revision_no);
end;
$$;

revoke all on function public.republish_content(text, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.admin_list_content_revisions(text, uuid) from public, anon, authenticated;
revoke all on function public.admin_get_content_revision(uuid) from public, anon, authenticated;
revoke all on function public.restore_content_revision(text, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.republish_content(text, uuid, integer, text) to authenticated;
grant execute on function public.admin_list_content_revisions(text, uuid) to authenticated;
grant execute on function public.admin_get_content_revision(uuid) to authenticated;
grant execute on function public.restore_content_revision(text, uuid, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Editing published content: the draft-only guards become archived-only.
-- The public keeps reading the current snapshot until "Publish changes".
-- ---------------------------------------------------------------------

-- Recreated from 20260906133000_establish_s5a_services_admin.sql with the archived-only guard.
create or replace function public.update_admin_service_draft(
  target_id uuid,
  expected_version integer,
  expected_localization_version integer,
  target_locale text,
  target_slug text,
  target_name text,
  target_summary text,
  target_body_blocks jsonb,
  target_seo_title text,
  target_seo_description text,
  target_scope text,
  target_deliverables text,
  target_exclusions text,
  target_client_inputs text,
  target_delivery_wording text,
  target_professional_terminology text,
  target_sort_order integer,
  target_featured boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_service record;
  current_localization record;
  changed_keys jsonb;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.'))
    );
  end if;
  if target_id is null
     or expected_version is null
     or expected_localization_version is null
     or target_locale is null
     or target_slug is null
     or target_name is null
     or target_summary is null
     or target_body_blocks is null
     or target_seo_title is null
     or target_seo_description is null
     or target_scope is null
     or target_deliverables is null
     or target_exclusions is null
     or target_client_inputs is null
     or target_delivery_wording is null
     or target_professional_terminology is null
     or target_sort_order is null
     or target_featured is null
     or expected_version < 1 or expected_localization_version < 1
     or target_sort_order < 0 or target_sort_order > 100000
     or target_locale !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'
     or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(target_slug) > 120
     or char_length(btrim(target_name)) not between 1 and 160
     or not private.safe_public_text(btrim(target_name))
     or (nullif(btrim(target_summary), '') is not null and (
       char_length(btrim(target_summary)) > 600 or not private.safe_public_text(btrim(target_summary))
     ))
     or (nullif(btrim(target_scope), '') is not null and (
       char_length(btrim(target_scope)) > 4000 or not private.safe_public_text(btrim(target_scope))
     ))
     or (nullif(btrim(target_deliverables), '') is not null and (
       char_length(btrim(target_deliverables)) > 4000 or not private.safe_public_text(btrim(target_deliverables))
     ))
     or (nullif(btrim(target_exclusions), '') is not null and (
       char_length(btrim(target_exclusions)) > 4000 or not private.safe_public_text(btrim(target_exclusions))
     ))
     or (nullif(btrim(target_client_inputs), '') is not null and (
       char_length(btrim(target_client_inputs)) > 4000 or not private.safe_public_text(btrim(target_client_inputs))
     ))
     or (nullif(btrim(target_delivery_wording), '') is not null and (
       char_length(btrim(target_delivery_wording)) > 4000 or not private.safe_public_text(btrim(target_delivery_wording))
     ))
     or (nullif(btrim(target_professional_terminology), '') is not null and (
       char_length(btrim(target_professional_terminology)) > 4000 or not private.safe_public_text(btrim(target_professional_terminology))
     ))
     or (nullif(btrim(target_seo_title), '') is not null and (
       char_length(btrim(target_seo_title)) > 160 or not private.safe_public_text(btrim(target_seo_title))
     ))
     or (nullif(btrim(target_seo_description), '') is not null and (
       char_length(btrim(target_seo_description)) > 320 or not private.safe_public_text(btrim(target_seo_description))
     ))
     or not private.content_blocks_are_valid(target_body_blocks) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Service fields are invalid.'))
    );
  end if;

  select
    service.publication_status,
    service.featured,
    service.sort_order,
    service.version
  into current_service
  from public.services as service
  where service.id = target_id
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'service', 'Service does not exist.'))
    );
  end if;
  if current_service.publication_status = 'archived' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived services cannot be edited.'))
    );
  end if;

  select
    localization.slug,
    localization.name,
    localization.summary,
    localization.body_blocks,
    localization.seo_title,
    localization.seo_description,
    localization.scope,
    localization.deliverables,
    localization.exclusions,
    localization.client_inputs,
    localization.delivery_wording,
    localization.professional_terminology,
    localization.version
  into current_localization
  from public.service_localizations as localization
  where localization.service_id = target_id and localization.locale = target_locale
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'localization', 'Service localization does not exist.'))
    );
  end if;
  if current_service.version <> expected_version
     or current_localization.version <> expected_localization_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', current_service.version,
      'current_localization_version', current_localization.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer service version is available.'))
    );
  end if;

  select coalesce(jsonb_agg(change.key order by change.position), '[]'::jsonb)
  into changed_keys
  from (values
    (1, 'featured', current_service.featured is distinct from target_featured),
    (2, 'sort_order', current_service.sort_order is distinct from target_sort_order),
    (3, 'slug', current_localization.slug is distinct from target_slug),
    (4, 'name', current_localization.name is distinct from btrim(target_name)),
    (5, 'summary', current_localization.summary is distinct from nullif(btrim(target_summary), '')),
    (6, 'body_blocks', current_localization.body_blocks is distinct from target_body_blocks),
    (7, 'seo_title', current_localization.seo_title is distinct from nullif(btrim(target_seo_title), '')),
    (8, 'seo_description', current_localization.seo_description is distinct from nullif(btrim(target_seo_description), '')),
    (9, 'scope', current_localization.scope is distinct from nullif(btrim(target_scope), '')),
    (10, 'deliverables', current_localization.deliverables is distinct from nullif(btrim(target_deliverables), '')),
    (11, 'exclusions', current_localization.exclusions is distinct from nullif(btrim(target_exclusions), '')),
    (12, 'client_inputs', current_localization.client_inputs is distinct from nullif(btrim(target_client_inputs), '')),
    (13, 'delivery_wording', current_localization.delivery_wording is distinct from nullif(btrim(target_delivery_wording), '')),
    (14, 'professional_terminology', current_localization.professional_terminology is distinct from nullif(btrim(target_professional_terminology), ''))
  ) as change(position, key, changed)
  where change.changed;

  if changed_keys = '[]'::jsonb then
    return jsonb_build_object(
      'ok', true,
      'id', target_id,
      'version', current_service.version,
      'localization_version', current_localization.version,
      'unchanged', true
    );
  end if;

  perform set_config('renz.s4.publication_command', '1', true);
  update public.services
  set featured = target_featured,
      sort_order = target_sort_order,
      updated_by = auth.uid(),
      version = version + 1
  where id = target_id;

  update public.service_localizations
  set slug = target_slug,
      name = btrim(target_name),
      summary = nullif(btrim(target_summary), ''),
      body_blocks = target_body_blocks,
      seo_title = nullif(btrim(target_seo_title), ''),
      seo_description = nullif(btrim(target_seo_description), ''),
      scope = nullif(btrim(target_scope), ''),
      deliverables = nullif(btrim(target_deliverables), ''),
      exclusions = nullif(btrim(target_exclusions), ''),
      client_inputs = nullif(btrim(target_client_inputs), ''),
      delivery_wording = nullif(btrim(target_delivery_wording), ''),
      professional_terminology = nullif(btrim(target_professional_terminology), ''),
      updated_by = auth.uid(),
      version = version + 1
  where service_id = target_id and locale = target_locale;

  perform private.s4_audit(
    'service.update', 'service', target_id::text, 'success',
    jsonb_build_object(
      'version', expected_version + 1,
      'localization_version', expected_localization_version + 1,
      'changed_keys', changed_keys
    )
  );

  return jsonb_build_object(
    'ok', true,
    'id', target_id,
    'version', expected_version + 1,
    'localization_version', expected_localization_version + 1,
    'changed_keys', changed_keys
  );
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.update_admin_project_draft(
  target_id uuid,
  expected_version integer,
  expected_localization_version integer,
  target_locale text,
  target_slug text,
  target_title text,
  target_summary text,
  target_challenge text,
  target_approach text,
  target_solution text,
  target_outcomes text,
  target_seo_title text,
  target_seo_description text,
  target_public_location text,
  target_public_location_granularity text,
  target_project_type text,
  target_project_scope text,
  target_renz_role text,
  target_delivery_status text,
  target_start_year integer,
  target_completion_year integer,
  target_sort_order integer,
  target_featured boolean,
  target_hero_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  current_localization record;
  changed_keys jsonb;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.'))
    );
  end if;
  if target_id is null
     or expected_version is null
     or expected_localization_version is null
     or target_locale is null
     or target_slug is null
     or target_title is null
     or target_summary is null
     or target_challenge is null
     or target_approach is null
     or target_solution is null
     or target_outcomes is null
     or target_seo_title is null
     or target_seo_description is null
     or target_sort_order is null
     or target_featured is null
     or expected_version < 1 or expected_localization_version < 1
     or target_sort_order < 0 or target_sort_order > 100000
     or target_locale !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'
     or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(target_slug) > 120
     or char_length(btrim(target_title)) not between 1 and 160
     or not private.safe_public_text(btrim(target_title))
     or (nullif(btrim(target_summary), '') is not null and (
       char_length(btrim(target_summary)) > 600 or not private.safe_public_text(btrim(target_summary))
     ))
     or (nullif(btrim(target_challenge), '') is not null and (
       char_length(btrim(target_challenge)) > 4000 or not private.safe_public_text(btrim(target_challenge))
     ))
     or (nullif(btrim(target_approach), '') is not null and (
       char_length(btrim(target_approach)) > 4000 or not private.safe_public_text(btrim(target_approach))
     ))
     or (nullif(btrim(target_solution), '') is not null and (
       char_length(btrim(target_solution)) > 4000 or not private.safe_public_text(btrim(target_solution))
     ))
     or (nullif(btrim(target_outcomes), '') is not null and (
       char_length(btrim(target_outcomes)) > 4000 or not private.safe_public_text(btrim(target_outcomes))
     ))
     or (nullif(btrim(target_seo_title), '') is not null and (
       char_length(btrim(target_seo_title)) > 160 or not private.safe_public_text(btrim(target_seo_title))
     ))
     or (nullif(btrim(target_seo_description), '') is not null and (
       char_length(btrim(target_seo_description)) > 320 or not private.safe_public_text(btrim(target_seo_description))
     ))
     or (target_public_location is not null and (
       char_length(btrim(target_public_location)) not between 1 and 200
       or not private.safe_public_text(btrim(target_public_location))
     ))
     or (target_public_location_granularity is not null
       and target_public_location_granularity not in ('city', 'region', 'country'))
     or (target_project_type is not null and char_length(btrim(target_project_type)) not between 1 and 80)
     or (target_project_scope is not null and (
       char_length(btrim(target_project_scope)) not between 1 and 4000
       or not private.safe_public_text(btrim(target_project_scope))
     ))
     or (target_renz_role is not null and (
       char_length(btrim(target_renz_role)) not between 1 and 400
       or not private.safe_public_text(btrim(target_renz_role))
     ))
     or (target_delivery_status is not null and char_length(btrim(target_delivery_status)) not between 1 and 80)
     or (target_start_year is not null and target_start_year not between 1800 and 2500)
     or (target_completion_year is not null and target_completion_year not between 1800 and 2500)
     or (target_start_year is not null and target_completion_year is not null and target_completion_year < target_start_year)
     or (target_hero_asset_id is not null and not exists (
       select 1 from public.media_assets where id = target_hero_asset_id
     )) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Project fields are invalid.'))
    );
  end if;

  select
    project.publication_status,
    project.featured,
    project.sort_order,
    project.hero_asset_id,
    project.public_location,
    project.public_location_granularity,
    project.project_type,
    project.project_scope,
    project.renz_role,
    project.delivery_status,
    project.start_year,
    project.completion_year,
    project.version
  into current_project
  from public.projects as project
  where project.id = target_id
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.'))
    );
  end if;
  if current_project.publication_status = 'archived' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.'))
    );
  end if;

  select
    localization.slug,
    localization.title,
    localization.summary,
    localization.challenge,
    localization.approach,
    localization.solution,
    localization.outcomes,
    localization.seo_title,
    localization.seo_description,
    localization.version
  into current_localization
  from public.project_localizations as localization
  where localization.project_id = target_id and localization.locale = target_locale
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'localization', 'Project localization does not exist.'))
    );
  end if;
  if current_project.version <> expected_version
     or current_localization.version <> expected_localization_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', current_project.version,
      'current_localization_version', current_localization.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  select coalesce(jsonb_agg(change.key order by change.position), '[]'::jsonb)
  into changed_keys
  from (values
    (1, 'featured', current_project.featured is distinct from target_featured),
    (2, 'sort_order', current_project.sort_order is distinct from target_sort_order),
    (3, 'hero_asset_id', current_project.hero_asset_id is distinct from target_hero_asset_id),
    (4, 'public_location', current_project.public_location is distinct from nullif(btrim(target_public_location), '')),
    (5, 'public_location_granularity', current_project.public_location_granularity is distinct from target_public_location_granularity),
    (6, 'project_type', current_project.project_type is distinct from nullif(btrim(target_project_type), '')),
    (7, 'project_scope', current_project.project_scope is distinct from nullif(btrim(target_project_scope), '')),
    (8, 'renz_role', current_project.renz_role is distinct from nullif(btrim(target_renz_role), '')),
    (9, 'delivery_status', current_project.delivery_status is distinct from nullif(btrim(target_delivery_status), '')),
    (10, 'start_year', current_project.start_year is distinct from target_start_year),
    (11, 'completion_year', current_project.completion_year is distinct from target_completion_year),
    (12, 'slug', current_localization.slug is distinct from target_slug),
    (13, 'title', current_localization.title is distinct from btrim(target_title)),
    (14, 'summary', current_localization.summary is distinct from nullif(btrim(target_summary), '')),
    (15, 'challenge', current_localization.challenge is distinct from nullif(btrim(target_challenge), '')),
    (16, 'approach', current_localization.approach is distinct from nullif(btrim(target_approach), '')),
    (17, 'solution', current_localization.solution is distinct from nullif(btrim(target_solution), '')),
    (18, 'outcomes', current_localization.outcomes is distinct from nullif(btrim(target_outcomes), '')),
    (19, 'seo_title', current_localization.seo_title is distinct from nullif(btrim(target_seo_title), '')),
    (20, 'seo_description', current_localization.seo_description is distinct from nullif(btrim(target_seo_description), ''))
  ) as change(position, key, changed)
  where change.changed;

  if changed_keys = '[]'::jsonb then
    return jsonb_build_object(
      'ok', true,
      'id', target_id,
      'version', current_project.version,
      'localization_version', current_localization.version,
      'unchanged', true
    );
  end if;

  perform set_config('renz.s4.publication_command', '1', true);
  update public.projects
  set featured = target_featured,
      sort_order = target_sort_order,
      hero_asset_id = target_hero_asset_id,
      public_location = nullif(btrim(target_public_location), ''),
      public_location_granularity = target_public_location_granularity,
      project_type = nullif(btrim(target_project_type), ''),
      project_scope = nullif(btrim(target_project_scope), ''),
      renz_role = nullif(btrim(target_renz_role), ''),
      delivery_status = nullif(btrim(target_delivery_status), ''),
      start_year = target_start_year,
      completion_year = target_completion_year,
      updated_by = auth.uid(),
      version = version + 1
  where id = target_id;

  update public.project_localizations
  set slug = target_slug,
      title = btrim(target_title),
      summary = nullif(btrim(target_summary), ''),
      challenge = nullif(btrim(target_challenge), ''),
      approach = nullif(btrim(target_approach), ''),
      solution = nullif(btrim(target_solution), ''),
      outcomes = nullif(btrim(target_outcomes), ''),
      seo_title = nullif(btrim(target_seo_title), ''),
      seo_description = nullif(btrim(target_seo_description), ''),
      updated_by = auth.uid(),
      version = version + 1
  where project_id = target_id and locale = target_locale;

  perform private.s4_audit(
    'project.update', 'project', target_id::text, 'success',
    jsonb_build_object(
      'version', expected_version + 1,
      'localization_version', expected_localization_version + 1,
      'changed_keys', changed_keys
    )
  );

  return jsonb_build_object(
    'ok', true,
    'id', target_id,
    'version', expected_version + 1,
    'localization_version', expected_localization_version + 1,
    'changed_keys', changed_keys
  );
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.mark_project_factually_reviewed(
  target_id uuid,
  expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
begin
  if not private.has_permission('claims.verify') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'claims.verify is required.'))
    );
  end if;
  if target_id is null or expected_version is null or expected_version < 1 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Review command is invalid.'))
    );
  end if;

  select project.publication_status, project.version
  into current_project
  from public.projects as project
  where project.id = target_id
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.'))
    );
  end if;
  if current_project.publication_status = 'archived' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be reviewed.'))
    );
  end if;
  if current_project.version <> expected_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', current_project.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  perform set_config('renz.s4.publication_command', '1', true);
  update public.projects
  set reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_by = auth.uid(),
      version = version + 1
  where id = target_id;

  perform private.s4_audit(
    'project.mark_reviewed', 'project', target_id::text, 'success',
    jsonb_build_object('version', expected_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.set_admin_project_services(
  target_project_id uuid,
  expected_version integer,
  target_services jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  entry jsonb;
  service_ids uuid[] := array[]::uuid[];
  seen_ids uuid[] := array[]::uuid[];
  candidate_id uuid;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.'))
    );
  end if;
  if target_project_id is null or expected_version is null or expected_version < 1
     or target_services is null or jsonb_typeof(target_services) <> 'array'
     or jsonb_array_length(target_services) > 20 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Service relationships are invalid.'))
    );
  end if;

  select project.publication_status, project.version
  into current_project
  from public.projects as project
  where project.id = target_project_id
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.'))
    );
  end if;
  if current_project.publication_status = 'archived' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.'))
    );
  end if;
  if current_project.version <> expected_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', current_project.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  for entry in select jsonb_array_elements(target_services)
  loop
    if not (entry ? 'service_id') then
      return jsonb_build_object(
        'ok', false,
        'reasons', jsonb_build_array(private.failure('invalid_input', 'service_id', 'Each service relationship needs a service_id.'))
      );
    end if;
    candidate_id := (entry ->> 'service_id')::uuid;
    if not exists (select 1 from public.services where id = candidate_id) then
      return jsonb_build_object(
        'ok', false,
        'reasons', jsonb_build_array(private.failure('not_found', 'service_id', 'A related service does not exist.'))
      );
    end if;
    if candidate_id = any(seen_ids) then
      return jsonb_build_object(
        'ok', false,
        'reasons', jsonb_build_array(private.failure('invalid_input', 'service_id', 'Each service may only be related once.'))
      );
    end if;
    seen_ids := seen_ids || candidate_id;
    service_ids := service_ids || candidate_id;
    if (entry ->> 'scope_label') is not null and (
      char_length(btrim(entry ->> 'scope_label')) > 200
      or not private.safe_public_text(btrim(entry ->> 'scope_label'))
    ) then
      return jsonb_build_object(
        'ok', false,
        'reasons', jsonb_build_array(private.failure('invalid_input', 'scope_label', 'Scope label is invalid.'))
      );
    end if;
  end loop;

  delete from public.project_services where project_id = target_project_id;

  insert into public.project_services (project_id, service_id, scope_label, sort_order)
  select
    target_project_id,
    (service_entry.value ->> 'service_id')::uuid,
    nullif(btrim(service_entry.value ->> 'scope_label'), ''),
    coalesce((service_entry.value ->> 'sort_order')::integer, service_entry.ordinality::integer - 1)
  from jsonb_array_elements(target_services) with ordinality as service_entry(value, ordinality);

  perform set_config('renz.s4.publication_command', '1', true);
  update public.projects
  set updated_by = auth.uid(), version = version + 1
  where id = target_project_id;

  perform private.s4_audit(
    'project.set_services', 'project', target_project_id::text, 'success',
    jsonb_build_object('version', expected_version + 1, 'service_count', array_length(service_ids, 1))
  );

  return jsonb_build_object('ok', true, 'id', target_project_id, 'version', expected_version + 1);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.create_admin_project_stage(
  target_project_id uuid,
  expected_version integer,
  target_title text,
  target_description text,
  target_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  stage_id uuid;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.'))
    );
  end if;
  if target_project_id is null or expected_version is null or expected_version < 1
     or target_title is null or char_length(btrim(target_title)) not between 1 and 160
     or not private.safe_public_text(btrim(target_title))
     or (target_description is not null and (
       char_length(btrim(target_description)) > 4000
       or not private.safe_public_text(btrim(target_description))
     ))
     or target_sort_order is null or target_sort_order < 0 or target_sort_order > 1000 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Story chapter fields are invalid.'))
    );
  end if;

  select project.publication_status, project.version into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.')));
  end if;
  if current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;
  if current_project.version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_project.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  insert into public.project_stages (project_id, title, description, sort_order, created_by, updated_by)
  values (target_project_id, btrim(target_title), nullif(btrim(target_description), ''), target_sort_order, auth.uid(), auth.uid())
  returning id into stage_id;

  perform set_config('renz.s4.publication_command', '1', true);
  update public.projects set updated_by = auth.uid(), version = version + 1 where id = target_project_id;

  perform private.s4_audit(
    'project.stage_create', 'project', target_project_id::text, 'success',
    jsonb_build_object('stage_id', stage_id, 'version', expected_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', stage_id, 'project_version', expected_version + 1);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.update_admin_project_stage(
  target_id uuid,
  target_project_id uuid,
  expected_stage_version integer,
  target_title text,
  target_description text,
  target_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  current_stage record;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_id is null or target_project_id is null or expected_stage_version is null or expected_stage_version < 1
     or target_title is null or char_length(btrim(target_title)) not between 1 and 160
     or not private.safe_public_text(btrim(target_title))
     or (target_description is not null and (
       char_length(btrim(target_description)) > 4000
       or not private.safe_public_text(btrim(target_description))
     ))
     or target_sort_order is null or target_sort_order < 0 or target_sort_order > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Story chapter fields are invalid.')));
  end if;

  select project.publication_status into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found or current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;

  select stage.version into current_stage
  from public.project_stages as stage
  where stage.id = target_id and stage.project_id = target_project_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'stage', 'Story chapter does not exist.')));
  end if;
  if current_stage.version <> expected_stage_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_stage.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer story chapter version is available.'))
    );
  end if;

  update public.project_stages
  set title = btrim(target_title),
      description = nullif(btrim(target_description), ''),
      sort_order = target_sort_order,
      updated_by = auth.uid(),
      version = version + 1
  where id = target_id;

  perform private.s4_audit(
    'project.stage_update', 'project', target_project_id::text, 'success',
    jsonb_build_object('stage_id', target_id, 'version', expected_stage_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_stage_version + 1);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.delete_admin_project_stage(
  target_id uuid,
  target_project_id uuid,
  expected_stage_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  current_version integer;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_id is null or target_project_id is null or expected_stage_version is null or expected_stage_version < 1 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Story chapter reference is invalid.')));
  end if;

  select project.publication_status into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found or current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;

  select stage.version into current_version
  from public.project_stages as stage
  where stage.id = target_id and stage.project_id = target_project_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'stage', 'Story chapter does not exist.')));
  end if;
  if current_version <> expected_stage_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer story chapter version is available.'))
    );
  end if;

  begin
    delete from public.project_stages where id = target_id;
  exception when foreign_key_violation then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('in_use', 'stage', 'Remove or reassign attached media before deleting this chapter.'))
    );
  end;

  perform private.s4_audit(
    'project.stage_delete', 'project', target_project_id::text, 'success',
    jsonb_build_object('stage_id', target_id)
  );

  return jsonb_build_object('ok', true, 'id', target_id);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.admin_attach_project_media(
  target_project_id uuid,
  expected_version integer,
  target_media_asset_id uuid,
  target_role text,
  target_phase text default null,
  target_stage_id uuid default null,
  target_decorative boolean default false,
  target_credit text default null,
  target_alt_text text default null,
  target_caption text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  next_sort_order integer;
  usage_id uuid;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_project_id is null or expected_version is null or expected_version < 1
     or target_media_asset_id is null
     or target_role is null or btrim(target_role) = '' or char_length(btrim(target_role)) > 40
     or target_role !~ '^[a-z][a-z0-9_]*$'
     or (target_phase is not null and char_length(btrim(target_phase)) > 40)
     or target_decorative is null
     or (not target_decorative and (target_alt_text is null or btrim(target_alt_text) = ''))
     or (target_alt_text is not null and (
       char_length(btrim(target_alt_text)) > 300 or not private.safe_public_text(btrim(target_alt_text))
     ))
     or (target_caption is not null and (
       char_length(btrim(target_caption)) > 600 or not private.safe_public_text(btrim(target_caption))
     ))
     or (target_credit is not null and (
       char_length(btrim(target_credit)) > 200 or not private.safe_public_text(btrim(target_credit))
     ))
     or not exists (select 1 from public.media_assets where id = target_media_asset_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Media attachment fields are invalid.')));
  end if;
  if target_stage_id is not null and not exists (
    select 1 from public.project_stages where id = target_stage_id and project_id = target_project_id
  ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'stage_id', 'Story chapter does not exist on this project.')));
  end if;

  select project.publication_status, project.version into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.')));
  end if;
  if current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;
  if current_project.version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_project.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  select coalesce(max(sort_order) + 1, 0) into next_sort_order
  from public.project_media where project_id = target_project_id;

  insert into public.project_media (
    project_id, media_asset_id, role, phase, stage_id, decorative, credit, sort_order, created_by, updated_by
  ) values (
    target_project_id, target_media_asset_id, btrim(target_role), nullif(btrim(target_phase), ''),
    target_stage_id, target_decorative, nullif(btrim(target_credit), ''), next_sort_order, auth.uid(), auth.uid()
  ) returning id into usage_id;

  insert into public.project_media_localizations (
    project_media_id, locale, alt_text, caption, created_by, updated_by
  ) values (
    usage_id, 'en', nullif(btrim(target_alt_text), ''), nullif(btrim(target_caption), ''), auth.uid(), auth.uid()
  );

  perform set_config('renz.s4.publication_command', '1', true);
  update public.projects set updated_by = auth.uid(), version = version + 1 where id = target_project_id;

  perform private.s4_audit(
    'project.media_attach', 'project', target_project_id::text, 'success',
    jsonb_build_object('project_media_id', usage_id, 'role', target_role, 'version', expected_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', usage_id, 'project_version', expected_version + 1);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.admin_update_project_media(
  target_id uuid,
  target_project_id uuid,
  expected_media_version integer,
  target_role text,
  target_phase text,
  target_stage_id uuid,
  target_decorative boolean,
  target_credit text,
  target_alt_text text,
  target_caption text,
  expected_localization_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  current_media record;
  current_localization record;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_id is null or target_project_id is null or expected_media_version is null or expected_media_version < 1
     or expected_localization_version is null or expected_localization_version < 1
     or target_role is null or btrim(target_role) = '' or target_role !~ '^[a-z][a-z0-9_]*$'
     or target_decorative is null
     or (not target_decorative and (target_alt_text is null or btrim(target_alt_text) = ''))
     or (target_alt_text is not null and (
       char_length(btrim(target_alt_text)) > 300 or not private.safe_public_text(btrim(target_alt_text))
     ))
     or (target_caption is not null and (
       char_length(btrim(target_caption)) > 600 or not private.safe_public_text(btrim(target_caption))
     ))
     or (target_credit is not null and (
       char_length(btrim(target_credit)) > 200 or not private.safe_public_text(btrim(target_credit))
     )) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Media fields are invalid.')));
  end if;
  if target_stage_id is not null and not exists (
    select 1 from public.project_stages where id = target_stage_id and project_id = target_project_id
  ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'stage_id', 'Story chapter does not exist on this project.')));
  end if;

  select project.publication_status into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found or current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;

  select usage.version into current_media
  from public.project_media as usage
  where usage.id = target_id and usage.project_id = target_project_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Project media does not exist.')));
  end if;
  if current_media.version <> expected_media_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_media.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer media version is available.'))
    );
  end if;

  select localization.version into current_localization
  from public.project_media_localizations as localization
  where localization.project_media_id = target_id and localization.locale = 'en'
  for update;
  if found and current_localization.version <> expected_localization_version then
    return jsonb_build_object(
      'ok', false, 'current_localization_version', current_localization.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer media caption version is available.'))
    );
  end if;

  update public.project_media
  set role = btrim(target_role),
      phase = nullif(btrim(target_phase), ''),
      stage_id = target_stage_id,
      decorative = target_decorative,
      credit = nullif(btrim(target_credit), ''),
      updated_by = auth.uid(),
      version = version + 1
  where id = target_id;

  if found then
    update public.project_media_localizations
    set alt_text = nullif(btrim(target_alt_text), ''),
        caption = nullif(btrim(target_caption), ''),
        updated_by = auth.uid(),
        version = version + 1
    where project_media_id = target_id and locale = 'en';
  else
    insert into public.project_media_localizations (project_media_id, locale, alt_text, caption, created_by, updated_by)
    values (target_id, 'en', nullif(btrim(target_alt_text), ''), nullif(btrim(target_caption), ''), auth.uid(), auth.uid());
  end if;

  perform private.s4_audit(
    'project.media_update', 'project', target_project_id::text, 'success',
    jsonb_build_object('project_media_id', target_id, 'version', expected_media_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_media_version + 1);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.admin_reorder_project_media(
  target_project_id uuid,
  ordered_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  expected_count integer;
  actual_count integer;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_project_id is null or ordered_ids is null or array_length(ordered_ids, 1) is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Media order is invalid.')));
  end if;

  select project.publication_status into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found or current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;

  select count(*) into expected_count from public.project_media where project_id = target_project_id;
  select count(distinct id) into actual_count from unnest(ordered_ids) as id;
  if actual_count <> array_length(ordered_ids, 1) or actual_count <> expected_count then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'ordered_ids', 'The reordered set must match this project''s media exactly once each.')));
  end if;

  update public.project_media as usage
  set sort_order = reordered.position - 1,
      updated_by = auth.uid()
  from unnest(ordered_ids) with ordinality as reordered(id, position)
  where usage.id = reordered.id and usage.project_id = target_project_id;

  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'ordered_ids', 'Media reorder did not match this project.')));
  end if;

  perform private.s4_audit(
    'project.media_reorder', 'project', target_project_id::text, 'success',
    jsonb_build_object('count', array_length(ordered_ids, 1))
  );

  return jsonb_build_object('ok', true, 'id', target_project_id);
end;
$$;

-- Recreated from 20260910120000_establish_s5c_projects_admin.sql with the archived-only guard.
create or replace function public.admin_remove_project_media(
  target_id uuid,
  target_project_id uuid,
  expected_media_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  current_version integer;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_id is null or target_project_id is null or expected_media_version is null or expected_media_version < 1 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Media reference is invalid.')));
  end if;

  select project.publication_status into current_project
  from public.projects as project where project.id = target_project_id for update;
  if not found or current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;

  select usage.version into current_version
  from public.project_media as usage
  where usage.id = target_id and usage.project_id = target_project_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Project media does not exist.')));
  end if;
  if current_version <> expected_media_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer media version is available.'))
    );
  end if;

  delete from public.project_media where id = target_id;

  perform private.s4_audit(
    'project.media_remove', 'project', target_project_id::text, 'success',
    jsonb_build_object('project_media_id', target_id)
  );

  return jsonb_build_object('ok', true, 'id', target_id);
end;
$$;


-- Concept-aware rights confirmation + promotion for project media.
create or replace function public.admin_clear_and_promote_project_media(
  target_project_media_id uuid,
  expected_media_version integer,
  target_rights_holder text,
  target_rights_source text,
  target_credit text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  usage_row record;
  asset_row public.media_assets%rowtype;
  project_class text;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  select usage.id, usage.version, usage.media_asset_id, usage.project_id into usage_row
  from public.project_media as usage where usage.id = target_project_media_id for update;
  if usage_row.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project_media', 'Project media usage does not exist.')));
  end if;
  if usage_row.version <> expected_media_version then
    return jsonb_build_object(
      'ok', false, 'current_version', usage_row.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Project media changed before promotion.'))
    );
  end if;
  select evidence_class into project_class from public.projects where id = usage_row.project_id;
  select * into asset_row from public.media_assets where id = usage_row.media_asset_id for update;
  if asset_row.provenance_class = 'synthetic_test'
     or (project_class = 'real_project' and asset_row.provenance_class in ('concept_demo', 'generated_reference')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_media_classification', 'provenance_class', 'Concept or generated media cannot illustrate a real RENZ project. Change the project class or choose RENZ-provided media.')));
  end if;
  if asset_row.bucket_id <> 'editorial-derivatives' or asset_row.storage_state not in ('ready_private', 'promotion_pending', 'public_eligible') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('media_not_ready', 'storage_state', 'A finalized derivative is required before promotion.')));
  end if;

  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set rights_status = 'cleared',
         public_use_permission = 'granted',
         consent_state = case when consent_required then 'granted' else consent_state end,
         rights_holder = coalesce(nullif(btrim(target_rights_holder), ''), rights_holder),
         rights_source = coalesce(nullif(btrim(target_rights_source), ''), rights_source),
         credit = coalesce(nullif(btrim(target_credit), ''), credit),
         rights_reviewer_id = auth.uid(),
         rights_verified_at = statement_timestamp(),
         updated_by = auth.uid(),
         version = version + 1
   where id = asset_row.id;
  perform private.s4_audit('media.rights.update', 'media', asset_row.id::text, 'success', jsonb_build_object('rights_status', 'cleared'));

  if asset_row.storage_state <> 'public_eligible' and asset_row.provenance_class not in ('concept_demo', 'generated_reference') then
    update public.media_assets
       set storage_state = 'public_eligible', updated_by = auth.uid(), version = version + 1
     where id = asset_row.id;
    perform private.s4_audit('media.promote', 'media', asset_row.id::text, 'success', '{}'::jsonb);
  end if;

  update public.project_media
     set public_status = 'eligible', updated_by = auth.uid(), version = version + 1
   where id = target_project_media_id;
  perform private.s4_audit('media.promote', 'project_media', target_project_media_id::text, 'success', '{}'::jsonb);

  return jsonb_build_object('ok', true, 'id', target_project_media_id, 'state', 'eligible');
end;
$$;

-- ---------------------------------------------------------------------
-- Owner detail fields (services, projects) and slug aliases
-- ---------------------------------------------------------------------

create or replace function public.update_admin_service_details(
  target_id uuid,
  expected_localization_version integer,
  target_positioning text,
  target_sub_services jsonb,
  target_use_cases jsonb,
  target_process_steps jsonb,
  target_coordination text,
  target_faqs jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_localization record;
  current_status text;
  faq jsonb;
  entry jsonb;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_sub_services is null or jsonb_typeof(target_sub_services) <> 'array' or jsonb_array_length(target_sub_services) > 24
     or target_use_cases is null or jsonb_typeof(target_use_cases) <> 'array' or jsonb_array_length(target_use_cases) > 24
     or target_process_steps is null or jsonb_typeof(target_process_steps) <> 'array' or jsonb_array_length(target_process_steps) > 24
     or target_faqs is null or jsonb_typeof(target_faqs) <> 'array' or jsonb_array_length(target_faqs) > 24
     or (target_positioning is not null and (char_length(btrim(target_positioning)) > 300 or not private.safe_public_text(btrim(target_positioning))))
     or (target_coordination is not null and (char_length(btrim(target_coordination)) > 1000 or not private.safe_public_text(btrim(target_coordination)))) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Service detail fields are invalid.')));
  end if;
  for entry in select value from jsonb_array_elements(target_sub_services || target_use_cases || target_process_steps) loop
    if jsonb_typeof(entry) <> 'string' or char_length(entry #>> '{}') not between 1 and 600 or not private.safe_public_text(btrim(entry #>> '{}')) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lists', 'List entries are plain text up to 600 characters.')));
    end if;
  end loop;
  for faq in select value from jsonb_array_elements(target_faqs) loop
    if jsonb_typeof(faq) <> 'object'
       or char_length(coalesce(faq ->> 'question', '')) not between 1 and 300
       or char_length(coalesce(faq ->> 'answer', '')) not between 1 and 2000
       or not private.safe_public_text(btrim(faq ->> 'question')) or not private.safe_public_text(btrim(faq ->> 'answer')) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'faqs', 'Each FAQ needs a question (300) and an answer (2000) in plain text.')));
    end if;
  end loop;
  select publication_status into current_status from public.services where id = target_id for update;
  if current_status is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'service', 'Service does not exist.')));
  end if;
  if current_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived services cannot be edited.')));
  end if;
  select version into current_localization from public.service_localizations where service_id = target_id and locale = 'en' for update;
  if current_localization.version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'localization', 'Service localization does not exist.')));
  end if;
  if current_localization.version <> expected_localization_version then
    return jsonb_build_object('ok', false, 'current_localization_version', current_localization.version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer service version is available.')));
  end if;
  update public.service_localizations
     set positioning = nullif(btrim(coalesce(target_positioning, '')), ''),
         sub_services = (select coalesce(jsonb_agg(to_jsonb(btrim(v #>> '{}'))), '[]'::jsonb) from jsonb_array_elements(target_sub_services) as v),
         use_cases = (select coalesce(jsonb_agg(to_jsonb(btrim(v #>> '{}'))), '[]'::jsonb) from jsonb_array_elements(target_use_cases) as v),
         process_steps = (select coalesce(jsonb_agg(to_jsonb(btrim(v #>> '{}'))), '[]'::jsonb) from jsonb_array_elements(target_process_steps) as v),
         coordination = nullif(btrim(coalesce(target_coordination, '')), ''),
         faqs = (select coalesce(jsonb_agg(jsonb_build_object('question', btrim(v ->> 'question'), 'answer', btrim(v ->> 'answer'))), '[]'::jsonb) from jsonb_array_elements(target_faqs) as v),
         updated_by = auth.uid(),
         version = version + 1
   where service_id = target_id and locale = 'en';
  perform private.s4_audit('service.update', 'service', target_id::text, 'success', jsonb_build_object('localization_version', expected_localization_version + 1, 'changed_keys', jsonb_build_array('details')));
  return jsonb_build_object('ok', true, 'id', target_id, 'localization_version', expected_localization_version + 1);
end;
$$;

create or replace function public.update_admin_project_presentation(
  target_id uuid,
  expected_version integer,
  target_evidence_class text,
  target_layout_hint text,
  target_home_featured boolean,
  target_materials text,
  target_tags jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_project record;
  entry jsonb;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_evidence_class not in ('real_project', 'concept_study', 'experience_study')
     or target_layout_hint not in ('auto', 'monument', 'portrait', 'landscape', 'technical', 'strip', 'wide')
     or target_home_featured is null
     or target_tags is null or jsonb_typeof(target_tags) <> 'array' or jsonb_array_length(target_tags) > 12
     or (target_materials is not null and (char_length(btrim(target_materials)) > 300 or not private.safe_public_text(btrim(target_materials)))) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Project presentation fields are invalid.')));
  end if;
  for entry in select value from jsonb_array_elements(target_tags) loop
    if jsonb_typeof(entry) <> 'string' or char_length(entry #>> '{}') not between 1 and 40 or not private.safe_public_text(btrim(entry #>> '{}')) then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'tags', 'Tags are plain text up to 40 characters.')));
    end if;
  end loop;
  select publication_status, version, evidence_class into current_project from public.projects where id = target_id for update;
  if current_project.version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Project does not exist.')));
  end if;
  if current_project.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived projects cannot be edited.')));
  end if;
  if current_project.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_project.version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.')));
  end if;
  if current_project.evidence_class <> 'real_project' and target_evidence_class = 'real_project'
     and exists (
       select 1 from public.project_media as usage join public.media_assets as asset on asset.id = usage.media_asset_id
       where usage.project_id = target_id and asset.provenance_class in ('concept_demo', 'generated_reference')
     ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_media_classification', 'evidence_class', 'Remove concept or generated imagery before classifying this as a real RENZ project.')));
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  update public.projects
     set evidence_class = target_evidence_class,
         layout_hint = target_layout_hint,
         home_featured = target_home_featured,
         materials = nullif(btrim(coalesce(target_materials, '')), ''),
         tags = (select coalesce(jsonb_agg(to_jsonb(btrim(v #>> '{}'))), '[]'::jsonb) from jsonb_array_elements(target_tags) as v),
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('project.update', 'project', target_id::text, 'success', jsonb_build_object('version', expected_version + 1, 'changed_keys', jsonb_build_array('presentation')));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

revoke all on function public.update_admin_service_details(uuid, integer, text, jsonb, jsonb, jsonb, text, jsonb) from public, anon, authenticated;
revoke all on function public.update_admin_project_presentation(uuid, integer, text, text, boolean, text, jsonb) from public, anon, authenticated;
grant execute on function public.update_admin_service_details(uuid, integer, text, jsonb, jsonb, jsonb, text, jsonb) to authenticated;
grant execute on function public.update_admin_project_presentation(uuid, integer, text, text, boolean, text, jsonb) to authenticated;

-- Slug aliases: when a published service / project / insight changes its
-- slug, the old address redirects to the new one.
create or replace function private.record_slug_alias_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefix text;
  entity text;
  parent_id uuid;
  is_published boolean;
begin
  if tg_table_name = 'service_localizations' then
    prefix := '/services/'; entity := 'service'; parent_id := new.service_id;
    select publication_status = 'published' into is_published from public.services where id = parent_id;
  elsif tg_table_name = 'project_localizations' then
    prefix := '/projects/'; entity := 'project'; parent_id := new.project_id;
    select publication_status = 'published' into is_published from public.projects where id = parent_id;
  else
    prefix := '/insights/'; entity := 'post'; parent_id := new.post_id;
    select publication_status = 'published' into is_published from public.posts where id = parent_id;
  end if;
  if new.locale = 'en' and old.slug is distinct from new.slug and coalesce(is_published, false) then
    delete from public.website_route_aliases where source_path = prefix || new.slug;
    insert into public.website_route_aliases (source_path, target_path, entity_type, entity_id, created_by)
    values (prefix || old.slug, prefix || new.slug, entity, parent_id, auth.uid())
    on conflict (source_path) do update set target_path = excluded.target_path, entity_id = excluded.entity_id;
    update public.website_route_aliases set target_path = prefix || new.slug where entity_type = entity and entity_id = parent_id;
  end if;
  return new;
end;
$$;

drop trigger if exists service_localizations_slug_alias on public.service_localizations;
create trigger service_localizations_slug_alias after update of slug on public.service_localizations
for each row execute function private.record_slug_alias_trigger();
drop trigger if exists project_localizations_slug_alias on public.project_localizations;
create trigger project_localizations_slug_alias after update of slug on public.project_localizations
for each row execute function private.record_slug_alias_trigger();
drop trigger if exists post_localizations_slug_alias on public.post_localizations;
create trigger post_localizations_slug_alias after update of slug on public.post_localizations
for each row execute function private.record_slug_alias_trigger();

-- Public reads of the new columns (anon column grants follow the S4 pattern).
grant select (positioning, sub_services, use_cases, process_steps, coordination, faqs) on public.service_localizations to anon;
grant select (evidence_class, layout_hint, home_featured, materials, tags) on public.projects to anon;

comment on table public.content_publications is
  'CR1 frozen publication snapshots for services, projects and insights. The public projections read the current snapshot; drafts are private until republished.';
