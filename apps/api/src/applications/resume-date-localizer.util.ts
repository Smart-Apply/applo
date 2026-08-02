/**
 * Render-time localization of the date strings inside a stored resume JSON
 * (`Application.resumeText`).
 *
 * Date labels (`dateRange`, `year`, `date`) are baked into the stored JSON at
 * creation time. When an application is exported in a different language the
 * labels must follow — deterministically, without an LLM (fix plan
 * `docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md`):
 *
 * 1. Entries that carry raw ISO dates (`startDate`/`endDate`/`isCurrent`,
 *    stored since this fix) get their label **re-derived** from the raw dates
 *    in the target language.
 * 2. Legacy entries without raw dates fall back to a conservative
 *    **token mapping** of known month names and "Heute"/"Aktuell"/"Present"
 *    markers — applied only to the dedicated date fields, never to prose.
 * 3. Raw ISO strings that leaked into display fields (older generated rows
 *    stored `project.date`/`certification.date` as `toISOString()`) are
 *    detected and formatted properly.
 *
 * Pure and dependency-free so it is unit-testable without Nest/Prisma.
 */
import {
  formatDate,
  formatDateRange,
  presentLabel,
  shortMonthLabel,
} from './resume-template.util';

/** Loose stored-resume shape — structural subset, parsed from JSON. */
export interface LocalizableResume {
  experiences?: Array<{
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }>;
  education?: Array<{
    year?: string;
    startDate?: string;
    endDate?: string;
  }>;
  projects?: Array<{
    date?: string;
    startDate?: string;
  }>;
  certifications?: Array<{
    date?: string;
  }>;
}

/**
 * Month + "present" source tokens → canonical month index (0-based).
 * Stored resume JSON is only ever created in German or English, so the
 * recognition side stays de/en; the EMISSION side covers every export
 * language (labels are produced via the same Intl formatting that
 * `formatDate` uses, so re-derived and token-mapped labels agree).
 */
const SOURCE_MONTH_TOKENS: Record<string, number> = {
  // German (short + long)
  Jan: 0, Januar: 0,
  Feb: 1, Februar: 1,
  März: 2, Mär: 2,
  Apr: 3, April: 3,
  Mai: 4,
  Juni: 5, Jun: 5,
  Juli: 6, Jul: 6,
  Aug: 7, August: 7,
  Sep: 8, Sept: 8, September: 8,
  Okt: 9, Oktober: 9,
  Nov: 10, November: 10,
  Dez: 11, Dezember: 11,
  // English (short + long, where they differ from German)
  Mar: 2, March: 2,
  May: 4,
  June: 5,
  July: 6,
  Oct: 9, October: 9,
  Dec: 11, December: 11,
  January: 0,
  February: 1,
};

/** "Present" source markers (German + English, as stored historically). */
const SOURCE_PRESENT_TOKENS = new Set([
  'Heute', 'heute', 'Aktuell', 'aktuell', 'laufend',
  'Present', 'present', 'Today', 'Current',
]);

/** Was the source token a long-form month name ("Januar"/"January")? */
// "März" is deliberately NOT here: formatDate renders it as the German
// SHORT label, so stored labels containing it map to short target tokens.
const LONG_SOURCE_TOKENS = new Set([
  'Januar', 'Februar', 'April', 'Juni', 'Juli', 'August',
  'September', 'Oktober', 'November', 'Dezember',
  'January', 'February', 'March', 'June', 'July', 'October', 'December',
]);

/** Intl locale used for month labels per target language (mirrors formatDate). */
function monthLabelLocale(targetLanguage: string): string {
  switch (targetLanguage) {
    case 'en':
      return 'en-US';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'pt':
      return 'pt-PT';
    case 'it':
      return 'it-IT';
    default:
      return 'de-DE';
  }
}

/** Localized month label for a canonical month index. */
function monthLabel(monthIndex: number, targetLanguage: string, long: boolean): string {
  const sample = new Date(2000, monthIndex, 15);
  if (long) {
    return sample.toLocaleDateString(monthLabelLocale(targetLanguage), { month: 'long' });
  }
  return shortMonthLabel(sample, targetLanguage);
}

/**
 * Map known month/"present" tokens inside a date label to the target language.
 * Conservative: token-level, exact matches only (with or without a trailing
 * dot); everything unrecognized passes through unchanged. Safe because it is
 * only ever applied to the dedicated date fields of the stored resume.
 */
export function mapDateTokens(value: string, targetLanguage: string): string {
  return value.replace(/\p{L}+\.?/gu, (token) => {
    const bare = token.replace(/\.$/, '');
    if (SOURCE_PRESENT_TOKENS.has(token) || SOURCE_PRESENT_TOKENS.has(bare)) {
      return presentLabel(targetLanguage);
    }
    const monthIndex = SOURCE_MONTH_TOKENS[token] ?? SOURCE_MONTH_TOKENS[bare];
    if (monthIndex === undefined) return token;
    return monthLabel(monthIndex, targetLanguage, LONG_SOURCE_TOKENS.has(bare));
  });
}

/** Parse a stored raw date; accepts ISO strings, rejects bare years/free text. */
function parseIsoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Localize every date label of a stored resume into `targetLanguage`.
 * Returns a new object; the input is never mutated. Prose fields are
 * untouched — this is the deterministic date companion of the LLM
 * content translation.
 */
export function localizeStoredResumeDates<T extends LocalizableResume>(
  resume: T,
  targetLanguage: string,
): T {
  const clone: LocalizableResume = JSON.parse(JSON.stringify(resume));

  for (const exp of clone.experiences ?? []) {
    const start = parseIsoDate(exp.startDate);
    const end = parseIsoDate(exp.endDate);
    if (start || end) {
      exp.dateRange = formatDateRange(start, end, exp.isCurrent === true, targetLanguage);
    } else if (typeof exp.dateRange === 'string' && exp.dateRange) {
      exp.dateRange = mapDateTokens(exp.dateRange, targetLanguage);
    }
  }

  for (const edu of clone.education ?? []) {
    const start = parseIsoDate(edu.startDate);
    const end = parseIsoDate(edu.endDate);
    if (start || end) {
      edu.year = formatDateRange(start, end, false, targetLanguage);
    } else if (typeof edu.year === 'string' && edu.year) {
      edu.year = mapDateTokens(edu.year, targetLanguage);
    }
  }

  for (const project of clone.projects ?? []) {
    const raw = parseIsoDate(project.startDate) ?? parseIsoDate(project.date);
    if (raw) {
      project.date = formatDate(raw, targetLanguage);
    } else if (typeof project.date === 'string' && project.date) {
      project.date = mapDateTokens(project.date, targetLanguage);
    }
  }

  for (const cert of clone.certifications ?? []) {
    const raw = parseIsoDate(cert.date);
    if (raw) {
      cert.date = formatDate(raw, targetLanguage);
    } else if (typeof cert.date === 'string' && cert.date) {
      cert.date = mapDateTokens(cert.date, targetLanguage);
    }
  }

  return clone as T;
}
