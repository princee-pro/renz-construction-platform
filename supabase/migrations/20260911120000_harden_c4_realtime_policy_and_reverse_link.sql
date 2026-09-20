-- C4 hardening (forward-only):
--
-- 1. realtime_events RLS policy fix. The original policy evaluated
--    `private.has_aal2()` inline, but that helper is deliberately revoked
--    from `authenticated` (S3). Under a real `authenticated` session — which
--    is exactly the role Supabase Realtime impersonates when it applies RLS
--    to `postgres_changes` — the policy therefore raised "permission denied
--    for function has_aal2" and no staff session could ever receive a change
--    pointer. Surfaced by supabase/tests/database/012_c4_security_negative.sql.
--    The fix is a purpose-built SECURITY DEFINER predicate
--    (`private.is_active_aal2_staff()`), granted to `authenticated`, in the
--    same style as the S4 `private.is_public_*` projection helpers. It
--    exposes nothing but a boolean about the caller's own session.
--
-- 2. Public case study -> operational project reverse lookup facade for the
--    Case Studies editor ("Open operational project", C4 §56). Nothing on the
--    public `projects` table changes; the relationship stays a single named
--    FK on `operational_projects`.
--
-- 3. admin_get_project (S5C) is re-created to also return `project_scope` and
--    `renz_role`. The editor contract (src/features/projects/project-contract.ts)
--    requires both keys and the update facade already accepts them, but the
--    read facade never emitted them — every Case Studies editor load failed
--    schema validation. Surfaced by the C4 browser E2E when it opened the
--    editor from the Project Command Center. Body otherwise identical to S5C.

-- ---------------------------------------------------------------------
-- 1. Realtime policy predicate
-- ---------------------------------------------------------------------

create or replace function private.is_active_aal2_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and private.has_aal2()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.account_status = 'active'
    );
$$;

comment on function private.is_active_aal2_staff() is
  'RLS predicate: true only for the current session when it is an active staff profile at AAL2. Carries no data; safe to grant to authenticated.';

revoke all on function private.is_active_aal2_staff() from public, anon, authenticated;
grant execute on function private.is_active_aal2_staff() to authenticated;

drop policy if exists realtime_events_staff_select on public.realtime_events;
create policy realtime_events_staff_select
  on public.realtime_events for select to authenticated
  using (private.is_active_aal2_staff());

-- ---------------------------------------------------------------------
-- 2. Case study -> operational project reverse lookup
-- ---------------------------------------------------------------------
--
-- Authorization: callers without `operations.projects.read` receive `null`
-- (the same "omit, never deny" posture as `admin_global_quick_find`) so the
-- content editor keeps working for content-only staff without ever
-- revealing that an operational record exists.

create or replace function public.admin_get_operational_project_for_case_study(
  target_case_study_id uuid
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
  if target_case_study_id is null or not private.has_permission('operations.projects.read') then
    return null;
  end if;

  select jsonb_build_object(
    'id', project.id,
    'title', project.title,
    'status', project.status,
    'current_phase', project.current_phase,
    'priority', project.priority,
    'archived_at', project.archived_at
  )
  into result
  from public.operational_projects as project
  where project.public_case_study_id = target_case_study_id;

  return result;
end;
$$;

comment on function public.admin_get_operational_project_for_case_study(uuid) is
  'Case Studies editor reverse lookup: the operational project (if any) whose public representation is this case study. Null when unlinked or when the caller lacks operations.projects.read. Never exposes client identity.';

revoke all on function public.admin_get_operational_project_for_case_study(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_operational_project_for_case_study(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. admin_get_project: emit project_scope and renz_role
-- ---------------------------------------------------------------------

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
      'project_scope', project.project_scope,
      'renz_role', project.renz_role,
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

