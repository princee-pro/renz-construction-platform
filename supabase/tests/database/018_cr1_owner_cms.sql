-- CR1 owner website control: permissions, default-deny RLS on the page
-- tables, reserved routes, XSS refusal at the facade, draft/published
-- snapshot isolation, optimistic concurrency, publish / restore / unpublish,
-- navigation dependency checks, slug aliases and RBAC negatives
-- (AAL1, disabled account, read-only role, editor without publish).
begin;
select plan(76);

-- Inventory ------------------------------------------------------------
select is((select count(*) from public.permissions where key in ('website.read', 'website.pages.write', 'website.layout.write', 'website.publish', 'website.navigation.write', 'website.seo.write'))::bigint, 6::bigint, 'six website permissions are seeded');
select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id where r.key = 'admin' and p.key = 'website.pages.write'), 'admin (editor) holds website.pages.write');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id where r.key = 'admin' and p.key = 'website.publish'), 'admin (editor) does not hold website.publish');
select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id where r.key = 'super_admin' and p.key = 'website.publish'), 'super_admin holds website.publish');
select is((select count(*) from public.website_pages where status = 'published')::bigint, 12::bigint, 'the approved pages ship published (10 routes + 2 globals)');
select ok((select bool_and(published_revision_id is not null) from public.website_pages where status = 'published'), 'every published page points at a frozen revision');
select ok((select count(*) from public.website_section_types where system_module) >= 8, 'system modules are registered section types');

-- RLS: default deny on every CMS table -----------------------------------
create function pg_temp.as_actor(actor uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated', 'aal', aal)::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;
create temporary table cr1 (key text primary key, value text not null);
create function pg_temp.v(k text) returns text language sql as $$ select value from cr1 where key = k $$;

set role anon;
select throws_ok($$ select count(*) from public.website_pages $$, '42501', null, 'anon cannot read website_pages directly');
select throws_ok($$ select count(*) from public.website_page_sections $$, '42501', null, 'anon cannot read website_page_sections directly');
select throws_ok($$ select count(*) from public.website_page_revisions $$, '42501', null, 'anon cannot read website_page_revisions directly');
select throws_ok($$ select count(*) from public.website_route_aliases $$, '42501', null, 'anon cannot read website_route_aliases directly');
set role authenticated;
select throws_ok($$ select count(*) from public.website_pages $$, '42501', null, 'authenticated cannot read website_pages directly');
select throws_ok($$ insert into public.website_pages (page_key, page_type, path, title) values ('x', 'custom', '/x', 'x') $$, '42501', null, 'authenticated cannot insert website_pages directly');
reset role;

-- Public facade (anon) ---------------------------------------------------
select pg_temp.as_anon();
select ok((select public.public_website_page('/') ->> 'sections') is not null, 'anon reads the published home page through the facade');
select is((select (public.public_website_page('/') -> 'revision' ->> 'no')::integer), 1, 'the public home page is revision 1');
select ok((select jsonb_array_length(public.public_website_page('/') -> 'sections') >= 8), 'the home page carries its approved sections');
select is(public.public_website_page('/does-not-exist'), null, 'an unknown path is null (404)');
select is((public.public_website_page('/_globals') -> 'page' ->> 'page_type'), 'global', 'global content is served to the public layout through the same snapshot facade (never routable: the slug rules refuse a leading underscore)');
select is((select count(*) from jsonb_array_elements(public.public_website_pages()) as page where page ->> 'path' like '/\_%'), 0::bigint, 'the public page index never lists global pages');
select is(public.public_website_route_alias('/projects/experience-study'), '/projects/ridge-residence', 'the seeded slug alias resolves for visitors');
select pg_temp.as_postgres();

-- Actors ---------------------------------------------------------------
insert into auth.users (id) values
  ('98000000-0000-4000-8000-0000000000a1'), ('98000000-0000-4000-8000-0000000000a2'),
  ('98000000-0000-4000-8000-0000000000a3'), ('98000000-0000-4000-8000-0000000000a4');
update public.profiles set account_status = 'active', display_name = 'SYNTHETIC CR1 Staff ' || right(id::text, 1), version = version + 1
where id in ('98000000-0000-4000-8000-0000000000a1', '98000000-0000-4000-8000-0000000000a2', '98000000-0000-4000-8000-0000000000a3');
update public.profiles set account_status = 'disabled', version = version + 1 where id = '98000000-0000-4000-8000-0000000000a4';
insert into public.user_roles (user_id, role_id) select '98000000-0000-4000-8000-0000000000a1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id) select unnest(array['98000000-0000-4000-8000-0000000000a2', '98000000-0000-4000-8000-0000000000a4']::uuid[]), id from public.roles where key = 'admin';
insert into public.roles (key, display_name) values ('cr1-test-website-read', 'SYNTHETIC website read only');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where roles.key = 'cr1-test-website-read' and permissions.key in ('website.read');
insert into public.user_roles (user_id, role_id) select '98000000-0000-4000-8000-0000000000a3', id from public.roles where key = 'cr1-test-website-read';
delete from public.notifications;

-- RBAC negatives ---------------------------------------------------------
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a1', 'aal1');
select is((public.create_website_page('synthetic-aal1', 'AAL1 attempt') -> 'reasons' -> 0 ->> 'code'), 'not_authorized', 'a super admin at AAL1 cannot create pages');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a4', 'aal2');
select is((public.create_website_page('synthetic-disabled', 'Disabled attempt') -> 'reasons' -> 0 ->> 'code'), 'not_authorized', 'a disabled admin cannot create pages');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a3', 'aal2');
select ok(jsonb_array_length(public.admin_list_website_pages()) >= 12, 'website.read alone can list pages');
select is((public.create_website_page('synthetic-readonly', 'Read-only attempt') -> 'reasons' -> 0 ->> 'code'), 'not_authorized', 'website.read alone cannot create pages');
select is((public.publish_website_page((select id from public.website_pages where path = '/'), 2) -> 'reasons' -> 0 ->> 'code'), 'not_authorized', 'website.read alone cannot publish');
select pg_temp.as_anon();
select is((public.create_website_page('synthetic-anon', 'Anon attempt') -> 'reasons' -> 0 ->> 'code'), 'not_authorized', 'anon cannot create pages');
select throws_ok($$ select public.admin_get_website_page((select id from public.website_pages where path = '/')) $$, '42501', null, 'anon cannot read drafts');
select pg_temp.as_postgres();

-- Reserved routes and slug safety ------------------------------------------
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a2', 'aal2');
select is((public.create_website_page('admin', 'Admin') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', '"admin" is reserved');
select is((public.create_website_page('api', 'API') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', '"api" is reserved');
select is((public.create_website_page('services', 'Services') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', '"services" is reserved');
select is((public.create_website_page('i', 'Invoice share') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', '"i" (invoice share) is reserved');
select is((public.create_website_page('po', 'PO share') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', '"po" (purchase order share) is reserved');
select is((public.create_website_page('Synthetic Page', 'Bad slug') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', 'spaces and capitals are not a slug');
select is((public.create_website_page('../etc', 'Traversal') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', 'path traversal is not a slug');
select is((public.create_website_page('about', 'About clash') -> 'reasons' -> 0 ->> 'code'), 'reserved_route', 'an existing content route cannot be claimed');
select is((public.create_website_page('synthetic-approach', '<b>Title</b>') -> 'reasons' -> 0 ->> 'code'), 'invalid_title', 'markup in a title is refused');

-- A real custom page (editor) ---------------------------------------------
insert into cr1 select 'page', (public.create_website_page('synthetic-approach', 'Synthetic Approach') ->> 'id');
select ok(pg_temp.v('page') is not null, 'an editor creates a custom page draft');
select is((select status from public.website_pages where id = pg_temp.v('page')::uuid), 'draft', 'a new page starts as a draft');
select is((select count(*) from public.website_page_sections where page_id = pg_temp.v('page')::uuid)::bigint, 1::bigint, 'a new page starts with a masthead');
select is((public.create_website_page('synthetic-approach', 'Duplicate') -> 'reasons' -> 0 ->> 'code'), 'duplicate_route', 'the same address cannot be claimed twice');

-- XSS refused at the facade -------------------------------------------------
insert into cr1 select 'section', id::text from public.website_page_sections where page_id = pg_temp.v('page')::uuid;
select is((public.update_website_section(pg_temp.v('section')::uuid, 1, jsonb_build_object('title', '<script>alert(1)</script>'), 'default', 'paper', 'standard', 'standard', false) -> 'reasons' -> 0 ->> 'code'), 'unsafe_content', 'a script tag in section content is refused');
select is((public.update_website_section(pg_temp.v('section')::uuid, 1, jsonb_build_object('title', 'Fine', 'html', 'x'), 'default', 'paper', 'standard', 'standard', false) -> 'reasons' -> 0 ->> 'code'), 'unsafe_content', 'a raw html key is refused');
select is((public.update_website_section(pg_temp.v('section')::uuid, 1, jsonb_build_object('title', 'Fine', 'link', 'javascript:alert(1)'), 'default', 'paper', 'standard', 'standard', false) -> 'reasons' -> 0 ->> 'code'), 'unsafe_content', 'a javascript: link is refused');
select is((public.update_website_section(pg_temp.v('section')::uuid, 1, jsonb_build_object('eyebrow', 'Synthetic', 'title', 'Synthetic Approach', 'summary', 'Created from Admin.'), 'default', 'paper', 'standard', 'standard', false) ->> 'ok'), 'true', 'plain text content is accepted');
select is((public.update_website_section(pg_temp.v('section')::uuid, 1, jsonb_build_object('title', 'Stale'), 'default', 'paper', 'standard', 'standard', false) -> 'reasons' -> 0 ->> 'code'), 'version_conflict', 'a stale section save is refused (optimistic concurrency)');

-- Layout: add a section, move it, system module cannot be removed -----------
insert into cr1 select 'faq', (public.create_website_section(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'faq', jsonb_build_object('heading', 'Synthetic questions', 'items', jsonb_build_array(jsonb_build_object('question', 'Is this synthetic?', 'answer', 'Yes.')))) ->> 'id');
select ok(pg_temp.v('faq') is not null, 'an editor adds a FAQ section');
select is((select sort_order from public.website_page_sections where id = pg_temp.v('faq')::uuid), 1, 'the new section lands last');
select is((public.move_website_section(pg_temp.v('faq')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'up') ->> 'ok'), 'true', 'move up is accepted');
select is((select sort_order from public.website_page_sections where id = pg_temp.v('faq')::uuid), 0, 'the section moved above the masthead');
select is((public.create_website_section(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'contact_form') -> 'reasons' -> 0 ->> 'code'), 'invalid_state', 'system modules cannot be added to a custom page');
select is((public.delete_website_section((select id from public.website_page_sections where page_id = (select id from public.website_pages where path = '/') and locked), (select version from public.website_pages where path = '/')) -> 'reasons' -> 0 ->> 'code'), 'invalid_state', 'a locked system module cannot be removed');

-- Editor cannot publish; owner can; drafts stay private until then ----------
select is((public.publish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid)) -> 'reasons' -> 0 ->> 'code'), 'not_authorized', 'an editor cannot publish');
select pg_temp.as_anon();
select is(public.public_website_page('/synthetic-approach'), null, 'an unpublished custom page is not public');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a1', 'aal2');
select is((public.publish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid)) -> 'reasons' -> 0 ->> 'code'), 'seo_incomplete', 'a custom page needs a search description before publishing');
select is((public.update_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'Synthetic Approach', 'synthetic-approach', null, 'A synthetic custom page.', null, false) ->> 'ok'), 'true', 'the owner sets the search description');
select is((public.publish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'First publish') ->> 'revision_no'), '1', 'the owner publishes revision 1');
select pg_temp.as_anon();
select is((public.public_website_page('/synthetic-approach') -> 'sections' -> 0 ->> 'type'), 'faq', 'the public page renders the published order');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a1', 'aal2');

-- Snapshot isolation + rollback ---------------------------------------------
select is((public.update_website_section(pg_temp.v('section')::uuid, (select version from public.website_page_sections where id = pg_temp.v('section')::uuid), jsonb_build_object('eyebrow', 'Synthetic', 'title', 'SYNTHETIC EDITED TITLE', 'summary', 'Edited.'), 'default', 'paper', 'standard', 'standard', false) ->> 'ok'), 'true', 'the owner edits the published page');
select pg_temp.as_anon();
select is((select section ->> 'type' from jsonb_array_elements(public.public_website_page('/synthetic-approach') -> 'sections') as section where section -> 'config' ->> 'title' = 'SYNTHETIC EDITED TITLE'), null, 'visitors keep seeing revision 1 until publish');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a1', 'aal2');
select is((public.publish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'Second publish') ->> 'revision_no'), '2', 'the edit publishes as revision 2');
select pg_temp.as_anon();
select is((select count(*) from jsonb_array_elements(public.public_website_page('/synthetic-approach') -> 'sections') as section where section -> 'config' ->> 'title' = 'SYNTHETIC EDITED TITLE')::bigint, 1::bigint, 'visitors see revision 2 after publish');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a1', 'aal2');
select is((public.restore_website_page_revision(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), (select id from public.website_page_revisions where page_id = pg_temp.v('page')::uuid and revision_no = 1)) ->> 'ok'), 'true', 'revision 1 restores as the new draft');
select is((select count(*) from public.website_page_revisions where page_id = pg_temp.v('page')::uuid)::bigint, 3::bigint, 'restore is non-destructive: both published revisions remain and the draft is kept as a restore point');
select is((select count(*) from public.website_page_revisions where page_id = pg_temp.v('page')::uuid and kind = 'restore_point')::bigint, 1::bigint, 'the pre-restore draft is captured as a restore point');
select is((public.publish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'Rollback') ->> 'revision_no'), '4', 'publishing the restored draft creates revision 4 (3 was the restore point)');
select pg_temp.as_anon();
select is((select count(*) from jsonb_array_elements(public.public_website_page('/synthetic-approach') -> 'sections') as section where section -> 'config' ->> 'title' = 'SYNTHETIC EDITED TITLE')::bigint, 0::bigint, 'after rollback visitors see the revision 1 wording again');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a1', 'aal2');

-- Navigation dependency + slug alias + unpublish ------------------------------
select is((public.update_navigation_settings((select version from public.settings_domain_versions where domain = 'navigation'), jsonb_build_array(jsonb_build_object('route_key', 'page:synthetic-approach', 'label', 'Synthetic', 'visible', true, 'sort_order', 900))) ->> 'ok'), 'true', 'a published custom page can join the navigation');
select is((public.unpublish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid)) -> 'reasons' -> 0 ->> 'code'), 'dependency_blocked', 'unpublish is blocked while the navigation links to the page');
select is((public.update_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid), 'Synthetic Approach', 'synthetic-method', null, 'A synthetic custom page.', null, false) ->> 'path'), '/synthetic-method', 'the owner renames the address');
select is(public.public_website_route_alias('/synthetic-approach'), '/synthetic-method', 'the old address redirects to the new one');
select is((select route_key from public.navigation_settings where route_key like 'page:synthetic%'), 'page:synthetic-method', 'the navigation follows the rename');
select is((public.update_navigation_settings((select version from public.settings_domain_versions where domain = 'navigation'), '[]'::jsonb) ->> 'ok'), 'true', 'the owner removes the navigation link');
select is((public.unpublish_website_page(pg_temp.v('page')::uuid, (select version from public.website_pages where id = pg_temp.v('page')::uuid)) ->> 'ok'), 'true', 'unpublish succeeds once nothing links to the page');
select pg_temp.as_anon();
select is(public.public_website_page('/synthetic-method'), null, 'an unpublished page stops resolving');
select pg_temp.as_postgres();

select is((select count(*) from public.audit_logs where action in ('page.create', 'page.publish', 'revision.restore', 'page.unpublish') and entity_id = pg_temp.v('page')) >= 5, true, 'page commands are audited without content bodies');
select ok(not exists (select 1 from public.audit_logs where entity_id = pg_temp.v('page') and metadata::text ilike '%SYNTHETIC EDITED TITLE%'), 'audit metadata never carries section bodies');

select * from finish();
rollback;
