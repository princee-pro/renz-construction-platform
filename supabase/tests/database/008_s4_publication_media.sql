begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

select has_table(
  'public',
  'evidence_records',
  'S4 evidence records exist as a first-class governance table'
);

select is(
  private.content_blocks_are_valid('[{"type":"paragraph","text":"SYNTHETIC safe copy"}]'::jsonb),
  true,
  'the exact safe structured-content registry is accepted'
);

select is(
  private.content_json_is_safe('[{"html":"<script>alert(1)</script>"}]'::jsonb),
  false,
  'raw HTML/script content is rejected by the safe-content guard'
);

select is(
  private.content_json_is_safe('[{"type":"paragraph","text":"<strong>SYNTHETIC raw markup</strong>"}]'::jsonb),
  false,
  'non-executable raw HTML is also rejected by the safe-content guard'
);

select is(
  private.content_blocks_are_valid('[{"type":"unregistered","text":"SYNTHETIC arbitrary block"}]'::jsonb),
  false,
  'unregistered structured-content block types are rejected'
);

select is(
  private.content_blocks_are_valid('[{"type":"paragraph","text":""}]'::jsonb),
  false,
  'structured-content text cannot be empty'
);

insert into public.site_pages (id, page_key, template_key)
values
  ('81000000-0000-4000-8000-000000000030', 's4-scope-home', 'home'),
  ('81000000-0000-4000-8000-000000000031', 's4-scope-general', 'general');

select throws_ok(
  $$insert into public.page_sections (page_id, section_type, enabled)
    values ('81000000-0000-4000-8000-000000000031', 'hero', true)$$,
  '23514',
  null,
  'homepage sections cannot be attached to a general page'
);

select throws_ok(
  $$insert into public.page_sections (page_id, section_type, enabled)
    values ('81000000-0000-4000-8000-000000000030', 'rich_text', true)$$,
  '23514',
  null,
  'page-only sections cannot be attached to the homepage'
);

select throws_ok(
  $$insert into public.page_sections (page_id, section_type, config)
    values (
      '81000000-0000-4000-8000-000000000030',
      'hero',
      '{"component":"SYNTHETIC arbitrary component"}'::jsonb
    )$$,
  '23514',
  null,
  'page sections reject config without an admitted versioned schema'
);

select throws_ok(
  $$insert into public.page_localizations (
      page_id, locale, path, title, canonical_override
    ) values (
      '81000000-0000-4000-8000-000000000031',
      'en',
      '/s4-unsafe-canonical',
      'SYNTHETIC unsafe canonical',
      'javascript:synthetic'
    )$$,
  '23514',
  null,
  'public canonical overrides reject executable or non-HTTPS URLs'
);

select throws_ok(
  $$insert into public.page_localizations (
      page_id, locale, path, title
    ) values (
      '81000000-0000-4000-8000-000000000031',
      'en',
      '/s4\unsafe-path',
      'SYNTHETIC unsafe path'
    )$$,
  '23514',
  null,
  'public page paths reject ambiguous backslashes'
);

insert into public.navigation_menus (id, key)
values ('81000000-0000-4000-8000-000000000032', 's4-url-guard');

select throws_ok(
  $$insert into public.navigation_items (menu_id, link_type, internal_path)
    values (
      '81000000-0000-4000-8000-000000000032',
      'internal',
      '/\synthetic.example'
    )$$,
  '23514',
  null,
  'ambiguous backslash navigation paths are rejected'
);

select throws_ok(
  $$insert into public.public_site_settings (namespace, key, value)
    values (
      'contact.public',
      'directions_url',
      to_jsonb(('https://synthetic.example' || chr(92) || '@other.example')::text)
    )$$,
  '23514',
  null,
  'allow-listed URL settings reject ambiguous backslashes even while private'
);

select throws_ok(
  $$insert into public.media_assets (
      id, bucket_id, object_path, mime_type, byte_size, checksum_sha256, provenance_class
    ) values (
      '81000000-0000-4000-8000-000000000040',
      'synthetic-test',
      '../synthetic.jpg',
      'image/jpeg',
      4,
      repeat('a', 64),
      'synthetic_test'
    )$$,
  '23514',
  null,
  'synthetic media cannot bypass UUID-rooted path validation'
);

select throws_ok(
  $$insert into public.media_assets (
      id, bucket_id, object_path, mime_type, byte_size, checksum_sha256, provenance_class
    ) values (
      '81000000-0000-4000-8000-000000000041',
      'synthetic-test',
      '81000000-0000-4000-8000-000000000041/payload.svg',
      'image/svg+xml',
      4,
      repeat('b', 64),
      'synthetic_test'
    )$$,
  '23514',
  null,
  'synthetic media cannot bypass the admitted MIME set'
);

select throws_ok(
  $$insert into public.media_assets (
      id, bucket_id, object_path, mime_type, byte_size, checksum_sha256,
      media_kind, provenance_class
    ) values (
      '81000000-0000-4000-8000-000000000042',
      'synthetic-test',
      '81000000-0000-4000-8000-000000000042/mismatch.jpg',
      'image/jpeg',
      4,
      repeat('c', 64),
      'video',
      'synthetic_test'
    )$$,
  '23514',
  null,
  'media kind must match its admitted MIME family'
);

select throws_ok(
  $$insert into public.services (id, publication_status, published_at)
    values ('81000000-0000-4000-8000-000000000001', 'published', now())$$,
  '23514',
  null,
  'direct publication bypasses are rejected even when published_at is present'
);

insert into public.services (id)
values ('81000000-0000-4000-8000-000000000002');

select throws_ok(
  $$insert into public.service_localizations (
      service_id, locale, slug, name, body_blocks
    ) values (
      '81000000-0000-4000-8000-000000000002',
      'en',
      's4-unsafe-content',
      'SYNTHETIC Unsafe Service',
      '[{"html":"<script>alert(1)</script>"}]'::jsonb
    )$$,
  '23514',
  null,
  'localized content rejects raw executable markup'
);

insert into auth.users (id)
values ('81000000-0000-4000-8000-000000000010');

insert into public.evidence_records (
  id,
  fact_claim,
  source_type,
  source_reference,
  reviewer_id,
  verification_state,
  verified_at,
  consent_required,
  consent_state,
  approved_public_wording
)
values (
  '81000000-0000-4000-8000-000000000011',
  'SYNTHETIC test evidence supports a bounded test record.',
  'client_supplied',
  'SYNTHETIC test source only',
  '81000000-0000-4000-8000-000000000010',
  'verified',
  now(),
  false,
  'not_required',
  'SYNTHETIC approved wording only.'
);

select is(
  (select verification_state from public.evidence_records where id = '81000000-0000-4000-8000-000000000011'),
  'verified',
  'verified evidence persists its independent evidence state'
);

insert into public.services (id)
values ('81000000-0000-4000-8000-000000000003');

insert into public.service_localizations (
  service_id,
  locale,
  slug,
  name,
  summary,
  body_blocks,
  schema_version,
  seo_title,
  seo_description,
  scope,
  deliverables,
  exclusions,
  delivery_wording
)
values (
  '81000000-0000-4000-8000-000000000003',
  'en',
  's4-synthetic-service',
  'SYNTHETIC Test Service',
  'SYNTHETIC service summary for a database-only publication test.',
  '[{"type":"paragraph","text":"SYNTHETIC service body"}]'::jsonb,
  1,
  'SYNTHETIC Service | Test',
  'SYNTHETIC service description for test-only publication readiness.',
  'SYNTHETIC bounded scope',
  'SYNTHETIC bounded deliverables',
  'SYNTHETIC exclusions',
  'SYNTHETIC delivery wording'
);

insert into public.service_evidence (service_id, evidence_id, required, purpose)
values (
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000011',
  true,
  'SYNTHETIC readiness test'
);

select is(
  private.publication_failures('service', '81000000-0000-4000-8000-000000000003'::uuid),
  '[]'::jsonb,
  'a complete service with current evidence is publication-ready'
);

select set_config('renz.s4.publication_command', '1', true);
update public.services
set publication_status = 'published',
    published_at = now(),
    version = version + 1
where id = '81000000-0000-4000-8000-000000000003';
select set_config('renz.s4.publication_command', '', true);

select is(
  private.is_public_content('service', '81000000-0000-4000-8000-000000000003'::uuid),
  true,
  'published content is publicly eligible only after readiness succeeds'
);

select ok(
  exists (
    select 1
    from public.published_services
    where id = '81000000-0000-4000-8000-000000000003'
  ),
  'the published service is visible through the explicit public projection'
);

insert into public.projects (
  id,
  public_location,
  public_location_granularity,
  project_type,
  project_scope,
  renz_role,
  reviewed_by,
  reviewed_at
)
values (
  '81000000-0000-4000-8000-000000000004',
  'SYNTHETIC test region',
  'region',
  'SYNTHETIC test type',
  'SYNTHETIC bounded project scope',
  'SYNTHETIC test delivery role',
  '81000000-0000-4000-8000-000000000010',
  now()
);

insert into public.project_localizations (
  project_id,
  locale,
  slug,
  title,
  summary,
  seo_title,
  seo_description
)
values (
  '81000000-0000-4000-8000-000000000004',
  'en',
  's4-synthetic-project',
  'SYNTHETIC Test Project',
  'SYNTHETIC project summary for a database-only publication test.',
  'SYNTHETIC Project | Test',
  'SYNTHETIC project description for test-only publication readiness.'
);

insert into public.project_services (project_id, service_id)
values (
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000003'
);

insert into public.project_evidence (project_id, evidence_id, required, purpose)
values (
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000011',
  true,
  'SYNTHETIC project readiness test'
);

select is(
  private.publication_failures('project', '81000000-0000-4000-8000-000000000004'::uuid),
  '[]'::jsonb,
  'a project requires and accepts a published related service plus current evidence'
);

select set_config('renz.s4.publication_command', '1', true);
update public.projects
set publication_status = 'published',
    published_at = now(),
    version = version + 1
where id = '81000000-0000-4000-8000-000000000004';
select set_config('renz.s4.publication_command', '', true);

select is(
  private.is_public_content('project', '81000000-0000-4000-8000-000000000004'::uuid),
  true,
  'a reviewed project becomes public only through the guarded publication boundary'
);

select ok(
  exists (
    select 1
    from public.published_projects
    where id = '81000000-0000-4000-8000-000000000004'
  ),
  'the published project is visible through the explicit public projection'
);

insert into public.media_assets (
  id,
  bucket_id,
  object_path,
  mime_type,
  byte_size,
  checksum_sha256,
  media_kind,
  provenance_class
)
values (
  '81000000-0000-4000-8000-000000000020',
  'editorial-originals',
  '81000000-0000-4000-8000-000000000020/original.jpg',
  'image/jpeg',
  4,
  repeat('a', 64),
  'image',
  'concept_demo'
);

select throws_ok(
  $$update public.media_assets
    set storage_state = 'public_eligible', version = version + 1
    where id = '81000000-0000-4000-8000-000000000020'$$,
  '23514',
  null,
  'concept media cannot be promoted to public evidence'
);

select throws_ok(
  $$insert into public.project_media (
      id, project_id, media_asset_id, role, public_status
    ) values (
      '81000000-0000-4000-8000-000000000021',
      '81000000-0000-4000-8000-000000000004',
      '81000000-0000-4000-8000-000000000020',
      'gallery',
      'eligible'
    )$$,
  '23514',
  null,
  'project media promotion must use the reviewed command boundary'
);

select set_config('renz.s4.media_command', '1', true);
insert into public.project_media (
  id, project_id, media_asset_id, role, public_status
)
values (
  '81000000-0000-4000-8000-000000000021',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000020',
  'gallery',
  'eligible'
);
select set_config('renz.s4.media_command', '', true);

select is(
  private.is_public_content('project', '81000000-0000-4000-8000-000000000004'::uuid),
  false,
  'a published project is withdrawn from the public projection when an eligible media relation is invalid'
);

select throws_ok(
  $$insert into public.public_site_settings (namespace, key, value, public_status)
    values ('unknown', 'secret', '"SYNTHETIC"'::jsonb, 'eligible')$$,
  '23514',
  null,
  'unknown public settings cannot be promoted through the allow-list'
);

select is(
  public.publish_content('service', '81000000-0000-4000-8000-000000000003'::uuid, 2)->'reasons'->0->>'code',
  'not_authorized',
  'publication commands fail closed without an authenticated AAL2 actor'
);

select has_table(
  'storage',
  'objects',
  'Supabase Storage objects remain provider-managed and available to the policy layer'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'Storage objects retain provider-managed row-level security'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 's4_editorial_objects_select'
      and roles = array['authenticated']::name[]
  ),
  'Storage reads use the bounded authenticated media.read policy'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 's4_editorial_objects_insert'
      and roles = array['authenticated']::name[]
  ),
  'Storage uploads use the bounded authenticated media.upload policy'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 's4_editorial_objects_delete'
      and roles = array['authenticated']::name[]
  ),
  'Storage deletion is limited to the reviewed media.manage policy'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 's4_editorial_objects_%'
      and roles @> array['anon']::name[]
  ),
  'S4 Storage policies never grant the anonymous role'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('published_services', 'published_projects')
      and column_name in ('internal_notes', 'rights_status', 'reviewer_id', 'review_due_at')
  ),
  'public projections omit evidence, rights, and reviewer internals'
);

select ok(
  not exists (
    select 1
    from (values
      ('public.services'), ('public.service_localizations'),
      ('public.projects'), ('public.project_localizations'),
      ('public.project_categories'), ('public.project_category_localizations'),
      ('public.project_category_assignments'), ('public.project_services'),
      ('public.project_stages'), ('public.project_media'),
      ('public.project_media_localizations'), ('public.posts'),
      ('public.post_localizations'), ('public.post_categories'),
      ('public.post_category_localizations'), ('public.post_category_assignments'),
      ('public.team_members'), ('public.team_member_localizations'),
      ('public.testimonials'), ('public.testimonial_localizations'),
      ('public.testimonial_verifications'), ('public.credentials'),
      ('public.credential_localizations'), ('public.credential_verifications'),
      ('public.site_pages'), ('public.page_localizations'), ('public.page_sections'),
      ('public.page_section_projects'), ('public.page_section_services'),
      ('public.page_section_media'), ('public.navigation_menus'),
      ('public.navigation_items'), ('public.navigation_item_localizations'),
      ('public.public_site_settings'), ('public.content_section_registry'),
      ('public.public_setting_registry'), ('public.evidence_records'),
      ('public.service_evidence'), ('public.project_evidence'),
      ('public.post_evidence'), ('public.page_evidence'),
      ('public.team_member_evidence'), ('public.testimonial_evidence'),
      ('public.credential_evidence'), ('public.navigation_evidence'),
      ('public.setting_evidence'), ('public.material_claims'),
      ('public.claim_evidence'), ('public.project_claims'),
      ('public.service_claims'), ('public.post_claims'), ('public.page_claims'),
      ('public.team_member_claims'), ('public.credential_claims'),
      ('public.media_assets')
    ) as base_tables(table_name)
    where has_table_privilege('anon', base_tables.table_name, 'select')
  ),
  'anonymous has no SELECT privilege on any editorial or evidence base table'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.media_assets'::regclass
      and conname = 'media_assets_s4_provenance_class_check'
      and pg_get_constraintdef(oid) like '%production_asset%'
  ),
  'media provenance includes an explicit future production-asset class'
);

select * from finish();
rollback;
