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
import { formatDate, formatDateRange } from './resume-template.util';

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

/** Month + "present" tokens, German → English. */
const DE_TO_EN: Record<string, string> = {
  Jan: 'Jan',
  Feb: 'Feb',
  März: 'Mar',
  Apr: 'Apr',
  Mai: 'May',
  Juni: 'Jun',
  Juli: 'Jul',
  Aug: 'Aug',
  Sept: 'Sep',
  Sep: 'Sep',
  Okt: 'Oct',
  Nov: 'Nov',
  Dez: 'Dec',
  Januar: 'January',
  Februar: 'February',
  April: 'April',
  August: 'August',
  September: 'September',
  Oktober: 'October',
  November: 'November',
  Dezember: 'December',
  Heute: 'Present',
  heute: 'Present',
  Aktuell: 'Present',
  aktuell: 'Present',
  laufend: 'Present',
};

/** Month + "present" tokens, English → German. */
const EN_TO_DE: Record<string, string> = {
  Jan: 'Jan.',
  Feb: 'Feb.',
  Mar: 'März',
  Apr: 'Apr.',
  May: 'Mai',
  Jun: 'Juni',
  Jul: 'Juli',
  Aug: 'Aug.',
  Sep: 'Sept.',
  Sept: 'Sept.',
  Oct: 'Okt.',
  Nov: 'Nov.',
  Dec: 'Dez.',
  January: 'Januar',
  February: 'Februar',
  March: 'März',
  June: 'Juni',
  July: 'Juli',
  October: 'Oktober',
  December: 'Dezember',
  Present: 'Heute',
  present: 'Heute',
  Today: 'Heute',
  Current: 'Heute',
};

/**
 * Map known month/"present" tokens inside a date label to the target language.
 * Conservative: token-level, exact matches only (with or without a trailing
 * dot); everything unrecognized passes through unchanged. Safe because it is
 * only ever applied to the dedicated date fields of the stored resume.
 */
export function mapDateTokens(value: string, targetLanguage: string): string {
  const map = targetLanguage === 'de' ? EN_TO_DE : DE_TO_EN;
  return value.replace(/\p{L}+\.?/gu, (token) => {
    // Look up the token with and without its trailing dot; the mapped value
    // already carries the correct punctuation for the target language.
    return map[token] ?? map[token.replace(/\.$/, '')] ?? token;
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
