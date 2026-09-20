import type { PreviewProject } from "@/features/client-preview/projects";

/**
 * D1.7 seed source for the project studies: the six Rwanda-context studies
 * (07–12), the public category of every study, its context wording and the
 * gallery plan (files under public/media/renz-preview/projects/<slug>/).
 *
 * Evidence rules (D1.7 §5–6, §31): every image here is a generated concept
 * visual or a concept diagram drawn by the website team. Nothing is a
 * photograph of a real building, and nothing is claimed as built RENZ work.
 * Locations are context wording only ("Kigali context study"), never an
 * address.
 */
export type GalleryRole =
  "hero" | "context" | "exterior" | "interior" | "detail" | "process" | "drawing" | "dusk";

export type GalleryItem = Readonly<{
  file: string;
  role: GalleryRole;
  caption: string;
  alt: string;
  /** How the file was made — recorded as the rights source in the media register. */
  source: "generated" | "diagram" | "crop";
}>;

export type StudyMeta = Readonly<{
  /** Public filter category (D1.7 §16). */
  category: string;
  /** Context wording, never an address (D1.7 §14). */
  location: string | null;
  evidenceClass: "concept_study" | "context_study";
  featured: boolean;
  gallery: readonly GalleryItem[];
}>;

const generated = (slug: string, file: string, role: GalleryRole, caption: string, alt: string) =>
  ({ file: `${slug}/${file}`, role, caption, alt, source: "generated" }) as const;

function diagrams(slug: string, title: string): readonly GalleryItem[] {
  return [
    {
      file: `${slug}/diagram-site.webp`,
      role: "drawing",
      caption: "Site diagram",
      alt: `Site diagram of the ${title} concept: boundary, access and the building footprint`,
      source: "diagram",
    },
    {
      file: `${slug}/diagram-plan.webp`,
      role: "drawing",
      caption: "Plan study",
      alt: `Plan abstraction of the ${title} concept with the entrance and main dimension`,
      source: "diagram",
    },
    {
      file: `${slug}/diagram-section.webp`,
      role: "drawing",
      caption: "Section study",
      alt: `Section diagram of the ${title} concept: ground line, levels and roof form`,
      source: "diagram",
    },
    {
      file: `${slug}/diagram-materials.webp`,
      role: "detail",
      caption: "Material study",
      alt: `Material palette of the ${title} concept with four named materials`,
      source: "diagram",
    },
    {
      file: `${slug}/diagram-sequence.webp`,
      role: "process",
      caption: "Construction sequence study",
      alt: `Construction sequence diagram of the ${title} concept in five stages`,
      source: "diagram",
    },
  ];
}

const crop = (slug: string, title: string, caption: string): GalleryItem => ({
  file: `${slug}/detail-crop.webp`,
  role: "detail",
  caption,
  alt: `Detail crop of the ${title} concept visual`,
  source: "crop",
});

/** Category, context and gallery for the original six studies (heroes already exist). */
export const studyMeta: Readonly<Record<string, StudyMeta>> = {
  "ridge-residence": {
    category: "Residential",
    location: null,
    evidenceClass: "concept_study",
    featured: true,
    gallery: [
      crop("ridge-residence", "Ridge Residence", "Timber screen and stone base"),
      ...diagrams("ridge-residence", "Ridge Residence"),
    ],
  },
  "courtyard-house": {
    category: "Residential",
    location: null,
    evidenceClass: "concept_study",
    featured: true,
    gallery: [
      crop("courtyard-house", "Courtyard House", "Garden edge and covered walkway"),
      ...diagrams("courtyard-house", "Courtyard House"),
    ],
  },
  "urban-workspace": {
    category: "Workplace",
    location: null,
    evidenceClass: "concept_study",
    featured: true,
    gallery: [
      crop("urban-workspace", "Urban Workspace", "Concrete frame and timber fins"),
      ...diagrams("urban-workspace", "Urban Workspace"),
    ],
  },
  "lake-retreat": {
    category: "Hospitality",
    location: null,
    evidenceClass: "concept_study",
    featured: false,
    gallery: [
      crop("lake-retreat", "Lake Retreat", "Timber deck at the water"),
      ...diagrams("lake-retreat", "Lake Retreat"),
    ],
  },
  "community-pavilion": {
    category: "Community",
    location: null,
    evidenceClass: "concept_study",
    featured: false,
    gallery: [
      crop("community-pavilion", "Community Pavilion", "Brick pier and roof edge"),
      ...diagrams("community-pavilion", "Community Pavilion"),
    ],
  },
  "industrial-campus": {
    category: "Industrial",
    location: null,
    evidenceClass: "concept_study",
    featured: false,
    gallery: [
      crop("industrial-campus", "Industrial Campus", "Precast panel and canopy"),
      ...diagrams("industrial-campus", "Industrial Campus"),
    ],
  },
  "kigali-infill-apartments": {
    category: "Mixed Use",
    location: "Kigali context study",
    evidenceClass: "context_study",
    featured: true,
    gallery: [
      generated(
        "kigali-infill-apartments",
        "interior.webp",
        "interior",
        "Living room and shaded balcony",
        "Generated concept interior: a compact living room opening onto a deep balcony with a steel screen, looking over hillside houses",
      ),
      ...diagrams("kigali-infill-apartments", "Kigali Infill Apartments"),
    ],
  },
  "musanze-highlands-lodge": {
    category: "Hospitality",
    location: "Musanze context study",
    evidenceClass: "context_study",
    featured: true,
    gallery: [
      generated(
        "musanze-highlands-lodge",
        "interior.webp",
        "interior",
        "Lounge with the fire lit, mist outside",
        "Generated concept interior: a timber-ceilinged lounge with a volcanic stone fireplace and glazing onto a misty courtyard",
      ),
      ...diagrams("musanze-highlands-lodge", "Musanze Highlands Lodge"),
    ],
  },
  "bugesera-logistics-hub": {
    category: "Industrial",
    location: "Bugesera context study",
    evidenceClass: "context_study",
    featured: true,
    gallery: [
      generated(
        "bugesera-logistics-hub",
        "process.webp",
        "process",
        "Construction stage study: portal frame and precast panels",
        "Generated concept visual of the construction stage: a steel portal frame being erected next to a finished slab with precast panels stacked on red earth",
      ),
      ...diagrams("bugesera-logistics-hub", "Bugesera Logistics Hub"),
    ],
  },
  "huye-learning-courtyard": {
    category: "Education",
    location: "Huye context study",
    evidenceClass: "context_study",
    featured: false,
    gallery: [
      generated(
        "huye-learning-courtyard",
        "detail.webp",
        "detail",
        "Brick ventilation screen and timber louvre",
        "Generated concept detail: a perforated clay-brick screen beside a timber louvre window under a concrete lintel",
      ),
      ...diagrams("huye-learning-courtyard", "Huye Learning Courtyard"),
    ],
  },
  "rubavu-lakeside-residences": {
    category: "Residential",
    location: "Rubavu context study",
    evidenceClass: "context_study",
    featured: false,
    gallery: [
      crop("rubavu-lakeside-residences", "Rubavu Lakeside Residences", "Terrace wall and pergola"),
      ...diagrams("rubavu-lakeside-residences", "Rubavu Lakeside Residences"),
    ],
  },
  "rwamagana-production-yard": {
    category: "Industrial",
    location: "Rwamagana context study",
    evidenceClass: "context_study",
    featured: false,
    gallery: [
      crop("rwamagana-production-yard", "Rwamagana Production Yard", "Sawtooth roof at blue hour"),
      ...diagrams("rwamagana-production-yard", "Rwamagana Production Yard"),
    ],
  },
};

/** The six Rwanda-context studies (D1.7 §8–13). Same shape as the original six. */
export const contextStudies = [
  {
    index: "07",
    slug: "kigali-infill-apartments",
    title: "Kigali Infill Apartments",
    category: "Mixed Use",
    materials: "Clay brick / warm concrete / steel screens",
    atmosphere: "A compact apartment building on a steep Kigali street",
    image: "/media/renz-preview/projects/kigali-infill-apartments/hero.webp",
    alt: "Generated concept visual of a five-storey brick and concrete apartment building with shaded balconies on a dense Kigali hillside street; not RENZ project evidence",
    composition: "monument",
    chapters: [
      {
        title: "The brief",
        copy: "A small plot between two existing houses on a busy hillside street. The idea: homes above, a shop and an office below, and every flat with a shaded balcony.",
      },
      {
        title: "The site",
        copy: "The street slopes. The plot is narrow and deep, with neighbours tight on both sides. The best light and the best view are to the front, over the valley.",
      },
      {
        title: "The challenge",
        copy: "How do you give each home privacy, shade and a view on a plot with only one open side? The study turns the whole front into deep balconies.",
      },
      {
        title: "Our approach",
        copy: "A concrete frame keeps the building slim and the ground floor open. Brick fills the walls. Slim steel screens and planting make the balconies private.",
      },
      {
        title: "Design",
        copy: "Two flats on each level, one on each side of a central stair. The balconies are the living rooms' outdoor half. The ground floor opens to the street.",
      },
      {
        title: "Structure",
        copy: "A simple concrete frame on a stepped foundation that follows the slope. The frame is exposed at the front; the brick walls sit inside it.",
      },
      {
        title: "Construction plan",
        copy: "Dig and step the foundations first, then pour the frame floor by floor. Brick walls and screens follow once the roof is on, so the street stays open as long as possible.",
      },
      {
        title: "Materials and details",
        copy: "Local clay brick, board-marked concrete, steel screens painted dark, concrete planters. Deep overhangs keep rain off the brick.",
      },
      {
        title: "Final idea",
        copy: "A quiet, well-shaded building that belongs to its street: brick, balconies and plants instead of glass and gates.",
      },
    ],
  },
  {
    index: "08",
    slug: "musanze-highlands-lodge",
    title: "Musanze Highlands Lodge",
    category: "Hospitality",
    materials: "Volcanic stone / timber / slate roofs",
    atmosphere: "A low lodge in the cool mist of the northern highlands",
    image: "/media/renz-preview/projects/musanze-highlands-lodge/hero.webp",
    alt: "Generated concept visual of a low-rise lodge with volcanic stone bases, timber walls and pitched roofs in mist among highland trees; not RENZ project evidence",
    composition: "split",
    chapters: [
      {
        title: "The brief",
        copy: "A small lodge for visitors to the northern highlands: warm rooms, quiet courtyards and a view of the mountains when the mist lifts.",
      },
      {
        title: "The site",
        copy: "A gently sloping clearing among tall trees, cool and often wet. Mornings bring mist; afternoons bring wind from the mountains.",
      },
      {
        title: "The challenge",
        copy: "Cold nights and heavy rain. The buildings need to feel warm inside without closing off the landscape.",
      },
      {
        title: "Our approach",
        copy: "Heavy stone at the base, light timber above, and steep roofs that throw the rain clear. Small pavilions instead of one big block.",
      },
      {
        title: "Design",
        copy: "Four pavilions around two courtyards, joined by covered walkways. The lounge and dining room look across the main courtyard to the mountains.",
      },
      {
        title: "Structure",
        copy: "Volcanic stone walls carry a timber frame. The roofs are timber trusses with slate, and the overhangs protect the timber walls.",
      },
      {
        title: "Construction plan",
        copy: "Stone bases first, so the site can drain. Then the timber frames and roofs, pavilion by pavilion, and the courtyards and walkways last.",
      },
      {
        title: "Materials and details",
        copy: "Dark volcanic stone, warm timber inside and out, slate roofs, woven textiles. Fireplaces in the shared rooms.",
      },
      {
        title: "Final idea",
        copy: "Cool outside, warm inside. A lodge that sits low in the trees and lets the mountains do the talking.",
      },
    ],
  },
  {
    index: "09",
    slug: "bugesera-logistics-hub",
    title: "Bugesera Logistics Hub",
    category: "Industrial",
    materials: "Steel / precast concrete / deep canopies",
    atmosphere: "A clean, large-scale logistics hub on an open eastern site",
    image: "/media/renz-preview/projects/bugesera-logistics-hub/hero.webp",
    alt: "Generated concept visual of a logistics hub with long steel and precast halls, loading bays and a truck yard on a flat sunny site with acacia trees; not RENZ project evidence",
    composition: "monument",
    chapters: [
      {
        title: "The brief",
        copy: "Two large halls for storage and sorting, loading bays for trucks, a small office at the gate and a yard that keeps everything moving.",
      },
      {
        title: "The site",
        copy: "A wide, almost flat site with strong sun and hard rain. Trucks arrive from one road; the yard must let them turn without crossing each other.",
      },
      {
        title: "The challenge",
        copy: "Heat and water. The halls must stay cool without air conditioning, and the yard must drain fast in a storm.",
      },
      {
        title: "Our approach",
        copy: "Simple steel frames with high ridges for ventilation, deep canopies over every bay, and a yard that slopes gently to open drains.",
      },
      {
        title: "Design",
        copy: "Two long halls side by side, bays facing the yard, the office block at the entrance so every truck is seen on the way in and out.",
      },
      {
        title: "Structure",
        copy: "Steel portal frames on concrete pads, precast concrete wall panels, a light roof with a ventilated ridge.",
      },
      {
        title: "Construction plan",
        copy: "Grade the yard and lay the drains first. Then slabs, then frames, then panels and canopies. The office block can be built while the halls go up.",
      },
      {
        title: "Materials and details",
        copy: "Galvanised steel, precast panels, profiled roof sheets, concrete yard with painted lanes, a line of trees as a windbreak.",
      },
      {
        title: "Final idea",
        copy: "Clean, functional and easy to run: a hub that works in the heat and in the rain.",
      },
    ],
  },
  {
    index: "10",
    slug: "huye-learning-courtyard",
    title: "Huye Learning Courtyard",
    category: "Education",
    materials: "Clay brick / timber roofs / concrete lintels",
    atmosphere: "Classrooms around a shaded courtyard with one big tree",
    image: "/media/renz-preview/projects/huye-learning-courtyard/hero.webp",
    alt: "Generated concept visual of brick classroom wings with covered walkways around a courtyard with a large shade tree, seen from inside an arcade; not RENZ project evidence",
    composition: "double",
    chapters: [
      {
        title: "The brief",
        copy: "A small school for a growing community: classrooms, a library, a place to gather, and shade everywhere between them.",
      },
      {
        title: "The site",
        copy: "A level site at the edge of town with one large existing tree. The study keeps the tree and builds the school around it.",
      },
      {
        title: "The challenge",
        copy: "Heat, glare and noise. Classrooms need daylight without direct sun, and fresh air without dust.",
      },
      {
        title: "Our approach",
        copy: "Brick walls with ventilation screens, covered walkways on every side, and a courtyard that is the school's main room.",
      },
      {
        title: "Design",
        copy: "Four wings around the courtyard: classrooms on two sides, the library and hall on the others. Every door opens onto a shaded arcade.",
      },
      {
        title: "Structure",
        copy: "Load-bearing brick walls, concrete lintels and ring beams, timber roof trusses with wide overhangs.",
      },
      {
        title: "Construction plan",
        copy: "Slabs and brick walls wing by wing, so part of the school can open early. Roofs next, then the arcades and the courtyard garden.",
      },
      {
        title: "Materials and details",
        copy: "Local clay brick, timber, concrete lintels, louvred windows, gravel paths and a rain garden under the tree.",
      },
      {
        title: "Final idea",
        copy: "A school built from a few honest materials, where the courtyard and the tree are the heart of the day.",
      },
    ],
  },
  {
    index: "11",
    slug: "rubavu-lakeside-residences",
    title: "Rubavu Lakeside Residences",
    category: "Residential",
    materials: "Lime plaster / grey stone / timber screens",
    atmosphere: "Terraced homes stepping down to the lake",
    image: "/media/renz-preview/projects/rubavu-lakeside-residences/hero.webp",
    alt: "Generated concept visual of pale plaster and stone residences stepping down terraces towards a lake in soft afternoon light; not RENZ project evidence",
    composition: "sticky",
    chapters: [
      {
        title: "The brief",
        copy: "A group of homes on a lakeside slope, each with its own terrace and a clear view of the water, sharing one path down to the shore.",
      },
      {
        title: "The site",
        copy: "A gentle slope facing the lake, with afternoon light off the water and cool air in the evening.",
      },
      {
        title: "The challenge",
        copy: "Every home wants the view. The study steps the homes down the slope so nobody looks into a neighbour's roof.",
      },
      {
        title: "Our approach",
        copy: "Stone terrace walls hold the slope. Light plaster homes sit on them, with timber screens and pergolas for shade.",
      },
      {
        title: "Design",
        copy: "Two-storey homes in a staggered line, terraces in front, gardens between. A stone path zig-zags down to the shore.",
      },
      {
        title: "Structure",
        copy: "Stone retaining walls, concrete slabs on the terraces, plastered block walls, timber pergolas.",
      },
      {
        title: "Construction plan",
        copy: "Build the terrace walls and drains from the bottom up. Then the slabs and walls, home by home, and the planting last.",
      },
      {
        title: "Materials and details",
        copy: "Lime plaster, grey stone, timber screens, terracotta floors, a lot of planting between the homes.",
      },
      {
        title: "Final idea",
        copy: "Light walls, stone terraces and the lake: calm homes that face the water together.",
      },
    ],
  },
  {
    index: "12",
    slug: "rwamagana-production-yard",
    title: "Rwamagana Production Yard",
    category: "Industrial",
    materials: "Steel frames / sawtooth roofs / brick admin block",
    atmosphere: "Daylit workshop halls in the eastern production landscape",
    image: "/media/renz-preview/projects/rwamagana-production-yard/hero.webp",
    alt: "Generated concept visual of modular workshop halls with glowing sawtooth roofs and a brick admin block at blue hour, with a loading yard and banana plants; not RENZ project evidence",
    composition: "detail",
    chapters: [
      {
        title: "The brief",
        copy: "Workshop halls for processing farm produce, an office at the gate, a loading yard and room to add more halls later.",
      },
      {
        title: "The site",
        copy: "Open farmland on the eastern plateau with a road on one side. Bright days, heavy afternoon rain in season.",
      },
      {
        title: "The challenge",
        copy: "Good daylight without heat, and a plan that can grow one hall at a time without stopping work.",
      },
      {
        title: "Our approach",
        copy: "Repeated halls with sawtooth roofs that face away from the sun, so the light is even and cool. Each hall is a module.",
      },
      {
        title: "Design",
        copy: "Four halls in a row facing the yard, the admin block at the gate, a strip of trees and banana plants as a buffer to the fields.",
      },
      {
        title: "Structure",
        copy: "Steel frames on concrete slabs, light sawtooth roofs with glazing on the shaded side, brick walls for the admin block.",
      },
      {
        title: "Construction plan",
        copy: "Drainage and slabs for all four halls first, then frames and roofs one hall at a time. The first hall can work while the others are built.",
      },
      {
        title: "Materials and details",
        copy: "Painted steel, profiled roof sheets, clerestory glazing, brick, a concrete yard with wide drains.",
      },
      {
        title: "Final idea",
        copy: "A working landscape: simple halls, honest daylight and space to grow.",
      },
    ],
  },
] as const satisfies ReadonlyArray<PreviewProject>;
