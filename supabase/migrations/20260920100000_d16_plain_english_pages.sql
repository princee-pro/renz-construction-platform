-- D1.6 — Plain-English rewrite of the owner-managed public pages (client art
-- direction, 2026-09-19). CONTENT ONLY: no table, RPC, permission or policy
-- changes (functional freeze respected). Every page that still carries the
-- CR1 wording receives its plain-English wording as a NEW published revision,
-- so the owner keeps Revision History and can restore the previous text.
--
-- Wording standard: docs/RENZ_PLAIN_ENGLISH_GUIDE.md — short sentences,
-- familiar words, active voice, one brand line ("From land to landmark")
-- always followed by a plain explanation. Tokens ({{services.count_words}}
-- and friends) stay, so counts remain true when the owner adds content.
--
-- Idempotent: a page is skipped when a revision with this summary exists.

create or replace function private.d16_rewrite_section(
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

create or replace function private.d16_publish_page(target_page text, target_seo_title text, target_seo_description text, target_title text)
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
     where r.page_id = target_id and r.summary = 'D1.6 plain-English wording'
  ) then
    return;
  end if;
  update public.website_pages
     set seo_title = coalesce(target_seo_title, seo_title),
         seo_description = coalesce(target_seo_description, seo_description),
         title = coalesce(target_title, title),
         version = version + 1
   where id = target_id;
  select coalesce(max(r.revision_no), 0) + 1 into next_no
    from public.website_page_revisions as r
   where r.page_id = target_id;
  snapshot := private.website_page_snapshot(target_id);
  insert into public.website_page_revisions (page_id, revision_no, kind, summary, snapshot, media_ids)
  values (target_id, next_no, 'published', 'D1.6 plain-English wording', snapshot, private.website_snapshot_media_ids(snapshot))
  returning id into revision_id;
  update public.website_pages
     set status = 'published', published_revision_id = revision_id, published_at = now(), version = version + 1
   where id = target_id;
end;
$$;

-- ---------------------------------------------------------------- HOME
select private.d16_rewrite_section('home', 0, 'hero', '{
  "kicker": "Construction services",
  "headline_lines": ["From land", "to landmark"],
  "summary": "RENZ helps you plan, design, build and supervise your project — from the first idea to final handover.",
  "secondary_cta": {"label": "See our services", "destination_type": "internal", "destination": "/services"},
  "register": [
    {"label": "Services", "value": "{{services.names}}"},
    {"label": "We work with", "value": "Private clients, developers and institutions"},
    {"label": "Based in", "value": "{{business.region}}"}
  ]
}'::jsonb);
select private.d16_rewrite_section('home', 1, 'feature_grid', '{
  "kicker": "What we do",
  "heading": "Design. Build. Supervise.",
  "items": [
    {"index_label": "A", "title": "Design", "body": "We turn your idea and your site into clear drawings that a builder can price and build.", "link": {"label": "See Design", "destination_type": "internal", "destination": "/services/design"}},
    {"index_label": "B", "title": "Build", "body": "We manage construction from start to handover: materials, quality, progress and cost.", "link": {"label": "See Executions", "destination_type": "internal", "destination": "/services/executions"}},
    {"index_label": "C", "title": "Supervise and advise", "body": "We check another builder’s work on site, or help you decide before you commit.", "link": {"label": "See Supervision", "destination_type": "internal", "destination": "/services/supervision"}}
  ]
}'::jsonb);
select private.d16_rewrite_section('home', 2, 'marquee', '{
  "words": ["Design", "Build", "Supervise", "Advise", "Plan", "Check"]
}'::jsonb);
select private.d16_rewrite_section('home', 3, 'service_showcase', '{
  "kicker": "Services",
  "heading": "Choose the support you need.",
  "intro": "RENZ can help with one stage of your project, or manage several stages together.",
  "link_label": "See all services"
}'::jsonb);
select private.d16_rewrite_section('home', 4, 'project_showcase', '{
  "kicker": "Projects",
  "heading": "Explore project studies.",
  "intro": "These concept studies show how RENZ plans a building for different sites and needs. They are studies, not completed RENZ projects. Real case studies will appear here when they are ready.",
  "link_label": "See all studies"
}'::jsonb);
select private.d16_rewrite_section('home', 5, 'process', '{
  "kicker": "How it works",
  "heading": "How your project moves forward.",
  "intro": "Every project follows the same clear steps. You can start at the step that fits you — design, building, or supervision only.",
  "closing": "Handover — and the next project."
}'::jsonb);
select private.d16_rewrite_section('home', 6, 'full_media', '{
  "kicker": "Detail",
  "heading": "Good work shows in the details.",
  "body": "Concrete, timber and stone each do a different job. Careful details and checked site work make the difference between a drawing and a good building.",
  "badge": "Concept material study"
}'::jsonb);
select private.d16_rewrite_section('home', 7, 'feature_grid', '{
  "kicker": "Why RENZ",
  "heading": "Clear planning. Clear communication. Checked work.",
  "intro": "This is how we work on every project.",
  "items": [
    {"title": "We measure before we draw", "body": "We record the site — levels, access, boundaries and approvals — before design starts."},
    {"title": "One set of drawings for everyone", "body": "Builders and suppliers price the same drawings, so quotes are easy to compare."},
    {"title": "Checks at every stage", "body": "We inspect and record each stage before the next one starts. You see progress with photos and staged invoices."},
    {"title": "Honest advice on scope", "body": "We tell you which service fits: design only, building, one team for both, supervision, or advice."}
  ]
}'::jsonb);
select private.d16_rewrite_section('home', 8, 'insight_feed', '{
  "kicker": "Insights",
  "heading": "Simple guides for your project.",
  "link_label": "Read all guides"
}'::jsonb);
select private.d16_rewrite_section('home', 9, 'cta', '{
  "kicker": "Start a project",
  "heading": "Ready to start?",
  "body": "Answer {{process.count_words_lower}} short questions about what you want to build. It takes about five minutes.",
  "steps": [
    {"title": "Tell us what you need", "body": "Design, building, one team for both, supervision, or advice — or not sure yet."},
    {"title": "Describe the site and size", "body": "Where the project is, the land, the number of floors, the approximate size and your budget range."},
    {"title": "Get a reply from RENZ", "body": "We reply on WhatsApp or by email with the next step and what to prepare."}
  ]
}'::jsonb);
select private.d16_publish_page('home', 'From Land to Landmark', 'RENZ Construction Services Ltd helps you plan, design, build and supervise your project — from the first idea to final handover.', null);

-- ---------------------------------------------------------------- SERVICES
select private.d16_rewrite_section('services', 0, 'masthead', '{
  "title": "Services for every stage of your project.",
  "summary": "Choose the support you need. RENZ can help with one stage or manage several stages together.",
  "facts": [
    {"label": "Services", "value": "{{services.count}} services"},
    {"label": "How it works", "value": "On their own or together"},
    {"label": "Contact", "value": "WhatsApp or email"}
  ]
}'::jsonb);
select private.d16_rewrite_section('services', 1, 'services_navigator', '{
  "all_kicker": "All services",
  "all_heading": "Every service in one line.",
  "empty_title": "No service is published yet.",
  "empty_description": "Services appear here once they are published."
}'::jsonb);
select private.d16_rewrite_section('services', 2, 'feature_grid', '{
  "kicker": "Which service fits me?",
  "heading": "Start where your project is.",
  "intro": "Not sure? Send an enquiry anyway. RENZ will tell you which service fits and what it includes.",
  "items": [
    {"title": "I have land and an idea", "body": "Start with Design. If the budget or approvals are unclear, start with a Consultation."},
    {"title": "I have drawings and need a builder", "body": "Choose Executions. RENZ prices your drawings, plans the work and builds in checked stages."},
    {"title": "I want one team from drawing to keys", "body": "Choose Hybrid Service. One team designs and builds, with no gap in between."},
    {"title": "I have a builder and want an independent check", "body": "Choose Supervision. We inspect site work, check materials and record every decision."},
    {"title": "I need advice before I commit", "body": "Choose Consultations. We help you understand the site, the likely cost and the approvals you need."}
  ]
}'::jsonb);
select private.d16_rewrite_section('services', 3, 'process', '{
  "kicker": "How it works",
  "heading": "How your project moves forward.",
  "intro": "Every project follows the same clear steps. You can start at the step that fits you.",
  "closing": "Handover — and the next project."
}'::jsonb);
select private.d16_rewrite_section('services', 4, 'cta', '{
  "kicker": "Next step",
  "heading": "Tell us what you want to build.",
  "body": "{{process.count_words}} short questions, no account, about five minutes. Or send a one-line service enquiry if you already know what you need.",
  "secondary_cta": {"label": "Ask about a service", "destination_type": "service_enquiry", "destination": null}
}'::jsonb);
select private.d16_publish_page('services', 'Services', 'Design, construction, one team for both, supervision and advice: ways to work with RENZ Construction Services Ltd at every stage of your project.', null);

-- ---------------------------------------------------------------- PROJECTS
select private.d16_rewrite_section('projects', 0, 'masthead', '{
  "title": "Explore project studies.",
  "summary": "See how different project types can be planned and developed. These are concept studies, not completed RENZ projects.",
  "facts": [
    {"label": "Concept studies", "value": "{{projects.concept_count}}"},
    {"label": "Case studies", "value": "{{projects.real_count}}"},
    {"label": "Labels", "value": "Every study is labelled"}
  ]
}'::jsonb);
select private.d16_rewrite_section('projects', 1, 'projects_index', '{
  "empty_title": "No case study is published yet.",
  "filters_label": "Filter studies",
  "studies_intro": "Each study has a concept image and a short story: the brief, the site, the challenge, the design, the structure, the construction plan, the materials and the final idea.",
  "studies_kicker": "Concept studies",
  "studies_heading": "{{projects.concept_count_words}} sites, {{projects.concept_count_words_lower}} ideas.",
  "published_kicker": "Case studies",
  "published_heading": "Completed RENZ projects, with evidence.",
  "empty_description": "A project appears here once its facts, permissions and photos are approved for public use."
}'::jsonb);
select private.d16_rewrite_section('projects', 2, 'cta', '{
  "kicker": "Your site",
  "heading": "Every project starts with a conversation about the land.",
  "secondary_cta": {"label": "See our services", "destination_type": "internal", "destination": "/services"}
}'::jsonb);
select private.d16_publish_page('projects', 'Projects', 'RENZ concept studies and case studies — clearly labelled, never presented as completed work unless the evidence is approved.', null);

-- ---------------------------------------------------------------- ABOUT
select private.d16_rewrite_section('about', 0, 'masthead', '{
  "title": "One team from planning to handover.",
  "summary": "RENZ brings design, construction, supervision and advice into one clear project process."
}'::jsonb);
select private.d16_rewrite_section('about', 1, 'editorial_intro', '{
  "kicker": "Who we are",
  "heading": "What RENZ does.",
  "lede": "RENZ helps you get from land, an idea and a budget to a finished building — without the gaps that usually appear between the designer, the builder and the person who checks the work.",
  "body": "We work as one team across {{services.count_words_lower}} services. You can use one service or all of them. The drawings, checks and records are the same either way. Start with Design, add construction later, or bring RENZ in only to supervise another builder.",
  "items": [
    {"title": "We measure before we draw", "body": "We record the site before design begins. Nothing is guessed."},
    {"title": "One set of drawings", "body": "Structure, services and finishes are drawn together, so everyone prices the same thing."},
    {"title": "Checked in stages", "body": "Each stage is checked and recorded before the next one starts."},
    {"title": "Clear invoices", "body": "Staged invoices in one currency per project. You can always see the balance."}
  ]
}'::jsonb);
select private.d16_rewrite_section('about', 2, 'process', '{
  "kicker": "How RENZ works",
  "heading": "{{process.count_words}} clear steps on every project.",
  "intro": "See what happens at each step, what you receive and what is decided.",
  "link_label": "See the full process"
}'::jsonb);
select private.d16_rewrite_section('about', 3, 'service_showcase', '{
  "kicker": "Services",
  "heading": "{{services.count_words}} services, one team."
}'::jsonb);
select private.d16_rewrite_section('about', 4, 'full_media', '{
  "kicker": "Detail",
  "heading": "A building is only as good as its details.",
  "body": "Supervision is where RENZ earns your trust. We check materials, inspect the joints the drawings promised, and record what was accepted or corrected.",
  "badge": "Concept material study"
}'::jsonb);
select private.d16_rewrite_section('about', 6, 'project_showcase', '{
  "kicker": "Concept studies",
  "heading": "How our approach works on a site.",
  "link_label": "See all studies"
}'::jsonb);
select private.d16_rewrite_section('about', 7, 'cta', '{
  "kicker": "Talk to RENZ",
  "heading": "Bring us your land, your brief or your question.",
  "secondary_cta": {"label": "Contact us", "destination_type": "contact", "destination": null}
}'::jsonb);
select private.d16_publish_page('about', 'About', 'RENZ Construction Services Ltd: one team for design, construction, supervision and advice — from the first idea to handover.', null);

-- ---------------------------------------------------------------- INSIGHTS
select private.d16_rewrite_section('insights', 0, 'masthead', '{
  "title": "Simple guides for planning and building.",
  "summary": "Short, practical guides on briefs, site visits, drawings, pricing and supervision — written from how RENZ runs real projects."
}'::jsonb);
select private.d16_rewrite_section('insights', 1, 'insights_index', '{
  "all_note": "Each guide says which service it relates to, and when you need advice about your own site.",
  "all_kicker": "All guides",
  "read_label": "Read the guide",
  "all_heading": "Read in order, or pick a topic.",
  "empty_title": "No guide is published yet.",
  "featured_label": "Featured",
  "figure_caption": "Drawing before building",
  "empty_description": "Guides appear here once they are written, reviewed and published."
}'::jsonb);
select private.d16_rewrite_section('insights', 2, 'cta', '{
  "kicker": "Put it to work",
  "heading": "Bring a brief, a site, or a set of drawings.",
  "body": "Every guide ends where a RENZ project begins: a written brief, a site record, or a set of drawings. Start with whichever you have.",
  "secondary_cta": {"label": "See our services", "destination_type": "internal", "destination": "/services"}
}'::jsonb);
select private.d16_publish_page('insights', 'Insights', 'Short, practical RENZ guides on briefs, site visits, drawings, pricing and supervision.', null);

-- ---------------------------------------------------------------- CONTACT
select private.d16_rewrite_section('contact', 0, 'masthead', '{
  "title": "Tell us about your project.",
  "summary": "Send a short message, email us, or message {{business.short_name}} on WhatsApp.",
  "facts": [
    {"label": "Email", "value": "{{contact.email}}"},
    {"label": "WhatsApp", "value": "Messages only"},
    {"label": "Reply", "value": "By WhatsApp or email"}
  ]
}'::jsonb);
select private.d16_rewrite_section('contact', 1, 'contact_channels', '{
  "email_body": "Best for drawings, documents and anything you want in writing.",
  "start_body": "What you need, the site, the size, your details and any files — about five minutes.",
  "start_label": "Start a project",
  "start_title": "{{process.count_words}} simple questions",
  "whatsapp_body": "Fastest for a first question. Messages only — this number does not take calls.",
  "whatsapp_title": "Message {{business.short_name}}"
}'::jsonb);
select private.d16_rewrite_section('contact', 2, 'contact_form', '{
  "intro": "Tell us what you need and how to reach you. Your message gets a reference number you can quote later.",
  "kicker": "Contact form",
  "heading": "Send us a message.",
  "email_note": "Drawings, documents, anything in writing",
  "paused_text": "Online messages are paused right now. You can still email or WhatsApp {{business.short_name}} directly.",
  "reply_label": "How RENZ replies",
  "reply_steps": [
    "Your message is saved with a reference number.",
    "RENZ replies on the channel you chose — WhatsApp or email.",
    "If it is a project, the next step is a short conversation, not a commitment."
  ],
  "aside_service_label": "Ask about a service",
  "aside_material_label": "Ask about materials"
}'::jsonb);
select private.d16_rewrite_section('contact', 3, 'faq', '{
  "kicker": "Before you write",
  "heading": "Common questions.",
  "items": [
    {"question": "What should I prepare before I contact RENZ?", "answer": "The location or a description of the land, what you want to build, your budget range, and any drawings, sketches or photos you already have. Nothing needs to be final."},
    {"question": "Do I need to know which service I need?", "answer": "No. Describe your situation and RENZ will reply with the service that fits and what it includes."},
    {"question": "Can RENZ work with my existing builder?", "answer": "Yes. Supervision is a separate service. We check site work, verify materials and keep a record of decisions while another builder builds."},
    {"question": "How does RENZ reply?", "answer": "By WhatsApp message or email — whichever you chose on the form. RENZ does not make cold calls. The public WhatsApp number is for messages only."}
  ]
}'::jsonb);
select private.d16_publish_page('contact', 'Contact', 'Send RENZ a short message, email us, or message RENZ on WhatsApp.', null);

-- ---------------------------------------------------------------- START A PROJECT
select private.d16_rewrite_section('start-a-project', 0, 'masthead', '{
  "title": "Tell us what you want to build.",
  "summary": "Answer {{process.count_words_lower}} simple questions. It takes about five minutes."
}'::jsonb);
select private.d16_rewrite_section('start-a-project', 1, 'start_project_wizard', '{
  "next_steps": [
    "Your answers reach the RENZ team with a reference number you can quote.",
    "RENZ replies by email or WhatsApp to confirm what you need and arrange a first conversation.",
    "You receive a written summary of your project and the service that fits it."
  ],
  "paused_text": "Online project requests are paused right now. You can still email or WhatsApp {{business.short_name}} directly."
}'::jsonb);
select private.d16_publish_page('start-a-project', 'Start a Project', 'Tell RENZ what you want to build in a few simple questions. It takes about five minutes.', null);

select private.d16_rewrite_section('start-a-project-success', 0, 'masthead', '{
  "title": "We have your project details.",
  "summary": "Your answers are now with the RENZ team."
}'::jsonb);
select private.d16_rewrite_section('start-a-project-success', 1, 'intake_success', '{
  "heading": "Thank you. Your project details are with RENZ.",
  "next_steps": "Keep this reference number. {{business.short_name}} reads every request by hand and replies through the contact details you gave. There is no automatic reply.",
  "invalid_text": "This page needs a valid reference number.",
  "restart_label": "Start a new project request"
}'::jsonb);
select private.d16_publish_page('start-a-project-success', 'Project details received', 'Your project details have reached RENZ.', 'Project details received');

-- ---------------------------------------------------------------- ENQUIRIES
select private.d16_rewrite_section('enquire-service', 0, 'masthead', '{
  "title": "Ask about this service.",
  "summary": "Ask about one of the {{services.count_words_lower}} RENZ services. One short form, no account.",
  "preselected_summary": "Ask about {{service.name}}. One short form, no account."
}'::jsonb);
select private.d16_rewrite_section('enquire-service', 1, 'service_enquiry_form', '{
  "next_steps": [
    "Your question reaches the RENZ team with a reference number.",
    "RENZ replies to say whether the service fits and what it would include.",
    "If it fits, the next step is a short conversation — not a commitment."
  ]
}'::jsonb);
select private.d16_publish_page('enquire-service', 'Ask about a service', 'Ask RENZ about one of its services. One short form, no account.', null);

select private.d16_rewrite_section('enquire-materials', 0, 'masthead', '{
  "title": "Tell us what materials you need.",
  "summary": "List the materials you need. RENZ checks what is possible and replies. Nothing is ordered until you confirm."
}'::jsonb);
select private.d16_rewrite_section('enquire-materials', 1, 'material_enquiry_form', '{
  "next_steps": [
    "Your list reaches the RENZ team with a reference number.",
    "RENZ checks availability and replies with what is possible and what it needs from you.",
    "Nothing is ordered or priced until you confirm in writing."
  ]
}'::jsonb);
select private.d16_publish_page('enquire-materials', 'Ask about materials', 'Tell RENZ which construction materials you need. An enquiry, not an order.', null);

-- ---------------------------------------------------------------- GLOBALS + FOOTER
select private.d16_rewrite_section('globals', 0, 'global_copy', '{
  "insight_note": "This guide gives general advice based on how RENZ works. It is not advice about your specific site, structure, legal position or finances. Decisions about a real building need a site survey, the right professionals and the approvals that apply where you build.",
  "whatsapp_note": "Messages only — this number does not take calls.",
  "prefer_to_talk_label": "Prefer to talk?",
  "what_happens_next_label": "What happens next",
  "all_services_label": "See all services"
}'::jsonb);
select private.d16_rewrite_section('globals', 1, 'process_steps', '{
  "steps": [
    {"key": "understand", "verb": "Listen", "field": "quiet", "title": "Understand",
     "summary": "A first conversation about your site, what you want to build, your budget range and your timeline. Tell us what you already have: land, sketches, a builder, approvals.",
     "receives": "A written summary of your project and the services that fit it.",
     "decision": "Which service to start with: design, building, one team for both, supervision or advice."},
    {"key": "survey", "verb": "Measure", "field": "survey", "title": "Survey the site",
     "summary": "We record the site before any drawing starts: levels, access, boundaries, neighbours, water and power, and the approvals your location needs.",
     "receives": "A site record and a list of limits and opportunities.",
     "decision": "What the land allows, and what it will cost to work with."},
    {"key": "design", "verb": "Draw", "field": "plan", "title": "Design",
     "summary": "First we draw options. Then we develop the drawings in enough detail to be priced, approved and built — structure, services and finishes together.",
     "receives": "Drawings, a specification and a cost check at each stage.",
     "decision": "The design, the materials and the scope to take into construction."},
    {"key": "coordinate", "verb": "Align", "field": "datum", "title": "Plan the work",
     "summary": "Builders and suppliers price the same drawings. Materials are scheduled, permits are in hand, and everyone agrees the programme.",
     "receives": "A programme, a materials plan and named responsibilities.",
     "decision": "Who builds what, when, and for how much."},
    {"key": "execute", "verb": "Build", "field": "structure", "title": "Build",
     "summary": "Construction in clear stages: setting out, structure, walls and roof, services, finishes. Each stage is inspected before the next one starts.",
     "receives": "Progress records, staged invoices and photos of each milestone.",
     "decision": "Approval to continue at every checkpoint."},
    {"key": "supervise", "verb": "Check", "field": "material", "title": "Check",
     "summary": "Independent quality checks on site, material checks, site records and change control — so the building matches the drawing.",
     "receives": "Inspection reports and a record of decisions you can rely on later.",
     "decision": "What is accepted, what is corrected, what changes."},
    {"key": "resolve", "verb": "Hand over", "field": "quiet", "title": "Hand over",
     "summary": "Final fixes are closed, documents are compiled, and warranties and drawings are handed over. We also review how the building performs.",
     "receives": "As-built drawings, a maintenance guide and the final account.",
     "decision": "Sign-off, and what comes next."}
  ]
}'::jsonb);
select private.d16_publish_page('globals', null, null, null);

select private.d16_rewrite_section('footer', 0, 'footer_options', '{
  "headline": "From land to landmark.",
  "statement": "RENZ helps you plan, design, build and supervise your project — from the first idea to final handover."
}'::jsonb);
select private.d16_publish_page('footer', null, null, null);

drop function private.d16_publish_page(text, text, text, text);
drop function private.d16_rewrite_section(text, integer, text, jsonb);
