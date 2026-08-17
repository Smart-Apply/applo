/**
 * Content model for Applo's programmatic SEO pages.
 *
 * Two page families are generated for every profession, in every supported
 * locale. The shape below is deliberately information-dense: Google's
 * scaled-content-abuse policy demotes pages that are a template with a name
 * substituted into it, so every field here has to hold something a reader
 * could only get from a page about *this* profession — real ATS terminology,
 * the certificates recruiters actually look for, the mistakes specific to
 * that application, the questions that profession really gets asked.
 *
 * Structural parity across locales is enforced by the compiler: each locale
 * file is typed as `ProfessionCatalog`, so a missing profession — or a missing
 * field inside one — is a build error, not a half-empty page in production.
 */

/** The page families. Each profession gets one page per family per locale. */
export const SEO_FAMILIES = ['application', 'interview'] as const;

export type SeoFamily = (typeof SEO_FAMILIES)[number];

/**
 * Language-neutral profession keys. Chosen for cross-market search demand in
 * all six locales and for spread across sectors (tech, health, trades,
 * business, education, admin) — Applo is profession-neutral by design and the
 * SEO surface has to reflect that rather than skewing IT-only.
 */
export const PROFESSION_IDS = [
  'software-developer',
  'nurse',
  'project-manager',
  'sales-representative',
  'accountant',
  'marketing-manager',
  'data-analyst',
  'teacher',
  'office-administrator',
  'customer-service-agent',
  'electrician',
  'warehouse-logistics',
] as const;

export type ProfessionId = (typeof PROFESSION_IDS)[number];

export function isProfessionId(value: string): value is ProfessionId {
  return (PROFESSION_IDS as readonly string[]).includes(value);
}

/** A heading plus the sentence that explains it. */
export interface DetailItem {
  label: string;
  detail: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface InterviewQuestion {
  question: string;
  /** What the interviewer is actually testing with it. */
  why: string;
  /** How to structure a strong answer. */
  tip: string;
}

/** "Application documents" family — cover letter + CV for one profession. */
export interface ApplicationContent {
  /** Localized URL segment, e.g. `softwareentwickler`. */
  slug: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  /** Terms an ATS parser scores this profession's documents against. */
  atsKeywords: string[];
  hardSkills: DetailItem[];
  softSkills: string[];
  certifications: string[];
  /** What a recruiter checks first on this profession's CV. */
  cvFocus: DetailItem[];
  /** A concrete opening sentence, written for this profession. */
  coverLetterOpener: string;
  mistakes: DetailItem[];
  faq: FaqItem[];
}

/** "Interview questions" family — the same profession, at the interview. */
export interface InterviewContent {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  questions: InterviewQuestion[];
  /** Answers that cost this profession the offer. */
  redFlags: string[];
  /** Questions worth asking the interviewer back. */
  askThem: string[];
  faq: FaqItem[];
}

export interface ProfessionContent {
  /** Display name in this locale, e.g. "Softwareentwickler". */
  name: string;
  application: ApplicationContent;
  interview: InterviewContent;
}

/** One locale's full content set. Every profession must be present. */
export type ProfessionCatalog = Record<ProfessionId, ProfessionContent>;

/** Narrow a family-agnostic lookup to the right content block. */
export function contentForFamily(
  profession: ProfessionContent,
  family: SeoFamily,
): ApplicationContent | InterviewContent {
  return family === 'application' ? profession.application : profession.interview;
}
