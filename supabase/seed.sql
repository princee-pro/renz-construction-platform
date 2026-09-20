-- Deterministic S2-only fixtures. These records are synthetic, remain drafts,
-- and must never be interpreted as RENZ business facts or production content.

insert into public.services (id, publication_status, sort_order, featured)
values ('10000000-0000-4000-8000-000000000001', 'draft', 0, false)
on conflict (id) do nothing;

insert into public.service_localizations (
  service_id,
  locale,
  slug,
  name,
  summary,
  body_blocks,
  schema_version
)
values (
  '10000000-0000-4000-8000-000000000001',
  'und',
  'synthetic-service-alpha',
  'SYNTHETIC Service Alpha',
  'Synthetic fixture for local database verification only.',
  '[]'::jsonb,
  1
)
on conflict (service_id, locale) do nothing;

insert into public.projects (id, publication_status, sort_order, featured)
values ('20000000-0000-4000-8000-000000000001', 'draft', 0, false)
on conflict (id) do nothing;

insert into public.project_localizations (
  project_id,
  locale,
  slug,
  title,
  summary
)
values (
  '20000000-0000-4000-8000-000000000001',
  'und',
  'synthetic-project-alpha',
  'SYNTHETIC Project Alpha',
  'Synthetic fixture for local relationship verification only.'
)
on conflict (project_id, locale) do nothing;

insert into public.project_services (project_id, service_id, sort_order)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  0
)
on conflict (project_id, service_id) do nothing;

insert into public.posts (id, publication_status)
values ('30000000-0000-4000-8000-000000000001', 'draft')
on conflict (id) do nothing;

insert into public.post_localizations (
  post_id,
  locale,
  slug,
  title,
  excerpt,
  body_blocks,
  schema_version
)
values (
  '30000000-0000-4000-8000-000000000001',
  'und',
  'synthetic-draft-article',
  'SYNTHETIC Draft Article',
  'Synthetic fixture for local publication-state verification only.',
  '[]'::jsonb,
  1
)
on conflict (post_id, locale) do nothing;

insert into public.site_pages (
  id,
  page_key,
  template_key,
  publication_status
)
values (
  '40000000-0000-4000-8000-000000000001',
  'synthetic-foundation',
  'synthetic-foundation',
  'draft'
)
on conflict (id) do nothing;

insert into public.page_localizations (
  page_id,
  locale,
  path,
  title,
  summary,
  body_blocks,
  schema_version,
  noindex
)
values (
  '40000000-0000-4000-8000-000000000001',
  'und',
  '/synthetic-foundation',
  'SYNTHETIC Foundation Page',
  'Synthetic fixture for local page-schema verification only.',
  '[]'::jsonb,
  1,
  true
)
on conflict (page_id, locale) do nothing;
