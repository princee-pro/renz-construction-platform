-- RENZ Phase 1 / C3 (S5C): narrow, AAL2-gated administration facades for
-- Projects (public case studies), mirroring the S5A Services admin pattern.
--
-- The S4 editorial tables remain default-deny. These functions expose only
-- the fields and commands required by the Projects workspace; authenticated
-- users never receive generic table mutation privileges. Publication itself
-- continues to run through the existing generic public.publish_project /
-- public.unpublish_content / public.archive_content kernel from S4 — this
-- migration adds the admin-facing draft CRUD, service-relationship, story
-- stage, and media-attachment commands that S4/S5A did not yet cover for
-- projects, plus a narrow media-path resolver for signed public delivery.

create index if not exists projects_admin_updated_idx
  on public.projects (updated_at desc, id desc);

-- ---------------------------------------------------------------------
-- Overview / list / detail
-- ---------------------------------------------------------------------

create or replace function public.admin_project_overview()
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
    raise exception using errcode = '42501', message = 'project overview is not authorized';
  end if;

  select jsonb_build_object(
    'draft', count(*) filter (where project.publication_status = 'draft'),
    'published', count(*) filter (where project.publication_status = 'published'),
    'archived', count(*) filter (where project.publication_status = 'archived'),
    'blocked', count(*) filter (
      where project.publication_status = 'draft'
        and private.project_publication_failures(project.id) <> '[]'::jsonb
    ),
    'media', jsonb_build_object(
      'total', (select count(*) from public.project_media),
      'eligible', (select count(*) from public.project_media where public_status = 'eligible'),
      'rights_unknown', (
        select count(distinct usage.id)
        from public.project_media as usage
        join public.media_assets as asset on asset.id = usage.media_asset_id
        where asset.rights_status in ('unknown', 'in_review')
      )
    )
  )
  into result
  from public.projects as project;

  return result;
end;
$$;

create or replace function public.admin_list_projects(
  search_query text default null,
  status_filter text default null,
  type_filter text default null,
  locale_filter text default null,
  cursor_updated_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item record;
  items jsonb := '[]'::jsonb;
  item_count integer := 0;
  has_more boolean := false;
  next_updated_at timestamptz := null;
  next_id uuid := null;
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('content.read') then
    raise exception using errcode = '42501', message = 'project list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'project page size is outside the admitted range';
  end if;
  if status_filter is not null and status_filter not in ('draft', 'published', 'archived') then
    raise exception using errcode = '22023', message = 'project status filter is not admitted';
  end if;
  if locale_filter is not null
     and locale_filter !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$' then
    raise exception using errcode = '22023', message = 'project locale filter is not admitted';
  end if;
  if type_filter is not null and char_length(type_filter) > 80 then
    raise exception using errcode = '22023', message = 'project type filter is too long';
  end if;
  if normalized_query is not null and char_length(normalized_query) > 100 then
    raise exception using errcode = '22023', message = 'project search query is too long';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'project cursor is incomplete';
  end if;

  for item in
    select
      project.id,
      project.publication_status,
      project.updated_at,
      project.version,
      project.featured,
      project.project_type,
      project.public_location,
      localization.locale,
      localization.title,
      localization.slug,
      private.project_publication_failures(project.id) as failures,
      (select count(*) from public.project_media as media where media.project_id = project.id) as media_count
    from public.projects as project
    join lateral (
      select
        candidate.locale,
        candidate.title,
        candidate.slug
      from public.project_localizations as candidate
      where candidate.project_id = project.id
        and (locale_filter is null or candidate.locale = locale_filter)
        and (
          normalized_query is null
          or strpos(lower(candidate.title), lower(normalized_query)) > 0
          or strpos(lower(candidate.slug), lower(normalized_query)) > 0
        )
      order by
        case when candidate.locale = 'en' then 0 else 1 end,
        candidate.locale asc
      limit 1
    ) as localization on true
    where (status_filter is null or project.publication_status = status_filter)
      and (type_filter is null or project.project_type = type_filter)
      and (
        cursor_updated_at is null
        or (project.updated_at, project.id) < (cursor_updated_at, cursor_id)
      )
    order by project.updated_at desc, project.id desc
    limit page_size + 1
  loop
    item_count := item_count + 1;
    if item_count > page_size then
      has_more := true;
      exit;
    end if;

    items := items || jsonb_build_array(jsonb_build_object(
      'id', item.id,
      'publication_status', item.publication_status,
      'updated_at', item.updated_at,
      'version', item.version,
      'featured', item.featured,
      'project_type', item.project_type,
      'public_location', item.public_location,
      'locale', item.locale,
      'title', item.title,
      'slug', item.slug,
      'readiness', case when item.failures = '[]'::jsonb then 'ready' else 'blocked' end,
      'blocker_count', jsonb_array_length(item.failures),
      'media_count', item.media_count
    ));
    next_updated_at := item.updated_at;
    next_id := item.id;
  end loop;

  return jsonb_build_object(
    'items', items,
    'has_more', has_more,
    'next_cursor', case
      when has_more then jsonb_build_object('updated_at', next_updated_at, 'id', next_id)
      else null
    end
  );
end;
$$;

create or replace function public.admin_get_project(
  target_id uuid,
  target_locale text default 'en'
)
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
    raise exception using errcode = '42501', message = 'project detail is not authorized';
  end if;
  if target_locale is null
     or target_locale !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$' then
    raise exception using errcode = '22023', message = 'project locale is not admitted';
  end if;

  select jsonb_build_object(
    'project', jsonb_build_object(
      'id', project.id,
      'publication_status', project.publication_status,
      'published_at', project.published_at,
      'public_location', project.public_location,
      'public_location_granularity', project.public_location_granularity,
      'project_type', project.project_type,
      'start_year', project.start_year,
      'completion_year', project.completion_year,
      'delivery_status', project.delivery_status,
      'sort_order', project.sort_order,
      'featured', project.featured,
      'hero_asset_id', project.hero_asset_id,
      'reviewed_by', project.reviewed_by,
      'reviewed_at', project.reviewed_at,
      'created_at', project.created_at,
      'updated_at', project.updated_at,
      'version', project.version
    ),
    'localization', (
      select jsonb_build_object(
        'locale', localization.locale,
        'slug', localization.slug,
        'title', localization.title,
        'summary', localization.summary,
        'challenge', localization.challenge,
        'approach', localization.approach,
        'solution', localization.solution,
        'outcomes', localization.outcomes,
        'seo_title', localization.seo_title,
        'seo_description', localization.seo_description,
        'version', localization.version
      )
      from public.project_localizations as localization
      where localization.project_id = project.id
        and localization.locale = target_locale
    ),
    'available_locales', coalesce((
      select jsonb_agg(localization.locale order by localization.locale)
      from public.project_localizations as localization
      where localization.project_id = project.id
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'service_id', relation.service_id,
        'name', coalesce(name_localization.name, en_localization.name),
        'scope_label', relation.scope_label,
        'sort_order', relation.sort_order
      ) order by relation.sort_order, relation.service_id)
      from public.project_services as relation
      left join public.service_localizations as name_localization
        on name_localization.service_id = relation.service_id and name_localization.locale = target_locale
      left join public.service_localizations as en_localization
        on en_localization.service_id = relation.service_id and en_localization.locale = 'en'
      where relation.project_id = project.id
    ), '[]'::jsonb),
    'stages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', stage.id,
        'title', stage.title,
        'description', stage.description,
        'stage_date', stage.stage_date,
        'stage_status', stage.stage_status,
        'sort_order', stage.sort_order,
        'version', stage.version
      ) order by stage.sort_order, stage.id)
      from public.project_stages as stage
      where stage.project_id = project.id
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', usage.id,
        'media_asset_id', usage.media_asset_id,
        'role', usage.role,
        'phase', usage.phase,
        'stage_id', usage.stage_id,
        'decorative', usage.decorative,
        'credit', usage.credit,
        'sort_order', usage.sort_order,
        'public_status', usage.public_status,
        'version', usage.version,
        'asset_version', asset.version,
        'mime_type', asset.mime_type,
        'width', asset.width,
        'height', asset.height,
        'provenance_class', asset.provenance_class,
        'storage_state', asset.storage_state,
        'rights_status', asset.rights_status,
        'public_use_permission', asset.public_use_permission,
        'original_filename', asset.original_filename,
        'alt_text', text_localization.alt_text,
        'caption', text_localization.caption,
        'localization_version', text_localization.version
      ) order by usage.sort_order, usage.id)
      from public.project_media as usage
      join public.media_assets as asset on asset.id = usage.media_asset_id
      left join public.project_media_localizations as text_localization
        on text_localization.project_media_id = usage.id and text_localization.locale = target_locale
      where usage.project_id = project.id
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', evidence.id,
        'fact_claim', evidence.fact_claim,
        'source_type', evidence.source_type,
        'source_reference', evidence.source_reference,
        'sensitivity', evidence.sensitivity,
        'verification_state', case
          when evidence.verification_state = 'verified'
            and evidence.review_due_at is not null
            and evidence.review_due_at < now()
          then 'expired'
          else evidence.verification_state
        end,
        'review_due_at', evidence.review_due_at,
        'consent_required', evidence.consent_required,
        'consent_state', evidence.consent_state,
        'required', link.required,
        'purpose', link.purpose,
        'version', evidence.version,
        'updated_at', evidence.updated_at
      ) order by link.required desc, evidence.updated_at desc, evidence.id)
      from public.project_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.project_id = project.id
    ), '[]'::jsonb),
    'readiness', jsonb_build_object(
      'ready', private.project_publication_failures(project.id) = '[]'::jsonb,
      'reasons', private.project_publication_failures(project.id)
    )
  )
  into result
  from public.projects as project
  where project.id = target_id;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Draft create / update
-- ---------------------------------------------------------------------

create or replace function public.create_admin_project_draft(
  target_locale text,
  target_slug text,
  target_title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_id uuid;
begin
  if not private.has_permission('content.write') then
    raise exception using errcode = '42501', message = 'project creation is not authorized';
  end if;
  if target_locale is null
     or target_slug is null
     or target_title is null
     or target_locale !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'
     or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(target_slug) > 120
     or char_length(btrim(target_title)) not between 1 and 160
     or not private.safe_public_text(btrim(target_title)) then
    raise exception using errcode = '22023', message = 'project draft fields are invalid';
  end if;

  insert into public.projects (created_by, updated_by)
  values (auth.uid(), auth.uid())
  returning id into project_id;

  insert into public.project_localizations (
    project_id, locale, slug, title, created_by, updated_by
  ) values (
    project_id, target_locale, target_slug, btrim(target_title), auth.uid(), auth.uid()
  );

  perform private.s4_audit(
    'project.create', 'project', project_id::text, 'success',
    jsonb_build_object(
      'locale', target_locale,
      'version', 1,
      'localization_version', 1,
      'changed_keys', jsonb_build_array('locale', 'slug', 'title')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'id', project_id,
    'version', 1,
    'localization_version', 1
  );
end;
$$;

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
  if current_project.publication_status <> 'draft' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.'))
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
  if current_project.publication_status <> 'draft' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be reviewed.'))
    );
  end if;
  if current_project.version <> expected_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', current_project.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

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

-- ---------------------------------------------------------------------
-- Service relationships
-- ---------------------------------------------------------------------

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
  if current_project.publication_status <> 'draft' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.'))
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

-- ---------------------------------------------------------------------
-- Story stages
-- ---------------------------------------------------------------------

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
  if current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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

  update public.projects set updated_by = auth.uid(), version = version + 1 where id = target_project_id;

  perform private.s4_audit(
    'project.stage_create', 'project', target_project_id::text, 'success',
    jsonb_build_object('stage_id', stage_id, 'version', expected_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', stage_id, 'project_version', expected_version + 1);
end;
$$;

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
  if not found or current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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
  if not found or current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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

-- ---------------------------------------------------------------------
-- Media attachment
-- ---------------------------------------------------------------------

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
  if current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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

  update public.projects set updated_by = auth.uid(), version = version + 1 where id = target_project_id;

  perform private.s4_audit(
    'project.media_attach', 'project', target_project_id::text, 'success',
    jsonb_build_object('project_media_id', usage_id, 'role', target_role, 'version', expected_version + 1)
  );

  return jsonb_build_object('ok', true, 'id', usage_id, 'project_version', expected_version + 1);
end;
$$;

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
  if not found or current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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
  if not found or current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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
  if not found or current_project.publication_status <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft projects can be edited.')));
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

-- ---------------------------------------------------------------------
-- Upload finalization and promotion (Media Command Center rights workflow)
-- ---------------------------------------------------------------------

-- register_media_asset() leaves a freshly uploaded asset in 'registered' state.
-- The upload route calls this immediately after a successful Storage upload to
-- confirm the object landed and move the asset into the 'ready_private' state
-- that promote_media_asset() requires before rights can ever be cleared.
create or replace function public.finalize_media_upload(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  current_state text;
begin
  if not private.has_permission('media.upload') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.upload is required.')));
  end if;
  select version, storage_state into current_version, current_state
  from public.media_assets where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before finalization.'))
    );
  end if;
  if current_state <> 'registered' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'storage_state', 'Only freshly registered media can be finalized.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set storage_state = 'ready_private', updated_by = auth.uid(), version = version + 1
   where id = target_id;
  perform private.s4_audit('media.finalize', 'media', target_id::text, 'success', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', 'ready_private');
end;
$$;

-- Bounded admin convenience: clear rights and promote a project_media usage
-- (and its underlying derivative asset) to 'eligible' in a single command, so
-- the Media Command Center exposes one clear "clear rights and use publicly"
-- action rather than requiring three separate calls in a fixed order.
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
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  select usage.id, usage.version, usage.media_asset_id into usage_row
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
  select * into asset_row from public.media_assets where id = usage_row.media_asset_id for update;
  if asset_row.provenance_class in ('concept_demo', 'generated_reference', 'synthetic_test') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_media_classification', 'provenance_class', 'This media class cannot be promoted to public evidence.')));
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

  if asset_row.storage_state <> 'public_eligible' then
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
-- Project evidence (mirrors service evidence exactly)
-- ---------------------------------------------------------------------

create or replace function public.create_project_evidence(
  target_project_id uuid,
  fact_claim text,
  source_type text,
  source_reference text,
  sensitivity text default 'private',
  consent_required boolean default false,
  required boolean default true,
  purpose text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_id uuid;
begin
  if not private.has_permission('content.write') then
    raise exception using errcode = '42501', message = 'project evidence creation is not authorized';
  end if;
  if target_project_id is null
     or fact_claim is null
     or source_type is null
     or source_reference is null
     or sensitivity is null
     or consent_required is null
     or required is null
     or not exists (select 1 from public.projects where id = target_project_id)
     or source_type not in (
       'client_supplied', 'client_confirmation', 'contract_document',
       'project_document', 'media_metadata', 'credential_document',
       'testimonial_consent', 'public_authoritative_source',
       'internal_record', 'other_reviewed_source'
     )
     or sensitivity not in ('public', 'private')
     or char_length(btrim(fact_claim)) not between 1 and 1000
     or char_length(btrim(source_reference)) not between 1 and 1000
     or not private.safe_public_text(btrim(fact_claim))
     or not private.safe_public_text(btrim(source_reference))
     or (purpose is not null and (
       char_length(btrim(purpose)) not between 1 and 500
       or not private.safe_public_text(btrim(purpose))
     )) then
    raise exception using errcode = '22023', message = 'project evidence fields are invalid';
  end if;

  insert into public.evidence_records (
    fact_claim, source_type, source_reference, sensitivity,
    consent_required, consent_state, owner_id, created_by, updated_by
  ) values (
    btrim(fact_claim), source_type, btrim(source_reference), sensitivity,
    consent_required, case when consent_required then 'pending' else 'not_required' end,
    auth.uid(), auth.uid(), auth.uid()
  ) returning id into evidence_id;

  insert into public.project_evidence (project_id, evidence_id, required, purpose)
  values (target_project_id, evidence_id, required, nullif(btrim(purpose), ''));

  perform private.s4_audit(
    'evidence.create', 'evidence', evidence_id::text, 'success',
    jsonb_build_object(
      'content_type', 'project',
      'content_id', target_project_id,
      'source_type', source_type,
      'sensitivity', sensitivity,
      'required', required
    )
  );

  return jsonb_build_object('ok', true, 'id', evidence_id, 'version', 1);
end;
$$;

create or replace function public.submit_project_evidence_for_review(
  target_project_id uuid,
  target_evidence_id uuid,
  expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence record;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_project_id is null or target_evidence_id is null or expected_version is null or expected_version < 1 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Evidence command is invalid.')));
  end if;
  if not exists (
    select 1 from public.project_evidence
    where project_id = target_project_id and evidence_id = target_evidence_id
  ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Linked project evidence does not exist.')));
  end if;

  select evidence_record.verification_state, evidence_record.version
  into evidence
  from public.evidence_records as evidence_record
  where evidence_record.id = target_evidence_id
  for update;
  if evidence.version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', evidence.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer evidence version is available.'))
    );
  end if;
  if evidence.verification_state not in ('unverified', 'expired', 'rejected') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'verification_state', 'Evidence is not awaiting submission.')));
  end if;

  update public.evidence_records
  set verification_state = 'in_review',
      reviewer_id = null,
      verified_at = null,
      approved_public_wording = null,
      updated_by = auth.uid(),
      version = version + 1
  where id = target_evidence_id;

  perform private.s4_audit(
    'evidence.submit_review', 'evidence', target_evidence_id::text, 'success',
    jsonb_build_object('content_type', 'project', 'content_id', target_project_id, 'version', expected_version + 1)
  );
  return jsonb_build_object('ok', true, 'id', target_evidence_id, 'version', expected_version + 1, 'state', 'in_review');
end;
$$;

create or replace function public.review_project_evidence(
  target_project_id uuid,
  target_evidence_id uuid,
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
  current_state text;
  current_version integer;
begin
  if not private.has_permission('claims.verify') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'claims.verify is required.')));
  end if;
  if target_project_id is null or target_evidence_id is null or expected_version is null or expected_version < 1 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Evidence review command is invalid.')));
  end if;
  if next_state is null or next_state not in ('verified', 'rejected') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'next_state', 'Review may only verify or reject evidence.')));
  end if;
  if not exists (
    select 1 from public.project_evidence
    where project_id = target_project_id and evidence_id = target_evidence_id
  ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Linked project evidence does not exist.')));
  end if;

  select evidence.verification_state, evidence.version
  into current_state, current_version
  from public.evidence_records as evidence
  where evidence.id = target_evidence_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Evidence does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer evidence version is available.'))
    );
  end if;
  if current_state <> 'in_review' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'verification_state', 'Only evidence in review may receive a review decision.')));
  end if;

  return public.transition_evidence(
    target_evidence_id, expected_version, next_state,
    next_approved_public_wording, next_consent_state, next_review_due_at
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Public projection: project/service relationships
-- ---------------------------------------------------------------------

create view public.published_project_services with (security_barrier = true) as
select
  relation.project_id,
  relation.service_id,
  relation.scope_label,
  relation.sort_order
from public.project_services as relation
where private.is_public_content('project', relation.project_id)
  and private.is_public_content('service', relation.service_id);

-- ---------------------------------------------------------------------
-- Narrow signed-media path resolver (public delivery of eligible media)
-- ---------------------------------------------------------------------

create or replace function public.resolve_project_media_path(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  asset record;
  publicly_eligible boolean;
begin
  if target_id is null then
    return null;
  end if;

  publicly_eligible := private.is_public_media_usage(target_id);
  if not publicly_eligible and not private.has_permission('content.read') then
    -- Neither publicly eligible nor an authorized staff reader (draft preview) may resolve this.
    return null;
  end if;

  select storage_asset.bucket_id, storage_asset.object_path, storage_asset.mime_type
  into asset
  from public.project_media as usage
  join public.media_assets as storage_asset on storage_asset.id = usage.media_asset_id
  where usage.id = target_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'bucket_id', asset.bucket_id,
    'object_path', asset.object_path,
    'mime_type', asset.mime_type
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

revoke all on function public.admin_project_overview() from public, anon, authenticated;
revoke all on function public.admin_list_projects(text, text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_project(uuid, text) from public, anon, authenticated;
revoke all on function public.create_admin_project_draft(text, text, text) from public, anon, authenticated;
revoke all on function public.update_admin_project_draft(uuid, integer, integer, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer, integer, boolean, uuid) from public, anon, authenticated;
revoke all on function public.mark_project_factually_reviewed(uuid, integer) from public, anon, authenticated;
revoke all on function public.set_admin_project_services(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.create_admin_project_stage(uuid, integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.update_admin_project_stage(uuid, uuid, integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.delete_admin_project_stage(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_attach_project_media(uuid, integer, uuid, text, text, uuid, boolean, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_update_project_media(uuid, uuid, integer, text, text, uuid, boolean, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.admin_reorder_project_media(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.admin_remove_project_media(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.create_project_evidence(uuid, text, text, text, text, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.submit_project_evidence_for_review(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.review_project_evidence(uuid, uuid, integer, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.resolve_project_media_path(uuid) from public, anon, authenticated;
revoke all on function public.finalize_media_upload(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_clear_and_promote_project_media(uuid, integer, text, text, text) from public, anon, authenticated;

grant execute on function public.admin_project_overview() to authenticated;
grant execute on function public.admin_list_projects(text, text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_get_project(uuid, text) to authenticated;
grant execute on function public.create_admin_project_draft(text, text, text) to authenticated;
grant execute on function public.update_admin_project_draft(uuid, integer, integer, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer, integer, boolean, uuid) to authenticated;
grant execute on function public.mark_project_factually_reviewed(uuid, integer) to authenticated;
grant execute on function public.set_admin_project_services(uuid, integer, jsonb) to authenticated;
grant execute on function public.create_admin_project_stage(uuid, integer, text, text, integer) to authenticated;
grant execute on function public.update_admin_project_stage(uuid, uuid, integer, text, text, integer) to authenticated;
grant execute on function public.delete_admin_project_stage(uuid, uuid, integer) to authenticated;
grant execute on function public.admin_attach_project_media(uuid, integer, uuid, text, text, uuid, boolean, text, text, text) to authenticated;
grant execute on function public.admin_update_project_media(uuid, uuid, integer, text, text, uuid, boolean, text, text, text, integer) to authenticated;
grant execute on function public.admin_reorder_project_media(uuid, uuid[]) to authenticated;
grant execute on function public.admin_remove_project_media(uuid, uuid, integer) to authenticated;
grant execute on function public.create_project_evidence(uuid, text, text, text, text, boolean, boolean, text) to authenticated;
grant execute on function public.submit_project_evidence_for_review(uuid, uuid, integer) to authenticated;
grant execute on function public.review_project_evidence(uuid, uuid, integer, text, text, text, timestamptz) to authenticated;
-- Media path resolution is gated entirely inside the function body (public
-- eligibility OR an authorized staff reader for draft preview), so it is
-- safe to grant to anon: an ineligible id simply returns null.
grant execute on function public.resolve_project_media_path(uuid) to anon, authenticated;
grant execute on function public.finalize_media_upload(uuid, integer) to authenticated;
grant execute on function public.admin_clear_and_promote_project_media(uuid, integer, text, text, text) to authenticated;

grant select on public.published_project_services to anon, authenticated;

comment on function public.admin_list_projects(text, text, text, text, timestamptz, uuid, integer) is
  'S5C bounded keyset-paginated Projects register. Requires fresh AAL2 content.read.';
comment on function public.admin_get_project(uuid, text) is
  'S5C explicit Projects editor payload with services, stages, media, evidence, and authoritative publication readiness.';
comment on function public.update_admin_project_draft(uuid, integer, integer, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, integer, integer, integer, boolean, uuid) is
  'S5C draft-only project update with dual optimistic versions and redacted changed-key audit metadata.';
comment on function public.resolve_project_media_path(uuid) is
  'Returns the storage bucket/path for a project_media row when it is publicly eligible OR the caller holds content.read (draft preview); used by the media-delivery route to mint short-lived signed URLs without exposing raw Storage access.';
