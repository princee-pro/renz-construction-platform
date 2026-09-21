-- R1 (owner decisions, 2026-09-21) — Cloudflare Web Analytics as an admitted
-- third-party provider. It is cookieless (no consent is forced, like
-- Plausible/Umami); the beacon loads only when the owner enables it under
-- Settings → Website. The function body is the C9 definition with the
-- provider vocabulary widened; nothing else changes.

alter table public.website_settings drop constraint if exists website_settings_analytics_provider_check;
alter table public.website_settings add constraint website_settings_analytics_provider_check
  check (analytics_provider is null or analytics_provider in ('none', 'plausible', 'umami', 'ga4', 'cloudflare', 'other'));

create or replace function public.update_website_settings(
  expected_version integer, target_homepage_cta_label text, target_homepage_cta_route text,
  target_canonical_base_url text default null, target_secondary_cta_label text default null, target_secondary_cta_route text default null,
  target_footer_statement text default null, target_contact_intro text default null, target_service_area_wording text default null,
  target_company_summary text default null, target_announcement_text text default null, target_announcement_active boolean default false,
  target_analytics_enabled boolean default false, target_analytics_provider text default null, target_consent_required boolean default false,
  target_first_party_analytics_enabled boolean default false, target_analytics_site_id text default null, target_analytics_retention_days integer default 400
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  previous public.website_settings%rowtype;
  provider text := nullif(btrim(coalesce(target_analytics_provider, '')), '');
  site_id text := nullif(btrim(coalesce(target_analytics_site_id, '')), '');
begin
  if not private.has_permission('settings.website.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write is required.')));
  end if;
  select * into previous from public.website_settings where id = 1 for update;
  current_version := previous.version;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the website settings first.')));
  end if;
  if target_homepage_cta_route not in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')
     or (target_secondary_cta_route is not null and target_secondary_cta_route not in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'homepage_cta_route', 'Choose an approved destination.')));
  end if;
  if target_canonical_base_url is not null and btrim(target_canonical_base_url) <> '' and btrim(target_canonical_base_url) !~ '^https?://[^/\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'canonical_base_url', 'Use an origin like https://www.example.com (no path).')));
  end if;
  if provider is not null and provider not in ('none', 'plausible', 'umami', 'ga4', 'cloudflare', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_provider', 'Choose an admitted provider.')));
  end if;
  if target_analytics_enabled and (provider is null or provider = 'none') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_provider', 'Choose a third-party provider before enabling it, or leave third-party analytics off.')));
  end if;
  if site_id is not null and site_id !~ '^[A-Za-z0-9._:/-]{1,200}$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_site_id', 'The provider site id may only contain letters, digits, dots, colons, slashes, underscores and hyphens.')));
  end if;
  if target_analytics_retention_days is null or target_analytics_retention_days not between 30 and 1100 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_retention_days', 'Retention must be between 30 and 1100 days.')));
  end if;
  begin
    update public.website_settings
       set canonical_base_url = nullif(btrim(target_canonical_base_url), ''), homepage_cta_label = btrim(target_homepage_cta_label),
           homepage_cta_route = target_homepage_cta_route, secondary_cta_label = nullif(btrim(target_secondary_cta_label), ''),
           secondary_cta_route = target_secondary_cta_route, footer_statement = nullif(btrim(target_footer_statement), ''),
           contact_intro = nullif(btrim(target_contact_intro), ''), service_area_wording = nullif(btrim(target_service_area_wording), ''),
           company_summary = nullif(btrim(target_company_summary), ''), announcement_text = nullif(btrim(target_announcement_text), ''),
           announcement_active = target_announcement_active and nullif(btrim(target_announcement_text), '') is not null,
           analytics_enabled = target_analytics_enabled, analytics_provider = provider,
           -- A cookie-setting provider (GA4 / unknown "other") always requires consent; the owner may require it for any provider.
           consent_required = target_consent_required or (target_analytics_enabled and provider in ('ga4', 'other')),
           first_party_analytics_enabled = target_first_party_analytics_enabled,
           analytics_site_id = site_id, analytics_retention_days = target_analytics_retention_days,
           updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'website', 'A website field is not admitted: ' || sqlerrm)));
  end;
  perform private.s4_audit('website_settings.update', 'settings', 'website_settings', 'success',
    jsonb_build_object('version', expected_version + 1, 'analytics_enabled', target_analytics_enabled,
      'first_party_analytics_enabled', target_first_party_analytics_enabled, 'analytics_provider', provider));
  if previous.first_party_analytics_enabled is distinct from target_first_party_analytics_enabled
     or previous.analytics_enabled is distinct from target_analytics_enabled
     or previous.analytics_provider is distinct from provider
     or previous.analytics_site_id is distinct from site_id
     or previous.analytics_retention_days is distinct from target_analytics_retention_days
     or previous.consent_required is distinct from (target_consent_required or (target_analytics_enabled and provider in ('ga4', 'other'))) then
    perform private.s4_audit('analytics.settings_update', 'settings', 'website_settings', 'success',
      jsonb_build_object('first_party', target_first_party_analytics_enabled, 'third_party', target_analytics_enabled,
        'provider', provider, 'consent_required', target_consent_required or (target_analytics_enabled and provider in ('ga4', 'other')),
        'retention_days', target_analytics_retention_days));
  end if;
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;
