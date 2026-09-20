export type PreviewProjectComposition =
  "monument" | "split" | "double" | "sticky" | "detail" | "closing";

export type PreviewProject = Readonly<{
  index: string;
  slug: string;
  title: string;
  category: string;
  materials: string;
  atmosphere: string;
  image: string;
  alt: string;
  composition: PreviewProjectComposition;
  chapters: ReadonlyArray<
    Readonly<{
      title: string;
      copy: string;
    }>
  >;
}>;

export const previewProjects = [
  {
    index: "01",
    slug: "ridge-residence",
    title: "Ridge Residence",
    category: "Hillside residential concept",
    materials: "Concrete / timber / stone",
    atmosphere: "A house on a ridge, sheltered on one side and open to the view on the other",
    image: "/media/renz-preview/projects/ridge-residence/hero.webp",
    alt: "Generated concept study of a concrete, timber, and stone residence on a highland ridge; not RENZ project evidence",
    composition: "monument",
    chapters: [
      {
        title: "The brief",
        copy: "A family house that sits quietly on a ridge and opens to the horizon. Arrival, shelter and long views come together in one clear route through the house.",
      },
      {
        title: "The site",
        copy: "The imagined ridge gives the design its direction. A planted approach on the uphill side opens out into terraces that face the valley.",
      },
      {
        title: "The challenge",
        copy: "How can a house have a wide view without feeling exposed? The study puts the shelter on the uphill edge and the openness towards the valley.",
      },
      {
        title: "Our approach",
        copy: "Low concrete floors step down with the slope. Timber screens break the long side of the house into areas of light, shade and privacy.",
      },
      {
        title: "Design",
        copy: "The rooms alternate between enclosed and open: a sheltered entrance, a quiet courtyard, then a room that faces the view.",
      },
      {
        title: "Structure",
        copy: "A regular concrete frame sits on a rough stone base. Deep roof edges make the difference clear between the solid lower level and the open upper level.",
      },
      {
        title: "Construction plan",
        copy: "Construction would start with the stone base and the ground floor slab, then the concrete frame, then the roof. Timber screens and windows come last.",
      },
      {
        title: "Materials and details",
        copy: "Board-marked concrete, dark timber, bronze-coloured metal and rough stone. A small number of materials, used with care.",
      },
      {
        title: "Final idea",
        copy: "A line of shelter in a wide landscape. The house and the horizon belong to the same calm picture.",
      },
    ],
  },
  {
    index: "02",
    slug: "courtyard-house",
    title: "Courtyard House",
    category: "Private residential concept",
    materials: "Warm plaster / stone / timber",
    atmosphere: "A home built around a garden",
    image: "/media/renz-preview/projects/courtyard-house/hero.webp",
    alt: "Generated concept study of a warm plaster, stone, and timber courtyard home; not RENZ project evidence",
    composition: "split",
    chapters: [
      {
        title: "The brief",
        copy: "A home with an open-air room at its centre. The garden becomes the place everyone looks to during the day.",
      },
      {
        title: "The site",
        copy: "On the imagined plot, you arrive in stages: from the street to the entrance, from the entrance to the shade, from the shade to the garden.",
      },
      {
        title: "The challenge",
        copy: "How can a home feel private without feeling closed in? A planted centre gives every room something to look at inside the walls.",
      },
      {
        title: "Our approach",
        copy: "Low single-storey buildings gather around one planted courtyard. Deep roof edges and layered openings make the line between room and garden feel soft.",
      },
      {
        title: "Design",
        copy: "Every room has a view of green. Warm surfaces catch the light, and shaded walkways slow the pace between rooms.",
      },
      {
        title: "Structure",
        copy: "Simple roof planes rest on solid walls. Openings repeat at a steady rhythm around the courtyard.",
      },
      {
        title: "Construction plan",
        copy: "Construction would start with the walls around the courtyard, then the roofs, then the garden levels and the paving. The planting goes in last.",
      },
      {
        title: "Materials and details",
        copy: "Lime plaster, textured stone and timber. The materials feel good to touch, and their differences show in the soft light under the roof edges.",
      },
      {
        title: "Final idea",
        copy: "A home designed from the inside out. The courtyard holds the rooms, the routes and daily life together.",
      },
    ],
  },
  {
    index: "03",
    slug: "urban-workspace",
    title: "Urban Workspace",
    category: "Office + studio concept",
    materials: "Concrete / glass / bronze",
    atmosphere: "Open to the street by day, warm and clear by night",
    image: "/media/renz-preview/projects/urban-workspace/hero.webp",
    alt: "Generated concept study of a concrete, glass, and bronze urban workspace at blue hour; not RENZ project evidence",
    composition: "double",
    chapters: [
      {
        title: "The brief",
        copy: "An office and studio building with two moods: an open ground floor facing the street, and quieter workspaces above.",
      },
      {
        title: "The site",
        copy: "The imagined street edge has planting, a covered entrance and views into the shared rooms. The building starts with the space in front of it.",
      },
      {
        title: "The challenge",
        copy: "Daylight shows the depth of the front of the building. Evening shows the life inside it. The study asks how one front can do both.",
      },
      {
        title: "Our approach",
        copy: "A concrete frame sets the order. Bronze-coloured fins add a finer rhythm and turn the front into a pattern of deep and shallow shadows.",
      },
      {
        title: "Design",
        copy: "Shared rooms sit behind deep openings. Glimpses through the front connect the scale of the street to the scale of a desk or a conversation.",
      },
      {
        title: "Structure",
        copy: "A regular grid of columns gives the design a clear beat. Solid floor edges and slim vertical screens give two scales to read from the street.",
      },
      {
        title: "Construction plan",
        copy: "Construction would start with the concrete frame and floors, then the glass, then the fins and the entrance canopy. Each front junction repeats, so it can be checked once and built many times.",
      },
      {
        title: "Materials and details",
        copy: "Concrete, dark glass and weathered bronze. A controlled contrast between daylight outside and warm light inside.",
      },
      {
        title: "Final idea",
        copy: "At dusk the front becomes a layered outline of warm rooms and darker structure. That contrast gives the building its evening character.",
      },
    ],
  },
  {
    index: "04",
    slug: "lake-retreat",
    title: "Lake Retreat",
    category: "Hospitality + lodge concept",
    materials: "Stone / timber / landscape",
    atmosphere: "Quiet shelters beside the water",
    image: "/media/renz-preview/projects/lake-retreat/hero.webp",
    alt: "Generated concept study of a stone and timber retreat beside a highland lake; not RENZ project evidence",
    composition: "sticky",
    chapters: [
      {
        title: "The brief",
        copy: "A retreat made of several small, quiet shelters. Low buildings frame the water and leave the landscape as the main event.",
      },
      {
        title: "The site",
        copy: "The imagined shoreline gives a long, level line. Paths follow the land between trees, stone edges and sheltered places to stop.",
      },
      {
        title: "The challenge",
        copy: "How little does a place need to feel complete? The study looks for atmosphere in the depth of a roof edge, the texture of stone and a clear view of the water.",
      },
      {
        title: "Our approach",
        copy: "Separate rooms follow the land in a loose line. Covered outdoor edges make a gradual passage from shared space to private retreat.",
      },
      {
        title: "Design",
        copy: "Long roofs and deep verandas keep the buildings close to the horizon. Windows frame parts of the shoreline rather than one wide wall of glass.",
      },
      {
        title: "Structure",
        copy: "Heavy stone bases carry lighter timber roofs. The same details repeat, so the separate pavilions read as one family.",
      },
      {
        title: "Construction plan",
        copy: "Construction would go pavilion by pavilion: stone base, timber frame, roof, then the terraces and paths that link them. The landscape is protected throughout.",
      },
      {
        title: "Materials and details",
        copy: "Weathered timber, dark roofing and irregular stone. One quiet palette that belongs to the landscape.",
      },
      {
        title: "Final idea",
        copy: "A place designed around pauses: by the water, under a roof, between the trees. The landscape matters as much as the buildings.",
      },
    ],
  },
  {
    index: "05",
    slug: "community-pavilion",
    title: "Community Pavilion",
    category: "Civic + community concept",
    materials: "Masonry / shade / landscape",
    atmosphere: "A big shared roof at a human scale",
    image: "/media/renz-preview/projects/community-pavilion/hero.webp",
    alt: "Generated concept study of a shaded masonry community pavilion in use; not RENZ project evidence",
    composition: "detail",
    chapters: [
      {
        title: "The brief",
        copy: "A generous roof and room to gather. This community building starts with shared shade and everything that can happen under it.",
      },
      {
        title: "The site",
        copy: "The imagined public edge brings together planting, informal seating and a covered hall. Several ways in make the centre feel connected to the streets around it.",
      },
      {
        title: "The challenge",
        copy: "The study holds two scales at once: a roof big enough to gather under, and edges small enough for one person to feel comfortable.",
      },
      {
        title: "Our approach",
        copy: "A broad roof defines the shared space. Open brickwork gives the edges texture, with views and openings breaking up the solid walls.",
      },
      {
        title: "Design",
        copy: "The edge becomes a place of its own: somewhere to sit, wait, meet or look out. The open centre stays free for different kinds of gathering.",
      },
      {
        title: "Structure",
        copy: "Visible roof beams and repeated brick bays make the building easy to read. Their rhythm gives the open hall a sense of proportion.",
      },
      {
        title: "Construction plan",
        copy: "Construction would start with the brick bays and columns, then the roof structure, then the seating edges and the paving. Planting comes last.",
      },
      {
        title: "Materials and details",
        copy: "Brick, concrete, timber and planting, shown with natural variation rather than a polished finish.",
      },
      {
        title: "Final idea",
        copy: "Architecture as a generous background for everyday life: a shaded place whose character comes from the people who gather there.",
      },
    ],
  },
  {
    index: "06",
    slug: "industrial-campus",
    title: "Industrial Campus",
    category: "Workshop + production concept",
    materials: "Steel / precast / disciplined grid",
    atmosphere: "Useful, ordered and full of light",
    image: "/media/renz-preview/projects/industrial-campus/hero.webp",
    alt: "Generated concept study of a precast and steel industrial campus at morning light; not RENZ project evidence",
    composition: "closing",
    chapters: [
      {
        title: "The brief",
        copy: "A workshop campus organised around movement, daylight and one clear repeated frame. Usefulness sets the direction of the design.",
      },
      {
        title: "The site",
        copy: "The imagined campus has two kinds of route: wide service yards for vehicles, and a narrower planted path linking the workshop entrances.",
      },
      {
        title: "The challenge",
        copy: "Large working buildings can overwhelm their own entrances. The study adds smaller canopies, planted edges and clear openings to bring the scale down to the person arriving.",
      },
      {
        title: "Our approach",
        copy: "Precast concrete bays set a disciplined grid. Dark steel canopies mark the breaks in the rhythm and give entrances and crossings their own identity.",
      },
      {
        title: "Design",
        copy: "High windows and open yards break up the long buildings. The design keeps its industrial character while making room for light and landscape.",
      },
      {
        title: "Structure",
        copy: "The repeated frame is the main idea. Its rhythm runs from the long walls to the small details of a canopy or an opening.",
      },
      {
        title: "Construction plan",
        copy: "Construction would use repeated precast panels and a steel roof, bay by bay. Because the grid is consistent, small mistakes would show quickly and could be corrected early.",
      },
      {
        title: "Materials and details",
        copy: "Precast concrete, dark steel, translucent panels and hard-wearing paving.",
      },
      {
        title: "Final idea",
        copy: "A precise, purposeful group of buildings in morning light: large spaces, ordered movement and small human moments in one picture.",
      },
    ],
  },
] as const satisfies ReadonlyArray<PreviewProject>;

export function getPreviewProject(slug: string): PreviewProject | undefined {
  return previewProjects.find((project) => project.slug === slug);
}

export function getNextPreviewProject(slug: string): PreviewProject {
  const currentIndex = previewProjects.findIndex((project) => project.slug === slug);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % previewProjects.length;
  return previewProjects[nextIndex] ?? previewProjects[0];
}
