-- D1.7 — owner experience + portfolio expansion.
--
-- 1. A fourth evidence class, `context_study`: a concept designed for a named
--    Rwandan context ("Kigali context study") that is never claimed as built
--    RENZ work. It sits beside concept_study / experience_study; the same
--    promotion gate to real_project applies (no generated media may remain).
-- 2. Public wording: the footer/menu "Staff Login" entry (system navigation,
--    owner-editable label + note) and dynamic project-count copy on the
--    Projects page. Idempotent: pages are skipped when a revision with the
--    D1.7 summary exists.

alter table public.projects
  drop constraint if exists projects_evidence_class_check,
  add constraint projects_evidence_class_check
    check (evidence_class in ('real_project', 'concept_study', 'context_study', 'experience_study'));

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
  if target_evidence_class not in ('real_project', 'concept_study', 'context_study', 'experience_study')
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


-- The owner sitemap names the new class.
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
        'type', case p.evidence_class when 'real_project' then 'Project' when 'concept_study' then 'Concept study' when 'context_study' then 'Rwanda context concept study' else 'Experience study' end,
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


-- ---------------------------------------------------------------- COPY
create or replace function private.d17_rewrite_section(
  target_page text, target_order integer, target_type text, patch jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.website_page_sections as s
     set config = s.config || patch,
         version = s.version + 1,
         updated_at = now()
    from public.website_pages as p
   where p.id = s.page_id
     and p.page_key = target_page
     and s.sort_order = target_order
     and s.section_type = target_type;
end;
$$;

create or replace function private.d17_publish_page(target_page text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  next_no integer;
  snapshot jsonb;
  revision_id uuid;
begin
  select id into target_id from public.website_pages where page_key = target_page;
  if target_id is null then
    return;
  end if;
  if exists (
    select 1 from public.website_page_revisions as r
     where r.page_id = target_id and r.summary = 'D1.7 owner experience wording'
  ) then
    return;
  end if;
  update public.website_pages set version = version + 1 where id = target_id;
  select coalesce(max(r.revision_no), 0) + 1 into next_no
    from public.website_page_revisions as r
   where r.page_id = target_id;
  snapshot := private.website_page_snapshot(target_id);
  insert into public.website_page_revisions (page_id, revision_no, kind, summary, snapshot, media_ids)
  values (target_id, next_no, 'published', 'D1.7 owner experience wording', snapshot, private.website_snapshot_media_ids(snapshot))
  returning id into revision_id;
  update public.website_pages
     set status = 'published', published_revision_id = revision_id, published_at = now(), version = version + 1
   where id = target_id;
end;
$$;

select private.d17_rewrite_section('globals', 0, 'global_copy', '{
  "staff_signin_label": "Staff Login",
  "staff_signin_note": "RENZ team access"
}'::jsonb);
select private.d17_publish_page('globals');

select private.d17_rewrite_section('projects', 0, 'masthead', '{
  "title": "Explore {{projects.concept_count}} project studies.",
  "summary": "See how different building types can be planned for different places in Rwanda. These are concept studies with galleries and drawings, not completed RENZ projects.",
  "facts": [
    {"label": "Project studies", "value": "{{projects.concept_count}}"},
    {"label": "Case studies", "value": "{{projects.real_count}}"},
    {"label": "Labels", "value": "Every study is labelled"}
  ]
}'::jsonb);
select private.d17_rewrite_section('projects', 1, 'projects_index', '{
  "studies_heading": "{{projects.concept_count_words}} places, {{projects.concept_count_words_lower}} different answers.",
  "studies_intro": "Each study has a gallery, a set of drawings and a short story: the brief, the site, the challenge, the design, the structure, the construction plan, the materials and the final idea."
}'::jsonb);
select private.d17_publish_page('projects');

drop function private.d17_publish_page(text);
drop function private.d17_rewrite_section(text, integer, text, jsonb);
