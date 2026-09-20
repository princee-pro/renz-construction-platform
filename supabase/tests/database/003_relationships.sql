begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into public.projects (id)
values ('95000000-0000-4000-8000-000000000001');
insert into public.project_categories (id)
values ('95000000-0000-4000-8000-000000000002');
insert into public.project_category_assignments (project_id, category_id)
values (
  '95000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000002'
);

select throws_ok(
  $$delete from public.project_categories
    where id = '95000000-0000-4000-8000-000000000002'$$,
  '23503',
  null,
  'referenced project category deletion is restricted'
);

delete from public.projects
where id = '95000000-0000-4000-8000-000000000001';

select is(
  (
    select count(*)
    from public.project_category_assignments
    where project_id = '95000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'project deletion cascades its category assignments'
);

insert into public.services (id)
values ('95000000-0000-4000-8000-000000000003');
insert into public.projects (id)
values ('95000000-0000-4000-8000-000000000004');
insert into public.project_services (project_id, service_id)
values (
  '95000000-0000-4000-8000-000000000004',
  '95000000-0000-4000-8000-000000000003'
);

select throws_ok(
  $$delete from public.services
    where id = '95000000-0000-4000-8000-000000000003'$$,
  '23503',
  null,
  'referenced service deletion is restricted'
);

select lives_ok(
  $$delete from public.projects
    where id = '95000000-0000-4000-8000-000000000004'$$,
  'project deletion cascades its service mappings'
);

select is(
  (
    select count(*)
    from public.project_services
    where project_id = '95000000-0000-4000-8000-000000000004'
  ),
  0::bigint,
  'no project-service mapping survives its project'
);

insert into public.media_assets (
  id,
  bucket_id,
  object_path,
  mime_type,
  byte_size,
  checksum_sha256
)
values (
  '95000000-0000-4000-8000-000000000005',
  'synthetic-test',
  '95000000-0000-4000-8000-000000000005/restricted-hero.jpg',
  'image/jpeg',
  1,
  repeat('d', 64)
);
insert into public.services (id, hero_asset_id)
values (
  '95000000-0000-4000-8000-000000000006',
  '95000000-0000-4000-8000-000000000005'
);

select throws_ok(
  $$delete from public.media_assets
    where id = '95000000-0000-4000-8000-000000000005'$$,
  '23503',
  null,
  'referenced hero media deletion is restricted'
);

insert into public.projects (id)
values
  ('95000000-0000-4000-8000-000000000007'),
  ('95000000-0000-4000-8000-000000000008');
insert into public.project_stages (id, project_id, title)
values (
  '95000000-0000-4000-8000-000000000009',
  '95000000-0000-4000-8000-000000000007',
  'SYNTHETIC Stage'
);
insert into public.media_assets (
  id,
  bucket_id,
  object_path,
  mime_type,
  byte_size,
  checksum_sha256
)
values (
  '95000000-0000-4000-8000-000000000010',
  'synthetic-test',
  '95000000-0000-4000-8000-000000000010/cross-project-stage.jpg',
  'image/jpeg',
  1,
  repeat('e', 64)
);

set constraints project_media_stage_fk immediate;

select throws_ok(
  $$insert into public.project_media (
      id, project_id, media_asset_id, stage_id, role
    ) values (
      '95000000-0000-4000-8000-000000000011',
      '95000000-0000-4000-8000-000000000008',
      '95000000-0000-4000-8000-000000000010',
      '95000000-0000-4000-8000-000000000009',
      'synthetic-test'
    )$$,
  '23503',
  null,
  'project media cannot reference another project stage'
);

insert into public.projects (id)
values ('95000000-0000-4000-8000-000000000017');
insert into public.project_stages (id, project_id, title)
values (
  '95000000-0000-4000-8000-000000000018',
  '95000000-0000-4000-8000-000000000017',
  'SYNTHETIC Deletion Stage'
);
insert into public.media_assets (
  id,
  bucket_id,
  object_path,
  mime_type,
  byte_size,
  checksum_sha256
)
values (
  '95000000-0000-4000-8000-000000000019',
  'synthetic-test',
  '95000000-0000-4000-8000-000000000019/project-graph-deletion.jpg',
  'image/jpeg',
  1,
  repeat('f', 64)
);
insert into public.project_media (
  id,
  project_id,
  media_asset_id,
  stage_id,
  role
)
values (
  '95000000-0000-4000-8000-000000000020',
  '95000000-0000-4000-8000-000000000017',
  '95000000-0000-4000-8000-000000000019',
  '95000000-0000-4000-8000-000000000018',
  'synthetic-test'
);

set constraints project_media_stage_fk immediate;

select throws_ok(
  $$delete from public.project_stages
    where id = '95000000-0000-4000-8000-000000000018'$$,
  '23503',
  null,
  'direct project-stage deletion remains blocked while media references it'
);

set constraints project_media_stage_fk deferred;

select lives_ok(
  $$delete from public.projects
    where id = '95000000-0000-4000-8000-000000000017'$$,
  'whole-project deletion can cascade a stage-linked media graph'
);

select lives_ok(
  $$set constraints project_media_stage_fk immediate$$,
  'whole-project deletion satisfies the deferred stage/media reference'
);

select is(
  (
    (select count(*) from public.project_stages
      where project_id = '95000000-0000-4000-8000-000000000017')
    +
    (select count(*) from public.project_media
      where project_id = '95000000-0000-4000-8000-000000000017')
  ),
  0::bigint,
  'whole-project deletion leaves no owned stage or media assignment'
);

insert into public.navigation_menus (id, key)
values ('95000000-0000-4000-8000-000000000012', 'synthetic-test-menu');
insert into public.navigation_items (
  id,
  menu_id,
  parent_id,
  link_type,
  internal_path
)
values
  (
    '95000000-0000-4000-8000-000000000013',
    '95000000-0000-4000-8000-000000000012',
    null,
    'internal',
    '/synthetic-parent'
  ),
  (
    '95000000-0000-4000-8000-000000000014',
    '95000000-0000-4000-8000-000000000012',
    '95000000-0000-4000-8000-000000000013',
    'internal',
    '/synthetic-child'
  );

select throws_ok(
  $$update public.navigation_items
    set parent_id = id,
        version = version + 1
    where id = '95000000-0000-4000-8000-000000000014'$$,
  '23514',
  null,
  'navigation rejects a direct self-cycle'
);

select throws_ok(
  $$delete from public.navigation_items
    where id = '95000000-0000-4000-8000-000000000013'$$,
  '23503',
  null,
  'navigation parent deletion is restricted while children exist'
);

select throws_ok(
  $$update public.navigation_items
    set parent_id = '95000000-0000-4000-8000-000000000014',
        version = version + 1
    where id = '95000000-0000-4000-8000-000000000013'$$,
  '23514',
  null,
  'navigation rejects a multi-node cycle'
);

insert into public.leads (id, reference, lead_type, source_channel, full_name, email, email_normalized, summary)
values (
  '95000000-0000-4000-8000-000000000015',
  'RENZ-LEAD-2026-999901',
  'general',
  'manual',
  'SYNTHETIC relationship lead',
  'synthetic-relationship@example.test',
  'synthetic-relationship@example.test',
  'SYNTHETIC subject'
);
insert into public.lead_attachments (lead_id, bucket_id, object_path, original_filename, detected_mime_type, byte_size, checksum_sha256)
values (
  '95000000-0000-4000-8000-000000000015',
  'lead-intake',
  '95000000-0000-4000-8000-000000000015/95000000-0000-4000-8000-000000000016.jpg',
  'synthetic.jpg',
  'image/jpeg',
  4,
  repeat('a', 64)
);

select throws_ok(
  $$delete from public.leads
    where id = '95000000-0000-4000-8000-000000000015'$$,
  '23503',
  null,
  'lead deletion is restricted while attachment evidence exists'
);

insert into public.services (id)
values ('95000000-0000-4000-8000-000000000016');
insert into public.service_localizations (service_id, locale, slug, name)
values (
  '95000000-0000-4000-8000-000000000016',
  'und',
  'synthetic-cascade-localization',
  'SYNTHETIC Cascade Localization'
);
delete from public.services
where id = '95000000-0000-4000-8000-000000000016';

select is(
  (
    select count(*)
    from public.service_localizations
    where service_id = '95000000-0000-4000-8000-000000000016'
  ),
  0::bigint,
  'service deletion cascades owned localizations'
);

select is(
  (
    select confdeltype::text
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_author_id_fkey'
  ),
  'n',
  'post author deletion action is SET NULL'
);

insert into auth.users (id)
values ('95000000-0000-4000-8000-000000000021');
insert into public.roles (key, display_name, created_by, updated_by)
values (
  'synthetic-attribution-delete',
  'SYNTHETIC Attribution Delete',
  '95000000-0000-4000-8000-000000000021',
  '95000000-0000-4000-8000-000000000021'
);

delete from auth.users
where id = '95000000-0000-4000-8000-000000000021';

select ok(
  exists (
    select 1
    from public.roles
    where key = 'synthetic-attribution-delete'
      and created_by is null
      and updated_by is null
      and version > 1
  ),
  'profile deletion preserves attributed history and advances its version'
);

select is(
  (
    select confdeltype::text
    from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and conname = 'user_roles_role_id_fkey'
  ),
  'r',
  'assigned role deletion action is RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.project_media'::regclass
      and conname = 'project_media_stage_fk'
      and confdeltype = 'a'
      and condeferrable
      and condeferred
  ),
  'project-stage reference is deferred NO ACTION for safe graph deletion'
);

select is(
  (
    select confdeltype::text
    from pg_constraint
    where conrelid = 'public.lead_attachments'::regclass
      and conname = 'lead_attachments_lead_id_fkey'
  ),
  'r',
  'lead attachment deletion action is RESTRICT'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and confrelid = 'auth.users'::regclass
      and contype = 'f'
      and confdeltype = 'c'
  ),
  'profile primary key references auth.users with intentional cascade'
);

select * from finish();
rollback;
