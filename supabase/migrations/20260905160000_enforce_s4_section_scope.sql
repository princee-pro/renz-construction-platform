-- S4 senior-review correction: enforce the registry scope independently from
-- the parent page template. The original guard validated registry membership
-- but reused one variable for both values, allowing a page-only section on a
-- homepage. This forward migration preserves the prior history and closes the
-- scope boundary without changing the approved section vocabulary.

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

  if not private.content_json_is_safe(new.config) then
    raise check_violation using message = 'page section configuration contains executable or raw markup';
  end if;

  return new;
end;
$$;

comment on function private.validate_page_section_trigger() is
  'S4 owner-evaluated page-section guard: enabled registry membership, registry scope, parent template, and safe config are mandatory.';
