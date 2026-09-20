/**
 * RENZ public service taxonomy — the five client-approved categories.
 *
 * Since CR1 this file is a SEED INPUT only: `scripts/website-seed-content.mjs`
 * migrates it into the Services register (and, with `--rewrite-copy`,
 * republishes the wording as a new content revision). The public site reads
 * the published register, never this file.
 *
 * D1.6 wording standard (docs/RENZ_PLAIN_ENGLISH_GUIDE.md): every service
 * answers, in plain English, what it is, when you need it, what RENZ does,
 * what you receive and what happens next. Construction terms are kept where
 * necessary and explained in the sentence that uses them.
 */

export type ServiceFaq = Readonly<{
  question: string;
  answer: string;
}>;

export type ServiceCategory = Readonly<{
  index: string;
  slug: string;
  name: string;
  positioning: string;
  overview: readonly string[];
  subServices: readonly string[];
  useCases: readonly string[];
  process: readonly string[];
  coordination: string;
  faqs: readonly ServiceFaq[];
}>;

export const SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  {
    index: "01",
    slug: "design",
    name: "Design",
    positioning: "Plan it clearly before you build.",
    overview: [
      "We turn your ideas and your site information into clear drawings that can be priced, checked and built.",
      "Design is the work before construction starts. We look at the site, work out what fits it, and draw the building in enough detail for a builder to price it and for the authorities to approve it.",
      "You can use Design on its own if you already have a builder. Or the drawings can go straight into RENZ construction or supervision.",
    ],
    subServices: [
      "Architectural Design",
      "Interior Design",
      "Space Planning",
      "Sustainable Architecture",
    ],
    useCases: [
      "You own land or a building and need drawings before you can apply for approvals or get builder quotes.",
      "You have an existing building and want to change the inside without touching the structure.",
      "You want a building that costs less to run: good orientation, insulation and materials chosen from the start.",
    ],
    process: [
      "Site visit and brief — we look at the site, your budget range and how you want to use the space.",
      "Design options — we show you layout and shape options before we develop one further.",
      "Developed design — we turn the chosen option into plans, elevations and a material direction.",
      "Technical drawings — the full set a builder and the permit office need.",
    ],
    coordination:
      "A design made here can go straight into Executions or Hybrid Service without a new briefing. Supervision can be added separately to check the build against these drawings.",
    faqs: [
      {
        question: "Do I need a finished design before RENZ can quote for construction?",
        answer:
          "A developed design with technical drawings gives the most reliable price. We can estimate from an early concept, but the figure will change as the design becomes more detailed.",
      },
      {
        question: "Can you work with drawings made by another architect?",
        answer:
          "Yes. We can review existing drawings, adapt them, or use them for space planning and interior work without starting again.",
      },
      {
        question: "What should I prepare before the first site visit?",
        answer:
          "The land title or site address, any survey or boundary information you have, a simple description of how you want to use the space, and roughly what you want to spend.",
      },
    ],
  },
  {
    index: "02",
    slug: "executions",
    name: "Executions",
    positioning: "Build with a clear plan.",
    overview: [
      "RENZ manages construction, materials, quality and progress from start to handover.",
      "Executions is the building work once a design exists — a RENZ design or one you bring. We manage the site day to day: who is on site, what happens in what order, and whether cost and quality stay on track.",
      "This service needs a settled design. It is not a design service.",
    ],
    subServices: [
      "Construction Management",
      "Quality Control",
      "Timeline Coordination",
      "Budget Management",
    ],
    useCases: [
      "You have approved drawings and need a team to manage the build from the first dig to handover.",
      "You want one team responsible for builders, materials and the schedule, instead of managing each trade yourself.",
      "You want to see costs tracked against the budget while the work happens, not only at the end.",
    ],
    process: [
      "Drawing review — we check the drawings can be built as drawn, and set a working budget and schedule.",
      "Procurement — planning, buying and tracking the materials and confirming the trade builders against that budget.",
      "Construction in stages — with planned checkpoints and written quality checks at each stage.",
      "Handover — final fixes, close-out documents and the final account.",
    ],
    coordination:
      "Executions works well with Supervision when you want an independent check on progress and quality. It works with Consultations when budget or feasibility questions come up during the build.",
    faqs: [
      {
        question: "Can RENZ manage a build from a design by another architect?",
        answer:
          "Yes. We start with a review of the existing drawings, so gaps are found before construction, not during it.",
      },
      {
        question: "How is the budget tracked during the project?",
        answer:
          "We track costs against the working budget at each stage. If something changes, we tell you when it happens, not at the end.",
      },
      {
        question: "What decisions will I need to make once construction starts?",
        answer:
          "Material and finish choices where the design leaves options open, and any trade-offs between cost, time or scope as the site shows its real conditions.",
      },
    ],
  },
  {
    index: "03",
    slug: "hybrid-service",
    name: "Hybrid Service",
    positioning: "Design and build with one team.",
    overview: [
      "One team designs your building and then builds it. You brief once, and one team is responsible from the first site visit to handover.",
      "Hybrid Service combines Design and Executions under one agreement and one point of contact. Some people call this design-and-build or turnkey.",
      "It suits you if you would rather hold one team responsible for both the drawings and the construction, instead of managing a separate architect and builder.",
    ],
    subServices: [
      "Full Project Management",
      "Design to Build",
      "Integrated Solutions",
      "Turnkey Projects",
    ],
    useCases: [
      "You want one contract and one responsible team from the first idea to a finished building you can move into.",
      "You want design decisions made with cost and buildability in mind from the start, so nothing has to be redesigned when prices come back.",
      "You are managing the project from far away and want fewer people to coordinate.",
    ],
    process: [
      "Brief and site review — run together by the design lead and the construction lead from day one.",
      "Design with cost checks — we check cost and buildability as we design, not as a separate step after the drawings are done.",
      "Construction by the same team — the people who drew the building build it, so nothing is lost in handover.",
      "Handover and close-out — with the design record kept for future maintenance or extension.",
    ],
    coordination:
      "Hybrid Service includes Design and Executions. You can still add Supervision separately if you want an independent check from outside the team, and Consultations is always available for stand-alone advice.",
    faqs: [
      {
        question: "How is this different from hiring RENZ for Design and then for Executions?",
        answer:
          "Scope, budget and responsibility sit under one agreement instead of two. Design decisions are made with construction cost and sequence in mind from the start, not after the drawings are finished.",
      },
      {
        question: "Does design-and-build cost more or less?",
        answer:
          "It depends on the project. The main benefit is fewer gaps and fewer redesigns, which usually reduces the cost of delays rather than the base construction cost.",
      },
      {
        question:
          "Can I still get an independent quality check if RENZ does both design and build?",
        answer:
          "Yes. Supervision can be added as a separate, independent service alongside Hybrid Service for exactly this reason.",
      },
    ],
  },
  {
    index: "04",
    slug: "supervision",
    name: "Supervision",
    positioning: "Keep site work checked.",
    overview: [
      "We inspect progress, quality and key construction stages so problems can be found early.",
      "Supervision is independent site checking. We confirm that the construction matches the approved drawings, that the quality is right, and that progress is reported honestly — whoever is doing the building.",
      "Most clients use it when they have hired their own builder and want someone on their side on site. It can also be added to RENZ Executions or Hybrid Service as an extra layer of checking.",
    ],
    subServices: [
      "Site Supervision",
      "Quality Assurance",
      "Progress Monitoring",
      "Compliance Checks",
    ],
    useCases: [
      "You have hired a builder directly and want someone to represent your interests on site.",
      "You cannot visit the site often and need reliable, independent reports on progress and quality.",
      "You want the work checked against the drawings before problems are covered up and become expensive to fix.",
    ],
    process: [
      "Review of the drawings, specification and contract — so everyone knows what 'correct' looks like for this project.",
      "Site visits at agreed intervals — or a continuous presence for larger or higher-risk builds.",
      "Written reports — progress, quality observations, and anything that differs from the drawings.",
      "Follow-up — every issue we raise is tracked until it is fixed or formally accepted.",
    ],
    coordination:
      "Supervision sits apart from Executions and Hybrid Service, so it can be used on projects RENZ is not building. It pairs with Consultations when a site finding raises a bigger planning or cost question.",
    faqs: [
      {
        question: "Can RENZ supervise a project built by another contractor?",
        answer: "Yes. Supervision is independent of who is building the project.",
      },
      {
        question: "How often are site visits and reports?",
        answer:
          "We agree this for each project based on size and risk. Smaller projects may suit regular visits; larger or higher-risk builds may need someone on site more often.",
      },
      {
        question: "What happens when supervision finds a problem?",
        answer:
          "We write it in the report, raise it with the person responsible, and track it until it is fixed or formally accepted.",
      },
    ],
  },
  {
    index: "05",
    slug: "consultations",
    name: "Consultations",
    positioning: "Get clear advice before you commit.",
    overview: [
      "We help you understand the site, your options, the likely cost and the next steps before you make big decisions.",
      "A consultation is advice, not a full design or construction service. It can answer whether a project makes sense, plan it before you brief anyone, or give a technical opinion on a specific question.",
      "It can stand on its own, or be the first step before Design, Executions or Hybrid Service.",
    ],
    subServices: [
      "Real Estate Advisory",
      "Project Planning",
      "Feasibility Studies",
      "Technical Consultation",
    ],
    useCases: [
      "You are looking at a piece of land or an existing building and want an informed opinion before you commit.",
      "You need a project planned — scope, stages and a rough budget — before briefing a designer or builder.",
      "You have a specific technical question about an existing building or a project in progress.",
    ],
    process: [
      "First call — we agree the question to answer and what a useful result looks like.",
      "Site review — we visit and gather the information the question needs.",
      "Written advice — you receive a written assessment with options and trade-offs, not just one answer.",
      "Next step — if you go ahead, we hand over to Design, Executions, Hybrid Service or Supervision.",
    ],
    coordination:
      "Consultations is the natural first step when it is not yet clear which service you need. The advice usually becomes the brief for whichever service comes next.",
    faqs: [
      {
        question: "Do I need to own the land already?",
        answer: "No. Feasibility and real estate advice are often used before you decide to buy.",
      },
      {
        question: "Is a consultation the same as a free quote?",
        answer:
          "No. It is a paid advisory service that produces a written assessment. A quote for design or construction work is a separate thing.",
      },
      {
        question: "What do I receive at the end?",
        answer:
          "A written assessment that answers the question we agreed at the start, with next-step options where they help.",
      },
    ],
  },
];

export function getServiceBySlug(slug: string): ServiceCategory | null {
  return SERVICE_CATEGORIES.find((service) => service.slug === slug) ?? null;
}
