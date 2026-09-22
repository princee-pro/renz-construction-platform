-- D1.8 §1–§2, §10, §16 — brand lock and plain-English corrections to the
-- owner-managed pages. CONTENT ONLY: no table, RPC, permission or policy
-- change (functional freeze respected). Every edit lands as a NEW published
-- revision so the owner keeps Revision History and can restore the previous
-- wording, and every value stays editable in Admin → Website.
--
-- The client confirmed the official slogan: "Brick by Brick." It replaces
-- "From land to landmark." as the homepage brand statement and the footer
-- headline. "From land to landmark." is retired from those authoritative
-- places; it may survive only as optional editorial copy where the owner
-- chooses to use it.
--
-- Idempotent: a page is skipped when a revision with this summary exists.

create or replace function private.d18_rewrite_section(
  target_page text, target_order integer, target_type text, patch jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.website_page_sections as s
     set config = s.config || patch,
         version = s.version + 1,
         updated_at = now()
    from public.website_pages as p
   where p.id = s.page_id
     and p.page_key = target_page
     and s.sort_order = target_order
     and s.section_type = target_type;
end;
$$;

create or replace function private.d18_publish_page(target_page text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  next_no integer;
  snapshot jsonb;
  revision_id uuid;
begin
  select id into target_id from public.website_pages where page_key = target_page;
  if target_id is null then
    return;
  end if;
  if exists (
    select 1 from public.website_page_revisions as r
     where r.page_id = target_id and r.summary = 'D1.8 brand lock (Brick by Brick)'
  ) then
    return;
  end if;
  select coalesce(max(r.revision_no), 0) + 1 into next_no
    from public.website_page_revisions as r
   where r.page_id = target_id;
  snapshot := private.website_page_snapshot(target_id);
  insert into public.website_page_revisions (page_id, revision_no, kind, summary, snapshot, media_ids)
  values (target_id, next_no, 'published', 'D1.8 brand lock (Brick by Brick)', snapshot,
          private.website_snapshot_media_ids(snapshot))
  returning id into revision_id;
  update public.website_pages
     set status = 'published', published_revision_id = revision_id, published_at = now(),
         version = version + 1
   where id = target_id;
end;
$$;

-- ------------------------------------------------------------------ HOME
-- The first viewport now states the slogan. The supporting line keeps the
-- plain-English promise so the headline never stands alone as a claim.
select private.d18_rewrite_section('home', 0, 'hero', '{
  "kicker": "Construction services",
  "headline_lines": ["Brick", "by Brick"],
  "summary": "RENZ helps you plan, design, build and supervise your project — from the first idea to final handover."
}'::jsonb);

-- ---------------------------------------------------------------- FOOTER
select private.d18_rewrite_section('footer', 0, 'footer_options', '{
  "headline": "Brick by Brick.",
  "statement": "RENZ helps you plan, design, build and supervise your project — from the first idea to final handover."
}'::jsonb);

-- --------------------------------------------------------------- GLOBALS
select private.d18_rewrite_section('globals', 0, 'global_copy', '{
  "menu_tagline": "Brick by Brick."
}'::jsonb);

-- -------------------------------------------------------------- INSIGHTS
-- Plainer index wording; the guides themselves are unchanged.
select private.d18_rewrite_section('insights', 0, 'masthead', '{
  "title": "Guides for planning and building.",
  "summary": "Short, practical guides on briefs, site visits, drawings, pricing and checking work on site — written from how RENZ runs real projects.",
  "note_variant": "survey"
}'::jsonb);

-- ------------------------------------------------------- HOME METADATA
-- The browser title and share description carried the retired line; they are
-- part of how the site "presents the official slogan", so they move too.
update public.website_pages
   set seo_title = 'Brick by Brick',
       seo_description = 'RENZ Construction Services Ltd helps you plan, design, build and supervise your project — from the first idea to final handover.',
       version = version + 1,
       updated_at = now()
 where page_key = 'home'
   and coalesce(seo_title, '') in ('', 'From Land to Landmark', 'From land to landmark.');

select private.d18_publish_page('home');
select private.d18_publish_page('footer');
select private.d18_publish_page('globals');
select private.d18_publish_page('insights');

drop function if exists private.d18_rewrite_section(text, integer, text, jsonb);
drop function if exists private.d18_publish_page(text);
