begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

select lives_ok(
  $$insert into public.services (id, publication_status)
    values ('91000000-0000-4000-8000-000000000001', 'draft')$$,
  'a valid draft service is accepted'
);

select throws_ok(
  $$update public.services
    set sort_order = 1
    where id = '91000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'mutable records require an explicit version increment'
);

select throws_ok(
  $$update public.services
    set sort_order = 1, version = version + 2
    where id = '91000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'mutable records reject a skipped version'
);

select lives_ok(
  $$update public.services
    set sort_order = 1, version = version + 1
    where id = '91000000-0000-4000-8000-000000000001'$$,
  'a mutation with the expected version increment succeeds'
);

select is(
  (
    select version
    from public.services
    where id = '91000000-0000-4000-8000-000000000001'
  ),
  2,
  'the mutation boundary controls the monotonic version'
);

select throws_ok(
  $$insert into public.services (id, publication_status)
    values ('91000000-0000-4000-8000-000000000002', 'published')$$,
  '23514',
  null,
  'published service requires published_at'
);

select throws_ok(
  $$insert into public.services (id, publication_status)
    values ('91000000-0000-4000-8000-000000000003', 'approved')$$,
  '23514',
  null,
  'unapproved publication status is rejected'
);

select throws_ok(
  $$insert into public.services (id, sort_order)
    values ('91000000-0000-4000-8000-000000000004', -1)$$,
  '23514',
  null,
  'negative service order is rejected'
);

select throws_ok(
  $$insert into public.services (id, version)
    values ('91000000-0000-4000-8000-000000000005', 0)$$,
  '23514',
  null,
  'nonpositive service version is rejected'
);

insert into public.services (id)
values ('91000000-0000-4000-8000-000000000006');

select lives_ok(
  $$insert into public.service_localizations (
      service_id, locale, slug, name, body_blocks, schema_version
    ) values (
      '91000000-0000-4000-8000-000000000001',
      'und',
      'test-constraint-service',
      'SYNTHETIC Test Service',
      '[]'::jsonb,
      1
    )$$,
  'valid service localization is accepted'
);

select throws_ok(
  $$insert into public.service_localizations (service_id, locale, slug, name)
    values (
      '91000000-0000-4000-8000-000000000006',
      'und',
      'test-constraint-service',
      'SYNTHETIC Duplicate Slug'
    )$$,
  '23505',
  null,
  'localized slug is unique within a locale'
);

select throws_ok(
  $$insert into public.service_localizations (
      service_id, locale, slug, name, body_blocks
    ) values (
      '91000000-0000-4000-8000-000000000006',
      'fr',
      'test-block-shape',
      'SYNTHETIC Invalid Blocks',
      '{}'::jsonb
    )$$,
  '23514',
  null,
  'structured body blocks must be an array'
);

select lives_ok(
  $$insert into public.media_assets (
      id, bucket_id, object_path, mime_type, byte_size, checksum_sha256
    ) values (
      '92000000-0000-4000-8000-000000000001',
      'synthetic-test',
      '92000000-0000-4000-8000-000000000001/path-one.jpg',
      'image/jpeg',
      1,
      repeat('a', 64)
    )$$,
  'valid synthetic media metadata is accepted'
);

select throws_ok(
  $$insert into public.media_assets (
      id, bucket_id, object_path, mime_type, byte_size, checksum_sha256
    ) values (
      '92000000-0000-4000-8000-000000000001',
      'synthetic-test',
      '92000000-0000-4000-8000-000000000001/path-one.jpg',
      'image/jpeg',
      2,
      repeat('b', 64)
    )$$,
  '23505',
  null,
  'media asset identity and its UUID-rooted object path are unique'
);

select throws_ok(
  $$insert into public.media_assets (
      id, bucket_id, object_path, mime_type, byte_size, checksum_sha256
    ) values (
      '92000000-0000-4000-8000-000000000003',
      'synthetic-test',
      '92000000-0000-4000-8000-000000000003/path-three.jpg',
      'image/jpeg',
      0,
      repeat('c', 64)
    )$$,
  '23514',
  null,
  'nonpositive media byte size is rejected'
);

insert into public.roles (key, display_name)
values ('synthetic.test.role', 'SYNTHETIC Test Role');

select throws_ok(
  $$insert into public.roles (key, display_name)
    values ('synthetic.test.role', 'SYNTHETIC Duplicate Role')$$,
  '23505',
  null,
  'role keys are unique'
);

insert into public.permissions (key, display_name)
values ('synthetic.test.permission', 'SYNTHETIC Test Permission');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
cross join public.permissions
where roles.key = 'synthetic.test.role'
  and permissions.key = 'synthetic.test.permission';

select throws_ok(
  $$insert into public.role_permissions (role_id, permission_id)
    select roles.id, permissions.id
    from public.roles
    cross join public.permissions
    where roles.key = 'synthetic.test.role'
      and permissions.key = 'synthetic.test.permission'$$,
  '23505',
  null,
  'role-permission pair is unique'
);

insert into public.site_pages (id, page_key, template_key)
values
  ('93000000-0000-4000-8000-000000000001', 'synthetic-page-one', 'synthetic'),
  ('93000000-0000-4000-8000-000000000002', 'synthetic-page-two', 'synthetic');

insert into public.page_localizations (page_id, locale, path, title)
values (
  '93000000-0000-4000-8000-000000000001',
  'und',
  '/synthetic-constraint-path',
  'SYNTHETIC Test Page'
);

select throws_ok(
  $$insert into public.page_localizations (page_id, locale, path, title)
    values (
      '93000000-0000-4000-8000-000000000002',
      'und',
      '/synthetic-constraint-path',
      'SYNTHETIC Duplicate Path'
    )$$,
  '23505',
  null,
  'localized page paths are unique within a locale'
);

select throws_ok(
  $$insert into public.page_localizations (page_id, locale, path, title)
    values (
      '93000000-0000-4000-8000-000000000002',
      'not_a_locale',
      '/synthetic-invalid-locale',
      'SYNTHETIC Invalid Locale'
    )$$,
  '23514',
  null,
  'page locale syntax is bounded consistently'
);

select throws_ok(
  $$insert into public.page_sections (
      id, page_id, section_type, sort_order
    ) values (
      '93000000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000001',
      'synthetic-test',
      -1
    )$$,
  '23514',
  null,
  'negative page-section order is rejected'
);

select throws_ok(
  $$insert into public.page_sections (
      id, page_id, section_type, enabled
    ) values (
      '93000000-0000-4000-8000-000000000004',
      '93000000-0000-4000-8000-000000000001',
      'synthetic-unregistered-section',
      true
    )$$,
  '23514',
  null,
  'unregistered S2 page sections cannot be enabled'
);

select throws_ok(
  $$insert into public.credentials (
      id, valid_from, valid_to
    ) values (
      '94000000-0000-4000-8000-000000000001',
      date '2026-02-01',
      date '2026-01-01'
    )$$,
  '23514',
  null,
  'credential validity dates cannot reverse'
);

select throws_ok(
  $$insert into public.testimonials (
      id, publication_status, published_at
    ) values (
      '94000000-0000-4000-8000-000000000002',
      'published',
      now()
    )$$,
  '23514',
  null,
  'testimonials fail closed until evidence and approval gates exist'
);

select throws_ok(
  $$insert into public.credentials (
      id, publication_status, published_at
    ) values (
      '94000000-0000-4000-8000-000000000003',
      'published',
      now()
    )$$,
  '23514',
  null,
  'credentials fail closed until evidence and approval gates exist'
);

insert into public.navigation_menus (id, key)
values ('94000000-0000-4000-8000-000000000004', 'synthetic-locale-menu');

insert into public.navigation_items (
  id,
  menu_id,
  link_type,
  internal_path
)
values (
  '94000000-0000-4000-8000-000000000005',
  '94000000-0000-4000-8000-000000000004',
  'internal',
  '/synthetic-locale-item'
);

select throws_ok(
  $$insert into public.navigation_item_localizations (
      navigation_item_id, locale, label
    ) values (
      '94000000-0000-4000-8000-000000000005',
      'not_a_locale',
      'SYNTHETIC Invalid Locale'
    )$$,
  '23514',
  null,
  'navigation locale syntax is bounded consistently'
);

select * from finish();
rollback;
