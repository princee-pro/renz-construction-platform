-- CR1 — Owner surfaces: Insights administration, Media library, Website
-- control center (overview + site map), Quick Find kinds and Launch
-- Readiness website checks.

-- ---------------------------------------------------------------------
-- Hero media for services and insights may be any rights-cleared website
-- image (labelled when it is a concept); real-project evidence keeps S4.
-- ---------------------------------------------------------------------

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
  if asset_id is not null and not private.public_media_is_current(asset_id) and not private.website_media_is_current(asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The service hero media is not ready for public use.'));
  end if;

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
  if asset_id is not null and not private.public_media_is_current(asset_id) and not private.website_media_is_current(asset_id) then
    failures := failures || jsonb_build_array(private.failure('rights_unknown', 'hero_asset_id', 'The insight hero media is not ready for public use.'));
  end if;
  return failures;
end;
$$;

-- ---------------------------------------------------------------------
-- Insights administration (posts domain)
-- ---------------------------------------------------------------------

create or replace function public.admin_list_posts(
  search_query text default null,
  status_filter text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('content.read') then
    raise exception using errcode = '42501', message = 'insight list is not authorized';
  end if;
  if status_filter is not null and status_filter not in ('draft', 'published', 'archived') then
    raise exception using errcode = '22023', message = 'insight status filter is not admitted';
  end if;
  return jsonb_build_object(
    'counts', (
      select jsonb_build_object(
        'draft', count(*) filter (where publication_status = 'draft'),
        'published', count(*) filter (where publication_status = 'published'),
        'archived', count(*) filter (where publication_status = 'archived')
      ) from public.posts
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', post.id,
        'publication_status', post.publication_status,
        'updated_at', post.updated_at,
        'published_at', post.published_at,
        'publication_date', post.publication_date,
        'version', post.version,
        'title', localization.title,
        'slug', localization.slug,
        'topic', post.topic,
        'featured', post.featured,
        'pinned', post.pinned,
        'has_draft_changes', post.publication_status = 'published' and private.content_has_draft_changes('post', post.id),
        'readiness', case when private.post_publication_failures(post.id) = '[]'::jsonb then 'ready' else 'blocked' end,
        'blocker_count', jsonb_array_length(private.post_publication_failures(post.id))
      ) order by post.updated_at desc, post.id desc)
      from public.posts as post
      join public.post_localizations as localization on localization.post_id = post.id and localization.locale = 'en'
      where (status_filter is null or post.publication_status = status_filter)
        and (normalized_query is null or localization.title ilike '%' || normalized_query || '%' or localization.slug ilike '%' || normalized_query || '%')
      limit 200
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_post(target_id uuid)
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
    raise exception using errcode = '42501', message = 'insight detail is not authorized';
  end if;
  select jsonb_build_object(
    'post', jsonb_build_object(
      'id', post.id,
      'publication_status', post.publication_status,
      'published_at', post.published_at,
      'publication_date', post.publication_date,
      'topic', post.topic,
      'related_service_id', post.related_service_id,
      'related_service_name', (select name from public.service_localizations where service_id = post.related_service_id and locale = 'en'),
      'featured', post.featured,
      'pinned', post.pinned,
      'sort_priority', post.sort_priority,
      'hero_asset_id', post.hero_asset_id,
      'is_time_sensitive', post.is_time_sensitive,
      'reviewed_at', post.reviewed_at,
      'reviewed_by', (select display_name from public.profiles where id = post.reviewed_by),
      'created_at', post.created_at,
      'updated_at', post.updated_at,
      'version', post.version,
      'has_draft_changes', post.publication_status = 'published' and private.content_has_draft_changes('post', post.id)
    ),
    'localization', jsonb_build_object(
      'locale', localization.locale,
      'slug', localization.slug,
      'title', localization.title,
      'excerpt', localization.excerpt,
      'body_blocks', localization.body_blocks,
      'seo_title', localization.seo_title,
      'seo_description', localization.seo_description,
      'version', localization.version
    ),
    'readiness', jsonb_build_object(
      'ready', private.post_publication_failures(post.id) = '[]'::jsonb,
      'reasons', private.post_publication_failures(post.id)
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', l.name) order by s.sort_order, l.name)
      from public.services as s join public.service_localizations as l on l.service_id = s.id and l.locale = 'en'
      where s.publication_status <> 'archived'
    ), '[]'::jsonb)
  )
  into result
  from public.posts as post
  join public.post_localizations as localization on localization.post_id = post.id and localization.locale = 'en'
  where post.id = target_id;
  return result;
end;
$$;

create or replace function public.create_admin_post_draft(target_slug text, target_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_id uuid;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_slug is null or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(target_slug) > 120
     or target_title is null or char_length(btrim(target_title)) not between 1 and 200 or not private.safe_public_text(btrim(target_title)) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'A slug (lowercase, hyphens) and a title up to 200 characters are required.')));
  end if;
  if exists (select 1 from public.post_localizations where slug = target_slug and locale = 'en') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_route', 'slug', 'Another insight already uses this address.')));
  end if;
  insert into public.posts (author_id, publication_date, created_by, updated_by)
  values (auth.uid(), current_date, auth.uid(), auth.uid())
  returning id into post_id;
  insert into public.post_localizations (post_id, locale, slug, title, created_by, updated_by)
  values (post_id, 'en', target_slug, btrim(target_title), auth.uid(), auth.uid());
  perform private.s4_audit('post.create', 'post', post_id::text, 'success', jsonb_build_object('slug', target_slug));
  return jsonb_build_object('ok', true, 'id', post_id, 'version', 1, 'localization_version', 1);
end;
$$;

create or replace function public.update_admin_post_draft(
  target_id uuid,
  expected_version integer,
  expected_localization_version integer,
  target_slug text,
  target_title text,
  target_excerpt text,
  target_body_blocks jsonb,
  target_seo_title text,
  target_seo_description text,
  target_publication_date date,
  target_topic text,
  target_related_service_id uuid,
  target_featured boolean,
  target_pinned boolean,
  target_sort_priority integer,
  target_hero_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_post record;
  current_localization record;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  if target_slug is null or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(target_slug) > 120
     or target_title is null or char_length(btrim(target_title)) not between 1 and 200 or not private.safe_public_text(btrim(target_title))
     or (target_excerpt is not null and (char_length(btrim(target_excerpt)) > 600 or not private.safe_public_text(btrim(target_excerpt))))
     or (target_seo_title is not null and (char_length(btrim(target_seo_title)) > 160 or not private.safe_public_text(btrim(target_seo_title))))
     or (target_seo_description is not null and (char_length(btrim(target_seo_description)) > 320 or not private.safe_public_text(btrim(target_seo_description))))
     or (target_topic is not null and (char_length(btrim(target_topic)) > 80 or not private.safe_public_text(btrim(target_topic))))
     or target_body_blocks is null or not private.content_blocks_are_valid(target_body_blocks)
     or target_featured is null or target_pinned is null
     or target_sort_priority is null or target_sort_priority < 0 or target_sort_priority > 100000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Insight fields are invalid.')));
  end if;
  if target_related_service_id is not null and not exists (select 1 from public.services where id = target_related_service_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'related_service_id', 'Related service does not exist.')));
  end if;
  if target_hero_asset_id is not null and not exists (select 1 from public.media_assets where id = target_hero_asset_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'hero_asset_id', 'Hero media does not exist.')));
  end if;
  select publication_status, version into current_post from public.posts where id = target_id for update;
  if current_post.version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'post', 'Insight does not exist.')));
  end if;
  if current_post.publication_status = 'archived' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Archived insights cannot be edited.')));
  end if;
  select slug, version into current_localization from public.post_localizations where post_id = target_id and locale = 'en' for update;
  if current_localization.version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'localization', 'Insight localization does not exist.')));
  end if;
  if current_post.version <> expected_version or current_localization.version <> expected_localization_version then
    return jsonb_build_object('ok', false, 'current_version', current_post.version, 'current_localization_version', current_localization.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer insight version is available.')));
  end if;
  if current_localization.slug <> target_slug and exists (select 1 from public.post_localizations where slug = target_slug and locale = 'en' and post_id <> target_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_route', 'slug', 'Another insight already uses this address.')));
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  update public.posts
     set publication_date = coalesce(target_publication_date, publication_date),
         topic = nullif(btrim(coalesce(target_topic, '')), ''),
         related_service_id = target_related_service_id,
         featured = target_featured,
         pinned = target_pinned,
         sort_priority = target_sort_priority,
         hero_asset_id = target_hero_asset_id,
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  update public.post_localizations
     set slug = target_slug,
         title = btrim(target_title),
         excerpt = nullif(btrim(coalesce(target_excerpt, '')), ''),
         body_blocks = target_body_blocks,
         seo_title = nullif(btrim(coalesce(target_seo_title, '')), ''),
         seo_description = nullif(btrim(coalesce(target_seo_description, '')), ''),
         updated_by = auth.uid(),
         version = version + 1
   where post_id = target_id and locale = 'en';
  perform private.s4_audit('post.update', 'post', target_id::text, 'success', jsonb_build_object('version', expected_version + 1, 'localization_version', expected_localization_version + 1));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'localization_version', expected_localization_version + 1);
end;
$$;

create or replace function public.mark_post_reviewed(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_post record;
begin
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;
  select publication_status, version into current_post from public.posts where id = target_id for update;
  if current_post.version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'post', 'Insight does not exist.')));
  end if;
  if current_post.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_post.version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer insight version is available.')));
  end if;
  perform set_config('renz.s4.publication_command', '1', true);
  update public.posts set reviewed_by = auth.uid(), reviewed_at = now(), updated_by = auth.uid(), version = version + 1 where id = target_id;
  perform private.s4_audit('post.review', 'post', target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- ---------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------

create or replace function private.media_usage(target_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(u) from (
      select jsonb_build_object('kind', 'project', 'id', project.id, 'label', l.title, 'role', usage.role, 'href', '/admin/content/projects/' || project.id) as u
      from public.project_media as usage
      join public.projects as project on project.id = usage.project_id
      join public.project_localizations as l on l.project_id = project.id and l.locale = 'en'
      where usage.media_asset_id = target_id
      union all
      select jsonb_build_object('kind', 'project', 'id', project.id, 'label', l.title, 'role', 'hero', 'href', '/admin/content/projects/' || project.id)
      from public.projects as project join public.project_localizations as l on l.project_id = project.id and l.locale = 'en'
      where project.hero_asset_id = target_id
      union all
      select jsonb_build_object('kind', 'service', 'id', service.id, 'label', l.name, 'role', 'hero', 'href', '/admin/content/services/' || service.id)
      from public.services as service join public.service_localizations as l on l.service_id = service.id and l.locale = 'en'
      where service.hero_asset_id = target_id
      union all
      select jsonb_build_object('kind', 'insight', 'id', post.id, 'label', l.title, 'role', 'hero', 'href', '/admin/content/insights/' || post.id)
      from public.posts as post join public.post_localizations as l on l.post_id = post.id and l.locale = 'en'
      where post.hero_asset_id = target_id
      union all
      select distinct jsonb_build_object('kind', 'page', 'id', page.id, 'label', page.title, 'role', 'section', 'href', '/admin/website/pages/' || page.id)
      from public.website_pages as page
      join public.website_page_sections as section on section.page_id = page.id
      where target_id = any (private.website_config_media_ids(section.config))
      union all
      select jsonb_build_object('kind', 'page', 'id', page.id, 'label', page.title, 'role', 'social image', 'href', '/admin/website/pages/' || page.id)
      from public.website_pages as page where page.og_media_id = target_id
      union all
      select jsonb_build_object('kind', 'brand', 'id', null, 'label', 'Brand media slot', 'role', 'brand', 'href', '/admin/settings/website')
      from public.brand_media_settings as brand
      where target_id in (brand.primary_logo_media_id, brand.reversed_logo_media_id, brand.favicon_media_id, brand.default_og_media_id, brand.default_share_media_id, brand.default_hero_media_id, brand.document_logo_media_id)
    ) as usages
  ), '[]'::jsonb);
$$;
revoke all on function private.media_usage(uuid) from public, anon, authenticated;

create or replace function private.media_classification(provenance text, rights text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when provenance in ('client_original', 'client_derivative') then 'renz_provided'
    when provenance = 'production_asset' then 'licensed'
    when provenance in ('concept_demo', 'generated_reference') then 'generated_concept'
    else 'review_required'
  end;
$$;

create or replace function public.admin_list_media(
  search_query text default null,
  filter text default 'all',
  limit_count integer default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('media.read') then
    raise exception using errcode = '42501', message = 'media library is not authorized';
  end if;
  if filter not in ('all', 'ready', 'needs_rights', 'needs_alt', 'unused', 'archived') then
    raise exception using errcode = '22023', message = 'media filter is not admitted';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 200 then limit_count := 60; end if;
  return jsonb_build_object(
    'counts', (
      select jsonb_build_object(
        'total', count(*) filter (where asset.storage_state <> 'archived'),
        'ready', count(*) filter (where private.website_media_is_current(asset.id)),
        'needs_rights', count(*) filter (where asset.storage_state <> 'archived' and not private.website_media_is_current(asset.id)),
        'needs_alt', count(*) filter (where asset.storage_state <> 'archived' and nullif(btrim(coalesce(asset.alt_text, '')), '') is null),
        'archived', count(*) filter (where asset.storage_state = 'archived')
      )
      from public.media_assets as asset
      where asset.bucket_id = 'editorial-derivatives' and asset.provenance_class <> 'synthetic_test'
    ),
    'items', coalesce((
      select jsonb_agg(row_to_json(item)::jsonb order by item.created_at desc)
      from (
        select
          asset.id, asset.original_filename as filename, asset.mime_type, asset.width, asset.height, asset.byte_size,
          asset.provenance_class, private.media_classification(asset.provenance_class, asset.rights_status) as classification,
          asset.rights_status, asset.storage_state, asset.alt_text, asset.caption, asset.credit, asset.focal_x, asset.focal_y,
          asset.created_at, asset.version,
          private.website_media_is_current(asset.id) as ready,
          jsonb_array_length(private.media_usage(asset.id)) as usage_count
        from public.media_assets as asset
        where asset.bucket_id = 'editorial-derivatives'
          and asset.provenance_class <> 'synthetic_test'
          and (normalized_query is null or asset.original_filename ilike '%' || normalized_query || '%' or asset.alt_text ilike '%' || normalized_query || '%' or asset.caption ilike '%' || normalized_query || '%')
          and case filter
            when 'ready' then private.website_media_is_current(asset.id)
            when 'needs_rights' then asset.storage_state <> 'archived' and not private.website_media_is_current(asset.id)
            when 'needs_alt' then asset.storage_state <> 'archived' and nullif(btrim(coalesce(asset.alt_text, '')), '') is null
            when 'unused' then asset.storage_state <> 'archived' and jsonb_array_length(private.media_usage(asset.id)) = 0
            when 'archived' then asset.storage_state = 'archived'
            else asset.storage_state <> 'archived'
          end
        order by asset.created_at desc
        limit limit_count
      ) as item
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_media(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('media.read') then
    raise exception using errcode = '42501', message = 'media detail is not authorized';
  end if;
  select jsonb_build_object(
    'id', asset.id, 'filename', asset.original_filename, 'mime_type', asset.mime_type, 'width', asset.width, 'height', asset.height,
    'byte_size', asset.byte_size, 'provenance_class', asset.provenance_class,
    'classification', private.media_classification(asset.provenance_class, asset.rights_status),
    'rights_status', asset.rights_status, 'rights_holder', asset.rights_holder, 'rights_source', asset.rights_source, 'credit', asset.credit,
    'public_use_permission', asset.public_use_permission, 'storage_state', asset.storage_state,
    'alt_text', asset.alt_text, 'caption', asset.caption, 'focal_x', asset.focal_x, 'focal_y', asset.focal_y,
    'created_at', asset.created_at, 'updated_at', asset.updated_at, 'version', asset.version,
    'ready', private.website_media_is_current(asset.id),
    'evidence_eligible', private.public_media_is_current(asset.id),
    'usage', private.media_usage(asset.id),
    'source_asset_id', asset.source_asset_id
  )
  into result
  from public.media_assets as asset
  where asset.id = target_id;
  return result;
end;
$$;

create or replace function public.admin_update_media_metadata(
  target_id uuid,
  expected_version integer,
  target_alt_text text,
  target_caption text,
  target_focal_x numeric,
  target_focal_y numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not (private.has_permission('media.manage') or private.has_permission('website.pages.write')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  if (target_alt_text is not null and (char_length(btrim(target_alt_text)) > 300 or not private.safe_public_text(btrim(target_alt_text))))
     or (target_caption is not null and (char_length(btrim(target_caption)) > 600 or not private.safe_public_text(btrim(target_caption))))
     or target_focal_x is null or target_focal_y is null or target_focal_x < 0 or target_focal_x > 1 or target_focal_y < 0 or target_focal_y > 1 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Alt text (300), caption (600) and a focal point between 0 and 1 are required.')));
  end if;
  select version into current_version from public.media_assets where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before this save.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set alt_text = nullif(btrim(coalesce(target_alt_text, '')), ''),
         caption = nullif(btrim(coalesce(target_caption, '')), ''),
         focal_x = round(target_focal_x, 3),
         focal_y = round(target_focal_y, 3),
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('media.metadata.update', 'media', target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- One-step rights confirmation for the owner. RENZ-provided and licensed
-- media become public-eligible evidence; generated concept imagery is cleared
-- for labelled illustration only and can never become project evidence.
create or replace function public.admin_confirm_media_rights(
  target_id uuid,
  expected_version integer,
  target_classification text,
  target_rights_holder text,
  target_rights_source text default null,
  target_credit text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset public.media_assets%rowtype;
  next_class text;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  if target_classification not in ('renz_provided', 'generated_concept', 'licensed')
     or target_rights_holder is null or char_length(btrim(target_rights_holder)) not between 1 and 200 or not private.safe_public_text(btrim(target_rights_holder))
     or (target_rights_source is not null and (char_length(btrim(target_rights_source)) > 300 or not private.safe_public_text(btrim(target_rights_source))))
     or (target_credit is not null and (char_length(btrim(target_credit)) > 200 or not private.safe_public_text(btrim(target_credit)))) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Choose a classification and name who holds the rights.')));
  end if;
  select * into asset from public.media_assets where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  if asset.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', asset.version, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before this confirmation.')));
  end if;
  if asset.bucket_id <> 'editorial-derivatives' or asset.storage_state not in ('ready_private', 'promotion_pending', 'public_eligible') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('media_not_ready', 'storage_state', 'The upload has not finished processing.')));
  end if;
  next_class := case target_classification
    when 'renz_provided' then 'client_derivative'
    when 'licensed' then 'production_asset'
    else 'generated_reference'
  end;
  if asset.provenance_class = 'synthetic_test' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_media_classification', 'provenance_class', 'Synthetic test media cannot be cleared for public use.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set provenance_class = next_class,
         rights_status = 'cleared',
         public_use_permission = 'granted',
         consent_state = case when consent_required then 'granted' else consent_state end,
         rights_holder = btrim(target_rights_holder),
         rights_source = nullif(btrim(coalesce(target_rights_source, '')), ''),
         credit = nullif(btrim(coalesce(target_credit, '')), ''),
         rights_reviewer_id = auth.uid(),
         rights_verified_at = statement_timestamp(),
         storage_state = case when next_class in ('client_derivative', 'production_asset') then 'public_eligible' else 'ready_private' end,
         visibility = case when next_class in ('client_derivative', 'production_asset') then 'public_eligible' else visibility end,
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  update public.media_assets
     set provenance_class = case next_class when 'client_derivative' then 'client_original' else next_class end,
         updated_by = auth.uid(), version = version + 1
   where id = asset.source_asset_id and asset.source_asset_id is not null;
  perform private.s4_audit('media.rights.update', 'media', target_id::text, 'success', jsonb_build_object('classification', target_classification, 'rights_status', 'cleared'));
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'ready', true);
end;
$$;

-- Archive: refused while any page, project, service, insight or brand slot
-- still uses the asset (replace or unlink first).
create or replace function public.archive_media_asset(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  usage jsonb;
begin
  if not private.has_permission('media.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'media.manage is required.')));
  end if;
  select version into current_version from public.media_assets where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'media', 'Media asset does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Media changed before archival.')));
  end if;
  usage := private.media_usage(target_id);
  if jsonb_array_length(usage) > 0
     or exists (select 1 from public.team_members where portrait_asset_id = target_id)
     or exists (select 1 from public.page_localizations where social_image_id = target_id)
     or exists (select 1 from public.page_section_media where media_asset_id = target_id)
     or exists (select 1 from public.media_assets where source_asset_id = target_id) then
    return jsonb_build_object('ok', false, 'usage', usage, 'reasons', jsonb_build_array(private.failure('media_in_use', 'media', 'This image is still in use. Replace or unlink it everywhere before archiving.')));
  end if;
  perform set_config('renz.s4.media_command', '1', true);
  update public.media_assets
     set storage_state = 'archived',
         visibility = 'private',
         processing_status = 'archived',
         archived_at = now(),
         updated_by = auth.uid(),
         version = version + 1
   where id = target_id;
  perform private.s4_audit('media.archive', 'media', target_id::text, 'success', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'state', 'archived');
end;
$$;

-- Replace a website-page image everywhere it is used in drafts (and as page
-- social image). Pages then show "draft changes" until republished.
create or replace function public.admin_replace_website_media(target_old_id uuid, target_new_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  section record;
  affected uuid[] := '{}'::uuid[];
begin
  if not private.has_permission('website.pages.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.pages.write is required.')));
  end if;
  if target_old_id is null or target_new_id is null or target_old_id = target_new_id
     or not exists (select 1 from public.media_assets where id = target_new_id and bucket_id = 'editorial-derivatives' and storage_state <> 'archived') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Choose a different, ready replacement image.')));
  end if;
  for section in
    select s.id, s.page_id, s.config from public.website_page_sections as s
    where target_old_id = any (private.website_config_media_ids(s.config))
  loop
    update public.website_page_sections
       set config = replace(section.config::text, target_old_id::text, target_new_id::text)::jsonb,
           updated_by = auth.uid(), version = version + 1
     where id = section.id;
    affected := affected || section.page_id;
  end loop;
  update public.website_pages set og_media_id = target_new_id, updated_by = auth.uid(), version = version + 1 where og_media_id = target_old_id;
  affected := array(select distinct unnest(affected));
  update public.website_pages set updated_by = auth.uid(), version = version + 1 where id = any (affected);
  perform private.s4_audit('media.replace', 'media', target_old_id::text, 'success', jsonb_build_object('replacement_id', target_new_id, 'pages', array_length(affected, 1)));
  return jsonb_build_object('ok', true, 'pages', coalesce(array_length(affected, 1), 0), 'page_ids', to_jsonb(affected));
end;
$$;

-- ---------------------------------------------------------------------
-- Website control center: overview + site map
-- ---------------------------------------------------------------------

create or replace function public.admin_website_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  content_ok boolean := private.has_permission('content.read');
  media_ok boolean := private.has_permission('media.read');
begin
  if not private.has_permission('website.read') then
    raise exception using errcode = '42501', message = 'website overview is not authorized';
  end if;
  select jsonb_build_object(
    'pages', jsonb_build_object(
      'published', count(*) filter (where page.status = 'published' and page.page_type <> 'global'),
      'draft', count(*) filter (where page.status = 'draft' and page.page_type <> 'global'),
      'archived', count(*) filter (where page.status = 'archived'),
      'draft_changes', count(*) filter (where page.status = 'published' and private.website_page_has_draft_changes(page.id)),
      'seo_issues', count(*) filter (where page.page_type <> 'global' and page.status <> 'archived' and (nullif(btrim(coalesce(page.seo_title, '')), '') is null or nullif(btrim(coalesce(page.seo_description, '')), '') is null)),
      'health_errors', count(*) filter (where page.page_type <> 'global' and page.status <> 'archived' and exists (select 1 from jsonb_array_elements(private.website_page_health(page.id)) as h where h ->> 'severity' = 'error'))
    )
  ) into result
  from public.website_pages as page;

  result := result || jsonb_build_object(
    'services', case when content_ok then (
      select jsonb_build_object(
        'published', count(*) filter (where publication_status = 'published'),
        'draft', count(*) filter (where publication_status = 'draft'),
        'draft_changes', count(*) filter (where publication_status = 'published' and private.content_has_draft_changes('service', id)),
        'blocked', count(*) filter (where publication_status = 'draft' and private.service_publication_failures(id) <> '[]'::jsonb)
      ) from public.services) else null end,
    'projects', case when content_ok then (
      select jsonb_build_object(
        'published', count(*) filter (where publication_status = 'published'),
        'draft', count(*) filter (where publication_status = 'draft'),
        'draft_changes', count(*) filter (where publication_status = 'published' and private.content_has_draft_changes('project', id)),
        'blocked', count(*) filter (where publication_status = 'draft' and private.project_publication_failures(id) <> '[]'::jsonb),
        'no_hero', count(*) filter (where publication_status <> 'archived' and hero_asset_id is null and not exists (select 1 from public.project_media as m where m.project_id = projects.id)),
        'home_featured', count(*) filter (where publication_status = 'published' and home_featured)
      ) from public.projects) else null end,
    'insights', case when content_ok then (
      select jsonb_build_object(
        'published', count(*) filter (where publication_status = 'published'),
        'draft', count(*) filter (where publication_status = 'draft'),
        'draft_changes', count(*) filter (where publication_status = 'published' and private.content_has_draft_changes('post', id)),
        'missing_excerpt', count(*) filter (where publication_status <> 'archived' and exists (select 1 from public.post_localizations as l where l.post_id = posts.id and l.locale = 'en' and nullif(btrim(coalesce(l.excerpt, '')), '') is null))
      ) from public.posts) else null end,
    'media', case when media_ok then (
      select jsonb_build_object(
        'total', count(*) filter (where storage_state <> 'archived'),
        'needs_alt', count(*) filter (where storage_state <> 'archived' and nullif(btrim(coalesce(alt_text, '')), '') is null),
        'needs_rights', count(*) filter (where storage_state <> 'archived' and not private.website_media_is_current(id))
      ) from public.media_assets where bucket_id = 'editorial-derivatives' and provenance_class <> 'synthetic_test') else null end,
    'services_without_projects', case when content_ok then (
      select count(*) from public.services as s
      where s.publication_status = 'published'
        and not exists (select 1 from public.published_project_services as rel where rel.service_id = s.id)
    ) else null end,
    'navigation', (
      select jsonb_build_object(
        'custom_links', count(*) filter (where route_key like 'page:%'),
        'broken_links', count(*) filter (where route_key like 'page:%' and not exists (
          select 1 from public.website_pages as p where p.path = '/' || substr(navigation_settings.route_key, 6) and p.status = 'published'))
      ) from public.navigation_settings
    ),
    'recent_activity', coalesce((
      select jsonb_agg(jsonb_build_object('action', a.action, 'entity_type', a.entity_type, 'entity_id', a.entity_id, 'at', a.occurred_at, 'actor', p.display_name) order by a.occurred_at desc)
      from (
        select * from public.audit_logs
        where entity_type in ('website_page', 'service', 'project', 'post', 'media')
          and action not like '%.read'
        order by occurred_at desc limit 12
      ) as a
      left join public.profiles as p on p.id = a.actor_id
    ), '[]'::jsonb),
    'permissions', jsonb_build_object(
      'content', content_ok, 'media', media_ok,
      'publish', private.has_permission('website.publish'),
      'navigation', private.has_permission('website.navigation.write') or private.has_permission('settings.website.write')
    )
  );
  return result;
end;
$$;

create or replace function public.admin_website_sitemap()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rows jsonb := '[]'::jsonb;
  content_ok boolean := private.has_permission('content.read');
begin
  if not private.has_permission('website.read') then
    raise exception using errcode = '42501', message = 'website site map is not authorized';
  end if;
  rows := rows || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', 'page', 'id', page.id, 'title', page.title, 'route', page.path,
      'type', case page.page_type when 'system' then 'System page' when 'content' then 'Content page' when 'custom' then 'Custom page' else 'Global' end,
      'status', page.status,
      'has_draft_changes', page.status = 'published' and private.website_page_has_draft_changes(page.id),
      'updated_at', page.updated_at, 'updated_by', editor.display_name,
      'seo_state', case when nullif(btrim(coalesce(page.seo_title, '')), '') is not null and nullif(btrim(coalesce(page.seo_description, '')), '') is not null then 'complete' else 'incomplete' end,
      'noindex', page.noindex,
      'health', private.website_page_health(page.id),
      'href', '/admin/website/pages/' || page.id
    ) order by case page.page_type when 'system' then 0 when 'content' then 1 when 'custom' then 2 else 3 end, case page.path when '/' then 0 else 1 end, page.path)
    from public.website_pages as page
    left join public.profiles as editor on editor.id = page.updated_by
    where page.page_type <> 'global'
  ), '[]'::jsonb);
  if content_ok then
    rows := rows || coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'service', 'id', s.id, 'title', l.name, 'route', '/services/' || l.slug, 'type', 'Service',
        'status', s.publication_status,
        'has_draft_changes', s.publication_status = 'published' and private.content_has_draft_changes('service', s.id),
        'updated_at', s.updated_at, 'updated_by', editor.display_name,
        'seo_state', case when nullif(btrim(coalesce(l.seo_title, '')), '') is not null and nullif(btrim(coalesce(l.seo_description, '')), '') is not null then 'complete' else 'incomplete' end,
        'noindex', false,
        'health', case when s.publication_status = 'draft' and private.service_publication_failures(s.id) <> '[]'::jsonb then jsonb_build_array(jsonb_build_object('code', 'blocked', 'severity', 'warning', 'message', 'Not ready to publish yet.')) else '[]'::jsonb end,
        'href', '/admin/content/services/' || s.id
      ) order by s.sort_order, l.name)
      from public.services as s
      join public.service_localizations as l on l.service_id = s.id and l.locale = 'en'
      left join public.profiles as editor on editor.id = s.updated_by
      where s.publication_status <> 'archived'
    ), '[]'::jsonb);
    rows := rows || coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'project', 'id', p.id, 'title', l.title, 'route', '/projects/' || l.slug,
        'type', case p.evidence_class when 'real_project' then 'Project' when 'concept_study' then 'Concept study' else 'Experience study' end,
        'status', p.publication_status,
        'has_draft_changes', p.publication_status = 'published' and private.content_has_draft_changes('project', p.id),
        'updated_at', p.updated_at, 'updated_by', editor.display_name,
        'seo_state', case when nullif(btrim(coalesce(l.seo_title, '')), '') is not null and nullif(btrim(coalesce(l.seo_description, '')), '') is not null then 'complete' else 'incomplete' end,
        'noindex', false,
        'health', case when p.hero_asset_id is null and not exists (select 1 from public.project_media as m where m.project_id = p.id and m.role = 'hero') then jsonb_build_array(jsonb_build_object('code', 'no_hero', 'severity', 'warning', 'message', 'No hero image.')) else '[]'::jsonb end,
        'href', '/admin/content/projects/' || p.id
      ) order by p.sort_order, l.title)
      from public.projects as p
      join public.project_localizations as l on l.project_id = p.id and l.locale = 'en'
      left join public.profiles as editor on editor.id = p.updated_by
      where p.publication_status <> 'archived'
    ), '[]'::jsonb);
    rows := rows || coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'insight', 'id', p.id, 'title', l.title, 'route', '/insights/' || l.slug, 'type', 'Insight',
        'status', p.publication_status,
        'has_draft_changes', p.publication_status = 'published' and private.content_has_draft_changes('post', p.id),
        'updated_at', p.updated_at, 'updated_by', editor.display_name,
        'seo_state', case when nullif(btrim(coalesce(l.seo_title, '')), '') is not null and nullif(btrim(coalesce(l.seo_description, '')), '') is not null then 'complete' else 'incomplete' end,
        'noindex', false,
        'health', case when nullif(btrim(coalesce(l.excerpt, '')), '') is null then jsonb_build_array(jsonb_build_object('code', 'no_excerpt', 'severity', 'warning', 'message', 'No excerpt.')) else '[]'::jsonb end,
        'href', '/admin/content/insights/' || p.id
      ) order by p.publication_date desc nulls last, l.title)
      from public.posts as p
      join public.post_localizations as l on l.post_id = p.id and l.locale = 'en'
      left join public.profiles as editor on editor.id = p.updated_by
      where p.publication_status <> 'archived'
    ), '[]'::jsonb);
  end if;
  rows := rows || coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', 'legal', 'id', legal.slug, 'title', coalesce(legal.published_title, legal.draft_title), 'route', '/' || legal.slug, 'type', 'Legal page',
      'status', case when legal.published_body is not null then 'published' else 'draft' end,
      'has_draft_changes', legal.published_body is not null and legal.draft_body is distinct from legal.published_body,
      'updated_at', legal.updated_at, 'updated_by', editor.display_name,
      'seo_state', 'system', 'noindex', false, 'health', '[]'::jsonb,
      'href', '/admin/settings/legal'
    ) order by legal.slug)
    from public.legal_pages as legal
    left join public.profiles as editor on editor.id = legal.updated_by
  ), '[]'::jsonb);
  return rows;
end;
$$;

-- ---------------------------------------------------------------------
-- Quick Find: pages, services and insights (case studies already exist)
-- ---------------------------------------------------------------------

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.admin_global_quick_find(text, integer)'::regprocedure);
  definition := replace(definition, 'FUNCTION public.admin_global_quick_find(', 'FUNCTION private.admin_global_quick_find_base(');
  execute definition;
end;
$$;
revoke all on function private.admin_global_quick_find_base(text, integer) from public, anon, authenticated;

create or replace function public.admin_global_quick_find(search_query text, limit_count integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
  result jsonb;
begin
  result := private.admin_global_quick_find_base(search_query, limit_count);
  if normalized_query is null or char_length(normalized_query) < 2 then
    return result;
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 20 then
    limit_count := 8;
  end if;
  if private.has_permission('website.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'page', 'id', id, 'label', title, 'detail', path || ' · ' || status))
      from (select id, title, path, status from public.website_pages where page_type <> 'global' and status <> 'archived'
            and (title ilike '%' || normalized_query || '%' or path ilike '%' || normalized_query || '%')
            order by path limit limit_count) as page), '[]'::jsonb);
  end if;
  if private.has_permission('content.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'service', 'id', id, 'label', name, 'detail', publication_status))
      from (select service.id, localization.name, service.publication_status from public.services as service
            join public.service_localizations as localization on localization.service_id = service.id and localization.locale = 'en'
            where service.publication_status <> 'archived' and localization.name ilike '%' || normalized_query || '%'
            order by service.sort_order limit limit_count) as service), '[]'::jsonb);
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'insight', 'id', id, 'label', title, 'detail', publication_status))
      from (select post.id, localization.title, post.publication_status from public.posts as post
            join public.post_localizations as localization on localization.post_id = post.id and localization.locale = 'en'
            where post.publication_status <> 'archived' and localization.title ilike '%' || normalized_query || '%'
            order by post.updated_at desc limit limit_count) as post), '[]'::jsonb);
  end if;
  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Launch readiness: website content checks
-- ---------------------------------------------------------------------

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('private.launch_readiness()'::regprocedure);
  definition := replace(definition, 'FUNCTION private.launch_readiness(', 'FUNCTION private.launch_readiness_base(');
  execute definition;
end;
$$;
revoke all on function private.launch_readiness_base() from public, anon, authenticated;

create or replace function private.launch_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base jsonb := private.launch_readiness_base();
  checks jsonb := base -> 'checks';
  draft_pages integer;
  unpublished_system integer;
  broken_nav integer;
  missing_alt integer;
  missing_seo integer;
  missing_hero integer;
  content_drafts integer;
  invalid_routes integer;
  dependency_errors integer;
begin
  select count(*) into draft_pages from public.website_pages where status = 'published' and private.website_page_has_draft_changes(id);
  select count(*) into unpublished_system from public.website_pages where page_type in ('system', 'global') and status <> 'published';
  select count(*) into broken_nav from public.navigation_settings as n
   where n.route_key like 'page:%' and n.visible and not exists (select 1 from public.website_pages as p where p.path = '/' || substr(n.route_key, 6) and p.status = 'published');
  select count(*) into missing_alt from public.media_assets as asset
   where asset.bucket_id = 'editorial-derivatives' and asset.storage_state <> 'archived' and asset.provenance_class <> 'synthetic_test'
     and nullif(btrim(coalesce(asset.alt_text, '')), '') is null
     and (private.website_media_is_published(asset.id) or private.content_media_is_published(asset.id));
  select count(*) into missing_seo from public.website_pages where page_type <> 'global' and status = 'published'
     and (nullif(btrim(coalesce(seo_title, '')), '') is null or nullif(btrim(coalesce(seo_description, '')), '') is null);
  select count(*) into missing_hero from public.projects as p where p.publication_status = 'published'
     and p.hero_asset_id is null and not exists (select 1 from public.project_media as m where m.project_id = p.id and m.role = 'hero');
  select
    (select count(*) from public.services where publication_status = 'published' and private.content_has_draft_changes('service', id))
    + (select count(*) from public.projects where publication_status = 'published' and private.content_has_draft_changes('project', id))
    + (select count(*) from public.posts where publication_status = 'published' and private.content_has_draft_changes('post', id))
    into content_drafts;
  select count(*) into invalid_routes from public.website_pages where page_type = 'custom' and status = 'published'
     and not private.website_custom_slug_is_admitted(ltrim(path, '/'));
  select count(*) into dependency_errors from public.website_pages as page where page.page_type <> 'global' and page.status = 'published'
     and exists (select 1 from jsonb_array_elements(private.website_page_health(page.id)) as h where h ->> 'severity' = 'error');

  checks := checks
    || jsonb_build_object('key', 'website_system_pages', 'label', 'System pages published (Home, Services, Projects, About, Insights, Contact, Start a Project)', 'classification', 'required',
         'state', case when unpublished_system = 0 then 'ready' else 'blocked' end,
         'detail', case when unpublished_system = 0 then null else unpublished_system || ' system page(s) are not published; open Website → Pages.' end)
    || jsonb_build_object('key', 'website_draft_changes', 'label', 'Website pages have no unpublished draft changes', 'classification', 'recommended',
         'state', case when draft_pages = 0 then 'ready' else 'warning' end,
         'detail', case when draft_pages = 0 then null else draft_pages || ' page(s) have draft changes visitors cannot see yet.' end)
    || jsonb_build_object('key', 'content_draft_changes', 'label', 'Services, projects and insights have no unpublished changes', 'classification', 'recommended',
         'state', case when content_drafts = 0 then 'ready' else 'warning' end,
         'detail', case when content_drafts = 0 then null else content_drafts || ' published record(s) have draft changes.' end)
    || jsonb_build_object('key', 'website_navigation_links', 'label', 'Navigation links resolve to published pages', 'classification', 'required',
         'state', case when broken_nav = 0 then 'ready' else 'blocked' end,
         'detail', case when broken_nav = 0 then null else broken_nav || ' navigation link(s) point at an unpublished page.' end)
    || jsonb_build_object('key', 'website_alt_text', 'label', 'Published images carry alt text', 'classification', 'recommended',
         'state', case when missing_alt = 0 then 'ready' else 'warning' end,
         'detail', case when missing_alt = 0 then null else missing_alt || ' published image(s) have no alt text; open Website → Media.' end)
    || jsonb_build_object('key', 'website_page_seo', 'label', 'Published pages have SEO title and description', 'classification', 'recommended',
         'state', case when missing_seo = 0 then 'ready' else 'warning' end,
         'detail', case when missing_seo = 0 then null else missing_seo || ' page(s) fall back to the site default description.' end)
    || jsonb_build_object('key', 'project_hero_media', 'label', 'Published projects have a hero image', 'classification', 'recommended',
         'state', case when missing_hero = 0 then 'ready' else 'warning' end,
         'detail', case when missing_hero = 0 then null else missing_hero || ' published project(s) have no hero image.' end)
    || jsonb_build_object('key', 'website_custom_routes', 'label', 'Custom page addresses are valid and unreserved', 'classification', 'required',
         'state', case when invalid_routes = 0 then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'website_dependencies', 'label', 'Published pages have no content dependency errors', 'classification', 'required',
         'state', case when dependency_errors = 0 then 'ready' else 'blocked' end,
         'detail', case when dependency_errors = 0 then null else dependency_errors || ' page(s) reference media that is not ready or have no sections.' end);
  return base || jsonb_build_object(
    'checks', checks,
    'overall', case
      when exists (select 1 from jsonb_array_elements(checks) as c where c ->> 'state' = 'blocked' and c ->> 'classification' = 'required') then 'blocked'
      when exists (select 1 from jsonb_array_elements(checks) as c where c ->> 'state' in ('warning', 'blocked')) then 'warning'
      else 'ready' end
  );
end;
$$;
revoke all on function private.launch_readiness() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

revoke all on function public.admin_list_posts(text, text) from public, anon, authenticated;
revoke all on function public.admin_get_post(uuid) from public, anon, authenticated;
revoke all on function public.create_admin_post_draft(text, text) from public, anon, authenticated;
revoke all on function public.update_admin_post_draft(uuid, integer, integer, text, text, text, jsonb, text, text, date, text, uuid, boolean, boolean, integer, uuid) from public, anon, authenticated;
revoke all on function public.mark_post_reviewed(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_list_media(text, text, integer) from public, anon, authenticated;
revoke all on function public.admin_get_media(uuid) from public, anon, authenticated;
revoke all on function public.admin_update_media_metadata(uuid, integer, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.admin_confirm_media_rights(uuid, integer, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_replace_website_media(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_website_overview() from public, anon, authenticated;
revoke all on function public.admin_website_sitemap() from public, anon, authenticated;
revoke all on function public.admin_global_quick_find(text, integer) from public, anon, authenticated;

grant execute on function public.admin_list_posts(text, text) to authenticated;
grant execute on function public.admin_get_post(uuid) to authenticated;
grant execute on function public.create_admin_post_draft(text, text) to authenticated;
grant execute on function public.update_admin_post_draft(uuid, integer, integer, text, text, text, jsonb, text, text, date, text, uuid, boolean, boolean, integer, uuid) to authenticated;
grant execute on function public.mark_post_reviewed(uuid, integer) to authenticated;
grant execute on function public.admin_list_media(text, text, integer) to authenticated;
grant execute on function public.admin_get_media(uuid) to authenticated;
grant execute on function public.admin_update_media_metadata(uuid, integer, text, text, numeric, numeric) to authenticated;
grant execute on function public.admin_confirm_media_rights(uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.admin_replace_website_media(uuid, uuid) to authenticated;
grant execute on function public.admin_website_overview() to authenticated;
grant execute on function public.admin_website_sitemap() to authenticated;
grant execute on function public.admin_global_quick_find(text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Public media metadata for website images (alt, caption, focal point)
-- ---------------------------------------------------------------------

create or replace function public.public_website_media(target_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', asset.id, 'alt_text', asset.alt_text, 'caption', asset.caption, 'width', asset.width, 'height', asset.height,
      'focal_x', asset.focal_x, 'focal_y', asset.focal_y, 'provenance_class', asset.provenance_class, 'mime_type', asset.mime_type
    ))
    from public.media_assets as asset
    where asset.id = any (coalesce(target_ids, '{}'::uuid[]))
      and cardinality(coalesce(target_ids, '{}'::uuid[])) <= 120
      and private.website_media_is_current(asset.id)
      and (private.website_media_is_published(asset.id) or private.content_media_is_published(asset.id))
  ), '[]'::jsonb);
$$;

create or replace function public.admin_website_media(target_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('website.read') or private.has_permission('content.read')) then
    raise exception using errcode = '42501', message = 'media metadata is not authorized';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', asset.id, 'alt_text', asset.alt_text, 'caption', asset.caption, 'width', asset.width, 'height', asset.height,
      'focal_x', asset.focal_x, 'focal_y', asset.focal_y, 'provenance_class', asset.provenance_class, 'mime_type', asset.mime_type,
      'ready', private.website_media_is_current(asset.id), 'filename', asset.original_filename
    ))
    from public.media_assets as asset
    where asset.id = any (coalesce(target_ids, '{}'::uuid[]))
      and cardinality(coalesce(target_ids, '{}'::uuid[])) <= 120
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.public_website_media(uuid[]) from public, anon, authenticated;
revoke all on function public.admin_website_media(uuid[]) from public, anon, authenticated;
grant execute on function public.public_website_media(uuid[]) to anon, authenticated;
grant execute on function public.admin_website_media(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- CR1 detail reads for the existing service / project editors
-- ---------------------------------------------------------------------

create or replace function public.admin_get_service_details(target_id uuid)
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
    raise exception using errcode = '42501', message = 'service detail is not authorized';
  end if;
  select jsonb_build_object(
    'positioning', l.positioning,
    'sub_services', l.sub_services,
    'use_cases', l.use_cases,
    'process_steps', l.process_steps,
    'coordination', l.coordination,
    'faqs', l.faqs,
    'localization_version', l.version,
    'hero_asset_id', s.hero_asset_id,
    'has_draft_changes', s.publication_status = 'published' and private.content_has_draft_changes('service', s.id)
  )
  into result
  from public.services as s
  join public.service_localizations as l on l.service_id = s.id and l.locale = 'en'
  where s.id = target_id;
  return result;
end;
$$;

create or replace function public.admin_get_project_presentation(target_id uuid)
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
  select jsonb_build_object(
    'evidence_class', p.evidence_class,
    'layout_hint', p.layout_hint,
    'home_featured', p.home_featured,
    'materials', p.materials,
    'tags', p.tags,
    'version', p.version,
    'has_draft_changes', p.publication_status = 'published' and private.content_has_draft_changes('project', p.id)
  )
  into result
  from public.projects as p
  where p.id = target_id;
  return result;
end;
$$;

revoke all on function public.admin_get_service_details(uuid) from public, anon, authenticated;
revoke all on function public.admin_get_project_presentation(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_service_details(uuid) to authenticated;
grant execute on function public.admin_get_project_presentation(uuid) to authenticated;
