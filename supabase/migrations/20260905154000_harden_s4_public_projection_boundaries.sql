-- S4 hardening: anonymous reads are projection-only.
--
-- Projection views are owned by the migration owner and execute their
-- fail-closed eligibility predicates under that owner. They are deliberately
-- not security-invoker views: anonymous callers must not need any privilege on
-- the editorial base tables. Explicit columns and security-barrier semantics
-- keep the projection surface narrow and prevent predicate reordering.

do $$
declare
  view_name text;
begin
  foreach view_name in array array[
    'published_services', 'published_projects', 'published_project_media',
    'published_posts', 'published_pages', 'published_page_sections',
    'published_team_members', 'published_testimonials', 'published_credentials',
    'published_navigation_items', 'published_site_settings', 'published_project_claims'
  ] loop
    execute format(
      'alter view public.%I set (security_invoker = false, security_barrier = true)',
      view_name
    );
  end loop;
end;
$$;

-- Remove the temporary column grants that were only needed while the views
-- were being exercised as invoker views. The public API is the named view
-- surface; base content/evidence/media tables are not anonymous APIs.
revoke all privileges on table
  public.services, public.service_localizations, public.projects,
  public.project_localizations, public.project_media,
  public.project_media_localizations, public.media_assets, public.posts,
  public.post_localizations, public.team_members, public.team_member_localizations,
  public.testimonials, public.testimonial_localizations, public.credentials,
  public.credential_localizations, public.credential_verifications,
  public.site_pages, public.page_localizations, public.page_sections,
  public.page_section_projects, public.page_section_services, public.page_section_media,
  public.navigation_menus, public.navigation_items, public.navigation_item_localizations,
  public.public_site_settings, public.content_section_registry,
  public.public_setting_registry, public.project_claims, public.material_claims
from anon;

comment on schema public is
  'S4 public reads use explicit security-barrier owner-evaluated projections; private editorial tables are not anonymous API surfaces.';
