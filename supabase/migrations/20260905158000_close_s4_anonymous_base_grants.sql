-- S4 hardening: anonymous reads are limited to named public projections.
--
-- 20260905151000 temporarily granted column-scoped base-table reads while
-- projection policies were being exercised as invoker views. The final
-- projection contract is stricter: anonymous callers receive no privilege on
-- editorial, evidence, claim, registry, or media base tables at all.

revoke all privileges on table
  public.services, public.service_localizations,
  public.projects, public.project_localizations,
  public.project_categories, public.project_category_localizations,
  public.project_category_assignments, public.project_services,
  public.project_stages, public.project_media,
  public.project_media_localizations,
  public.posts, public.post_localizations,
  public.post_categories, public.post_category_localizations,
  public.post_category_assignments,
  public.team_members, public.team_member_localizations,
  public.testimonials, public.testimonial_localizations,
  public.testimonial_verifications,
  public.credentials, public.credential_localizations,
  public.credential_verifications,
  public.site_pages, public.page_localizations, public.page_sections,
  public.page_section_projects, public.page_section_services,
  public.page_section_media,
  public.navigation_menus, public.navigation_items,
  public.navigation_item_localizations,
  public.public_site_settings,
  public.content_section_registry, public.public_setting_registry,
  public.evidence_records, public.service_evidence, public.project_evidence,
  public.post_evidence, public.page_evidence, public.team_member_evidence,
  public.testimonial_evidence, public.credential_evidence,
  public.navigation_evidence, public.setting_evidence,
  public.material_claims, public.claim_evidence,
  public.project_claims, public.service_claims, public.post_claims,
  public.page_claims, public.team_member_claims, public.credential_claims,
  public.media_assets
from anon;

comment on schema public is
  'S4 anonymous access is projection-only; base editorial, evidence, claims, registries, settings, and media tables have no anon table privileges.';
