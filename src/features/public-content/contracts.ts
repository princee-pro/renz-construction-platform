import type { Database } from "@/lib/database/database.types";
import { contentBlocksSchema, type ContentBlocks } from "@/lib/content/schemas";

type ServiceRow = Database["public"]["Views"]["published_services"]["Row"];
type ProjectRow = Database["public"]["Views"]["published_projects"]["Row"];
type PostRow = Database["public"]["Views"]["published_posts"]["Row"];
type PageRow = Database["public"]["Views"]["published_pages"]["Row"];
type TeamRow = Database["public"]["Views"]["published_team_members"]["Row"];
type CredentialRow = Database["public"]["Views"]["published_credentials"]["Row"];
type TestimonialRow = Database["public"]["Views"]["published_testimonials"]["Row"];
type SettingRow = Database["public"]["Views"]["published_site_settings"]["Row"];
type ClaimRow = Database["public"]["Views"]["published_project_claims"]["Row"];
type ProjectMediaRow = Database["public"]["Views"]["published_project_media"]["Row"];
type ProjectServiceLinkRow = Database["public"]["Views"]["published_project_services"]["Row"];

type ServiceProjection = Pick<
  ServiceRow,
  | "positioning"
  | "sub_services"
  | "use_cases"
  | "process_steps"
  | "coordination"
  | "faqs"
  | "hero_asset_id"
  | "id"
  | "locale"
  | "slug"
  | "name"
  | "summary"
  | "body_blocks"
  | "scope"
  | "client_inputs"
  | "deliverables"
  | "exclusions"
  | "delivery_wording"
  | "seo_title"
  | "seo_description"
  | "featured"
  | "sort_order"
>;
type ProjectProjection = Pick<
  ProjectRow,
  | "evidence_class"
  | "layout_hint"
  | "home_featured"
  | "materials"
  | "tags"
  | "hero_asset_id"
  | "stages"
  | "id"
  | "locale"
  | "slug"
  | "title"
  | "summary"
  | "project_type"
  | "public_location"
  | "start_year"
  | "completion_year"
  | "delivery_status"
  | "project_scope"
  | "renz_role"
  | "challenge"
  | "approach"
  | "solution"
  | "outcomes"
  | "seo_title"
  | "seo_description"
  | "featured"
  | "sort_order"
>;
type PostProjection = Pick<
  PostRow,
  | "topic"
  | "related_service_id"
  | "featured"
  | "pinned"
  | "sort_priority"
  | "hero_asset_id"
  | "id"
  | "locale"
  | "slug"
  | "title"
  | "excerpt"
  | "body_blocks"
  | "publication_date"
  | "seo_title"
  | "seo_description"
>;
type PageProjection = Pick<
  PageRow,
  | "id"
  | "locale"
  | "path"
  | "page_key"
  | "title"
  | "summary"
  | "body_blocks"
  | "seo_title"
  | "seo_description"
  | "canonical_override"
>;
type TeamProjection = Pick<
  TeamRow,
  "id" | "locale" | "name" | "role_label" | "biography" | "sort_order"
>;
type CredentialProjection = Pick<
  CredentialRow,
  | "id"
  | "locale"
  | "name"
  | "approved_public_wording"
  | "description"
  | "issuer"
  | "valid_from"
  | "valid_to"
>;
type TestimonialProjection = Pick<
  TestimonialRow,
  "id" | "locale" | "quote" | "attribution_presentation"
>;
type ProjectMediaProjection = Pick<
  ProjectMediaRow,
  | "focal_x"
  | "focal_y"
  | "provenance_class"
  | "media_asset_id"
  | "id"
  | "project_id"
  | "role"
  | "mime_type"
  | "width"
  | "height"
  | "alt_text"
  | "caption"
  | "decorative"
  | "sort_order"
>;
type ProjectServiceLinkProjection = Pick<
  ProjectServiceLinkRow,
  "project_id" | "service_id" | "scope_label" | "sort_order"
>;

function requiredText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

const publicUrlSettingIds = new Set([
  "contact.public:directions_url",
  "social.public:instagram",
  "social.public:linkedin",
]);

export function normalizePublicHttpsUrl(value: string | null | undefined): string | null {
  const candidate = requiredText(value ?? null);
  if (!candidate) return null;

  for (const character of candidate) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint <= 0x20 ||
      codePoint === 0x7f ||
      character === "\\" ||
      character === "<" ||
      character === ">" ||
      character === '"' ||
      character === "'"
    ) {
      return null;
    }
  }

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password
      ? candidate
      : null;
  } catch {
    return null;
  }
}

function stringList(value: unknown, max = 24): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    .slice(0, max);
}

function faqList(value: unknown): readonly Readonly<{ question: string; answer: string }>[] {
  if (!Array.isArray(value)) return [];
  const items: Readonly<{ question: string; answer: string }>[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const question = (entry as { question?: unknown }).question;
    const answer = (entry as { answer?: unknown }).answer;
    if (
      typeof question === "string" &&
      typeof answer === "string" &&
      question.trim() &&
      answer.trim()
    ) {
      items.push({ question, answer });
    }
  }
  return items.slice(0, 24);
}

function stageList(value: unknown): readonly PublicProjectStage[] {
  if (!Array.isArray(value)) return [];
  const items: PublicProjectStage[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as { id?: unknown }).id;
    const title = (entry as { title?: unknown }).title;
    const description = (entry as { description?: unknown }).description;
    if (typeof id === "string" && typeof title === "string" && title.trim()) {
      items.push({
        id,
        title,
        description: typeof description === "string" && description.trim() ? description : null,
      });
    }
  }
  return items;
}

function evidenceClass(value: string | null): ProjectEvidenceClass {
  return value === "concept_study" || value === "context_study" || value === "experience_study"
    ? value
    : "real_project";
}

function layoutHint(value: string | null): ProjectLayoutHint {
  return value === "monument" ||
    value === "portrait" ||
    value === "landscape" ||
    value === "technical" ||
    value === "strip" ||
    value === "wide"
    ? value
    : "auto";
}

function blocks(value: unknown): ContentBlocks {
  const parsed = contentBlocksSchema.safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
}

export type PublicService = Readonly<{
  id: string;
  locale: string;
  slug: string;
  name: string;
  summary: string;
  bodyBlocks: ContentBlocks;
  scope: string | null;
  clientInputs: string | null;
  deliverables: string | null;
  exclusions: string | null;
  deliveryWording: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  sortOrder: number;
  /** CR1 owner-managed detail (the client-approved category shape). */
  positioning: string | null;
  subServices: readonly string[];
  useCases: readonly string[];
  processSteps: readonly string[];
  coordination: string | null;
  faqs: readonly Readonly<{ question: string; answer: string }>[];
  heroAssetId: string | null;
}>;

export type ProjectEvidenceClass =
  "real_project" | "concept_study" | "context_study" | "experience_study";
export type ProjectLayoutHint =
  "auto" | "monument" | "portrait" | "landscape" | "technical" | "strip" | "wide";

export type PublicProjectStage = Readonly<{
  id: string;
  title: string;
  description: string | null;
}>;

export type PublicProject = Readonly<{
  id: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  projectType: string | null;
  publicLocation: string | null;
  startYear: number | null;
  completionYear: number | null;
  deliveryStatus: string | null;
  projectScope: string | null;
  renzRole: string | null;
  challenge: string | null;
  approach: string | null;
  solution: string | null;
  outcomes: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  sortOrder: number;
  evidenceClass: ProjectEvidenceClass;
  layoutHint: ProjectLayoutHint;
  homeFeatured: boolean;
  materials: string | null;
  tags: readonly string[];
  heroAssetId: string | null;
  stages: readonly PublicProjectStage[];
}>;

export type PublicPost = Readonly<{
  id: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyBlocks: ContentBlocks;
  publicationDate: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  topic: string | null;
  relatedServiceId: string | null;
  featured: boolean;
  pinned: boolean;
  sortPriority: number;
  heroAssetId: string | null;
}>;

export type PublicPage = Readonly<{
  id: string;
  locale: string;
  path: string;
  pageKey: string;
  title: string;
  summary: string;
  bodyBlocks: ContentBlocks;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalOverride: string | null;
}>;

export type PublicTeamMember = Readonly<{
  id: string;
  locale: string;
  name: string;
  roleLabel: string;
  biography: string;
  sortOrder: number;
}>;

export type PublicCredential = Readonly<{
  id: string;
  locale: string;
  name: string;
  approvedPublicWording: string;
  description: string | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
}>;

export type PublicTestimonial = Readonly<{
  id: string;
  locale: string;
  quote: string;
  attribution: string;
}>;

export type PublicSetting = Readonly<{
  namespace: string;
  key: string;
  value: string;
}>;

export type PublicProjectClaim = Readonly<{
  id: string;
  projectId: string;
  claimType: string;
  wording: string;
}>;

export type PublicProjectMedia = Readonly<{
  id: string;
  projectId: string;
  role: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  decorative: boolean;
  sortOrder: number;
  mediaAssetId: string | null;
  focalX: number;
  focalY: number;
  provenanceClass: string | null;
}>;

export type PublicProjectServiceLink = Readonly<{
  projectId: string;
  serviceId: string;
  scopeLabel: string | null;
  sortOrder: number;
}>;

export type PublicHomepageSnapshot = Readonly<{
  services: readonly PublicService[];
  projects: readonly PublicProject[];
  posts: readonly PublicPost[];
  testimonials: readonly PublicTestimonial[];
}>;

export function mapPublicService(row: ServiceProjection): PublicService | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const slug = requiredText(row.slug);
  const name = requiredText(row.name);
  const summary = requiredText(row.summary);
  if (!id || !locale || !slug || !name || !summary) return null;
  return {
    id,
    locale,
    slug,
    name,
    summary,
    bodyBlocks: blocks(row.body_blocks),
    scope: requiredText(row.scope),
    clientInputs: requiredText(row.client_inputs),
    deliverables: requiredText(row.deliverables),
    exclusions: requiredText(row.exclusions),
    deliveryWording: requiredText(row.delivery_wording),
    seoTitle: requiredText(row.seo_title),
    seoDescription: requiredText(row.seo_description),
    featured: row.featured === true,
    sortOrder: row.sort_order ?? 0,
    positioning: requiredText(row.positioning),
    subServices: stringList(row.sub_services),
    useCases: stringList(row.use_cases),
    processSteps: stringList(row.process_steps),
    coordination: requiredText(row.coordination),
    faqs: faqList(row.faqs),
    heroAssetId: requiredText(row.hero_asset_id),
  };
}

export function mapPublicProject(row: ProjectProjection): PublicProject | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const slug = requiredText(row.slug);
  const title = requiredText(row.title);
  const summary = requiredText(row.summary);
  if (!id || !locale || !slug || !title || !summary) return null;
  return {
    id,
    locale,
    slug,
    title,
    summary,
    projectType: requiredText(row.project_type),
    publicLocation: requiredText(row.public_location),
    startYear: row.start_year,
    completionYear: row.completion_year,
    deliveryStatus: requiredText(row.delivery_status),
    projectScope: requiredText(row.project_scope),
    renzRole: requiredText(row.renz_role),
    challenge: requiredText(row.challenge),
    approach: requiredText(row.approach),
    solution: requiredText(row.solution),
    outcomes: requiredText(row.outcomes),
    seoTitle: requiredText(row.seo_title),
    seoDescription: requiredText(row.seo_description),
    featured: row.featured === true,
    sortOrder: row.sort_order ?? 0,
    evidenceClass: evidenceClass(row.evidence_class),
    layoutHint: layoutHint(row.layout_hint),
    homeFeatured: row.home_featured === true,
    materials: requiredText(row.materials),
    tags: stringList(row.tags, 12),
    heroAssetId: requiredText(row.hero_asset_id),
    stages: stageList(row.stages),
  };
}

export function mapPublicPost(row: PostProjection): PublicPost | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const slug = requiredText(row.slug);
  const title = requiredText(row.title);
  const excerpt = requiredText(row.excerpt);
  if (!id || !locale || !slug || !title || !excerpt) return null;
  return {
    id,
    locale,
    slug,
    title,
    excerpt,
    bodyBlocks: blocks(row.body_blocks),
    publicationDate: row.publication_date,
    seoTitle: requiredText(row.seo_title),
    seoDescription: requiredText(row.seo_description),
    topic: requiredText(row.topic),
    relatedServiceId: requiredText(row.related_service_id),
    featured: row.featured === true,
    pinned: row.pinned === true,
    sortPriority: row.sort_priority ?? 0,
    heroAssetId: requiredText(row.hero_asset_id),
  };
}

export function mapPublicPage(row: PageProjection): PublicPage | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const path = requiredText(row.path);
  const pageKey = requiredText(row.page_key);
  const title = requiredText(row.title);
  const summary = requiredText(row.summary);
  if (!id || !locale || !path || !pageKey || !title || !summary) return null;
  return {
    id,
    locale,
    path,
    pageKey,
    title,
    summary,
    bodyBlocks: blocks(row.body_blocks),
    seoTitle: requiredText(row.seo_title),
    seoDescription: requiredText(row.seo_description),
    canonicalOverride: normalizePublicHttpsUrl(row.canonical_override),
  };
}

export function mapPublicTeamMember(row: TeamProjection): PublicTeamMember | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const name = requiredText(row.name);
  const roleLabel = requiredText(row.role_label);
  const biography = requiredText(row.biography);
  if (!id || !locale || !name || !roleLabel || !biography) return null;
  return { id, locale, name, roleLabel, biography, sortOrder: row.sort_order ?? 0 };
}

export function mapPublicCredential(row: CredentialProjection): PublicCredential | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const name = requiredText(row.name);
  const approvedPublicWording = requiredText(row.approved_public_wording);
  if (!id || !locale || !name || !approvedPublicWording) return null;
  return {
    id,
    locale,
    name,
    approvedPublicWording,
    description: requiredText(row.description),
    issuer: requiredText(row.issuer),
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

export function mapPublicTestimonial(row: TestimonialProjection): PublicTestimonial | null {
  const id = requiredText(row.id);
  const locale = requiredText(row.locale);
  const quote = requiredText(row.quote);
  const attribution = requiredText(row.attribution_presentation);
  if (!id || !locale || !quote || !attribution) return null;
  return { id, locale, quote, attribution };
}

export function mapPublicSetting(row: SettingRow): PublicSetting | null {
  const namespace = requiredText(row.namespace);
  const key = requiredText(row.key);
  let value = typeof row.value === "string" ? requiredText(row.value) : null;
  if (!namespace || !key || !value) return null;
  if (publicUrlSettingIds.has(`${namespace}:${key}`)) {
    value = normalizePublicHttpsUrl(value);
    if (!value) return null;
  }
  return { namespace, key, value };
}

export function mapPublicProjectClaim(row: ClaimRow): PublicProjectClaim | null {
  const id = requiredText(row.id);
  const projectId = requiredText(row.project_id);
  const claimType = requiredText(row.claim_type);
  const wording = requiredText(row.approved_public_wording);
  if (!id || !projectId || !claimType || !wording) return null;
  return { id, projectId, claimType, wording };
}

export function mapPublicProjectMedia(row: ProjectMediaProjection): PublicProjectMedia | null {
  const id = requiredText(row.id);
  const projectId = requiredText(row.project_id);
  const role = requiredText(row.role);
  if (!id || !projectId || !role) return null;
  return {
    id,
    projectId,
    role,
    mimeType: requiredText(row.mime_type),
    width: row.width,
    height: row.height,
    altText: requiredText(row.alt_text),
    caption: requiredText(row.caption),
    decorative: row.decorative === true,
    sortOrder: row.sort_order ?? 0,
    mediaAssetId: requiredText(row.media_asset_id),
    focalX: typeof row.focal_x === "number" ? row.focal_x : 0.5,
    focalY: typeof row.focal_y === "number" ? row.focal_y : 0.5,
    provenanceClass: requiredText(row.provenance_class),
  };
}

export function mapPublicProjectServiceLink(
  row: ProjectServiceLinkProjection,
): PublicProjectServiceLink | null {
  const projectId = requiredText(row.project_id);
  const serviceId = requiredText(row.service_id);
  if (!projectId || !serviceId) return null;
  return {
    projectId,
    serviceId,
    scopeLabel: requiredText(row.scope_label),
    sortOrder: row.sort_order ?? 0,
  };
}
