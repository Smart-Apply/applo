/**
 * Structured template data passed to every react-pdf renderer.
 *
 * Lives in `pdf-v2` because it is the contract between the LLM
 * pipeline (which produces the data) and the TSX templates (which
 * render it). Previously co-located with the legacy Handlebars
 * renderer in `pdf/template-renderer.service.ts` — moved here as
 * part of the puppeteer removal so consumers no longer need to
 * import from a deleted module.
 */

export interface CoverLetterTemplateData {
  candidateName: string;
  /** Target job title for CV/CL (displayed under name). */
  targetJobTitle?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  /** Street + house number (e.g., "Musterstraße 123"). */
  street?: string;
  /** Postal code / PLZ (e.g., "47057"). */
  postalCode?: string;
  /** City name (e.g., "Duisburg"). */
  city?: string;
  /** Country name (e.g., "Deutschland"). */
  country?: string;
  /** Pre-formatted full address for templates. */
  fullAddress?: string;
  date?: string;
  recipientName?: string;
  companyName?: string;
  companyAddress?: string;
  /** HTML content from LLM. */
  content: string;
  closingPhrase?: string;
  footer?: string;
  /** Language code ('de', 'en', etc.) for localized content. */
  language?: string;
}

export interface ResumeTemplateData {
  candidateName: string;
  targetJobTitle?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  fullAddress?: string;
  summary?: string;
  skillCategories?: SkillCategory[];
  experiences?: Experience[];
  projects?: Project[];
  education?: Education[];
  certifications?: Certification[];
  languages?: ResumeLanguage[];
  /** Language code ('de', 'en', etc.) for localized section headers. */
  language?: string;
  /**
   * User-chosen section order from the editor (keys: 'profile',
   * 'experience', 'education', 'projects', 'skills', 'languages',
   * 'certs'). Optional — absent means the template's default order,
   * so all pre-existing records render unchanged.
   */
  sectionOrder?: string[];
}

/**
 * Resolves the section order a template should render. Unknown requested
 * keys are dropped; sections the request omits are appended in the
 * template's default order so no content is ever lost.
 */
export function resolveSectionOrder(
  requested: string[] | undefined,
  templateDefault: readonly string[],
): string[] {
  if (!requested?.length) return [...templateDefault];
  const known = requested.filter((key) => templateDefault.includes(key));
  const missing = templateDefault.filter((key) => !known.includes(key));
  return [...known, ...missing];
}

export interface ResumeLanguage {
  name: string;
  level?: string;
}

export interface SkillCategory {
  /** Languages, Frameworks, Cloud, Databases, Tools, Other. */
  type: string;
  skills: string[];
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  /** e.g., "Jan 2020 - Present". */
  dateRange: string;
  /**
   * Raw ISO dates backing `dateRange`. Optional — present on rows stored
   * since the language-switch export fix so `dateRange` can be re-derived
   * deterministically in the export language. Absent on legacy rows (the
   * stored `dateRange` string is then used as-is).
   */
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  /** HTML strings. */
  achievements?: string[];
}

export interface Project {
  name: string;
  description?: string;
  date?: string;
  /** Raw ISO date backing `date` (see Experience.startDate). */
  startDate?: string;
  /** HTML strings. */
  highlights?: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
  /** Raw ISO dates backing `year` (see Experience.startDate). */
  startDate?: string;
  endDate?: string;
  fieldOfStudy?: string;
  gpa?: string;
  description?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
}

/** Match browser whitespace semantics for text imported from PDF/DOCX sources. */
export function collapseSoftWhitespace(value: string): string {
  return value.replace(/[ \t\f\r\n]+/g, ' ');
}

function normalizeInlineText(value: string): string {
  return collapseSoftWhitespace(value).replace(/^[ \t\f\r\n]+|[ \t\f\r\n]+$/g, '');
}

function normalizeCompactText(value: string): string {
  return value.replace(/[ \t\f\r\n]+/g, '');
}

function normalizeOptionalInlineText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return normalizeInlineText(value) || undefined;
}

function normalizeRichText(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes('<') ? trimmed : normalizeInlineText(trimmed);
}

function normalizeOptionalRichText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return normalizeRichText(value) || undefined;
}

function normalizeOptionalSummary(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return normalizeRichText(value.replace(/<br\s*\/?\s*>/gi, ' ')) || undefined;
}

/**
 * Collapse source-document line wrapping in fields rendered as inline text.
 * Explicit rich-text structure (`<p>`, `<div>`, `<br>`) stays untouched and
 * is interpreted later by `rich-text.tsx`.
 */
export function normalizeResumeTemplateData(data: ResumeTemplateData): ResumeTemplateData {
  return {
    ...data,
    candidateName: normalizeInlineText(data.candidateName),
    targetJobTitle: normalizeOptionalInlineText(data.targetJobTitle),
    email: data.email === undefined ? undefined : normalizeCompactText(data.email) || undefined,
    phone: normalizeOptionalInlineText(data.phone),
    linkedin:
      data.linkedin === undefined ? undefined : normalizeCompactText(data.linkedin) || undefined,
    github: data.github === undefined ? undefined : normalizeCompactText(data.github) || undefined,
    street: normalizeOptionalInlineText(data.street),
    postalCode: normalizeOptionalInlineText(data.postalCode),
    city: normalizeOptionalInlineText(data.city),
    country: normalizeOptionalInlineText(data.country),
    fullAddress: normalizeOptionalInlineText(data.fullAddress),
    summary: normalizeOptionalSummary(data.summary),
    skillCategories: data.skillCategories?.map((category) => ({
      ...category,
      type: normalizeInlineText(category.type),
      skills: category.skills.map(normalizeInlineText),
    })),
    experiences: data.experiences?.map((experience) => ({
      ...experience,
      title: normalizeInlineText(experience.title),
      company: normalizeInlineText(experience.company),
      location: normalizeOptionalInlineText(experience.location),
      dateRange: normalizeInlineText(experience.dateRange),
      description: normalizeOptionalRichText(experience.description),
      achievements: experience.achievements?.map(normalizeRichText),
    })),
    projects: data.projects?.map((project) => ({
      ...project,
      name: normalizeInlineText(project.name),
      description: normalizeOptionalRichText(project.description),
      date: normalizeOptionalInlineText(project.date),
      highlights: project.highlights?.map(normalizeRichText),
    })),
    education: data.education?.map((education) => ({
      ...education,
      degree: normalizeInlineText(education.degree),
      institution: normalizeInlineText(education.institution),
      year: normalizeInlineText(education.year),
      fieldOfStudy: normalizeOptionalInlineText(education.fieldOfStudy),
      gpa: normalizeOptionalInlineText(education.gpa),
      description: normalizeOptionalRichText(education.description),
    })),
    certifications: data.certifications?.map((certification) => ({
      ...certification,
      name: normalizeInlineText(certification.name),
      issuer: normalizeInlineText(certification.issuer),
      date: normalizeOptionalInlineText(certification.date),
    })),
    languages: data.languages?.map((language) => ({
      ...language,
      name: normalizeInlineText(language.name),
      level: normalizeOptionalInlineText(language.level),
    })),
  };
}
