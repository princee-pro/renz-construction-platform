-- RENZ Phase 1 / S5A: narrow, AAL2-gated administration facades for Services.
--
-- The S4 editorial tables remain default-deny. These functions expose only the
-- fields and commands required by the Services workspace; authenticated users
-- never receive generic table mutation privileges.

create index services_admin_updated_idx
  on public.services (updated_at desc, id desc);

create or replace function public.admin_service_overview()
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
    raise exception using errcode = '42501', message = 'service overview is not authorized';
  end if;

  select jsonb_build_object(
    'draft', count(*) filter (where service.publication_status = 'draft'),
    'published', count(*) filter (where service.publication_status = 'published'),
    'archived', count(*) filter (where service.publication_status = 'archived'),
    'blocked', count(*) filter (
      where service.publication_status = 'draft'
        and private.service_publication_failures(service.id) <> '[]'::jsonb
    ),
    'evidence', jsonb_build_object(
      'unverified', (
        select count(distinct evidence.id)
        from public.service_evidence as link
        join public.evidence_records as evidence on evidence.id = link.evidence_id
        where evidence.verification_state = 'unverified'
      ),
      'in_review', (
        select count(distinct evidence.id)
        from public.service_evidence as link
        join public.evidence_records as evidence on evidence.id = link.evidence_id
        where evidence.verification_state = 'in_review'
      ),
      'verified', (
        select count(distinct evidence.id)
        from public.service_evidence as link
        join public.evidence_records as evidence on evidence.id = link.evidence_id
        where evidence.verification_state = 'verified'
          and (evidence.review_due_at is null or evidence.review_due_at >= now())
      ),
      'attention', (
        select count(distinct evidence.id)
        from public.service_evidence as link
        join public.evidence_records as evidence on evidence.id = link.evidence_id
        where evidence.verification_state in ('expired', 'rejected')
          or (evidence.review_due_at is not null and evidence.review_due_at < now())
      )
    )
  )
  into result
  from public.services as service;

  return result;
end;
$$;

create or replace function public.admin_list_services(
  search_query text default null,
  status_filter text default null,
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
    raise exception using errcode = '42501', message = 'service list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'service page size is outside the admitted range';
  end if;
  if status_filter is not null and status_filter not in ('draft', 'published', 'archived') then
    raise exception using errcode = '22023', message = 'service status filter is not admitted';
  end if;
  if locale_filter is not null
     and locale_filter !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$' then
    raise exception using errcode = '22023', message = 'service locale filter is not admitted';
  end if;
  if normalized_query is not null and char_length(normalized_query) > 100 then
    raise exception using errcode = '22023', message = 'service search query is too long';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'service cursor is incomplete';
  end if;

  for item in
    select
      service.id,
      service.publication_status,
      service.updated_at,
      service.version,
      service.featured,
      localization.locale,
      localization.name,
      localization.slug,
      private.service_publication_failures(service.id) as failures
    from public.services as service
    join lateral (
      select
        candidate.locale,
        candidate.name,
        candidate.slug
      from public.service_localizations as candidate
      where candidate.service_id = service.id
        and (locale_filter is null or candidate.locale = locale_filter)
        and (
          normalized_query is null
          or strpos(lower(candidate.name), lower(normalized_query)) > 0
          or strpos(lower(candidate.slug), lower(normalized_query)) > 0
        )
      order by
        case when candidate.locale = 'en' then 0 else 1 end,
        candidate.locale asc
      limit 1
    ) as localization on true
    where (status_filter is null or service.publication_status = status_filter)
      and (
        cursor_updated_at is null
        or (service.updated_at, service.id) < (cursor_updated_at, cursor_id)
      )
    order by service.updated_at desc, service.id desc
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
      'locale', item.locale,
      'name', item.name,
      'slug', item.slug,
      'readiness', case when item.failures = '[]'::jsonb then 'ready' else 'blocked' end,
      'blocker_count', jsonb_array_length(item.failures)
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

create or replace function public.admin_get_service(
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
    raise exception using errcode = '42501', message = 'service detail is not authorized';
  end if;
  if target_locale is null
     or target_locale !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$' then
    raise exception using errcode = '22023', message = 'service locale is not admitted';
  end if;

  select jsonb_build_object(
    'service', jsonb_build_object(
      'id', service.id,
      'publication_status', service.publication_status,
      'published_at', service.published_at,
      'sort_order', service.sort_order,
      'featured', service.featured,
      'created_at', service.created_at,
      'updated_at', service.updated_at,
      'version', service.version
    ),
    'localization', (
      select jsonb_build_object(
        'locale', localization.locale,
        'slug', localization.slug,
        'name', localization.name,
        'summary', localization.summary,
        'body_blocks', localization.body_blocks,
        'schema_version', localization.schema_version,
        'seo_title', localization.seo_title,
        'seo_description', localization.seo_description,
        'scope', localization.scope,
        'deliverables', localization.deliverables,
        'exclusions', localization.exclusions,
        'client_inputs', localization.client_inputs,
        'delivery_wording', localization.delivery_wording,
        'professional_terminology', localization.professional_terminology,
        'version', localization.version
      )
      from public.service_localizations as localization
      where localization.service_id = service.id
        and localization.locale = target_locale
    ),
    'available_locales', coalesce((
      select jsonb_agg(localization.locale order by localization.locale)
      from public.service_localizations as localization
      where localization.service_id = service.id
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
      from public.service_evidence as link
      join public.evidence_records as evidence on evidence.id = link.evidence_id
      where link.service_id = service.id
    ), '[]'::jsonb),
    'readiness', jsonb_build_object(
      'ready', private.service_publication_failures(service.id) = '[]'::jsonb,
      'reasons', private.service_publication_failures(service.id)
    )
  )
  into result
  from public.services as service
  where service.id = target_id;

  return result;
end;
$$;

create or replace function public.create_admin_service_draft(
  target_locale text,
  target_slug text,
  target_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_id uuid;
begin
  if not private.has_permission('content.write') then
    raise exception using errcode = '42501', message = 'service creation is not authorized';
  end if;
  if target_locale is null
     or target_slug is null
     or target_name is null
     or target_locale !~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'
     or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(target_slug) > 120
     or char_length(btrim(target_name)) not between 1 and 160
     or not private.safe_public_text(btrim(target_name)) then
    raise exception using errcode = '22023', message = 'service draft fields are invalid';
  end if;

  insert into public.services (created_by, updated_by)
  values (auth.uid(), auth.uid())
  returning id into service_id;

  insert into public.service_localizations (
    service_id, locale, slug, name, created_by, updated_by
  ) values (
    service_id, target_locale, target_slug, btrim(target_name), auth.uid(), auth.uid()
  );

  perform private.s4_audit(
    'service.create', 'service', service_id::text, 'success',
    jsonb_build_object(
      'locale', target_locale,
      'version', 1,
      'localization_version', 1,
      'changed_keys', jsonb_build_array('locale', 'slug', 'name')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'id', service_id,
    'version', 1,
    'localization_version', 1
  );
end;
$$;

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
  if current_service.publication_status <> 'draft' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'publication_status', 'Only draft services can be edited.'))
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

create or replace function public.create_service_evidence(
  target_service_id uuid,
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
    raise exception using errcode = '42501', message = 'service evidence creation is not authorized';
  end if;
  if target_service_id is null
     or fact_claim is null
     or source_type is null
     or source_reference is null
     or sensitivity is null
     or consent_required is null
     or required is null
     or not exists (select 1 from public.services where id = target_service_id)
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
    raise exception using errcode = '22023', message = 'service evidence fields are invalid';
  end if;

  insert into public.evidence_records (
    fact_claim, source_type, source_reference, sensitivity,
    consent_required, consent_state, owner_id, created_by, updated_by
  ) values (
    btrim(fact_claim), source_type, btrim(source_reference), sensitivity,
    consent_required, case when consent_required then 'pending' else 'not_required' end,
    auth.uid(), auth.uid(), auth.uid()
  ) returning id into evidence_id;

  insert into public.service_evidence (service_id, evidence_id, required, purpose)
  values (target_service_id, evidence_id, required, nullif(btrim(purpose), ''));

  perform private.s4_audit(
    'evidence.create', 'evidence', evidence_id::text, 'success',
    jsonb_build_object(
      'content_type', 'service',
      'content_id', target_service_id,
      'source_type', source_type,
      'sensitivity', sensitivity,
      'required', required
    )
  );

  return jsonb_build_object('ok', true, 'id', evidence_id, 'version', 1);
end;
$$;

create or replace function public.submit_service_evidence_for_review(
  target_service_id uuid,
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
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.'))
    );
  end if;
  if target_service_id is null
     or target_evidence_id is null
     or expected_version is null
     or expected_version < 1 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Evidence command is invalid.'))
    );
  end if;
  if not exists (
    select 1 from public.service_evidence
    where service_id = target_service_id and evidence_id = target_evidence_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Linked service evidence does not exist.'))
    );
  end if;

  select evidence_record.verification_state, evidence_record.version
  into evidence
  from public.evidence_records as evidence_record
  where evidence_record.id = target_evidence_id
  for update;
  if evidence.version <> expected_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', evidence.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer evidence version is available.'))
    );
  end if;
  if evidence.verification_state not in ('unverified', 'expired', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'verification_state', 'Evidence is not awaiting submission.'))
    );
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
    jsonb_build_object('content_type', 'service', 'content_id', target_service_id, 'version', expected_version + 1)
  );
  return jsonb_build_object('ok', true, 'id', target_evidence_id, 'version', expected_version + 1, 'state', 'in_review');
end;
$$;

create or replace function public.review_service_evidence(
  target_service_id uuid,
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
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'claims.verify is required.'))
    );
  end if;
  if target_service_id is null
     or target_evidence_id is null
     or expected_version is null
     or expected_version < 1 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_input', null, 'Evidence review command is invalid.'))
    );
  end if;
  if next_state is null or next_state not in ('verified', 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'next_state', 'Review may only verify or reject evidence.'))
    );
  end if;
  if not exists (
    select 1 from public.service_evidence
    where service_id = target_service_id and evidence_id = target_evidence_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Linked service evidence does not exist.'))
    );
  end if;

  select evidence.verification_state, evidence.version
  into current_state, current_version
  from public.evidence_records as evidence
  where evidence.id = target_evidence_id
  for update;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'evidence', 'Evidence does not exist.'))
    );
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false,
      'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer evidence version is available.'))
    );
  end if;
  if current_state <> 'in_review' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'verification_state', 'Only evidence in review may receive a review decision.'))
    );
  end if;

  return public.transition_evidence(
    target_evidence_id,
    expected_version,
    next_state,
    next_approved_public_wording,
    next_consent_state,
    next_review_due_at
  );
end;
$$;

revoke all on function public.admin_service_overview() from public, anon, authenticated;
revoke all on function public.admin_list_services(text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_service(uuid, text) from public, anon, authenticated;
revoke all on function public.create_admin_service_draft(text, text, text) from public, anon, authenticated;
revoke all on function public.update_admin_service_draft(uuid, integer, integer, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.create_service_evidence(uuid, text, text, text, text, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.submit_service_evidence_for_review(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.review_service_evidence(uuid, uuid, integer, text, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.admin_service_overview() to authenticated;
grant execute on function public.admin_list_services(text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_get_service(uuid, text) to authenticated;
grant execute on function public.create_admin_service_draft(text, text, text) to authenticated;
grant execute on function public.update_admin_service_draft(uuid, integer, integer, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, integer, boolean) to authenticated;
grant execute on function public.create_service_evidence(uuid, text, text, text, text, boolean, boolean, text) to authenticated;
grant execute on function public.submit_service_evidence_for_review(uuid, uuid, integer) to authenticated;
grant execute on function public.review_service_evidence(uuid, uuid, integer, text, text, text, timestamptz) to authenticated;

comment on function public.admin_list_services(text, text, text, timestamptz, uuid, integer) is
  'S5A bounded keyset-paginated Services register. Requires fresh AAL2 content.read.';
comment on function public.admin_get_service(uuid, text) is
  'S5A explicit Services editor payload with evidence and authoritative publication readiness.';
comment on function public.update_admin_service_draft(uuid, integer, integer, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, integer, boolean) is
  'S5A draft-only service update with dual optimistic versions and redacted changed-key audit metadata.';
