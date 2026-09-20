-- S4: narrow, evidence-aware public-setting mutation.
--
-- Settings are an editorial boundary, not a generic JSON key/value store.
-- This command updates an existing allow-listed row only; creation and
-- broader website configuration remain an S5-owned workflow.

alter table public.media_assets
  add constraint media_assets_s4_media_kind_check
    check (media_kind in ('image', 'video')),
  add constraint media_assets_s4_provenance_class_check
    check (provenance_class in ('client_original', 'client_derivative', 'concept_demo', 'generated_reference', 'synthetic_test')),
  add constraint media_assets_s4_storage_state_check
    check (storage_state in ('registered', 'uploaded', 'ready_private', 'promotion_pending', 'public_eligible', 'archived')),
  add constraint media_assets_s4_rights_status_check
    check (rights_status in ('unknown', 'in_review', 'cleared', 'expired', 'rejected')),
  add constraint media_assets_s4_public_use_permission_check
    check (public_use_permission in ('not_granted', 'pending', 'granted', 'revoked')),
  add constraint media_assets_s4_consent_state_check
    check (consent_state in ('not_required', 'unknown', 'pending', 'granted', 'revoked'));

create or replace function public.update_public_site_setting(
  target_namespace text,
  target_key text,
  target_value jsonb,
  expected_version integer,
  next_public_status text default 'private',
  next_evidence_id uuid default null,
  next_review_due_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  registry public.public_setting_registry%rowtype;
  current_version integer;
begin
  if not private.has_permission('website.manage') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_authorized', null, 'website.manage is required.'))
    );
  end if;

  if expected_version is null or expected_version < 1 then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_version', 'expected_version', 'A positive expected version is required.'))
    );
  end if;

  if next_public_status not in ('private', 'eligible', 'archived') then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_state', 'next_public_status', 'Setting state is not admitted.'))
    );
  end if;

  select * into registry
    from public.public_setting_registry
   where namespace = target_namespace and key = target_key;
  if not found then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('unknown_setting', 'key', 'The setting is not in the public allow-list.'))
    );
  end if;

  if target_value is null or not private.content_json_is_safe(target_value) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('unsafe_content', 'value', 'Setting values must be safe structured data.'))
    );
  end if;

  if registry.value_type = 'string' and jsonb_typeof(target_value) <> 'string' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_value', 'value', 'This setting requires a string value.'))
    );
  end if;
  if registry.value_type = 'boolean' and jsonb_typeof(target_value) <> 'boolean' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_value', 'value', 'This setting requires a boolean value.'))
    );
  end if;
  if registry.value_type = 'number' and jsonb_typeof(target_value) <> 'number' then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_value', 'value', 'This setting requires a numeric value.'))
    );
  end if;
  if registry.value_type = 'url' and (
    jsonb_typeof(target_value) <> 'string'
    or (target_value #>> '{}') !~* '^https://[^\s<>]+$'
  ) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_url', 'value', 'Public URL settings must use HTTPS.'))
    );
  end if;

  select version into current_version
    from public.public_site_settings
   where namespace = target_namespace and key = target_key
   for update;
  if current_version is null then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_found', 'setting', 'The setting row does not exist.'))
    );
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'The setting changed before this command completed.'))
    );
  end if;

  if next_public_status = 'eligible' and not registry.public_allowed then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('not_public_allowed', 'key', 'This setting is not approved for public exposure.'))
    );
  end if;
  if next_public_status = 'eligible' and registry.requires_evidence
     and not private.evidence_is_current(next_evidence_id) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('missing_verification', 'evidence_id', 'Current verified evidence is required for this public setting.'))
    );
  end if;

  update public.public_site_settings
     set value = target_value,
         public_status = next_public_status,
         evidence_id = next_evidence_id,
         reviewed_by = case when next_public_status = 'eligible' then auth.uid() else null end,
         reviewed_at = case when next_public_status = 'eligible' then statement_timestamp() else null end,
         review_due_at = next_review_due_at,
         updated_by = auth.uid(),
         version = version + 1
   where namespace = target_namespace and key = target_key;

  perform private.s4_audit(
    'website.settings.update', 'public_setting', target_namespace || ':' || target_key,
    'success', jsonb_build_object('public_status', next_public_status, 'version', expected_version + 1)
  );
  return jsonb_build_object(
    'ok', true,
    'namespace', target_namespace,
    'key', target_key,
    'version', expected_version + 1,
    'public_status', next_public_status
  );
end;
$$;

grant execute on function public.update_public_site_setting(text, text, jsonb, integer, text, uuid, timestamptz)
  to authenticated;

comment on function public.update_public_site_setting(text, text, jsonb, integer, text, uuid, timestamptz) is
  'S4 allow-listed public-setting update. Requires website.manage, AAL2, optimistic version, safe JSON, and current evidence when required.';
