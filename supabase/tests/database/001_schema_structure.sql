begin;

create extension if not exists pgtap with schema extensions;

select plan(249);

create temporary table expected_s4_tables (
  name text primary key
) on commit drop;

insert into expected_s4_tables (name)
select unnest(array[
  'profiles', 'roles', 'permissions', 'role_permissions', 'user_roles',
  'media_assets', 'services', 'service_localizations', 'projects',
  'project_localizations', 'project_categories',
  'project_category_localizations', 'project_category_assignments',
  'project_services', 'project_stages', 'project_media',
  'project_media_localizations', 'posts', 'post_localizations',
  'post_categories', 'post_category_localizations',
  'post_category_assignments', 'team_members', 'team_member_localizations',
  'testimonials', 'testimonial_localizations', 'testimonial_verifications',
  'credentials', 'credential_localizations', 'site_pages', 'page_localizations',
  'page_sections', 'page_section_projects', 'page_section_services',
  'page_section_media', 'navigation_menus', 'navigation_items',
  'navigation_item_localizations', 'public_site_settings',
  'leads', 'lead_attachments', 'lead_notes', 'lead_stage_history', 'audit_logs'
  , 'lead_reference_counters', 'intake_settings', 'lead_upload_sessions', 'lead_project_details'
  , 'lead_service_details', 'lead_material_items', 'lead_contact_logs', 'lead_events', 'intake_rate_limits'
  , 'content_section_registry', 'public_setting_registry', 'evidence_records'
  , 'service_evidence', 'project_evidence', 'post_evidence', 'page_evidence'
  , 'team_member_evidence', 'testimonial_evidence', 'credential_evidence'
  , 'navigation_evidence', 'setting_evidence', 'material_claims', 'claim_evidence'
  , 'project_claims', 'service_claims', 'post_claims', 'page_claims'
  , 'team_member_claims', 'credential_claims', 'credential_verifications'
  , 'clients', 'client_notes', 'operational_projects', 'operational_project_notes'
  , 'operational_project_status_history', 'operational_project_phase_history'
  , 'realtime_events'
  , 'invoices', 'invoice_line_items', 'invoice_payments', 'invoice_share_links', 'invoice_number_counters'
  , 'trade_partners', 'contractor_assignments', 'contractor_payments', 'contractor_assignment_adjustments'
  , 'business_profile', 'contact_channels', 'business_location', 'business_hours', 'social_links', 'website_settings'
  , 'navigation_settings', 'brand_media_settings', 'seo_settings', 'legal_pages', 'legal_page_revisions'
  , 'document_defaults', 'operational_settings', 'settings_domain_versions', 'public_configuration_snapshots'
  , 'materials', 'project_material_requirements', 'purchase_orders', 'purchase_order_line_items'
  , 'purchase_order_receipts', 'purchase_order_receipt_items', 'purchase_order_share_links', 'purchase_order_number_counters'
  , 'website_analytics_daily', 'notifications', 'notification_preferences', 'notification_sweep_runs'
  , 'website_section_types', 'website_pages', 'website_page_sections', 'website_page_revisions', 'website_route_aliases'
  , 'content_publications'
]);

select has_schema('private', 'private helper schema exists');

select ok(
  current_setting('server_version_num')::integer between 170000 and 179999,
  'local database runs PostgreSQL 17'
);

select is(
  (
    select array_agg(table_name::text order by table_name)
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  ),
  (select array_agg(name order by name) from expected_s4_tables),
  'public contains exactly the 123 S2+S4+C4+C5+C6+C7+C8+C9+CR1 application tables'
);

select has_table('public', name, format('public.%s exists', name))
from expected_s4_tables;

select has_pk('public', name, format('public.%s has a primary key', name))
from expected_s4_tables;

select * from finish();
rollback;
