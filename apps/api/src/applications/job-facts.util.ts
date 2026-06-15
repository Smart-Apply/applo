/**
 * Cover-letter data layer (#5): structured job-posting facts extracted as a
 * dedicated step and fed into `v1/cover-letter.md`, instead of asking the
 * cover-letter writer to scan the raw `fullText` while it writes.
 *
 * Pure types + deterministic salutation builder + a validation guard, so the
 * branching/copy logic is unit-testable without an LLM. The extraction itself is
 * a focused LLM call (`v1/job-facts.md`) in `ApplicationsService`.
 */

/**
 * Facts extracted from a job posting that make a cover letter specific:
 * the named contact person, a few concrete company specifics, and whether the
 * posting explicitly asks for a salary expectation / start date.
 *
 * Union-free by design so it can use Azure strict `json_schema` (#8).
 */
export interface JobFactsDto {
  /** Contact person's name as written, or '' when none is present. */
  contact_name: string;
  /** 'Frau' | 'Herr' | '' — used to build a correctly-gendered salutation. */
  contact_salutation: string;
  /** 1-3 concrete, non-generic facts about THIS company from the posting. */
  company_specifics: string[];
  /** True when the posting explicitly requests a salary expectation. */
  asks_salary: boolean;
  /** True when the posting explicitly requests an earliest start date. */
  asks_start_date: boolean;
}

const GENERIC_SALUTATION: Record<string, string> = {
  de: 'Sehr geehrte Damen und Herren,',
  en: 'Dear Hiring Manager,',
};

/** Map an extracted 'Frau'/'Herr' to the language-appropriate honorific. */
function honorific(salutation: string, language: string): string | null {
  const s = salutation.trim().toLowerCase();
  const isGerman = language.toLowerCase().startsWith('de');
  if (s === 'frau') return isGerman ? 'Sehr geehrte Frau' : 'Dear Ms.';
  if (s === 'herr') return isGerman ? 'Sehr geehrter Herr' : 'Dear Mr.';
  return null;
}

/**
 * Strip a leading gender honorific (Frau/Herr/Mr/Mrs/Ms/Miss/Mx) from an
 * extracted contact name. The LLM sometimes returns the name *with* the
 * honorific ("Frau Dr. Petra Hoffmann") while also reporting `contact_salutation`
 * separately — composing both then doubles it ("Sehr geehrte Frau Frau …").
 * Academic titles (Dr./Prof.) are intentionally preserved.
 */
function stripLeadingHonorific(name: string): string {
  return name.replace(/^(?:Frau|Herr|Mrs|Mr|Ms|Miss|Mx)\.?(?:\s+|$)/i, '').trim();
}

/**
 * Build the salutation line for the cover letter, deterministically.
 *
 * - Gendered contact ("Frau Schmidt") → "Sehr geehrte Frau Schmidt," / "Dear Ms. Schmidt,".
 * - English name without a known gender → "Dear {name},".
 * - Otherwise the generic greeting for the language.
 *
 * Always returns a trailing comma so the prompt can use it verbatim.
 */
export function buildSalutation(
  facts: Pick<JobFactsDto, 'contact_name' | 'contact_salutation'> | null | undefined,
  language: string,
): string {
  const lang = language.toLowerCase().startsWith('de') ? 'de' : 'en';
  const generic = GENERIC_SALUTATION[lang];

  const rawName = facts?.contact_name?.trim() ?? '';
  if (!rawName) return generic;

  const prefix = honorific(facts?.contact_salutation ?? '', lang);
  if (prefix) {
    // The prefix already carries the gender honorific, so drop a duplicate one
    // from the name to avoid "Sehr geehrte Frau Frau Schmidt,".
    const name = stripLeadingHonorific(rawName);
    if (!name) return generic;
    return `${prefix} ${name},`;
  }

  // Name but no gender marker: English can still address by name (keeping any
  // "Ms."/"Mr." the name already carries); German can't form a correct
  // "Sehr geehrte/r" without it, so fall back to generic.
  if (lang === 'en') return `Dear ${rawName},`;
  return generic;
}

/**
 * Is `value` a well-formed `JobFactsDto`? Lenient — missing optional fields are
 * normalized by `normalizeJobFacts`. Used to reject a malformed LLM payload.
 */
export function isValidJobFacts(value: unknown): value is JobFactsDto {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.contact_name === 'string' &&
    typeof v.contact_salutation === 'string' &&
    Array.isArray(v.company_specifics) &&
    typeof v.asks_salary === 'boolean' &&
    typeof v.asks_start_date === 'boolean'
  );
}

/**
 * Coerce a (possibly partial) extracted payload into a safe `JobFactsDto`,
 * trimming strings and dropping empty company specifics.
 */
export function normalizeJobFacts(raw: Partial<JobFactsDto> | null | undefined): JobFactsDto {
  return {
    contact_name: (raw?.contact_name ?? '').trim(),
    contact_salutation: (raw?.contact_salutation ?? '').trim(),
    company_specifics: Array.isArray(raw?.company_specifics)
      ? raw!.company_specifics.map((s) => String(s).trim()).filter((s) => s.length > 0).slice(0, 3)
      : [],
    asks_salary: raw?.asks_salary === true,
    asks_start_date: raw?.asks_start_date === true,
  };
}
