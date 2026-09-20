import type { ContentBlocks } from "@/lib/content/schemas";

/**
 * RENZ editorial insights (D1.5 §40–§42, D1.6 plain-English rewrite). The
 * owner delegated website content creation, so these three practical guides
 * are authored here as the canonical text, published into the posts domain
 * by `scripts/content-publish-insights.mjs` / `website-seed-content.mjs`
 * through the existing content system (readiness checks, review metadata,
 * publish RPC), and shown by the public Insights routes when no database
 * post has been published yet.
 *
 * Content rules: general, practical guidance only — no licensed-engineer
 * claims, legal requirements, certifications, guarantees or client evidence.
 * Every guide carries the professional-advice note. Wording follows
 * docs/RENZ_PLAIN_ENGLISH_GUIDE.md: short paragraphs, clear subheadings,
 * lists, examples and simple definitions.
 */
export type EditorialInsight = Readonly<{
  slug: string;
  title: string;
  excerpt: string;
  topic: string;
  relatedService: Readonly<{ slug: string; name: string }>;
  publicationDate: string;
  seoTitle: string;
  seoDescription: string;
  bodyBlocks: ContentBlocks;
}>;

export const editorialNote =
  "This guide gives general advice based on how RENZ works. It is not advice about your specific site, structure, legal position or finances. Decisions about a real building need a site survey, the right professionals and the approvals that apply where you build.";

export const editorialInsights: readonly EditorialInsight[] = [
  {
    slug: "preparing-a-clear-construction-brief",
    title: "How to write a clear project brief",
    excerpt:
      "A brief is a short description of what you want to build and why. A clear brief helps the designer, the builder and you price the same building. Here is what to put in it.",
    topic: "Before design",
    relatedService: { slug: "design", name: "Design" },
    publicationDate: "2026-09-01",
    seoTitle: "How to write a clear project brief | RENZ Guides",
    seoDescription:
      "What to put in a construction brief: purpose, site, size, budget range, timeline, limits and the decisions you have already made.",
    bodyBlocks: [
      {
        type: "paragraph",
        text: "Many projects lose money and time before anything is drawn. The reason is simple: the people involved are pricing different buildings in their heads. A clear brief closes that gap. It does not need to be long. It needs to be specific about the things that change cost, order of work and approvals.",
      },
      { type: "heading", level: 2, text: "Start with the purpose, not the rooms" },
      {
        type: "paragraph",
        text: 'Say what the building is for and who will use it every day. "A family house for two generations, with a separate entrance for the older couple" tells a designer more than a list of bedrooms. The purpose shapes the plan. The number of rooms follows.',
      },
      { type: "heading", level: 2, text: "Describe the site as it is" },
      {
        type: "list",
        items: [
          "Location and access: how vehicles and materials can reach the plot, and at what time of day.",
          "Ground and slope: what you know, what you have been told, and what nobody has checked yet.",
          "Boundaries and neighbours: walls, shared drains, windows that look in, and trees you want to keep.",
          "Services: the water, power and drainage that already reach the site — and the ones that do not.",
        ],
      },
      { type: "heading", level: 2, text: "Give a budget range and a timeline" },
      {
        type: "paragraph",
        text: "You do not need a final figure. A range — the amount you can commit now and the most you would ever spend — lets the design be sized honestly from the first sketch. Add the dates that matter: when you need to move in, when money arrives, and when heavy rain makes digging difficult.",
      },
      { type: "heading", level: 2, text: "List the decisions you have already made" },
      {
        type: "paragraph",
        text: "If you have land, sketches, a builder you prefer, approvals in progress or materials already bought, say so. Each one either saves work or limits it. A designer should know which before drawing.",
      },
      { type: "heading", level: 2, text: "What a brief should not do" },
      {
        type: "paragraph",
        text: "A brief should not fix the structure, the finishes or the exact floor area. Those come out of the design. Fixing them too early usually locks in the wrong answer. Keep the brief about what you want, what limits you have and what matters most. Let the drawings carry the detail.",
      },
      { type: "heading", level: 2, text: "How RENZ uses your brief" },
      {
        type: "paragraph",
        text: "On a RENZ project, your brief becomes the first written summary you receive: the purpose, the site as we recorded it, the budget range, the timeline and the service that fits — design only, construction, one team for both, supervision of another builder, or advice. Every later decision is measured against it.",
      },
      { type: "paragraph", text: editorialNote },
      { type: "link", href: "/start-a-project", label: "Start a project with a clear brief" },
    ],
  },
  {
    slug: "what-to-understand-before-a-site-conversation",
    title: "What to know before your first site visit",
    excerpt:
      "The first site visit sets the tone for the whole project. Knowing what to look for, what to ask and what to write down turns a walk around the plot into the start of a site record.",
    topic: "Survey and context",
    relatedService: { slug: "consultations", name: "Consultations" },
    publicationDate: "2026-09-05",
    seoTitle: "What to know before your first site visit | RENZ Guides",
    seoDescription:
      "How to prepare for a first site visit: access, levels, water, neighbours, approvals and the questions that decide what the land allows.",
    bodyBlocks: [
      {
        type: "paragraph",
        text: "A site visit is not a sales visit. It is the moment a plot stops being an address and becomes a set of facts you can measure. The more you understand before it, the more useful the conversation is — and the fewer surprises appear once digging starts.",
      },
      { type: "heading", level: 2, text: "Walk the site at two times of day" },
      {
        type: "paragraph",
        text: "Morning and late afternoon show different light, different noise and different traffic on the access road. Note where the sun rises and sets, where water collects after rain, and which way the wind usually blows.",
      },
      { type: "heading", level: 2, text: "Questions worth asking" },
      {
        type: "list",
        items: [
          "Where does rainwater go now, and where will it go once there is a roof and a hard surface?",
          "How much does the ground level change across the plot? Is the lowest point the one you would build on?",
          "How will a truck of sand or stone reach the site, and where can it turn?",
          "Which neighbouring walls, drains or trees sit on or near the boundary?",
          "Which approvals apply to this location, and how long do they usually take?",
        ],
      },
      { type: "heading", level: 2, text: "Bring what you already have" },
      {
        type: "paragraph",
        text: "Title documents, any old survey, sketches, photos taken after heavy rain, and your brief. A short written brief keeps the conversation on decisions instead of re-explaining the project.",
      },
      { type: "heading", level: 2, text: "Write it down — do not rely on memory" },
      {
        type: "paragraph",
        text: "Take photos with something in them for scale. Sketch the boundaries with rough measurements. List what was said and by whom. This becomes the first page of the site record — the document RENZ uses to note limits and opportunities before anyone draws a line.",
      },
      { type: "heading", level: 2, text: "What the visit should decide" },
      {
        type: "paragraph",
        text: "Not the design. The visit should decide what the land allows, what it will cost to work with, and what the next step is: a full design, a consultation to test whether the project can work, or supervision if a builder is already lined up.",
      },
      { type: "paragraph", text: editorialNote },
      { type: "link", href: "/services/consultations", label: "Get advice before you commit" },
    ],
  },
  {
    slug: "coordinating-drawings-before-execution",
    title: "Why all the drawings must agree before you build",
    excerpt:
      "A structure drawing, a plumbing drawing and a finishes list that disagree get fixed on site — and that is expensive. Coordination means making them one set that says the same thing.",
    topic: "Design to construction",
    relatedService: { slug: "hybrid-service", name: "Hybrid Service" },
    publicationDate: "2026-09-10",
    seoTitle: "Why all the drawings must agree before you build | RENZ Guides",
    seoDescription:
      "Why coordinated drawings matter before construction: one set for pricing, fewer changes on site, clearer supervision and a programme everyone agrees to.",
    bodyBlocks: [
      {
        type: "paragraph",
        text: "Every building is described by several drawings at once: the plans and sections, the structure, the routes for water and power, the openings, the finishes. When those drawings are made separately and never checked against each other, the first person to find the conflict is usually the mason — with the wall already built.",
      },
      { type: "heading", level: 2, text: "What coordination means" },
      {
        type: "list",
        items: [
          "The same measurements on every sheet, taken from the same reference point.",
          "Beams and columns that land where the plan says the walls and openings are.",
          "Pipes and cables that pass through the structure where it is safe to cut, not where it is not.",
          "Finishes that fit the openings and levels drawn, including door thresholds and floor slopes.",
          "One current version: everyone prices and builds from the same set of drawings.",
        ],
      },
      { type: "heading", level: 2, text: "Why it changes the price" },
      {
        type: "paragraph",
        text: "Builders charge for uncertainty. A coordinated set lets them quote against the same drawings, so you can compare quotes fairly. Changes during construction are visible instead of hidden inside claims. It is the difference between a programme everyone agreed to and a series of surprises.",
      },
      { type: "heading", level: 2, text: "Coordinate before permits, not after" },
      {
        type: "paragraph",
        text: "Approvals are given against drawings. If you change the structure after the permit, you change the permit. Coordinating first keeps the approved drawings and the built building the same thing — which is also what supervision checks against.",
      },
      { type: "heading", level: 2, text: "A simple checklist" },
      {
        type: "list",
        items: [
          "Lay the structural plan over the architectural plan and mark every mismatch.",
          "Follow each drain from the fixture to the outlet on the section drawing, not only on the plan.",
          "Check the floor-to-floor heights against the stair and the beam depths.",
          "Agree the finished floor level and the outside ground level at every door.",
          "Issue one dated version, and withdraw the older sheets.",
        ],
      },
      { type: "heading", level: 2, text: "Where RENZ fits" },
      {
        type: "paragraph",
        text: "In Hybrid Service, RENZ takes the drawings straight into construction, so the coordination is done once by the team that will build from them. In Design only, the coordinated set is what you receive to take to a builder. In Supervision, it is what every site check is measured against.",
      },
      { type: "paragraph", text: editorialNote },
      { type: "link", href: "/services/hybrid-service", label: "How Hybrid Service works" },
    ],
  },
];

/** Reading time from the article's own copy (about 200 words a minute). */
export function readingMinutes(blocks: ContentBlocks): number {
  const words = blocks
    .map((block) =>
      block.type === "list"
        ? block.items.join(" ")
        : block.type === "link"
          ? block.label
          : block.text,
    )
    .join(" ")
    .split(/\s+/u)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function getEditorialInsight(slug: string): EditorialInsight | null {
  return editorialInsights.find((entry) => entry.slug === slug) ?? null;
}
