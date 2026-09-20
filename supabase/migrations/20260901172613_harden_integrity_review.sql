-- Corrections from the independent S2 database review. These changes remain
-- structural only: no caller permissions, workflow roles, or public policies
-- are introduced here.

create or replace function private.touch_mutable_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.version is distinct from old.version + 1 then
    raise check_violation using
      message = 'Mutable records must increment version explicitly by one.';
  end if;

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

comment on function private.touch_mutable_row() is
  'Maintains updated_at and requires the mutation boundary to increment version explicitly for optimistic concurrency.';

alter table public.project_media
  drop constraint project_media_stage_fk;

alter table public.project_media
  add constraint project_media_stage_fk
  foreign key (stage_id, project_id)
  references public.project_stages (id, project_id)
  on delete no action
  deferrable initially deferred;

comment on constraint project_media_stage_fk on public.project_media is
  'Direct stage deletion remains blocked while referenced; deferred validation permits a whole project graph to cascade in one transaction.';

alter table public.testimonials
  add constraint testimonials_s2_claim_publication_guard
  check (publication_status <> 'published');

alter table public.credentials
  add constraint credentials_s2_claim_publication_guard
  check (publication_status <> 'published');

alter table public.page_sections
  add constraint page_sections_s2_enablement_guard
  check (not enabled);

comment on constraint testimonials_s2_claim_publication_guard on public.testimonials is
  'S2 cannot publish testimonials until a later approved evidence and approval workflow replaces this fail-closed guard.';

comment on constraint credentials_s2_claim_publication_guard on public.credentials is
  'S2 cannot publish credentials until a later approved evidence and approval workflow replaces this fail-closed guard.';

comment on constraint page_sections_s2_enablement_guard on public.page_sections is
  'S2 keeps unregistered section configurations disabled until the approved section-type registry exists.';

create or replace function private.enforce_lead_child_kind()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_lead_id uuid;
  previous_lead_id uuid;
  actual_kind text;
  expected_kind text;
begin
  target_lead_id := case when tg_op = 'DELETE' then old.lead_id else new.lead_id end;
  previous_lead_id := case when tg_op = 'UPDATE' then old.lead_id else target_lead_id end;

  perform 1
  from public.leads
  where leads.id in (target_lead_id, previous_lead_id)
  order by leads.id
  for update;

  select leads.kind
  into actual_kind
  from public.leads
  where leads.id = target_lead_id;

  if actual_kind is null then
    raise foreign_key_violation using message = 'Referenced lead does not exist.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and new.lead_id is distinct from old.lead_id then
    raise check_violation using
      message = 'Lead subtype ownership is immutable; replace it within the approved lead transaction.';
  end if;

  expected_kind := case tg_table_name
    when 'project_briefs' then 'project_brief'
    when 'contact_messages' then 'contact_message'
    else null
  end;

  if actual_kind <> expected_kind then
    raise check_violation using message = 'Lead subtype does not match lead kind.';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_finalized_lead_subtype()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_lead_id uuid;
  lead_kind text;
  lead_finalized_at timestamptz;
  brief_count integer;
  message_count integer;
begin
  if tg_table_name = 'leads' then
    if tg_op = 'DELETE' then
      target_lead_id := old.id;
    else
      target_lead_id := new.id;
    end if;
  elsif tg_op = 'DELETE' then
    target_lead_id := old.lead_id;
  else
    target_lead_id := new.lead_id;
  end if;

  select leads.kind, leads.finalized_at
  into lead_kind, lead_finalized_at
  from public.leads
  where leads.id = target_lead_id
  for update;

  if not found then
    return null;
  end if;

  select count(*) into brief_count
  from public.project_briefs
  where project_briefs.lead_id = target_lead_id;

  select count(*) into message_count
  from public.contact_messages
  where contact_messages.lead_id = target_lead_id;

  if (lead_kind = 'project_brief' and message_count <> 0)
    or (lead_kind = 'contact_message' and brief_count <> 0) then
    raise check_violation using message = 'Lead has a subtype that conflicts with its kind.';
  end if;

  if lead_finalized_at is not null and (
    (lead_kind = 'project_brief' and (brief_count <> 1 or message_count <> 0))
    or (lead_kind = 'contact_message' and (message_count <> 1 or brief_count <> 0))
  ) then
    raise check_violation using message = 'Finalized lead must have exactly one matching subtype.';
  end if;

  return null;
end;
$$;

drop trigger project_briefs_kind_check on public.project_briefs;
create trigger project_briefs_kind_check
before insert or update of lead_id on public.project_briefs
for each row execute function private.enforce_lead_child_kind();

create trigger project_briefs_delete_integrity_lock
before delete on public.project_briefs
for each row execute function private.enforce_lead_child_kind();

drop trigger contact_messages_kind_check on public.contact_messages;
create trigger contact_messages_kind_check
before insert or update of lead_id on public.contact_messages
for each row execute function private.enforce_lead_child_kind();

create trigger contact_messages_delete_integrity_lock
before delete on public.contact_messages
for each row execute function private.enforce_lead_child_kind();

comment on function private.enforce_lead_child_kind() is
  'Serializes subtype changes on the parent lead row before validating the structural kind.';

comment on function private.enforce_finalized_lead_subtype() is
  'Validates the finalized exactly-one-subtype invariant while holding the parent lead row lock.';

create function private.enforce_navigation_acyclic()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_menu_id uuid;
  cycle_found boolean;
begin
  previous_menu_id := case when tg_op = 'UPDATE' then old.menu_id else new.menu_id end;

  perform 1
  from public.navigation_menus
  where navigation_menus.id in (new.menu_id, previous_menu_id)
  order by navigation_menus.id
  for update;

  if new.parent_id is null then
    return new;
  end if;

  with recursive ancestors (id, parent_id) as (
    select navigation_items.id, navigation_items.parent_id
    from public.navigation_items
    where navigation_items.id = new.parent_id
      and navigation_items.menu_id = new.menu_id

    union

    select navigation_items.id, navigation_items.parent_id
    from public.navigation_items
    join ancestors on navigation_items.id = ancestors.parent_id
    where navigation_items.menu_id = new.menu_id
  )
  select exists (
    select 1
    from ancestors
    where ancestors.id = new.id
  )
  into cycle_found;

  if cycle_found then
    raise check_violation using message = 'Navigation hierarchy cannot contain a cycle.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_navigation_acyclic() from public;
revoke all on function private.enforce_navigation_acyclic() from anon;
revoke all on function private.enforce_navigation_acyclic() from authenticated;

create trigger navigation_items_acyclic
before insert or update of menu_id, parent_id on public.navigation_items
for each row execute function private.enforce_navigation_acyclic();

comment on function private.enforce_navigation_acyclic() is
  'Serializes navigation mutations per menu and rejects direct or multi-node cycles.';

alter table public.page_localizations
  drop constraint page_localizations_locale_bounded,
  add constraint page_localizations_locale_bounded
    check (
      char_length(locale) between 2 and 35
      and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'
    );

alter table public.navigation_item_localizations
  drop constraint navigation_item_localizations_locale_bounded,
  add constraint navigation_item_localizations_locale_bounded
    check (
      char_length(locale) between 2 and 35
      and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'
    );

-- PostgreSQL must inspect referencing rows when a profile is deleted and an
-- attribution FK applies SET NULL. These partial indexes cover that real FK
-- maintenance path without indexing null-only rows.
create index roles_created_by_idx on public.roles (created_by) where created_by is not null;
create index roles_updated_by_idx on public.roles (updated_by) where updated_by is not null;
create index permissions_created_by_idx on public.permissions (created_by) where created_by is not null;
create index permissions_updated_by_idx on public.permissions (updated_by) where updated_by is not null;
create index role_permissions_granted_by_idx on public.role_permissions (granted_by) where granted_by is not null;
create index user_roles_granted_by_idx on public.user_roles (granted_by) where granted_by is not null;
create index media_assets_created_by_idx on public.media_assets (created_by) where created_by is not null;
create index media_assets_updated_by_idx on public.media_assets (updated_by) where updated_by is not null;
create index services_created_by_idx on public.services (created_by) where created_by is not null;
create index services_updated_by_idx on public.services (updated_by) where updated_by is not null;
create index service_localizations_created_by_idx on public.service_localizations (created_by) where created_by is not null;
create index service_localizations_updated_by_idx on public.service_localizations (updated_by) where updated_by is not null;
create index projects_created_by_idx on public.projects (created_by) where created_by is not null;
create index projects_updated_by_idx on public.projects (updated_by) where updated_by is not null;
create index project_localizations_created_by_idx on public.project_localizations (created_by) where created_by is not null;
create index project_localizations_updated_by_idx on public.project_localizations (updated_by) where updated_by is not null;
create index project_categories_created_by_idx on public.project_categories (created_by) where created_by is not null;
create index project_categories_updated_by_idx on public.project_categories (updated_by) where updated_by is not null;
create index project_category_localizations_created_by_idx on public.project_category_localizations (created_by) where created_by is not null;
create index project_category_localizations_updated_by_idx on public.project_category_localizations (updated_by) where updated_by is not null;
create index project_stages_created_by_idx on public.project_stages (created_by) where created_by is not null;
create index project_stages_updated_by_idx on public.project_stages (updated_by) where updated_by is not null;
create index project_media_created_by_idx on public.project_media (created_by) where created_by is not null;
create index project_media_updated_by_idx on public.project_media (updated_by) where updated_by is not null;
create index project_media_localizations_created_by_idx on public.project_media_localizations (created_by) where created_by is not null;
create index project_media_localizations_updated_by_idx on public.project_media_localizations (updated_by) where updated_by is not null;
create index posts_created_by_idx on public.posts (created_by) where created_by is not null;
create index posts_updated_by_idx on public.posts (updated_by) where updated_by is not null;
create index post_localizations_created_by_idx on public.post_localizations (created_by) where created_by is not null;
create index post_localizations_updated_by_idx on public.post_localizations (updated_by) where updated_by is not null;
create index post_categories_created_by_idx on public.post_categories (created_by) where created_by is not null;
create index post_categories_updated_by_idx on public.post_categories (updated_by) where updated_by is not null;
create index post_category_localizations_created_by_idx on public.post_category_localizations (created_by) where created_by is not null;
create index post_category_localizations_updated_by_idx on public.post_category_localizations (updated_by) where updated_by is not null;
create index team_members_created_by_idx on public.team_members (created_by) where created_by is not null;
create index team_members_updated_by_idx on public.team_members (updated_by) where updated_by is not null;
create index team_member_localizations_created_by_idx on public.team_member_localizations (created_by) where created_by is not null;
create index team_member_localizations_updated_by_idx on public.team_member_localizations (updated_by) where updated_by is not null;
create index testimonials_created_by_idx on public.testimonials (created_by) where created_by is not null;
create index testimonials_updated_by_idx on public.testimonials (updated_by) where updated_by is not null;
create index testimonial_localizations_created_by_idx on public.testimonial_localizations (created_by) where created_by is not null;
create index testimonial_localizations_updated_by_idx on public.testimonial_localizations (updated_by) where updated_by is not null;
create index credentials_created_by_idx on public.credentials (created_by) where created_by is not null;
create index credentials_updated_by_idx on public.credentials (updated_by) where updated_by is not null;
create index credential_localizations_created_by_idx on public.credential_localizations (created_by) where created_by is not null;
create index credential_localizations_updated_by_idx on public.credential_localizations (updated_by) where updated_by is not null;
create index site_pages_created_by_idx on public.site_pages (created_by) where created_by is not null;
create index site_pages_updated_by_idx on public.site_pages (updated_by) where updated_by is not null;
create index page_localizations_created_by_idx on public.page_localizations (created_by) where created_by is not null;
create index page_localizations_updated_by_idx on public.page_localizations (updated_by) where updated_by is not null;
create index page_sections_created_by_idx on public.page_sections (created_by) where created_by is not null;
create index page_sections_updated_by_idx on public.page_sections (updated_by) where updated_by is not null;
create index navigation_menus_created_by_idx on public.navigation_menus (created_by) where created_by is not null;
create index navigation_menus_updated_by_idx on public.navigation_menus (updated_by) where updated_by is not null;
create index navigation_items_created_by_idx on public.navigation_items (created_by) where created_by is not null;
create index navigation_items_updated_by_idx on public.navigation_items (updated_by) where updated_by is not null;
create index navigation_item_localizations_created_by_idx on public.navigation_item_localizations (created_by) where created_by is not null;
create index navigation_item_localizations_updated_by_idx on public.navigation_item_localizations (updated_by) where updated_by is not null;
create index public_site_settings_created_by_idx on public.public_site_settings (created_by) where created_by is not null;
create index public_site_settings_updated_by_idx on public.public_site_settings (updated_by) where updated_by is not null;
create index lead_stages_created_by_idx on public.lead_stages (created_by) where created_by is not null;
create index lead_stages_updated_by_idx on public.lead_stages (updated_by) where updated_by is not null;
create index leads_created_by_idx on public.leads (created_by) where created_by is not null;
create index leads_updated_by_idx on public.leads (updated_by) where updated_by is not null;
create index lead_notes_author_id_idx on public.lead_notes (author_id) where author_id is not null;
create index lead_stage_history_changed_by_idx on public.lead_stage_history (changed_by) where changed_by is not null;
