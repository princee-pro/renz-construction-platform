begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- ---------------------------------------------------------------------
-- R1 owner decisions: the official slogan is seeded once into the
-- owner-editable business profile; Cloudflare Web Analytics is an
-- admitted, cookieless third-party provider (no forced consent).
-- ---------------------------------------------------------------------

select is(
  (select tagline from public.business_profile where id = 1),
  'Brick by Brick.',
  'the official slogan is seeded into the owner-editable business profile'
);
select is(
  (select version from public.business_profile where id = 1),
  2,
  'the slogan seed bumped the singleton version exactly once'
);

insert into auth.users (id) values ('99000000-0000-4000-8000-0000000000c1');
update public.profiles set account_status = 'active', version = version + 1
where id = '99000000-0000-4000-8000-0000000000c1';
insert into public.user_roles (user_id, role_id)
select '99000000-0000-4000-8000-0000000000c1', id from public.roles where key = 'super_admin';
select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-0000000000c1","role":"authenticated","aal":"aal2"}', true);
create temporary table r1 (key text primary key, value integer not null);
insert into r1 values ('website_version', (select version from public.website_settings where id = 1));
grant select on r1 to authenticated;
set local role authenticated;

select is(
  (public.update_website_settings(
    (select value from r1 where key = 'website_version'),
    'Start a Project', 'start-a-project', null, null, null, null, null, null, null, null, false,
    true, 'cloudflare', false, true, 'synthetic-cf-token', 400
  )) ->> 'ok',
  'true',
  'Cloudflare Web Analytics is an admitted provider'
);
select is(
  (public.admin_get_website_settings() #>> '{website,consent_required}')::boolean,
  false,
  'a cookieless provider does not force consent'
);
select is(
  (public.update_website_settings(
    (select value from r1 where key = 'website_version') + 1,
    'Start a Project', 'start-a-project', null, null, null, null, null, null, null, null, false,
    true, 'not-a-provider', false, true, 'x', 400
  )) -> 'reasons' -> 0 ->> 'code',
  'invalid_input',
  'an unknown provider is still refused'
);
select is(
  public.admin_get_website_settings() #>> '{website,analytics_provider}',
  'cloudflare',
  'the provider choice is stored'
);

select * from finish();

rollback;
