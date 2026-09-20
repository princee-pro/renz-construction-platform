import type { AdminPermission } from "@/lib/auth/permissions";

/**
 * Contextual help (C10 §28–32): one plain-English entry per Admin area —
 * what the page is for, what you can do, common next steps, what changes
 * the public website, cautions — plus permission-aware notes ("You can view
 * invoices, but you cannot issue or record payments."). Static content, no
 * external service, no chatbot. Matched by the longest route prefix.
 */
export type HelpEntry = Readonly<{
  prefix: string;
  title: string;
  purpose: string;
  actions: readonly string[];
  nextSteps: readonly string[];
  publicEffect: string | null;
  cautions: readonly string[];
  /** Permission-aware notes: shown when the actor lacks the permission. */
  permissionNotes: readonly Readonly<{ permission: AdminPermission; without: string }>[];
  /** Related guide in docs/ (for the owner's reference). */
  guide?: string;
}>;

const projectNotes: HelpEntry["permissionNotes"] = [
  {
    permission: "operations.projects.write",
    without:
      "You can view projects but cannot create or change them. Ask the owner for project write access.",
  },
];

export const helpEntries: readonly HelpEntry[] = [
  {
    prefix: "/admin/operations/leads",
    title: "Leads",
    purpose:
      "Every enquiry from the website (contact form, Start a Project, service or material enquiry) lands here as a lead.",
    actions: [
      "Open a lead to read the full message and any files.",
      "Assign it to a staff member and move it through the stages.",
      "Turn a serious lead into a client (Create client), then a project.",
    ],
    nextSteps: [
      "Reply on WhatsApp or by email from the lead page.",
      "Create the client once the conversation is real.",
    ],
    publicEffect: null,
    cautions: [
      "Duplicate submissions are grouped by email — check before creating a second client.",
    ],
    permissionNotes: [
      {
        permission: "leads.write",
        without: "You can read leads but cannot assign or update them.",
      },
      {
        permission: "leads.convert",
        without: "You cannot turn a lead into a client. Ask the owner for lead conversion access.",
      },
    ],
  },
  {
    prefix: "/admin/operations/clients",
    title: "Clients",
    purpose:
      "Your client register: one record per person or company you work for, with their projects, invoices and notes in one place (Client 360).",
    actions: [
      "Add a client.",
      "Open a client to see projects, invoices, unpaid balances by currency and activity.",
      "Start a project or an invoice from the client page.",
    ],
    nextSteps: ["Create the project.", "Issue the first invoice."],
    publicEffect: null,
    cautions: ["Archiving hides a client from lists but keeps every invoice and project linked."],
    permissionNotes: [
      { permission: "clients.write", without: "You can view clients but cannot add or edit them." },
    ],
  },
  {
    prefix: "/admin/operations/projects",
    title: "Projects",
    purpose:
      "Create and manage client projects here: status, phase, dates, budget, services, contractors, purchase orders, invoices, media and notes.",
    actions: [
      "Create a project for a client.",
      "Track status, phase and priority.",
      "Assign contractors, raise purchase orders and invoices from the project.",
    ],
    nextSteps: [
      "Add a note when something changes.",
      "Publish a case study from Website → Projects when the client agrees.",
    ],
    publicEffect:
      "Nothing here is public. Publishing a case study is a separate step under Website → Projects and never exposes client finance.",
    cautions: ["Archiving keeps the project in the Admin but removes it from active lists."],
    permissionNotes: projectNotes,
  },
  {
    prefix: "/admin/operations/contractors",
    title: "Contractors",
    purpose: "Builders, trades and suppliers you work with, and their assignments to projects.",
    actions: [
      "Add a contractor or supplier.",
      "Assign a contractor to a project with an agreed amount.",
      "Record contractor payments.",
    ],
    nextSteps: ["Open the assignment from the project page."],
    publicEffect: null,
    cautions: [
      "Contractor payments are separate from client invoices and are never mixed across currencies.",
    ],
    permissionNotes: [
      {
        permission: "partners.write",
        without: "You can view contractors but cannot add or edit them.",
      },
      { permission: "contractors.assign", without: "You cannot assign contractors to projects." },
    ],
  },
  {
    prefix: "/admin/procurement",
    title: "Materials, suppliers and purchase orders",
    purpose:
      "What you buy (materials and units), who you buy from, and the purchase orders that record it.",
    actions: [
      "Add materials and suppliers.",
      "Prepare a purchase order for a project, issue it, then record deliveries.",
    ],
    nextSteps: ["Open the purchase order from its project."],
    publicEffect: null,
    cautions: ["An issued purchase order keeps its number; cancel it rather than editing it."],
    permissionNotes: [
      {
        permission: "procurement.orders.write",
        without: "You can view purchase orders but cannot prepare them.",
      },
      { permission: "procurement.orders.issue", without: "You cannot issue purchase orders." },
    ],
  },
  {
    prefix: "/admin/finance",
    title: "Finance",
    purpose:
      "Create invoices, record payments and track balances. Amounts in different currencies are kept separate and never added together.",
    actions: [
      "Draft an invoice for a client (and a project).",
      "Issue it — the number is fixed at that moment.",
      "Record payments; share a private link or PDF with the client.",
    ],
    nextSteps: [
      "Check outstanding and overdue amounts by currency.",
      "Void an invoice only if it was issued in error.",
    ],
    publicEffect:
      "Invoices are never on the public website. A share link is private to whoever holds it.",
    cautions: [
      "Issuing and voiding cannot be undone.",
      "Recording a payment twice is blocked — check the invoice balance first.",
    ],
    permissionNotes: [
      {
        permission: "finance.invoices.write",
        without: "You can view invoices but cannot draft them.",
      },
      {
        permission: "finance.invoices.issue",
        without: "You can draft invoices but cannot issue them.",
      },
      { permission: "finance.payments.write", without: "You cannot record payments." },
      { permission: "finance.invoices.void", without: "Only the owner can void an invoice." },
    ],
  },
  {
    prefix: "/admin/analytics",
    title: "Analytics",
    purpose:
      "Trends from your own data: leads, projects, finance by currency, delivery and website visits.",
    actions: ["Pick a period.", "Open a figure to jump to the filtered register behind it."],
    nextSteps: [],
    publicEffect: null,
    cautions: ["Currencies are never combined."],
    permissionNotes: [
      {
        permission: "analytics.finance.read",
        without: "Finance analytics are hidden from your role.",
      },
    ],
  },
  {
    prefix: "/admin/notifications",
    title: "Notifications",
    purpose: "What changed that concerns you: new leads, assignments, payments, publishing.",
    actions: ["Open a notification to go to the record.", "Mark all as read."],
    nextSteps: [],
    publicEffect: null,
    cautions: [],
    permissionNotes: [],
  },
  {
    prefix: "/admin/content/services",
    title: "Website — Services",
    purpose:
      "The services shown on the public website, in the navigation, footer, mega menu and the Start-a-Project form.",
    actions: ["Create or edit a service, its text, images and order.", "Publish when it is ready."],
    nextSteps: ["Check the public page from Private preview first."],
    publicEffect: "Publish makes the service public. Unpublish removes it everywhere at once.",
    cautions: ["Every public fact is a claim about RENZ — keep it true."],
    permissionNotes: [
      { permission: "content.write", without: "You can view services but cannot edit them." },
      { permission: "content.publish", without: "Publish access is not included in your role." },
    ],
    guide: "docs/RENZ_PLAIN_ENGLISH_GUIDE.md",
  },
  {
    prefix: "/admin/content/projects",
    title: "Website — Projects and studies",
    purpose:
      "The project studies and case studies on the public website, with their story, gallery and evidence class.",
    actions: [
      "Create a project, write its chapters, upload a gallery, choose related services.",
      "Set the evidence class (Case study / Rwanda context concept study / Concept study).",
      "Publish.",
    ],
    nextSteps: ["Use the gallery guide for roles and captions."],
    publicEffect:
      "Published projects appear on the Projects page, the film strip (if featured) and under their services. Unpublish or archive removes them.",
    cautions: [
      "A real case study needs reviewed evidence and RENZ photographs; generated visuals are refused for it.",
      "Never describe a study as completed RENZ work.",
    ],
    permissionNotes: [
      { permission: "content.write", without: "You can view projects but cannot edit them." },
      { permission: "content.publish", without: "Publish access is not included in your role." },
      { permission: "media.upload", without: "You cannot upload images." },
    ],
    guide: "docs/RENZ_PROJECT_GALLERY_GUIDE.md",
  },
  {
    prefix: "/admin/content/insights",
    title: "Website — Insights",
    purpose: "Guides and articles for clients.",
    actions: ["Write an article, add a topic and a related service, publish."],
    nextSteps: [],
    publicEffect: "Published articles appear on the Insights page and the Home feed.",
    cautions: ["Articles are general guidance, never site-specific advice."],
    permissionNotes: [
      { permission: "content.publish", without: "Publish access is not included in your role." },
    ],
  },
  {
    prefix: "/admin/website/media",
    title: "Website — Media",
    purpose:
      "Every image and video the website can use, with where it came from and whether RENZ may show it.",
    actions: ["Upload, describe (alt text), set the focal point, confirm rights."],
    nextSteps: ["Attach it from a page or a project."],
    publicEffect: "Only confirmed media appears publicly.",
    cautions: [
      "Generated visuals are labelled as such on the website and never count as evidence.",
    ],
    permissionNotes: [
      {
        permission: "media.manage",
        without: "You can view media but cannot confirm rights or archive it.",
      },
    ],
  },
  {
    prefix: "/admin/website",
    title: "Website",
    purpose:
      "The public website: pages, sections, navigation, footer, global copy, media, site map and SEO.",
    actions: [
      "Edit a page section by section; publish when ready.",
      "Change the navigation, footer and global wording.",
      "Check the site map for what is live.",
    ],
    nextSteps: ["Preview before publishing."],
    publicEffect:
      "Changes marked Published appear on the public website within seconds. Drafts stay private.",
    cautions: [
      "Unpublishing a page that the navigation links to is blocked until the link is removed.",
    ],
    permissionNotes: [
      { permission: "website.pages.write", without: "You can view pages but cannot edit them." },
      { permission: "website.publish", without: "Publish access is not included in your role." },
      {
        permission: "website.navigation.write",
        without: "You cannot change the navigation or footer.",
      },
    ],
  },
  {
    prefix: "/admin/settings/staff",
    title: "Users & Access",
    purpose: "Who can sign in, with which role, and what each person can do.",
    actions: [
      "Create a staff account with a temporary password (shown once).",
      "Change a role, disable or reactivate an account, reset a password.",
    ],
    nextSteps: [
      "Give the temporary password privately; the person chooses their own at first sign-in and sets up their authenticator.",
    ],
    publicEffect: null,
    cautions: [
      "Only the owner (Super Admin) can manage staff.",
      "The last active owner cannot be disabled or demoted.",
    ],
    permissionNotes: [
      {
        permission: "staff.manage",
        without: "You can see the staff list but cannot change accounts. Ask the owner.",
      },
    ],
  },
  {
    prefix: "/admin/settings/system",
    title: "System",
    purpose: "Document defaults, operational thresholds and system health.",
    actions: ["Check that the database, storage, media signing and required settings are healthy."],
    nextSteps: [],
    publicEffect: null,
    cautions: [],
    permissionNotes: [],
  },
  {
    prefix: "/admin/settings",
    title: "Settings",
    purpose:
      "Business details, contact channels, website settings, legal pages, document defaults, launch readiness and staff.",
    actions: [
      "Change business details and contact channels (these appear on the website after publishing the public configuration).",
      "Check launch readiness before going live.",
    ],
    nextSteps: [],
    publicEffect:
      "Publishing the public configuration updates the website's contact details, footer and site mode.",
    cautions: [
      "The business email is used as configured — change it here only if it is really wrong.",
    ],
    permissionNotes: [
      {
        permission: "settings.business.write",
        without: "You can view settings but cannot change them.",
      },
    ],
  },
  {
    prefix: "/admin/security",
    title: "Security",
    purpose: "Your authenticator, your password and what your role lets you do.",
    actions: ["Change your password.", "See your access in plain English."],
    nextSteps: [],
    publicEffect: null,
    cautions: [],
    permissionNotes: [],
  },
  {
    prefix: "/admin",
    title: "Overview",
    purpose:
      "Where things stand today: what needs attention first, then leads, projects, money and site work.",
    actions: [
      "Open any figure to go to the register behind it.",
      "Use Quick Find (Ctrl K) to jump to a client, project, invoice or page.",
    ],
    nextSteps: ["Start with the Getting started list if you are new."],
    publicEffect: null,
    cautions: [],
    permissionNotes: [],
  },
];

export function helpFor(pathname: string): HelpEntry {
  const match = [...helpEntries]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(
      (entry) =>
        pathname === entry.prefix ||
        pathname.startsWith(`${entry.prefix}/`) ||
        pathname.startsWith(`${entry.prefix}?`),
    );
  return match ?? helpEntries[helpEntries.length - 1]!;
}
