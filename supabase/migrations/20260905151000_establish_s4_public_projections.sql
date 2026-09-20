-- S4 public projections and row security.
-- Views use explicit columns and a security barrier. They are the only public
-- read surface; base editorial tables remain inaccessible to anon.

create or replace function private.is_public_media_asset(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.public_media_is_current(target_id);
$$;

create or replace function private.is_public_navigation_menu(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.navigation_menus as menu
    where menu.id = target_id
      and menu.publication_status = 'published'
      and menu.published_at is not null
      and menu.published_at <= now()
      and private.navigation_publication_failures(menu.id) = '[]'::jsonb
  );
$$;

create or replace function private.is_public_navigation_item(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.navigation_items as item
    where item.id = target_id
      and private.is_public_navigation_menu(item.menu_id)
      and item.visibility is distinct from 'hidden'
      and (
        (item.link_type = 'external' and item.external_url ~* '^https://')
        or (
          item.link_type = 'internal'
          and (
            item.internal_path in (
              '/', '/expertise', '/projects', '/about', '/insights',
              '/contact', '/start-a-project', '/privacy', '/terms'
            )
            or exists (
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
      and (not registry.requires_evidence or (
        setting.evidence_id is not null
        and private.evidence_is_current(setting.evidence_id)
        and setting.reviewed_by is not null
        and setting.reviewed_at is not null
        and (setting.review_due_at is null or setting.review_due_at >= now())
      ))
  );
$$;

create or replace function private.is_public_claim(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.claim_is_current(target_id);
$$;

-- The projection helpers are callable by policy evaluation only. They return
-- booleans and never expose evidence, notes, rights, or reviewer metadata.
grant execute on function private.is_public_content(text, uuid) to anon, authenticated;
grant execute on function private.is_public_media_asset(uuid) to anon, authenticated;
grant execute on function private.is_public_navigation_menu(uuid) to anon, authenticated;
grant execute on function private.is_public_navigation_item(uuid) to anon, authenticated;
grant execute on function private.is_public_setting(text, text) to anon, authenticated;
grant execute on function private.is_public_claim(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Existing content tables: anonymous publication-only policies and scoped
-- authenticated reads. There are no direct authenticated writes.
-- ---------------------------------------------------------------------------

create policy services_public_select
  on public.services for select to anon
  using (private.is_public_content('service', id));
create policy services_staff_select
  on public.services for select to authenticated
  using (private.is_public_content('service', id) or private.has_permission('content.read'));

create policy service_localizations_public_select
  on public.service_localizations for select to anon
  using (private.is_public_content('service', service_id) and locale = 'en');
create policy service_localizations_staff_select
  on public.service_localizations for select to authenticated
  using (private.is_public_content('service', service_id) or private.has_permission('content.read'));

create policy projects_public_select
  on public.projects for select to anon
  using (private.is_public_content('project', id));
create policy projects_staff_select
  on public.projects for select to authenticated
  using (private.is_public_content('project', id) or private.has_permission('content.read'));

create policy project_localizations_public_select
  on public.project_localizations for select to anon
  using (private.is_public_content('project', project_id) and locale = 'en');
create policy project_localizations_staff_select
  on public.project_localizations for select to authenticated
  using (private.is_public_content('project', project_id) or private.has_permission('content.read'));

create policy project_categories_public_select
  on public.project_categories for select to anon
  using (publication_status = 'published' and published_at is not null and published_at <= now());
create policy project_categories_staff_select
  on public.project_categories for select to authenticated
  using (private.has_permission('content.read'));

create policy project_category_localizations_public_select
  on public.project_category_localizations for select to anon
  using (exists (
    select 1 from public.project_categories as category
    where category.id = category_id
      and category.publication_status = 'published'
      and category.published_at is not null
      and category.published_at <= now()
  ) and locale = 'en');
create policy project_category_localizations_staff_select
  on public.project_category_localizations for select to authenticated
  using (private.has_permission('content.read'));

create policy project_category_assignments_public_select
  on public.project_category_assignments for select to anon
  using (exists (select 1 from public.projects where id = project_id and private.is_public_content('project', id)));
create policy project_category_assignments_staff_select
  on public.project_category_assignments for select to authenticated
  using (private.has_permission('content.read'));

create policy project_services_public_select
  on public.project_services for select to anon
  using (exists (select 1 from public.projects where id = project_id and private.is_public_content('project', id)));
create policy project_services_staff_select
  on public.project_services for select to authenticated
  using (private.has_permission('content.read'));

create policy project_stages_public_select
  on public.project_stages for select to anon
  using (exists (select 1 from public.projects where id = project_id and private.is_public_content('project', id)));
create policy project_stages_staff_select
  on public.project_stages for select to authenticated
  using (private.has_permission('content.read'));

create policy project_media_public_select
  on public.project_media for select to anon
  using (private.is_public_media_usage(id));
create policy project_media_staff_select
  on public.project_media for select to authenticated
  using (private.has_permission('media.read') or private.has_permission('content.read'));

create policy project_media_localizations_public_select
  on public.project_media_localizations for select to anon
  using (exists (
    select 1 from public.project_media as usage
    where usage.id = project_media_id and private.is_public_media_usage(usage.id)
  ) and locale = 'en');
create policy project_media_localizations_staff_select
  on public.project_media_localizations for select to authenticated
  using (private.has_permission('media.read') or private.has_permission('content.read'));

create policy media_assets_public_select
  on public.media_assets for select to anon
  using (private.is_public_media_asset(id));
create policy media_assets_staff_select
  on public.media_assets for select to authenticated
  using (private.has_permission('media.read'));

create policy posts_public_select
  on public.posts for select to anon
  using (private.is_public_content('post', id));
create policy posts_staff_select
  on public.posts for select to authenticated
  using (private.is_public_content('post', id) or private.has_permission('content.read'));

create policy post_localizations_public_select
  on public.post_localizations for select to anon
  using (private.is_public_content('post', post_id) and locale = 'en');
create policy post_localizations_staff_select
  on public.post_localizations for select to authenticated
  using (private.is_public_content('post', post_id) or private.has_permission('content.read'));

create policy post_categories_public_select
  on public.post_categories for select to anon
  using (publication_status = 'published' and published_at is not null and published_at <= now());
create policy post_categories_staff_select
  on public.post_categories for select to authenticated
  using (private.has_permission('content.read'));

create policy post_category_localizations_public_select
  on public.post_category_localizations for select to anon
  using (exists (
    select 1 from public.post_categories as category
    where category.id = category_id
      and category.publication_status = 'published'
      and category.published_at is not null
      and category.published_at <= now()
  ) and locale = 'en');
create policy post_category_localizations_staff_select
  on public.post_category_localizations for select to authenticated
  using (private.has_permission('content.read'));

create policy post_category_assignments_public_select
  on public.post_category_assignments for select to anon
  using (exists (select 1 from public.posts where id = post_id and private.is_public_content('post', id)));
create policy post_category_assignments_staff_select
  on public.post_category_assignments for select to authenticated
  using (private.has_permission('content.read'));

create policy team_members_public_select
  on public.team_members for select to anon
  using (private.is_public_content('team_member', id));
create policy team_members_staff_select
  on public.team_members for select to authenticated
  using (private.is_public_content('team_member', id) or private.has_permission('content.read'));

create policy team_member_localizations_public_select
  on public.team_member_localizations for select to anon
  using (private.is_public_content('team_member', team_member_id) and locale = 'en');
create policy team_member_localizations_staff_select
  on public.team_member_localizations for select to authenticated
  using (private.is_public_content('team_member', team_member_id) or private.has_permission('content.read'));

create policy testimonials_public_select
  on public.testimonials for select to anon
  using (private.is_public_content('testimonial', id));
create policy testimonials_staff_select
  on public.testimonials for select to authenticated
  using (private.is_public_content('testimonial', id) or private.has_permission('content.read'));

create policy testimonial_localizations_public_select
  on public.testimonial_localizations for select to anon
  using (private.is_public_content('testimonial', testimonial_id) and locale = 'en');
create policy testimonial_localizations_staff_select
  on public.testimonial_localizations for select to authenticated
  using (private.is_public_content('testimonial', testimonial_id) or private.has_permission('content.read'));

create policy testimonial_verifications_staff_select
  on public.testimonial_verifications for select to authenticated
  using (private.has_permission('claims.verify'));

create policy credentials_public_select
  on public.credentials for select to anon
  using (private.is_public_content('credential', id));
create policy credentials_staff_select
  on public.credentials for select to authenticated
  using (private.is_public_content('credential', id) or private.has_permission('content.read'));

create policy credential_localizations_public_select
  on public.credential_localizations for select to anon
  using (private.is_public_content('credential', credential_id) and locale = 'en');
create policy credential_localizations_staff_select
  on public.credential_localizations for select to authenticated
  using (private.is_public_content('credential', credential_id) or private.has_permission('content.read'));

create policy credential_verifications_staff_select
  on public.credential_verifications for select to authenticated
  using (private.has_permission('claims.verify'));
create policy credential_verifications_public_select
  on public.credential_verifications for select to anon
  using (private.is_public_content('credential', credential_id));

create policy site_pages_public_select
  on public.site_pages for select to anon
  using (private.is_public_content('page', id));
create policy site_pages_staff_select
  on public.site_pages for select to authenticated
  using (private.is_public_content('page', id) or private.has_permission('content.read'));

create policy page_localizations_public_select
  on public.page_localizations for select to anon
  using (private.is_public_content('page', page_id) and locale = 'en');
create policy page_localizations_staff_select
  on public.page_localizations for select to authenticated
  using (private.is_public_content('page', page_id) or private.has_permission('content.read'));

create policy page_sections_public_select
  on public.page_sections for select to anon
  using (enabled and exists (select 1 from public.site_pages where id = page_id and private.is_public_content('page', id)));
create policy page_sections_staff_select
  on public.page_sections for select to authenticated
  using (private.has_permission('content.read'));

create policy page_section_projects_public_select
  on public.page_section_projects for select to anon
  using (exists (
    select 1 from public.page_sections as section
    join public.site_pages as page on page.id = section.page_id
    where section.id = section_id and section.enabled and private.is_public_content('page', page.id)
  ) and exists (select 1 from public.projects where id = project_id and private.is_public_content('project', id)));
create policy page_section_projects_staff_select
  on public.page_section_projects for select to authenticated
  using (private.has_permission('content.read'));

create policy page_section_services_public_select
  on public.page_section_services for select to anon
  using (exists (
    select 1 from public.page_sections as section
    join public.site_pages as page on page.id = section.page_id
    where section.id = section_id and section.enabled and private.is_public_content('page', page.id)
  ) and exists (select 1 from public.services where id = service_id and private.is_public_content('service', id)));
create policy page_section_services_staff_select
  on public.page_section_services for select to authenticated
  using (private.has_permission('content.read'));

create policy page_section_media_public_select
  on public.page_section_media for select to anon
  using (exists (
    select 1 from public.page_sections as section
    join public.site_pages as page on page.id = section.page_id
    where section.id = section_id and section.enabled and private.is_public_content('page', page.id)
  ) and private.is_public_media_asset(media_asset_id));
create policy page_section_media_staff_select
  on public.page_section_media for select to authenticated
  using (private.has_permission('media.read') or private.has_permission('content.read'));

create policy navigation_menus_public_select
  on public.navigation_menus for select to anon
  using (private.is_public_navigation_menu(id));
create policy navigation_menus_staff_select
  on public.navigation_menus for select to authenticated
  using (private.is_public_navigation_menu(id) or private.has_permission('website.manage'));

create policy navigation_items_public_select
  on public.navigation_items for select to anon
  using (private.is_public_navigation_item(id));
create policy navigation_items_staff_select
  on public.navigation_items for select to authenticated
  using (private.is_public_navigation_menu(menu_id) or private.has_permission('website.manage'));

create policy navigation_item_localizations_public_select
  on public.navigation_item_localizations for select to anon
  using (private.is_public_navigation_item(navigation_item_id) and locale = 'en');
create policy navigation_item_localizations_staff_select
  on public.navigation_item_localizations for select to authenticated
  using (private.has_permission('website.manage') or private.is_public_navigation_item(navigation_item_id));

create policy public_site_settings_public_select
  on public.public_site_settings for select to anon
  using (private.is_public_setting(namespace, key));
create policy public_site_settings_staff_select
  on public.public_site_settings for select to authenticated
  using (private.is_public_setting(namespace, key) or private.has_permission('website.manage'));

-- Registry rows are structural and contain no client values or secrets.
create policy content_section_registry_public_select
  on public.content_section_registry for select to anon, authenticated
  using (enabled);
create policy public_setting_registry_public_select
  on public.public_setting_registry for select to anon, authenticated
  using (public_allowed);

-- Evidence, claims, rights, and reviewer notes are never anonymous. Only the
-- claims verifier capability can read those internal records.
create policy evidence_records_staff_select
  on public.evidence_records for select to authenticated
  using (private.has_permission('claims.verify'));
create policy evidence_relationships_staff_select
  on public.service_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy project_evidence_staff_select
  on public.project_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy post_evidence_staff_select
  on public.post_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy page_evidence_staff_select
  on public.page_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy team_member_evidence_staff_select
  on public.team_member_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy testimonial_evidence_staff_select
  on public.testimonial_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy credential_evidence_staff_select
  on public.credential_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy navigation_evidence_staff_select
  on public.navigation_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('website.manage'));
create policy setting_evidence_staff_select
  on public.setting_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('website.manage'));
create policy material_claims_staff_select
  on public.material_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy claim_evidence_staff_select
  on public.claim_evidence for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy project_claims_public_select
  on public.project_claims for select to anon using (exists (select 1 from public.projects where id = project_id and private.is_public_content('project', id)) and private.is_public_claim(claim_id));
create policy project_claims_staff_select
  on public.project_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy service_claims_staff_select
  on public.service_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy post_claims_staff_select
  on public.post_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy page_claims_staff_select
  on public.page_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy team_member_claims_staff_select
  on public.team_member_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));
create policy credential_claims_staff_select
  on public.credential_claims for select to authenticated using (private.has_permission('claims.verify') or private.has_permission('content.read'));

-- ---------------------------------------------------------------------------
-- Explicit public projections
-- ---------------------------------------------------------------------------

create view public.published_services with (security_barrier = true) as
select
  service.id,
  localization.locale,
  localization.slug,
  localization.name,
  localization.summary,
  localization.scope,
  localization.deliverables,
  localization.exclusions,
  localization.client_inputs,
  localization.delivery_wording,
  localization.body_blocks,
  localization.schema_version,
  localization.seo_title,
  localization.seo_description,
  service.sort_order,
  service.featured,
  service.published_at
from public.services as service
join public.service_localizations as localization on localization.service_id = service.id
where localization.locale = 'en' and private.is_public_content('service', service.id);

create view public.published_projects with (security_barrier = true) as
select
  project.id,
  localization.locale,
  localization.slug,
  localization.title,
  localization.summary,
  localization.challenge,
  localization.approach,
  localization.solution,
  localization.outcomes,
  localization.seo_title,
  localization.seo_description,
  project.public_location,
  project.public_location_granularity,
  project.project_type,
  project.project_scope,
  project.renz_role,
  project.start_year,
  project.completion_year,
  project.delivery_status,
  project.sort_order,
  project.featured,
  project.published_at
from public.projects as project
join public.project_localizations as localization on localization.project_id = project.id
where localization.locale = 'en' and private.is_public_content('project', project.id);

create view public.published_project_media with (security_barrier = true) as
select
  usage.id,
  usage.project_id,
  usage.media_asset_id,
  usage.role,
  usage.phase,
  usage.sort_order,
  usage.decorative,
  usage.credit,
  usage.focal_point,
  asset.mime_type,
  asset.width,
  asset.height,
  localization.locale,
  localization.alt_text,
  localization.caption
from public.project_media as usage
join public.media_assets as asset on asset.id = usage.media_asset_id
join public.project_media_localizations as localization on localization.project_media_id = usage.id
where localization.locale = 'en' and private.is_public_media_usage(usage.id);

create view public.published_posts with (security_barrier = true) as
select
  post.id,
  localization.locale,
  localization.slug,
  localization.title,
  localization.excerpt,
  localization.body_blocks,
  localization.schema_version,
  localization.seo_title,
  localization.seo_description,
  post.publication_date,
  post.published_at
from public.posts as post
join public.post_localizations as localization on localization.post_id = post.id
where localization.locale = 'en' and private.is_public_content('post', post.id);

create view public.published_pages with (security_barrier = true) as
select
  page.id,
  page.page_key,
  page.template_key,
  localization.locale,
  localization.path,
  localization.title,
  localization.summary,
  localization.body_blocks,
  localization.schema_version,
  localization.seo_title,
  localization.seo_description,
  localization.canonical_override,
  localization.social_image_id,
  localization.noindex,
  page.published_at
from public.site_pages as page
join public.page_localizations as localization on localization.page_id = page.id
where localization.locale = 'en' and private.is_public_content('page', page.id);

create view public.published_page_sections with (security_barrier = true) as
select section.id, section.page_id, section.section_type, section.schema_version, section.config, section.sort_order
from public.page_sections as section
join public.site_pages as page on page.id = section.page_id
where section.enabled and private.is_public_content('page', page.id);

create view public.published_team_members with (security_barrier = true) as
select member.id, localization.locale, localization.name, localization.role_label, localization.biography,
  member.portrait_asset_id, member.sort_order, member.published_at
from public.team_members as member
join public.team_member_localizations as localization on localization.team_member_id = member.id
where localization.locale = 'en' and private.is_public_content('team_member', member.id);

create view public.published_testimonials with (security_barrier = true) as
select testimonial.id, localization.locale, localization.quote, localization.attribution_presentation,
  testimonial.attribution_name, testimonial.attribution_role, testimonial.attribution_organization,
  testimonial.attribution_mode, testimonial.published_at
from public.testimonials as testimonial
join public.testimonial_localizations as localization on localization.testimonial_id = testimonial.id
where localization.locale = 'en' and private.is_public_content('testimonial', testimonial.id);

create view public.published_credentials with (security_barrier = true) as
select credential.id, localization.locale, localization.name, localization.description,
  credential.issuer, credential.reference, credential.valid_from, credential.valid_to,
  credential.team_member_id, verification.approved_public_wording, credential.published_at
from public.credentials as credential
join public.credential_localizations as localization on localization.credential_id = credential.id
join public.credential_verifications as verification on verification.credential_id = credential.id
where localization.locale = 'en' and private.is_public_content('credential', credential.id);

create view public.published_navigation_items with (security_barrier = true) as
select
  item.menu_id,
  item.id,
  item.parent_id,
  item.sort_order,
  item.link_type,
  item.internal_path,
  item.external_url,
  localization.locale,
  localization.label,
  localization.accessibility_text
from public.navigation_items as item
join public.navigation_item_localizations as localization on localization.navigation_item_id = item.id
where localization.locale = 'en' and private.is_public_navigation_item(item.id);

create view public.published_site_settings with (security_barrier = true) as
select setting.namespace, setting.key, setting.value
from public.public_site_settings as setting
join public.public_setting_registry as registry
  on registry.namespace = setting.namespace and registry.key = setting.key
where private.is_public_setting(setting.namespace, setting.key);

create view public.published_project_claims with (security_barrier = true) as
select relation.project_id, claim.id, claim.claim_type, claim.approved_public_wording
from public.project_claims as relation
join public.material_claims as claim on claim.id = relation.claim_id
where private.is_public_claim(claim.id)
  and exists (select 1 from public.projects as project where project.id = relation.project_id and private.is_public_content('project', project.id));

grant select on public.published_services,
  public.published_projects,
  public.published_project_media,
  public.published_posts,
  public.published_pages,
  public.published_page_sections,
  public.published_team_members,
  public.published_testimonials,
  public.published_credentials,
  public.published_navigation_items,
  public.published_site_settings,
  public.published_project_claims
to anon, authenticated;

-- Anonymous callers receive only columns that are safe for public projections.
grant select (id, publication_status, published_at, sort_order, featured, hero_asset_id)
  on public.services to anon;
grant select (service_id, locale, slug, name, summary, body_blocks, schema_version,
  seo_title, seo_description, scope, deliverables, exclusions, client_inputs, delivery_wording)
  on public.service_localizations to anon;
grant select (id, publication_status, published_at, public_location, public_location_granularity,
  project_type, start_year, completion_year, delivery_status, sort_order, featured, hero_asset_id,
  project_scope, renz_role)
  on public.projects to anon;
grant select (project_id, locale, slug, title, summary, challenge, approach, solution, outcomes,
  seo_title, seo_description)
  on public.project_localizations to anon;
grant select (id, project_id, media_asset_id, stage_id, role, phase, sort_order, public_status, decorative, credit, focal_point)
  on public.project_media to anon;
grant select (project_media_id, locale, alt_text, caption)
  on public.project_media_localizations to anon;
grant select (id, mime_type, width, height)
  on public.media_assets to anon;
grant select (id, publication_status, published_at, publication_date)
  on public.posts to anon;
grant select (post_id, locale, slug, title, excerpt, body_blocks, schema_version, seo_title, seo_description)
  on public.post_localizations to anon;
grant select (id, publication_status, published_at, sort_order, portrait_asset_id)
  on public.team_members to anon;
grant select (team_member_id, locale, name, role_label, biography)
  on public.team_member_localizations to anon;
grant select (id, publication_status, published_at, attribution_name, attribution_role, attribution_organization, attribution_mode)
  on public.testimonials to anon;
grant select (testimonial_id, locale, quote, attribution_presentation)
  on public.testimonial_localizations to anon;
grant select (id, publication_status, published_at, issuer, reference, valid_from, valid_to, team_member_id)
  on public.credentials to anon;
grant select (credential_id, locale, name, description)
  on public.credential_localizations to anon;
grant select (credential_id, approved_public_wording)
  on public.credential_verifications to anon;
grant select (id, page_key, template_key, publication_status, published_at)
  on public.site_pages to anon;
grant select (page_id, locale, path, title, summary, body_blocks, schema_version, seo_title,
  seo_description, canonical_override, social_image_id, noindex)
  on public.page_localizations to anon;
grant select (id, page_id, section_type, schema_version, config, enabled, sort_order)
  on public.page_sections to anon;
grant select (section_id, project_id, sort_order) on public.page_section_projects to anon;
grant select (section_id, service_id, sort_order) on public.page_section_services to anon;
grant select (section_id, media_asset_id, role, sort_order) on public.page_section_media to anon;
grant select (id, publication_status, published_at, key) on public.navigation_menus to anon;
grant select (id, menu_id, parent_id, sort_order, link_type, internal_path, external_url, visibility)
  on public.navigation_items to anon;
grant select (navigation_item_id, locale, label, accessibility_text)
  on public.navigation_item_localizations to anon;
grant select (namespace, key, value, public_status)
  on public.public_site_settings to anon;
grant select (key, scope, display_name, schema_version, enabled)
  on public.content_section_registry to anon;
grant select (namespace, key, value_type, public_allowed, requires_evidence, display_name)
  on public.public_setting_registry to anon;
grant select (project_id, claim_id, required) on public.project_claims to anon;
grant select (id, claim_type, approved_public_wording) on public.material_claims to anon;

-- Authenticated content readers can inspect the complete editorial records, but
-- evidence and claim verification remain capability-gated above.
grant select on public.services, public.service_localizations, public.projects,
  public.project_localizations, public.project_categories, public.project_category_localizations,
  public.project_category_assignments, public.project_services, public.project_stages,
  public.project_media, public.project_media_localizations, public.posts, public.post_localizations,
  public.post_categories, public.post_category_localizations, public.post_category_assignments,
  public.team_members, public.team_member_localizations, public.testimonials,
  public.testimonial_localizations, public.credentials, public.credential_localizations,
  public.site_pages, public.page_localizations, public.page_sections, public.page_section_projects,
  public.page_section_services, public.page_section_media, public.navigation_menus,
  public.navigation_items, public.navigation_item_localizations, public.public_site_settings,
  public.media_assets
to authenticated;

grant select on public.evidence_records, public.service_evidence, public.project_evidence,
  public.post_evidence, public.page_evidence, public.team_member_evidence,
  public.testimonial_evidence, public.credential_evidence, public.navigation_evidence,
  public.setting_evidence, public.material_claims, public.claim_evidence,
  public.project_claims, public.service_claims, public.post_claims, public.page_claims,
  public.team_member_claims, public.credential_claims, public.credential_verifications
to authenticated;

comment on view public.published_services is
  'Anonymous-safe service projection. It contains only current published English fields.';
comment on view public.published_projects is
  'Anonymous-safe project projection. It omits internal evidence, rights, reviewer, and audit fields.';
comment on view public.published_project_media is
  'Anonymous-safe project media metadata. S4 does not expose raw Storage paths or make private buckets public.';
comment on view public.published_site_settings is
  'Allow-listed public settings only; unknown/private settings are excluded.';
