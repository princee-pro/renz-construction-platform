begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

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
  'leads', 'lead_attachments', 'lead_notes', 'lead_stage_history', 'audit_logs',
  'lead_reference_counters', 'intake_settings', 'lead_upload_sessions', 'lead_project_details',
  'lead_service_details', 'lead_material_items', 'lead_contact_logs', 'lead_events', 'intake_rate_limits',
  'content_section_registry', 'public_setting_registry', 'evidence_records',
  'service_evidence', 'project_evidence', 'post_evidence', 'page_evidence',
  'team_member_evidence', 'testimonial_evidence', 'credential_evidence',
  'navigation_evidence', 'setting_evidence', 'material_claims', 'claim_evidence',
  'project_claims', 'service_claims', 'post_claims', 'page_claims',
  'team_member_claims', 'credential_claims', 'credential_verifications',
  'clients', 'client_notes', 'operational_projects', 'operational_project_notes',
  'operational_project_status_history', 'operational_project_phase_history',
  'realtime_events', 'invoices', 'invoice_line_items', 'invoice_payments',
  'invoice_share_links', 'invoice_number_counters',
  'trade_partners', 'contractor_assignments', 'contractor_payments', 'contractor_assignment_adjustments',
  'business_profile', 'contact_channels', 'business_location', 'business_hours', 'social_links', 'website_settings',
  'navigation_settings', 'brand_media_settings', 'seo_settings', 'legal_pages', 'legal_page_revisions',
  'document_defaults', 'operational_settings', 'settings_domain_versions', 'public_configuration_snapshots',
  'materials', 'project_material_requirements', 'purchase_orders', 'purchase_order_line_items',
  'purchase_order_receipts', 'purchase_order_receipt_items', 'purchase_order_share_links', 'purchase_order_number_counters',
  'website_analytics_daily', 'notifications', 'notification_preferences', 'notification_sweep_runs',
  'website_section_types', 'website_pages', 'website_page_sections', 'website_page_revisions', 'website_route_aliases',
  'content_publications'
]);

select is(
  (
    select array_agg(
      relations.relname::text || ':' || relations.relrowsecurity::text
      order by relations.relname
    )
    from pg_class as relations
    join pg_namespace as namespaces on namespaces.oid = relations.relnamespace
    where namespaces.nspname = 'public'
      and relations.relkind in ('r', 'p')
  ),
  (
    select array_agg(name || ':true' order by name)
    from expected_s4_tables
  ),
  'public contains exactly the S2+S4 application tables and every table has RLS enabled'
);

select ok(
  (
    select count(*)
    from pg_policies
    join expected_s4_tables on expected_s4_tables.name = pg_policies.tablename
    where pg_policies.schemaname = 'public'
  ) >= 6,
  'S3 identity policies and S4 projection policies are explicitly installed'
);

select ok(
  not exists (
    select 1
    from expected_s4_tables
    where has_table_privilege('anon', format('public.%I', name), 'INSERT')
      or has_table_privilege('anon', format('public.%I', name), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', name), 'DELETE')
      or has_table_privilege('anon', format('public.%I', name), 'TRUNCATE')
      or has_table_privilege('anon', format('public.%I', name), 'REFERENCES')
      or has_table_privilege('anon', format('public.%I', name), 'TRIGGER')
  ),
  'anon has no direct mutation privilege on any S2 or S4 table'
);

select ok(
  not exists (
    select 1
    from expected_s4_tables
    where has_table_privilege('authenticated', format('public.%I', name), 'INSERT')
      or has_table_privilege('authenticated', format('public.%I', name), 'UPDATE')
      or has_table_privilege('authenticated', format('public.%I', name), 'DELETE')
  ),
  'authenticated has no direct mutation privilege on S2 or S4 tables'
);

select ok(
  not has_schema_privilege('anon', 'private', 'USAGE'),
  'anon has no private-schema usage'
);

select ok(
  not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated has no private-schema usage'
);

select is(
  (
    select count(*)
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'private'
      and procedures.prosecdef
  ),
  88::bigint,
  'S3, S4, C4 and C9 private authorization, analytics and notification helpers are SECURITY DEFINER functions'
);

select is(
  (
    select count(*)
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.prokind in ('f', 'p')
      and procedures.proname in (
        'current_user_has_permission', 'current_user_access',
        'activate_current_profile', 'assign_invited_admin', 'disable_user',
        'assign_user_role', 'remove_user_role'
      )
  ),
  7::bigint,
  'public schema exposes only the seven narrow S3 authorization functions'
);

select is(
  (
    select count(*)
    from pg_class as relations
    join pg_namespace as namespaces on namespaces.oid = relations.relnamespace
    where namespaces.nspname = 'public'
      and relations.relkind in ('v', 'm')
  ),
  13::bigint,
  'public schema contains only the thirteen explicit S4/S5C projection views'
);

select ok(
  not exists (
    select 1
    from (values
      ('bootstrap_super_admin'), ('next_lead_reference'), ('lead_event'),
      ('lead_possible_matches'), ('lead_timeline'), ('lead_quick_find'), ('enforce_navigation_acyclic'),
      ('handle_auth_user_created'), ('has_aal2'), ('has_permission'),
      ('is_current_super_admin'), ('prevent_last_active_super_admin_delete'),
      ('prevent_last_active_super_admin_disable'), ('prevent_last_super_admin'),
      ('record_audit_event'), ('touch_mutable_row'), ('content_json_is_safe'),
      ('evidence_is_current'), ('public_media_is_current'),
      ('publication_failures'), ('publish_record'), ('service_publication_failures'),
      ('project_publication_failures'), ('post_publication_failures'),
      ('page_publication_failures'), ('team_member_publication_failures'),
      ('testimonial_publication_failures'), ('credential_publication_failures'),
      ('navigation_publication_failures'), ('is_public_content')
    ) as expected(proname)
    where not exists (
      select 1
      from pg_proc as procedures
      join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
      where namespaces.nspname = 'private'
        and procedures.prokind = 'f'
        and procedures.proname = expected.proname
    )
  ),
  'private schema contains the reviewed S2, S3, and S4 helper spine'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'private'
      and procedures.prokind = 'f'
      and procedures.proconfig is distinct from array['search_path=""']::text[]
  ),
  'every private helper has an empty search_path'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedures
    join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'private'
      and procedures.prokind = 'f'
      and (
        (
          has_function_privilege('anon', procedures.oid, 'EXECUTE')
          and procedures.proname not in (
            'is_public_content', 'is_public_media_asset', 'is_public_media_usage',
            'is_public_navigation_menu', 'is_public_navigation_item',
            'is_public_setting', 'is_public_claim'
          )
        )
        or (
          has_function_privilege('authenticated', procedures.oid, 'EXECUTE')
          and procedures.proname not in (
            'has_permission', 'is_active_aal2_staff',
            'is_public_content', 'is_public_media_asset', 'is_public_media_usage',
            'is_public_navigation_menu', 'is_public_navigation_item',
            'is_public_setting', 'is_public_claim'
          )
        )
        or exists (
          select 1
          from aclexplode(
            coalesce(
              procedures.proacl,
              acldefault('f', procedures.proowner)
            )
          ) as function_grants
          where function_grants.grantee = 0::oid
            and function_grants.privilege_type = 'EXECUTE'
        )
      )
  ),
  'PUBLIC and anon, and authenticated except for the RLS-required has_permission and is_active_aal2_staff helpers, cannot execute private helpers'
);

select ok(
  not exists (
    select 1
    from pg_class as sequences
    join pg_namespace as namespaces on namespaces.oid = sequences.relnamespace
    where namespaces.nspname = 'public'
      and sequences.relkind = 'S'
      and (
        has_sequence_privilege('anon', sequences.oid, 'USAGE')
        or has_sequence_privilege('anon', sequences.oid, 'SELECT')
        or has_sequence_privilege('anon', sequences.oid, 'UPDATE')
        or has_sequence_privilege('authenticated', sequences.oid, 'USAGE')
        or has_sequence_privilege('authenticated', sequences.oid, 'SELECT')
        or has_sequence_privilege('authenticated', sequences.oid, 'UPDATE')
        or exists (
          select 1
          from aclexplode(
            coalesce(
              sequences.relacl,
              acldefault('S', sequences.relowner)
            )
          ) as sequence_grants
          where sequence_grants.grantee = 0::oid
        )
      )
  ),
  'PUBLIC, anon, and authenticated have no privilege on public sequences'
);

select ok(
  not exists (
    with migration_owner as (
      select relowner as role_oid
      from pg_class
      where oid = 'public.profiles'::regclass
    ),
    expected_defaults (schema_name, object_type) as (
      values
        ('public'::text, 'r'::"char"),
        ('public'::text, 'S'::"char"),
        ('public'::text, 'f'::"char"),
        ('private'::text, 'f'::"char")
    )
    select 1
    from expected_defaults
    cross join migration_owner
    cross join lateral aclexplode(
      coalesce(
        (
          select defaults.defaclacl
          from pg_default_acl as defaults
          where defaults.defaclrole = migration_owner.role_oid
            and defaults.defaclnamespace = 0::oid
            and defaults.defaclobjtype = expected_defaults.object_type
        ),
        acldefault(expected_defaults.object_type, migration_owner.role_oid)
      )
      || coalesce(
        (
          select defaults.defaclacl
          from pg_default_acl as defaults
          where defaults.defaclrole = migration_owner.role_oid
            and defaults.defaclnamespace = to_regnamespace(expected_defaults.schema_name)
            and defaults.defaclobjtype = expected_defaults.object_type
        ),
        '{}'::aclitem[]
      )
    ) as default_grants
    where default_grants.grantee in (
      0::oid,
      ('anon'::regrole)::oid,
      ('authenticated'::regrole)::oid
    )
  ),
  'migration-owner defaults deny PUBLIC, anon, and authenticated for public tables/sequences/functions and private functions'
);

select is(
  (
    select array_agg(triggers.tgname::text order by triggers.tgname)
    from pg_trigger as triggers
    where not triggers.tgisinternal
      and triggers.tgname ~ '(subtype_integrity|kind_check|delete_integrity_lock|acyclic)$'
  ),
  array[
    'navigation_items_acyclic'
  ]::text[],
  'the exact reviewed integrity-trigger spine is installed (S2 lead subtype triggers retired by C8)'
);

select ok(
  exists (
    select 1
    from public.services
    join public.service_localizations
      on service_localizations.service_id = services.id
    where services.id = '10000000-0000-4000-8000-000000000001'
      and services.publication_status = 'draft'
      and services.published_at is null
      and service_localizations.name like 'SYNTHETIC%'
  ),
  'service seed is unmistakably synthetic and draft'
);

select ok(
  exists (
    select 1
    from public.projects
    join public.project_localizations
      on project_localizations.project_id = projects.id
    where projects.id = '20000000-0000-4000-8000-000000000001'
      and projects.publication_status = 'draft'
      and projects.published_at is null
      and project_localizations.title like 'SYNTHETIC%'
  ),
  'project seed is unmistakably synthetic and draft'
);

select ok(
  exists (
    select 1
    from public.posts
    join public.post_localizations
      on post_localizations.post_id = posts.id
    where posts.id = '30000000-0000-4000-8000-000000000001'
      and posts.publication_status = 'draft'
      and posts.published_at is null
      and post_localizations.title like 'SYNTHETIC%'
  ),
  'post seed is unmistakably synthetic and draft'
);

select ok(
  exists (
    select 1
    from public.site_pages
    join public.page_localizations
      on page_localizations.page_id = site_pages.id
    where site_pages.id = '40000000-0000-4000-8000-000000000001'
      and site_pages.publication_status = 'draft'
      and site_pages.published_at is null
      and page_localizations.noindex
      and page_localizations.title like 'SYNTHETIC%'
  ),
  'page seed is synthetic, draft, and noindex'
);

select ok(
  exists (
    select 1
    from public.project_services
    where project_id = '20000000-0000-4000-8000-000000000001'
      and service_id = '10000000-0000-4000-8000-000000000001'
  ),
  'synthetic project/service relationship is reproducible'
);

select is(
  (
    (select count(*) from public.services where publication_status = 'published')
    + (select count(*) from public.projects where publication_status = 'published')
    + (select count(*) from public.project_categories where publication_status = 'published')
    + (select count(*) from public.posts where publication_status = 'published')
    + (select count(*) from public.post_categories where publication_status = 'published')
    + (select count(*) from public.team_members where publication_status = 'published')
    + (select count(*) from public.testimonials where publication_status = 'published')
    + (select count(*) from public.credentials where publication_status = 'published')
    + (select count(*) from public.site_pages where publication_status = 'published')
  ),
  0::bigint,
  'no seeded publishable record is public'
);

select is(
  (
    (select count(*) from public.services)
    + (select count(*) from public.projects)
    + (select count(*) from public.project_categories)
    + (select count(*) from public.posts)
    + (select count(*) from public.post_categories)
    + (select count(*) from public.team_members)
    + (select count(*) from public.testimonials)
    + (select count(*) from public.credentials)
    + (select count(*) from public.site_pages)
  ),
  4::bigint,
  'the seed contains only the four reviewed synthetic content identities'
);

select is((select count(*) from public.roles), 6::bigint, 'S3 seeds super_admin and admin; C10 adds four role templates');
select is(
  (select count(*) from public.permissions),
  63::bigint,
  'S3, S4, C4, C5, C6 and C9 seed only the bounded identity/security/CRM/finance/delivery/analytics permissions'
);
select is(
  (select count(*) from public.user_roles),
  0::bigint,
  'S3 seeds no real user-role assignment'
);
select is(
  (select count(*) from public.role_permissions),
  195::bigint,
  'S3–C9 map the approved permissions to super_admin and admin; C10 adds four role templates (project_manager 27, finance 18, content_editor 22, viewer 16)'
);
select col_is_pk(
  'public',
  'role_permissions',
  array['role_id', 'permission_id'],
  'role-permission pair is the composite primary key'
);
select col_is_pk(
  'public',
  'user_roles',
  array['user_id', 'role_id'],
  'user-role pair is the composite primary key'
);
select is(
  (select count(*) from public.lead_reference_counters),
  0::bigint,
  'C8 seeds no lead reference counters'
);

select is(
  (
    (select count(*) from public.team_members)
    + (select count(*) from public.testimonials)
    + (select count(*) from public.credentials)
    + (select count(*) from public.leads)
    + (select count(*) from public.audit_logs)
  ),
  0::bigint,
  'S2 seeds no people, proof claims, leads, or audit claims'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = any (array[
        'password', 'token', 'api_key', 'authorization_header', 'raw_payload',
        'before', 'after', 'lead_payload', 'attachment_content'
      ])
  ),
  0::bigint,
  'audit table has no broad credential, payload, or before/after columns'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = any (array[
        'id', 'actor_id', 'action', 'entity_type', 'entity_id', 'outcome',
        'metadata', 'request_id', 'occurred_at'
      ])
  ),
  9::bigint,
  'audit table contains the bounded structural column set'
);

select is(
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'private'
      and table_type = 'BASE TABLE'
  ),
  0::bigint,
  'private schema contains no data table in S2'
);

select * from finish();
rollback;
