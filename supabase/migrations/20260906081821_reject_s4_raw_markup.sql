-- S4 senior-review hardening: structured public content is data, never HTML.
-- The original guard rejected executable tags but could still admit benign-looking
-- markup such as <strong>. Reject markup delimiters at the database boundary so a
-- future renderer never inherits an accidental HTML contract.

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
    return scalar !~ '[<>]'
      and scalar !~* '(javascript|vbscript)\s*:'
      and scalar !~* 'data\s*:\s*(text/html|application/javascript)'
      and scalar !~* 'on[a-z]+\s*=';
  end if;

  return true;
end;
$$;

revoke all on function private.content_json_is_safe(jsonb) from public, anon, authenticated;

-- Plain public copy follows the same data-only contract as structured JSON.
-- Do not reject harmless prose such as "Data: reviewed"; only reject markup
-- delimiters and executable-protocol/event-handler forms.
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
    and value !~* '(javascript|vbscript)\s*:'
    and value !~* 'data\s*:\s*(text/html|application/javascript)'
    and value !~* 'on[a-z]+\s*='
  );
$$;

revoke all on function private.safe_public_text(text) from public, anon, authenticated;

-- Backslashes and partially decoded percent escapes can be interpreted as a
-- different authority/path by URL consumers. S4 has no public route registry
-- yet, so internal navigation fails closed on both until S6 owns that contract.
create or replace function private.validate_navigation_item_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.link_type = 'internal' then
    if new.internal_path !~ '^/(?!/)[^[:space:]<>"'']*$'
       or new.internal_path ~ '[[:cntrl:]]'
       or new.internal_path ~ '%'
       or position(chr(92) in new.internal_path) > 0
       or new.internal_path ~* '^/(admin|preview)(/|$|\?|#)'
       or new.internal_path ~* 'javascript\s*:' then
      raise check_violation using message = 'internal navigation path is unsafe';
    end if;
  elsif new.link_type = 'external' then
    if new.external_url !~* '^https://[^[:space:]/@<>"'']+(?::[0-9]{1,5})?(?:/[^[:space:]<>"'']*)?$'
       or new.external_url ~ '[[:cntrl:]]'
       or position(chr(92) in new.external_url) > 0
       or new.external_url ~* '^(javascript|data|file):' then
      raise check_violation using message = 'external navigation URL must be HTTPS and safe';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_navigation_item_trigger() from public, anon, authenticated;

alter table public.page_localizations
  drop constraint page_localizations_canonical_override_safe;

alter table public.page_localizations
  add constraint page_localizations_canonical_override_safe
  check (
    canonical_override is null
    or (
      canonical_override = btrim(canonical_override)
      and canonical_override ~* '^https://[^[:space:]/@<>"'']+(?::[0-9]{1,5})?(?:/[^[:space:]<>"'']*)?$'
      and position(chr(92) in canonical_override) = 0
    )
  );

comment on constraint page_localizations_canonical_override_safe on public.page_localizations is
  'Optional public canonical overrides must be trimmed absolute HTTPS URLs without userinfo, markup, backslashes, or whitespace.';

alter table public.page_localizations
  drop constraint page_localizations_path_not_blank;

alter table public.page_localizations
  add constraint page_localizations_path_not_blank
  check (
    path = btrim(path)
    and char_length(path) between 1 and 2000
    and path ~ '^/(?!/)[^[:space:]<>"'']*$'
    and path !~ '[[:cntrl:]?#%]'
    and position(chr(92) in path) = 0
    and path !~* '^/(admin|preview)(/|$)'
  );

comment on constraint page_localizations_path_not_blank on public.page_localizations is
  'Public page paths are single-root, literal internal paths without private namespaces, query/fragment data, encoded ambiguity, markup, controls, or backslashes.';

create or replace function private.public_https_url_is_safe(value text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  return value is not null
    and value = btrim(value)
    and value <> ''
    and char_length(value) <= 2000
    and value !~ '[[:cntrl:]]'
    and position(chr(92) in value) = 0
    and value ~* '^https://[^[:space:]/@<>"'']+(?::[0-9]{1,5})?(?:/[^[:space:]<>"'']*)?$';
end;
$$;

create or replace function private.public_content_href_is_safe(value text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if value is null
     or value <> btrim(value)
     or value = ''
     or char_length(value) > 2000
     or value ~ '[[:space:][:cntrl:]<>]'
     or position(chr(92) in value) > 0 then
    return false;
  end if;

  if value ~ '^/(?!/)' then
    return value !~ '%'
      and value !~* '^/(admin|preview)(/|$|\?|#)';
  end if;

  return private.public_https_url_is_safe(value);
end;
$$;

create or replace function private.content_blocks_are_valid(payload jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  block jsonb;
  item jsonb;
  block_type text;
begin
  if payload is null
     or jsonb_typeof(payload) <> 'array'
     or jsonb_array_length(payload) > 128 then
    return false;
  end if;

  for block in select value from jsonb_array_elements(payload)
  loop
    if jsonb_typeof(block) <> 'object'
       or not private.content_json_is_safe(block)
       or jsonb_typeof(block->'type') <> 'string' then
      return false;
    end if;

    block_type := block->>'type';

    if block_type = 'heading' then
      if (select count(*) from jsonb_object_keys(block)) <> 3
         or not (block ?& array['type', 'level', 'text'])
         or block->'level' not in ('2'::jsonb, '3'::jsonb)
         or jsonb_typeof(block->'text') <> 'string'
         or not private.safe_public_text(block->>'text')
         or char_length(block->>'text') not between 1 and 4000 then
        return false;
      end if;
    elsif block_type = 'paragraph' then
      if (select count(*) from jsonb_object_keys(block)) <> 2
         or not (block ?& array['type', 'text'])
         or jsonb_typeof(block->'text') <> 'string'
         or not private.safe_public_text(block->>'text')
         or char_length(block->>'text') not between 1 and 4000 then
        return false;
      end if;
    elsif block_type = 'list' then
      if (select count(*) from jsonb_object_keys(block)) <> 2
         or not (block ?& array['type', 'items'])
         or jsonb_typeof(block->'items') <> 'array'
         or jsonb_array_length(block->'items') not between 1 and 32 then
        return false;
      end if;

      for item in select value from jsonb_array_elements(block->'items')
      loop
        if jsonb_typeof(item) <> 'string'
           or not private.safe_public_text(item #>> '{}')
           or char_length(item #>> '{}') not between 1 and 4000 then
          return false;
        end if;
      end loop;
    elsif block_type = 'link' then
      if (select count(*) from jsonb_object_keys(block)) <> 3
         or not (block ?& array['type', 'label', 'href'])
         or jsonb_typeof(block->'label') <> 'string'
         or not private.safe_public_text(block->>'label')
         or char_length(block->>'label') not between 1 and 4000
         or jsonb_typeof(block->'href') <> 'string'
         or not private.public_content_href_is_safe(block->>'href') then
        return false;
      end if;
    else
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function private.public_https_url_is_safe(text) from public, anon, authenticated;
revoke all on function private.public_content_href_is_safe(text) from public, anon, authenticated;
revoke all on function private.content_blocks_are_valid(jsonb) from public, anon, authenticated;

create or replace function private.validate_content_json_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.content_blocks_are_valid(new.body_blocks) then
    raise check_violation using message = 'structured content does not match the approved block registry';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_content_json_trigger() from public, anon, authenticated;

create or replace function private.validate_page_section_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  registry_scope text;
  parent_template text;
begin
  select registry.scope
    into registry_scope
    from public.content_section_registry as registry
   where registry.key = new.section_type
     and registry.enabled;

  if registry_scope is null then
    raise check_violation using message = 'page section type is not in the approved registry';
  end if;

  select page.template_key
    into parent_template
    from public.site_pages as page
   where page.id = new.page_id;

  if parent_template is null then
    raise foreign_key_violation using message = 'page section parent does not exist';
  end if;

  if registry_scope = 'homepage' and parent_template <> 'home' then
    raise check_violation using message = 'homepage sections belong only to the home template';
  end if;

  if registry_scope = 'page' and parent_template = 'home' then
    raise check_violation using message = 'page-only sections cannot be used by the home template';
  end if;

  if new.config <> '{}'::jsonb then
    raise check_violation using message = 'page section configuration has no admitted S4 schema';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_page_section_trigger() from public, anon, authenticated;

create or replace function private.validate_public_setting_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  registry public.public_setting_registry%rowtype;
begin
  select * into registry
  from public.public_setting_registry
  where namespace = new.namespace and key = new.key;

  if not found then
    raise check_violation using message = 'setting is not in the public allow-list';
  end if;

  if (registry.value_type = 'string' and jsonb_typeof(new.value) <> 'string')
     or (registry.value_type = 'boolean' and jsonb_typeof(new.value) <> 'boolean')
     or (registry.value_type = 'number' and jsonb_typeof(new.value) <> 'number')
     or (
       registry.value_type = 'url'
       and (
         jsonb_typeof(new.value) <> 'string'
         or not private.public_https_url_is_safe(new.value #>> '{}')
       )
     ) then
    raise check_violation using message = 'setting value does not match its registered public type';
  end if;

  if new.public_status = 'eligible' then
    if not registry.public_allowed then
      raise check_violation using message = 'setting is not allow-listed for public exposure';
    end if;
    if registry.requires_evidence
       and (new.evidence_id is null or new.reviewed_by is null or new.reviewed_at is null) then
      raise check_violation using message = 'public setting requires verified evidence and review';
    end if;
  end if;

  if not private.content_json_is_safe(new.value) then
    raise check_violation using message = 'setting contains executable or raw markup';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_public_setting_trigger() from public, anon, authenticated;

comment on function private.content_blocks_are_valid(jsonb) is
  'S4 exact structured-content registry: heading, paragraph, list, and link blocks only.';
comment on function private.validate_page_section_trigger() is
  'S4 owner-evaluated page-section guard: enabled registry membership, scope, parent template, and empty-until-versioned config are mandatory.';
comment on function private.validate_public_setting_trigger() is
  'S4 owner-evaluated public-setting guard: registry membership, exact value type, URL safety, review, and safe content are mandatory.';

-- Preserve the public command's stable invalid_url response for values that
-- the strengthened trigger would otherwise reject as a transport error.
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
  if registry.value_type = 'url'
     and (
       jsonb_typeof(target_value) <> 'string'
       or not private.public_https_url_is_safe(target_value #>> '{}')
     ) then
    return jsonb_build_object(
      'ok', false,
      'reasons', jsonb_build_array(private.failure('invalid_url', 'value', 'Public URL settings must use an unambiguous HTTPS URL.'))
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
  if next_public_status = 'eligible'
     and registry.requires_evidence
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

revoke all on function public.update_public_site_setting(text, text, jsonb, integer, text, uuid, timestamptz)
  from public, anon;
grant execute on function public.update_public_site_setting(text, text, jsonb, integer, text, uuid, timestamptz)
  to authenticated;

comment on function public.update_public_site_setting(text, text, jsonb, integer, text, uuid, timestamptz) is
  'S4 allow-listed public-setting update. Requires website.manage, AAL2, optimistic version, exact type, strict HTTPS URLs, safe JSON, and current evidence when required.';

-- Publication readiness is the shared boundary for both RPCs and public RLS
-- projections. Validate only fields that can cross that boundary; private
-- notes and source material remain outside this content predicate.
create or replace function private.public_content_record_is_safe(content_type text, target_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  case content_type
    when 'service' then
      return not exists (
        select 1
        from public.service_localizations as localization
        where localization.service_id = target_id
          and localization.locale = 'en'
          and not private.content_json_is_safe(jsonb_build_array(
            localization.slug, localization.name, localization.summary,
            localization.scope, localization.deliverables, localization.exclusions,
            localization.client_inputs, localization.delivery_wording,
            localization.body_blocks, localization.seo_title, localization.seo_description
          ))
      );
    when 'project' then
      return not exists (
        select 1
        from public.projects as project
        where project.id = target_id
          and not private.content_json_is_safe(jsonb_build_array(
            project.public_location, project.public_location_granularity,
            project.project_type, project.project_scope, project.renz_role,
            project.delivery_status
          ))
      ) and not exists (
        select 1
        from public.project_localizations as localization
        where localization.project_id = target_id
          and localization.locale = 'en'
          and not private.content_json_is_safe(jsonb_build_array(
            localization.slug, localization.title, localization.summary,
            localization.challenge, localization.approach, localization.solution,
            localization.outcomes, localization.seo_title, localization.seo_description
          ))
      );
    when 'post' then
      return not exists (
        select 1
        from public.post_localizations as localization
        where localization.post_id = target_id
          and localization.locale = 'en'
          and not private.content_json_is_safe(jsonb_build_array(
            localization.slug, localization.title, localization.excerpt,
            localization.body_blocks, localization.seo_title, localization.seo_description
          ))
      );
    when 'page' then
      return not exists (
        select 1
        from public.site_pages as page
        where page.id = target_id
          and not private.content_json_is_safe(jsonb_build_array(page.page_key, page.template_key))
      ) and not exists (
        select 1
        from public.page_localizations as localization
        where localization.page_id = target_id
          and localization.locale = 'en'
          and (
            not private.content_json_is_safe(jsonb_build_array(
              localization.title, localization.summary, localization.body_blocks,
              localization.seo_title, localization.seo_description
            ))
            or localization.path !~ '^/(?!/)[^[:space:]<>"'']*$'
            or localization.path ~ '[[:cntrl:]?#%]'
            or position(chr(92) in localization.path) > 0
            or localization.path ~* '^/(admin|preview)(/|$)'
            or (
              localization.canonical_override is not null
              and not private.public_https_url_is_safe(localization.canonical_override)
            )
          )
      );
    when 'team_member' then
      return not exists (
        select 1
        from public.team_member_localizations as localization
        where localization.team_member_id = target_id
          and localization.locale = 'en'
          and not private.content_json_is_safe(jsonb_build_array(
            localization.name, localization.role_label, localization.biography
          ))
      );
    when 'testimonial' then
      return not exists (
        select 1
        from public.testimonials as testimonial
        where testimonial.id = target_id
          and not private.content_json_is_safe(jsonb_build_array(
            testimonial.attribution_name, testimonial.attribution_role,
            testimonial.attribution_organization, testimonial.attribution_mode
          ))
      ) and not exists (
        select 1
        from public.testimonial_localizations as localization
        where localization.testimonial_id = target_id
          and localization.locale = 'en'
          and not private.content_json_is_safe(jsonb_build_array(
            localization.quote, localization.attribution_presentation
          ))
      );
    when 'credential' then
      return not exists (
        select 1
        from public.credentials as credential
        where credential.id = target_id
          and not private.content_json_is_safe(jsonb_build_array(
            credential.issuer, credential.reference
          ))
      ) and not exists (
        select 1
        from public.credential_localizations as localization
        where localization.credential_id = target_id
          and localization.locale = 'en'
          and not private.content_json_is_safe(jsonb_build_array(
            localization.name, localization.description
          ))
      ) and not exists (
        select 1
        from public.credential_verifications as verification
        where verification.credential_id = target_id
          and not private.content_json_is_safe(to_jsonb(verification.approved_public_wording))
      );
    else
      return false;
  end case;
end;
$$;

create or replace function private.publication_failures(content_type text, target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb;
begin
  case content_type
    when 'service' then failures := private.service_publication_failures(target_id);
    when 'project' then failures := private.project_publication_failures(target_id);
    when 'post' then failures := private.post_publication_failures(target_id);
    when 'page' then failures := private.page_publication_failures(target_id);
    when 'team_member' then failures := private.team_member_publication_failures(target_id);
    when 'testimonial' then failures := private.testimonial_publication_failures(target_id);
    when 'credential' then failures := private.credential_publication_failures(target_id);
    else
      return jsonb_build_array(
        private.failure('unsupported_content_type', 'content_type', 'Content type is not admitted.')
      );
  end case;

  if not private.public_content_record_is_safe(content_type, target_id)
     and not exists (
       select 1
       from jsonb_array_elements(failures) as reason
       where reason->>'code' = 'unsafe_content'
     ) then
    failures := failures || jsonb_build_array(
      private.failure(
        'unsafe_content',
        'content',
        'Public content must be plain text or an approved structured block.'
      )
    );
  end if;

  return failures;
end;
$$;

-- A navigation menu publishes as one unit. Every visible item must resolve to
-- an admitted public destination and have safe English presentation text.
create or replace function private.navigation_publication_failures(target_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  failures jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.navigation_menus where id = target_id) then
    return jsonb_build_array(
      private.failure('not_found', 'navigation_menu', 'Navigation menu does not exist.')
    );
  end if;

  if not exists (
    select 1
    from public.navigation_items as item
    join public.navigation_item_localizations as localization
      on localization.navigation_item_id = item.id
    where item.menu_id = target_id
      and item.visibility is distinct from 'hidden'
      and localization.locale = 'en'
  ) or exists (
    select 1
    from public.navigation_items as item
    where item.menu_id = target_id
      and item.visibility is distinct from 'hidden'
      and not exists (
        select 1
        from public.navigation_item_localizations as localization
        where localization.navigation_item_id = item.id
          and localization.locale = 'en'
      )
  ) then
    failures := failures || jsonb_build_array(
      private.failure(
        'missing_required_field',
        'navigation_items',
        'Every visible public navigation item needs reviewed English text.'
      )
    );
  end if;

  if exists (
    select 1
    from public.navigation_items as item
    where item.menu_id = target_id
      and item.visibility is distinct from 'hidden'
      and (
        (item.link_type = 'external' and not private.public_https_url_is_safe(item.external_url))
        or (
          item.link_type = 'internal'
          and (
            item.internal_path !~ '^/(?!/)[^[:space:]<>"'']*$'
            or item.internal_path ~ '[[:cntrl:]%]'
            or position(chr(92) in item.internal_path) > 0
            or item.internal_path ~* '^/(admin|preview)(/|$|\?|#)'
            or (
              item.internal_path not in (
                '/', '/expertise', '/projects', '/about', '/insights',
                '/contact', '/start-a-project', '/privacy', '/terms'
              )
              and not exists (
                select 1
                from public.page_localizations as localization
                join public.site_pages as page on page.id = localization.page_id
                where localization.path = item.internal_path
                  and localization.locale = 'en'
                  and private.is_public_content('page', page.id)
              )
            )
          )
        )
      )
  ) then
    failures := failures || jsonb_build_array(
      private.failure('invalid_url', 'navigation_items', 'Navigation contains an unsafe, private, or unpublished target.')
    );
  end if;

  if exists (
    select 1
    from public.navigation_items as item
    join public.navigation_item_localizations as localization
      on localization.navigation_item_id = item.id
    where item.menu_id = target_id
      and item.visibility is distinct from 'hidden'
      and localization.locale = 'en'
      and not private.content_json_is_safe(jsonb_build_array(
        localization.label, localization.accessibility_text
      ))
  ) then
    failures := failures || jsonb_build_array(
      private.failure('unsafe_content', 'navigation_items', 'Navigation labels must be plain text.')
    );
  end if;

  if exists (
    select 1
    from public.navigation_evidence as link
    where link.navigation_menu_id = target_id
      and link.required
      and not private.evidence_is_current(link.evidence_id)
  ) or not exists (
    select 1
    from public.navigation_evidence
    where navigation_menu_id = target_id and required
  ) then
    failures := failures || jsonb_build_array(
      private.failure('missing_verification', 'evidence', 'Navigation publication requires reviewed evidence.')
    );
  end if;

  return failures;
end;
$$;

-- Public media usage requires both an eligible asset and a currently
-- publishable parent project. This prevents pre-publication metadata leakage.
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
      and private.content_json_is_safe(jsonb_build_array(
        usage.role, usage.phase, usage.credit, usage.focal_point
      ))
      and exists (
        select 1
        from public.projects as project
        where project.id = usage.project_id
          and private.is_public_content('project', project.id)
      )
      and exists (
        select 1
        from public.project_media_localizations as localization
        where localization.project_media_id = usage.id
          and localization.locale = 'en'
          and private.content_json_is_safe(jsonb_build_array(
            localization.alt_text, localization.caption
          ))
          and (usage.decorative or btrim(localization.alt_text) <> '')
      )
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
      and claim.approved_public_wording is not null
      and btrim(claim.approved_public_wording) <> ''
      and private.content_json_is_safe(to_jsonb(claim.approved_public_wording))
      and (claim.review_due_at is null or claim.review_due_at >= now())
      and exists (
        select 1
        from public.claim_evidence as link
        where link.claim_id = claim.id
          and (not link.required or private.evidence_is_current(link.evidence_id))
      )
  );
$$;

create or replace function private.is_public_setting(target_namespace text, target_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.public_site_settings as setting
    join public.public_setting_registry as registry
      on registry.namespace = setting.namespace and registry.key = setting.key
    where setting.namespace = target_namespace
      and setting.key = target_key
      and setting.public_status = 'eligible'
      and registry.public_allowed
      and private.content_json_is_safe(setting.value)
      and (
        (registry.value_type = 'string' and jsonb_typeof(setting.value) = 'string')
        or (registry.value_type = 'boolean' and jsonb_typeof(setting.value) = 'boolean')
        or (registry.value_type = 'number' and jsonb_typeof(setting.value) = 'number')
        or (
          registry.value_type = 'url'
          and jsonb_typeof(setting.value) = 'string'
          and private.public_https_url_is_safe(setting.value #>> '{}')
        )
      )
      and (
        not registry.requires_evidence
        or (
          setting.evidence_id is not null
          and private.evidence_is_current(setting.evidence_id)
          and setting.reviewed_by is not null
          and setting.reviewed_at is not null
          and (setting.review_due_at is null or setting.review_due_at >= now())
        )
      )
  );
$$;

revoke all on function private.public_content_record_is_safe(text, uuid) from public, anon, authenticated;
revoke all on function private.publication_failures(text, uuid) from public, anon, authenticated;
revoke all on function private.navigation_publication_failures(uuid) from public, anon, authenticated;
revoke all on function private.claim_is_current(uuid) from public, anon, authenticated;

-- This boolean-only predicate is evaluated by the anonymous media RLS policy.
-- It reveals no row data and is the sole private helper grant restored here.
grant execute on function private.is_public_media_usage(uuid) to anon, authenticated;

comment on function private.public_content_record_is_safe(text, uuid) is
  'Checks only fields admitted to S4 public content projections; raw markup and executable protocol text fail closed.';
comment on function private.is_public_media_usage(uuid) is
  'True only for safe English metadata on eligible media attached to a currently publishable project.';
