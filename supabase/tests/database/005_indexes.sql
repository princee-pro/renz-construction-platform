begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

select ok(
  to_regclass('public.service_localizations_locale_slug_key') is not null,
  'service localization locale/slug unique index exists'
);
select ok(
  to_regclass('public.project_localizations_locale_slug_key') is not null,
  'project localization locale/slug unique index exists'
);
select ok(
  to_regclass('public.post_localizations_locale_slug_key') is not null,
  'post localization locale/slug unique index exists'
);
select ok(
  to_regclass('public.page_localizations_locale_path_unique') is not null,
  'page localization locale/path unique index exists'
);
select ok(
  to_regclass('public.media_assets_bucket_object_key') is not null,
  'media bucket/object unique index exists'
);
select ok(
  to_regclass('public.leads_reference_key') is not null,
  'lead reference unique index exists'
);
select ok(
  to_regclass('public.roles_key_key') is not null,
  'role key unique index exists'
);
select ok(
  to_regclass('public.permissions_key_key') is not null,
  'permission key unique index exists'
);
select ok(
  to_regclass('public.navigation_menus_key_unique') is not null,
  'navigation menu key unique index exists'
);
select ok(
  to_regclass('public.public_site_settings_namespace_key_unique') is not null,
  'public setting namespace/key unique index exists'
);

select ok(
  to_regclass('public.role_permissions_permission_role_idx') is not null,
  'role-permission reverse index exists'
);
select ok(
  to_regclass('public.user_roles_role_user_idx') is not null,
  'user-role reverse index exists'
);
select ok(
  to_regclass('public.project_services_service_project_idx') is not null,
  'project-service reverse index exists'
);
select ok(
  to_regclass('public.project_media_project_order_idx') is not null,
  'project-media ordering index exists'
);
select ok(
  to_regclass('public.navigation_items_menu_tree_order_idx') is not null,
  'navigation tree/order index exists'
);
select ok(
  to_regclass('public.leads_status_submitted_idx') is not null,
  'lead status/time index exists'
);
select ok(
  to_regclass('public.lead_notes_lead_created_idx') is not null,
  'lead-note ordering index exists'
);
select ok(
  to_regclass('public.audit_logs_entity_occurred_idx') is not null,
  'audit entity/time index exists'
);

select ok(
  pg_get_indexdef('public.role_permissions_permission_role_idx'::regclass)
    like '%(permission_id, role_id)%',
  'role-permission reverse index uses permission then role'
);

select ok(
  pg_get_indexdef('public.user_roles_role_user_idx'::regclass)
    like '%(role_id, user_id)%',
  'user-role reverse index uses role then user'
);

select ok(
  pg_get_indexdef('public.project_media_project_order_idx'::regclass)
    like '%(project_id, sort_order)%',
  'project-media index supports deterministic project ordering'
);

select ok(
  pg_get_indexdef('public.navigation_items_menu_tree_order_idx'::regclass)
    like '%(menu_id, parent_id, sort_order)%',
  'navigation index supports menu tree ordering'
);

select ok(
  not exists (
    select 1
    from pg_constraint as foreign_keys
    where foreign_keys.contype = 'f'
      and foreign_keys.confrelid = 'public.profiles'::regclass
      and not exists (
        select 1
        from pg_index as indexes
        where indexes.indrelid = foreign_keys.conrelid
          and indexes.indisvalid
          and indexes.indisready
          and indexes.indkey[0] = foreign_keys.conkey[1]
      )
  ),
  'every profile-reference FK has a leading maintenance index'
);

select ok(
  (
    select pg_get_expr(indexes.indpred, indexes.indrelid)
      like '%publication_status%published%'
      and pg_get_expr(indexes.indpred, indexes.indrelid) not like '%now()%'
    from pg_index as indexes
    where indexes.indexrelid = 'public.services_published_sort_idx'::regclass
  ),
  'published-service partial index uses a stable publication predicate'
);

select is(
  (
    select count(*)
    from pg_index as indexes
    join pg_class as relations on relations.oid = indexes.indrelid
    join pg_namespace as namespaces on namespaces.oid = relations.relnamespace
    where namespaces.nspname = 'public'
      and indexes.indpred is not null
      and pg_get_expr(indexes.indpred, indexes.indrelid) ~* '\mnow\s*\('
  ),
  0::bigint,
  'no public partial-index predicate contains volatile now()'
);

select * from finish();
rollback;
