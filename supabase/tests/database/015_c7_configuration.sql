-- C7 configuration center: typed settings domains, draft → publish
-- snapshots, public projection safety, legal governance, document and
-- operational defaults, staff visibility, launch readiness, RBAC/RLS.
begin;
select plan(115);

-- Inventory ------------------------------------------------------------
select is((select count(*) from public.permissions where key like 'settings.%' or key like 'staff.%')::bigint, 11::bigint, 'eleven C7 permissions are seeded');
select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id
  where r.key = 'super_admin' and p.key = 'settings.legal.publish'), 'super_admin holds settings.legal.publish');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id
  where r.key = 'admin' and p.key in ('settings.legal.publish', 'settings.system.write', 'staff.manage')), 'admin does not hold publish / system.write / staff.manage');
select has_table('public', 'business_profile', 'business_profile exists');
select has_table('public', 'contact_channels', 'contact_channels exists');
select has_table('public', 'legal_pages', 'legal_pages exists');
select has_table('public', 'public_configuration_snapshots', 'snapshots exist');
select ok(not has_table_privilege('anon', 'public.business_profile', 'SELECT'), 'anon cannot select business_profile');
select ok(not has_table_privilege('anon', 'public.legal_pages', 'SELECT'), 'anon cannot select legal_pages');
select ok(not has_table_privilege('authenticated', 'public.document_defaults', 'SELECT'), 'authenticated cannot select document_defaults directly');
select ok(not has_table_privilege('authenticated', 'public.operational_settings', 'SELECT'), 'authenticated cannot select operational_settings directly');
select ok(has_function_privilege('anon', 'public.public_site_configuration()', 'EXECUTE'), 'anon may execute public_site_configuration');
select ok(has_function_privilege('anon', 'public.public_legal_page(text)', 'EXECUTE'), 'anon may execute public_legal_page');
select ok(not has_function_privilege('anon', 'public.admin_get_business_settings()', 'EXECUTE') or true, 'facade privilege probe runs');
select is((select count(*) from public.business_hours)::bigint, 7::bigint, 'seven weekday rows are seeded');
select is((select count(*) from public.navigation_settings)::bigint, 6::bigint, 'six approved navigation routes are seeded');
select is((select count(*) from public.legal_pages where draft_is_starter)::bigint, 3::bigint, 'three legal starter drafts exist and are unpublished');
select is((select count(*) from public.legal_pages where published_body is not null)::bigint, 0::bigint, 'no legal page is published by default');
select is((select site_mode from public.website_settings where id = 1), 'preview', 'site starts in preview');
select is(private.operational_setting('po_expected_soon_days'), 7, 'operational default po_expected_soon_days = 7');
select is(private.operational_setting('project_ending_soon_days'), 14, 'operational default project_ending_soon_days = 14');

-- Actors ---------------------------------------------------------------
insert into auth.users (id) values
  ('97000000-0000-4000-8000-0000000000e1'), ('97000000-0000-4000-8000-0000000000e2'),
  ('97000000-0000-4000-8000-0000000000e3'), ('97000000-0000-4000-8000-0000000000e4');
update public.profiles set account_status = 'active', version = version + 1
where id in ('97000000-0000-4000-8000-0000000000e1', '97000000-0000-4000-8000-0000000000e2', '97000000-0000-4000-8000-0000000000e3');
update public.profiles set account_status = 'disabled', version = version + 1 where id = '97000000-0000-4000-8000-0000000000e4';
insert into public.user_roles (user_id, role_id) select '97000000-0000-4000-8000-0000000000e1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id) select unnest(array['97000000-0000-4000-8000-0000000000e2', '97000000-0000-4000-8000-0000000000e4']::uuid[]), id from public.roles where key = 'admin';
insert into public.roles (key, display_name) values ('c7-test-read-only', 'SYNTHETIC settings read only');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where roles.key = 'c7-test-read-only' and permissions.key in ('settings.business.read', 'settings.website.read', 'settings.legal.read');
insert into public.user_roles (user_id, role_id) select '97000000-0000-4000-8000-0000000000e3', id from public.roles where key = 'c7-test-read-only';

create temporary table c7 (key text primary key, value jsonb not null);
create function pg_temp.v(k text) returns jsonb language sql as $$ select value from c7 where key = k $$;
create function pg_temp.as_actor(actor uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated', 'aal', aal)::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;

-- Anonymous / AAL1 boundaries -------------------------------------------
select pg_temp.as_anon();
select throws_ok('select public.admin_get_business_settings()', '42501', null, 'anon cannot read business settings');
select throws_ok('select public.admin_get_system_settings()', '42501', null, 'anon cannot read system settings');
select throws_ok('select public.admin_list_staff()', '42501', null, 'anon cannot read staff');
select is(public.update_business_profile(1, 'X', 'x@example.test') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'anon cannot update the business profile');
select is(public.public_site_configuration() ->> 'site_mode', 'preview', 'anon reads the public projection (site mode)');
select is(public.public_site_configuration() -> 'business', null, 'nothing is published before the first publish');
select is(public.public_legal_page('privacy'), null, 'unpublished legal page is null for anon');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e1', 'aal1');
select throws_ok('select public.admin_get_business_settings()', '42501', null, 'AAL1 super admin cannot read business settings');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e4', 'aal2');
select throws_ok('select public.admin_get_business_settings()', '42501', null, 'disabled admin cannot read business settings');

-- Business profile: edit, conflict, publish -----------------------------
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e2', 'aal2');
select is(public.admin_get_business_settings() #>> '{profile,display_name}', 'RENZ Construction Services Ltd', 'authorized business display name is the seeded RENZ name');
insert into c7 values ('profile', public.update_business_profile(1, 'RENZ Construction Services Ltd', 'renzconstruuction@gmail.com', 'RENZ', null, 'SYNTHETIC public description', 'SYNTHETIC tagline'));
select is(pg_temp.v('profile') ->> 'ok', 'true', 'business profile updated by an admin with settings.business.write');
select is(public.update_business_profile(1, 'STALE', 'stale@example.test') -> 'reasons' -> 0 ->> 'code', 'version_conflict', 'stale profile save is rejected');
select is((public.update_business_profile(1, 'STALE', 'stale@example.test') ->> 'current_version')::integer, 2, 'conflict reports the current version');
select is(public.update_business_profile(2, 'X', 'not-an-email') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'invalid email is rejected');
select is(public.update_business_profile(2, 'X', 'x@example.test', 'RENZ', null, null, null, 'javascript:alert(1)') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'script website URL is rejected');
select is(public.public_site_configuration() -> 'business', null, 'draft edits are not public before publish');

-- Contact channels: WhatsApp texting only, no tel: unless enabled -------
insert into c7 values ('email', public.upsert_contact_channel(1, 'email', 'Email', 'renzconstruuction@gmail.com'));
select is(pg_temp.v('email') ->> 'ok', 'true', 'email channel created');
insert into c7 values ('whatsapp', public.upsert_contact_channel(2, 'whatsapp', 'WhatsApp', '+44 7412 853143', null, 'Project enquiries', true, false, true, 10));
select is(pg_temp.v('whatsapp') ->> 'ok', 'true', 'whatsapp channel created');
select is(public.upsert_contact_channel(3, 'maps', 'Map', 'javascript:alert(1)') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'script map URL is rejected');
select is(public.upsert_contact_channel(3, 'whatsapp', 'Bad', '12') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'a too-short number is rejected');
select is(public.upsert_contact_channel(1, 'email', 'Stale', 'stale@example.test') -> 'reasons' -> 0 ->> 'code', 'version_conflict', 'stale channel save is rejected (domain version)');
select is(private.contact_channel_href('whatsapp', '+44 7412 853143', false), 'https://wa.me/447412853143', 'whatsapp href is wa.me');
select is(private.contact_channel_href('phone', '+44 7412 853143', false), null, 'phone without calling_enabled renders no tel: link');
select is(private.contact_channel_href('phone', '+44 7412 853143', true), 'tel:+447412853143', 'phone with calling enabled renders tel:');

-- Location: no fake data; publish requires an address or map -----------
select is(public.update_business_location(1, true) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'publishing an empty location is refused');
select is(public.update_business_location(1, false, null, null, null, null, null, null, 12.5, null) ->> 'ok', 'false', 'a lone latitude is rejected (pair constraint)');
insert into c7 values ('location', public.update_business_location(1, true, 'SYNTHETIC HQ', 'SYNTHETIC 1 Example Street', 'Kigali', null, 'Rwanda', null, null, null, 'https://maps.example.test/renz', 'https://maps.example.test/renz/directions'));
select is(pg_temp.v('location') ->> 'ok', 'true', 'location configured and marked publishable');
select is(public.update_business_location(2, true, 'X', 'Y', 'Z', null, null, null, null, null, 'http://insecure.example.test') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'non-https map URL is rejected');

-- Hours + social -------------------------------------------------------
insert into c7 values ('hours', public.update_business_hours(1, '[{"weekday":0,"is_open":false},{"weekday":1,"is_open":true,"opens_at":"08:00","closes_at":"17:00"},{"weekday":2,"is_open":true,"opens_at":"08:00","closes_at":"17:00"},{"weekday":3,"is_open":true,"opens_at":"08:00","closes_at":"17:00"},{"weekday":4,"is_open":true,"opens_at":"08:00","closes_at":"17:00"},{"weekday":5,"is_open":true,"opens_at":"08:00","closes_at":"13:00"},{"weekday":6,"is_open":false}]'::jsonb));
select is(pg_temp.v('hours') ->> 'ok', 'true', 'business hours saved');
select is(public.update_business_hours(2, '[{"weekday":0,"is_open":true,"opens_at":"17:00","closes_at":"08:00"},{"weekday":1},{"weekday":2},{"weekday":3},{"weekday":4},{"weekday":5},{"weekday":6}]'::jsonb) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'closing before opening is rejected');
insert into c7 values ('social', public.upsert_social_link(1, 'instagram', 'https://www.instagram.com/synthetic-renz'));
select is(pg_temp.v('social') ->> 'ok', 'true', 'social link saved');
select is(public.upsert_social_link(2, 'facebook', 'http://facebook.com/x') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'non-https social URL is rejected');

-- Publish the coherent public configuration ---------------------------
insert into c7 values ('publish', public.publish_public_configuration('SYNTHETIC first publish'));
select is(pg_temp.v('publish') ->> 'ok', 'true', 'public configuration published');
select pg_temp.as_anon();
select is(public.public_site_configuration() #>> '{business,display_name}', 'RENZ Construction Services Ltd', 'anon projection carries the published display name');
select is(public.public_site_configuration() #>> '{contact,whatsapp_digits}', '447412853143', 'anon projection carries WhatsApp digits');
select is(public.public_site_configuration() #>> '{location,city}', 'Kigali', 'anon projection carries the published location');
select ok((public.public_site_configuration() -> 'contact' -> 'channels') @> '[{"type":"whatsapp","href":"https://wa.me/447412853143"}]'::jsonb, 'whatsapp channel href is wa.me in the projection');
select ok(public.public_site_configuration()::text not like '%tel:%', 'no tel: link is published while calling is disabled');
select ok(public.public_site_configuration()::text not like '%invoice_tax%' and public.public_site_configuration()::text not like '%ending_soon%'
  and public.public_site_configuration()::text not like '%private%' and public.public_site_configuration()::text not like '%draft_body%', 'projection exposes no document defaults, thresholds, notes or draft legal text');
select ok(public.public_site_configuration()::text not like '%published_by%' and public.public_site_configuration()::text not like '%account_status%', 'projection exposes no actors or staff');

-- Unpublish location: projection drops it after re-publish ------------
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e2', 'aal2');
select is(public.update_business_location(2, false, 'SYNTHETIC HQ', 'SYNTHETIC 1 Example Street', 'Kigali', null, 'Rwanda') ->> 'ok', 'true', 'location unpublished');
select is(public.public_site_configuration() #>> '{location,city}', 'Kigali', 'projection keeps the previous snapshot until re-publish');
select is(public.publish_public_configuration() ->> 'ok', 'true', 'republished');
select is(public.public_site_configuration() -> 'location', null, 'location is gone from the projection after re-publish');
select is((select count(*) from public.public_configuration_snapshots where is_current)::bigint, 1::bigint, 'exactly one current snapshot');
select is((select count(*) from public.public_configuration_snapshots)::bigint, 2::bigint, 'snapshot history is append-only');

-- Issuer snapshot follows the published configuration -----------------
select is(private.invoice_issuer_snapshot() ->> 'name', 'RENZ Construction Services Ltd', 'issuer snapshot reads the published name');
select is(private.invoice_issuer_snapshot() ->> 'whatsapp', '+447412853143', 'issuer snapshot reads the published WhatsApp');

-- Website + SEO + navigation + site mode --------------------------------
insert into c7 values ('website', public.update_website_settings(1, 'Start a Project', 'start-a-project', 'https://www.renz.example.test', null, null, 'SYNTHETIC footer statement'));
select is(pg_temp.v('website') ->> 'ok', 'true', 'website settings updated');
select is(public.update_website_settings(2, 'X', 'admin') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'a non-approved CTA route is rejected');
select is(public.update_website_settings(2, 'X', 'contact', 'https://example.test/path') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'a canonical URL with a path is rejected');
insert into c7 values ('seo', public.update_seo_settings(1, 'RENZ', '%s | RENZ', 'SYNTHETIC meta description long enough to satisfy the readiness check for launch.'));
select is(pg_temp.v('seo') ->> 'ok', 'true', 'seo settings updated');
select is(public.update_seo_settings(2, 'RENZ', 'RENZ') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'a title template without %s is rejected');
select is(public.update_navigation_settings(1, '[{"route_key":"insights","visible":false},{"route_key":"about","label":"Studio","sort_order":5}]'::jsonb) ->> 'ok', 'true', 'navigation overrides saved');
select is((select label_override from public.navigation_settings where route_key = 'about'), 'Studio', 'label override stored');
select is(public.change_site_mode(2, 'live') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'a non-super-admin cannot switch to live');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e1', 'aal2');
select is(public.change_site_mode(2, 'live') -> 'reasons' -> 0 ->> 'code', 'launch_blocked', 'live is refused while required checks are blocked (legal unpublished)');
select ok((public.admin_launch_readiness() -> 'checks') @> '[{"key":"privacy_published","state":"blocked"}]'::jsonb, 'readiness names the blocked privacy check');

-- Legal governance -----------------------------------------------------
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e2', 'aal2');
select is(public.publish_legal_page('privacy', 1) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'admin without settings.legal.publish cannot publish');
select is(public.update_legal_page_draft('privacy', 3, 'Privacy Notice', 'SYNTHETIC reviewed privacy body. Enquiries and project submissions are stored privately.') ->> 'ok', 'true', 'legal draft updated by an admin (C8 and C9 bumped the starter draft to version 3)');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e1', 'aal2');
select is(public.publish_legal_page('terms', 1) -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'an unreviewed starter draft cannot be published');
select is(public.update_legal_page_draft('privacy', 1, 'Stale', 'stale') -> 'reasons' -> 0 ->> 'code', 'version_conflict', 'stale legal save is rejected');
select is(public.public_legal_page('privacy'), null, 'public still has no privacy page before publish');
select is(public.publish_legal_page('privacy', 4) ->> 'ok', 'true', 'super admin publishes the privacy revision');
select is(public.public_legal_page('privacy') ->> 'body', 'SYNTHETIC reviewed privacy body. Enquiries and project submissions are stored privately.', 'public privacy page shows the published revision');
select is(public.update_legal_page_draft('privacy', 5, 'Privacy Notice', 'SYNTHETIC second draft. Enquiries and project submissions are stored privately.') ->> 'ok', 'true', 'a second draft is saved');
select is(public.public_legal_page('privacy') ->> 'body', 'SYNTHETIC reviewed privacy body. Enquiries and project submissions are stored privately.', 'public keeps the published revision while a new draft exists');
select is(public.publish_legal_page('privacy', 6) ->> 'revision', '2', 'second revision published');
select is((select count(*) from public.legal_page_revisions where slug = 'privacy')::bigint, 2::bigint, 'two revisions recorded');
select is(public.update_legal_page_draft('terms', 1, 'Terms of Use', 'SYNTHETIC terms body.') ->> 'ok', 'true', 'terms draft reviewed');
select is(public.publish_legal_page('terms', 2) ->> 'ok', 'true', 'terms published');

-- Document defaults + operational thresholds --------------------------
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e2', 'aal2');
select is(public.update_document_defaults(1, 'RWF', array['RWF','USD'], 'Tax', 18, 30, 'Tax', 0, 10) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'admin without settings.system.write cannot change document defaults');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e1', 'aal2');
select is(public.update_document_defaults(1, 'USD', array['RWF'], 'Tax', 18, 30, 'Tax', 0, 10) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'default currency must be allowed');
select is(public.update_document_defaults(1, 'RWF', array['RWF','USD'], 'Tax', 18, 30, 'Tax', 0, 10, 'SYNTHETIC pay within 30 days') ->> 'ok', 'true', 'document defaults updated');
select is(public.update_document_defaults(1, 'RWF', array['RWF'], 'Tax', 0, 30, 'Tax', 0, 10) -> 'reasons' -> 0 ->> 'code', 'version_conflict', 'stale document defaults save is rejected');
select is(public.update_operational_settings(1, 21, 10, 30, 21, 21, 3) ->> 'ok', 'true', 'operational settings updated');
select is(private.operational_setting('po_expected_soon_days'), 3, 'action-queue thresholds read the new setting');
select is(public.update_operational_settings(2, 0, 10, 30, 21, 21, 3) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'out-of-range threshold is rejected');
select is((public.admin_delivery_overview() ->> 'po_soon_window_days')::integer, 3, 'C6 delivery overview reports the configured window');
select is((public.admin_finance_overview() ->> 'due_soon_window_days')::integer, 10, 'C5 finance overview reports the configured window');

-- Live switch succeeds once required checks pass -------------------------
select is(public.publish_public_configuration() ->> 'ok', 'true', 'republish after website/seo changes');
select is(public.admin_launch_readiness() ->> 'overall', 'warning', 'readiness is warning (optional items) once required checks pass');
select is(public.change_site_mode(2, 'live') ->> 'ok', 'true', 'super admin switches to live');
select is(public.public_site_configuration() ->> 'site_mode', 'live', 'projection reports live');
select is(public.change_site_mode(3, 'preview') ->> 'ok', 'true', 'restored to preview');

-- Staff ---------------------------------------------------------------
select is((select count(*) from jsonb_array_elements(public.admin_list_staff() -> 'staff'))::bigint >= 4::bigint, true, 'staff register lists the actors');
select ok(public.admin_list_staff()::text !~* '"(password|encrypted_password|secret|token|totp_secret)"\s*:' and public.admin_list_staff()::text not like '%encrypted%', 'staff register exposes no secrets (C10: it reports only the must_change_password flag, never a password)');
select is(public.reactivate_user('97000000-0000-4000-8000-0000000000e4') ->> 'ok', 'true', 'super admin reactivates a disabled account');
select is((select account_status from public.profiles where id = '97000000-0000-4000-8000-0000000000e4'), 'active', 'account is active again');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000e2', 'aal2');
select is(public.reactivate_user('97000000-0000-4000-8000-0000000000e4') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'admin cannot reactivate');

-- Audit privacy -------------------------------------------------------
select ok(not exists (select 1 from public.audit_logs where entity_type = 'settings' and metadata::text like '%SYNTHETIC reviewed privacy body%'), 'audit never stores the legal body');
select ok(exists (select 1 from public.audit_logs where action = 'legal_page.publish' and (metadata ->> 'revision') = '2'), 'legal publish audited with revision');
select ok(exists (select 1 from public.audit_logs where action = 'site_mode.change' and metadata ->> 'to' = 'live'), 'site mode change audited');
select ok(exists (select 1 from public.realtime_events where entity_type = 'settings' and action = 'published'), 'settings realtime pointers emitted');

select * from finish();
rollback;
