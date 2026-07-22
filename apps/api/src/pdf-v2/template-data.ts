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
