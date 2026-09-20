create table public.posts (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  hero_asset_id uuid references public.media_assets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint posts_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint posts_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint posts_version_check check (version > 0)
);

create table public.post_localizations (
  post_id uuid not null references public.posts (id) on delete cascade,
  locale text not null,
  slug text not null,
  title text not null,
  excerpt text,
  body_blocks jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (post_id, locale),
  constraint post_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint post_localizations_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint post_localizations_title_check check (title = btrim(title) and title <> ''),
  constraint post_localizations_excerpt_check
    check (excerpt is null or (excerpt = btrim(excerpt) and excerpt <> '')),
  constraint post_localizations_blocks_check check (jsonb_typeof(body_blocks) = 'array'),
  constraint post_localizations_schema_version_check check (schema_version > 0),
  constraint post_localizations_version_check check (version > 0),
  constraint post_localizations_locale_slug_key unique (locale, slug)
);

create table public.post_categories (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint post_categories_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint post_categories_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint post_categories_sort_order_check check (sort_order >= 0),
  constraint post_categories_version_check check (version > 0)
);

create table public.post_category_localizations (
  category_id uuid not null references public.post_categories (id) on delete cascade,
  locale text not null,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (category_id, locale),
  constraint post_category_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint post_category_localizations_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint post_category_localizations_name_check check (name = btrim(name) and name <> ''),
  constraint post_category_localizations_version_check check (version > 0),
  constraint post_category_localizations_locale_slug_key unique (locale, slug)
);

create table public.post_category_assignments (
  post_id uuid not null references public.posts (id) on delete cascade,
  category_id uuid not null references public.post_categories (id) on delete restrict,
  primary key (post_id, category_id)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  sort_order integer not null default 0,
  portrait_asset_id uuid references public.media_assets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint team_members_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint team_members_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint team_members_sort_order_check check (sort_order >= 0),
  constraint team_members_version_check check (version > 0)
);

create table public.team_member_localizations (
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  locale text not null,
  name text not null,
  role_label text,
  biography text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (team_member_id, locale),
  constraint team_member_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint team_member_localizations_name_check check (name = btrim(name) and name <> ''),
  constraint team_member_localizations_role_check
    check (role_label is null or (role_label = btrim(role_label) and role_label <> '')),
  constraint team_member_localizations_version_check check (version > 0)
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  publication_status text not null default 'draft',
  published_at timestamptz,
  attribution_name text,
  attribution_role text,
  attribution_organization text,
  sort_order integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint testimonials_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint testimonials_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint testimonials_attribution_name_check
    check (attribution_name is null or (attribution_name = btrim(attribution_name) and attribution_name <> '')),
  constraint testimonials_sort_order_check check (sort_order >= 0),
  constraint testimonials_version_check check (version > 0)
);

create table public.testimonial_localizations (
  testimonial_id uuid not null references public.testimonials (id) on delete cascade,
  locale text not null,
  quote text not null,
  attribution_presentation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (testimonial_id, locale),
  constraint testimonial_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint testimonial_localizations_quote_check check (quote = btrim(quote) and quote <> ''),
  constraint testimonial_localizations_version_check check (version > 0)
);

create table public.testimonial_verifications (
  testimonial_id uuid primary key references public.testimonials (id) on delete restrict,
  source_reference text not null,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint testimonial_verifications_source_check
    check (source_reference = btrim(source_reference) and source_reference <> ''),
  constraint testimonial_verifications_version_check check (version > 0)
);

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid references public.team_members (id) on delete restrict,
  publication_status text not null default 'draft',
  published_at timestamptz,
  issuer text,
  reference text,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  constraint credentials_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint credentials_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint credentials_issuer_check
    check (issuer is null or (issuer = btrim(issuer) and issuer <> '')),
  constraint credentials_reference_check
    check (reference is null or (reference = btrim(reference) and reference <> '')),
  constraint credentials_validity_check
    check (valid_from is null or valid_to is null or valid_to >= valid_from),
  constraint credentials_version_check check (version > 0)
);

create table public.credential_localizations (
  credential_id uuid not null references public.credentials (id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  version integer not null default 1,
  primary key (credential_id, locale),
  constraint credential_localizations_locale_check
    check (char_length(locale) between 2 and 35 and locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  constraint credential_localizations_name_check check (name = btrim(name) and name <> ''),
  constraint credential_localizations_version_check check (version > 0)
);

create trigger posts_touch_mutable_row before update on public.posts
for each row execute function private.touch_mutable_row();
create trigger post_localizations_touch_mutable_row before update on public.post_localizations
for each row execute function private.touch_mutable_row();
create trigger post_categories_touch_mutable_row before update on public.post_categories
for each row execute function private.touch_mutable_row();
create trigger post_category_localizations_touch_mutable_row before update on public.post_category_localizations
for each row execute function private.touch_mutable_row();
create trigger team_members_touch_mutable_row before update on public.team_members
for each row execute function private.touch_mutable_row();
create trigger team_member_localizations_touch_mutable_row before update on public.team_member_localizations
for each row execute function private.touch_mutable_row();
create trigger testimonials_touch_mutable_row before update on public.testimonials
for each row execute function private.touch_mutable_row();
create trigger testimonial_localizations_touch_mutable_row before update on public.testimonial_localizations
for each row execute function private.touch_mutable_row();
create trigger testimonial_verifications_touch_mutable_row before update on public.testimonial_verifications
for each row execute function private.touch_mutable_row();
create trigger credentials_touch_mutable_row before update on public.credentials
for each row execute function private.touch_mutable_row();
create trigger credential_localizations_touch_mutable_row before update on public.credential_localizations
for each row execute function private.touch_mutable_row();

comment on table public.testimonial_verifications is
  'Private evidence metadata only; the table does not imply consent or approval.';
comment on table public.credentials is
  'Structural placeholder only; no credential or issuer claim is seeded by S2.';
