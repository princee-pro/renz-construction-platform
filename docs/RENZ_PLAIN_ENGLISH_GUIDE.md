# RENZ Plain-English Guide

How to write for the RENZ website. For the owner, for anyone who edits a
page in Website → Pages, and for developers who add wording to code.
Adopted in D1.6 (client art direction, 2026-09-19).

## Who we write for

People in Rwanda and abroad who want to build something and who may use
English as a second or third language. They should understand what RENZ
does, what help they can get, what projects they can see, how the process
works and how to contact RENZ — without knowing architecture vocabulary.

## The rules

1. **Short sentences.** Aim for 8–18 words. Never more than 24 unless it
   really cannot be split. (`node scripts/d16-copy-audit.mjs` flags these.)
2. **Short paragraphs.** One to three sentences.
3. **Active voice.** "We check the site" — not "The site is checked".
4. **Familiar verbs.** plan, design, build, check, advise, send, choose, see,
   start, tell, ask.
5. **Main meaning first.** "We inspect each stage before the next one
   starts." Put the condition or the detail after it.
6. **One idea per heading.** A visitor should understand a section from its
   heading alone.
7. **Simple is not childish.** Keep a confident, professional, respectful
   tone. No slang, no exclamation marks, no baby language.
8. **Never invent facts.** No statistics, years, client counts, ratings,
   testimonials, addresses or credentials unless they are verified and
   approved. (docs/AGENTS.md, evidence rules.)

## Words to avoid on public pages

These carried the old agency voice. They may survive only as tiny technical
labels (drawing marks, indices), never as the message.

| Avoid | Use instead |
| --- | --- |
| engagement | project, service, work |
| proposition | offer, what we do |
| spatial response, sequence (as a noun) | design, layout, order of work, steps |
| the datum, condition, register, mass, gesture | (visual labels only) |
| resolved form, intent becomes visible | the finished building, the design |
| bring … into focus | make clear |
| programme | schedule, plan |
| procurement | planning, buying and tracking the materials |
| execution (in copy) | construction, building, site work |
| deliverables | what you receive |
| feasibility | whether the project can work |
| coordination | keeping drawings, builders and site work aligned |

Service and product names stay as they are (Design, Executions, Hybrid
Service, Supervision, Consultations) — explain them in the sentence next to
them. Do not rename database or admin concepts to change public wording.

## Construction words we keep, and how to explain them

- **Brief** — "a short description of what you want to build and why".
- **Survey / site record** — "we measure and record the site before drawing".
- **Specification** — "the written list of materials and standards".
- **Approvals / permits** — "the permissions your location requires".
- **Handover** — "when the finished building is given to you with its documents".
- **Snagging / final fixes** — "small faults fixed before handover".
- **As-built drawings** — "drawings that show the building as it was actually built".

## Headlines

Short, direct, and about the visitor's project.

- Home: **From land to landmark.** (the one brand line) + "RENZ helps you plan,
  design, build and supervise your project — from the first idea to final handover."
- Services: **Services for every stage of your project.**
- Design: **Plan it clearly before you build.**
- Executions: **Build with a clear plan.**
- Hybrid Service: **Design and build with one team.**
- Supervision: **Keep site work checked.**
- Consultations: **Get clear advice before you commit.**
- Projects: **Explore project studies.**
- About: **One team from planning to handover.**
- Insights: **Simple guides for planning and building.**
- Contact: **Tell us about your project.**
- Start a Project: **Tell us what you want to build.**

## Calls to action

Two to five words, starting with a verb: *Start a Project · See our services
· See all studies · View Design · Read the guide · Send us a message ·
Message on WhatsApp · Ask about this service · Start.*

Never: "Explore the datum", "Enter the sequence", "Resolve the condition".

## Forms

Questions a friend would ask: "What do you want to build?", "Where is the
project?", "When would you like to start?", "What budget range are you
considering?", "Do you have drawings already?". Errors say what to do:
"Enter your email address.", "Choose one option.", "The file is too large."

## Legal pages

Privacy and terms may stay formal. Their introductions must still be plain.

## Writing in the CMS

- Every page opening has a **Small label above the title**, a **Page
  title**, a **Short description** and optional buttons. Keep the title
  under about eight words.
- Tokens such as `{{services.count_words}}` keep numbers true when you add
  content; leave them in.
- Draft → Preview → Publish. Revision History keeps every earlier wording,
  so rewriting is safe.
- Run the audit after big edits: `node scripts/d16-copy-audit.mjs` (dev
  server running) and read `.playwright/copy-audit/report.md`.

## The final test

Open the site as a first-time visitor. Can you say, in one breath, what
RENZ does, what help you can get, what projects you can see, how the process
works and how to contact RENZ? If not, rewrite.
