/**
 * Application domain constants
 */

export const APPLICATION_TITLE_MAX_LENGTH = 60;
export const APPLICATION_TITLE_MIN_LENGTH = 3;
export const APPLICATION_ID_DISPLAY_LENGTH = 8;
export const ELLIPSIS_LENGTH = 3; // Length of "..." for truncation

/**
 * Cover-letter word budgets by user preference (body words, excluding the
 * salutation line and the closing block — the same definition the
 * `cover-letter.md` prompt uses). Named constants so the prompt renderer, the
 * deterministic length lint, the guarded shorten pass and the eval harness all
 * measure against the SAME number — no drift between what we ask the LLM for
 * and what we check.
 */
export const COVER_LETTER_BUDGETS = {
  /** "Kompakt" — auf den Punkt (~1/2 page). */
  kurz: 250,
  /** Default — the classic one-page letter. */
  standard: 350,
} as const;

export type CoverLetterLength = keyof typeof COVER_LETTER_BUDGETS;

export const DEFAULT_COVER_LETTER_LENGTH: CoverLetterLength = 'standard';

/**
 * Fractional slack on top of the budget before the lint reports an overrun
 * (borderline results only log, they never trigger the shorten pass).
 */
export const COVER_LETTER_LENGTH_TOLERANCE = 0.15;
/**
 * German gets a slightly wider band: formal DE business letters carry fixed
 * formality overhead (Anrede-Bezüge, Schlussformeln im Fließtext) that consumes
 * words without adding content. See the fix plan's "small DE tolerance".
 */
export const COVER_LETTER_LENGTH_TOLERANCE_DE = 0.2;
/**
 * `words >= budget × factor` classifies as `critical` — the "2 Seiten, das
 * liest kein Mensch" failure class from the competitor review.
 */
export const COVER_LETTER_CRITICAL_FACTOR = 1.5;

/**
 * Resolve a stored/user-supplied length preference to its word budget,
 * defaulting unknown or missing values to the standard budget.
 */
export function resolveCoverLetterBudget(length: string | null | undefined): number {
  if (length && length in COVER_LETTER_BUDGETS) {
    return COVER_LETTER_BUDGETS[length as CoverLetterLength];
  }
  return COVER_LETTER_BUDGETS[DEFAULT_COVER_LETTER_LENGTH];
}

/**
 * Shared system-message anchor for the LLM generation calls (cover letter +
 * resume rewrite). Per the GPT-4.1 prompting guide, the static non-negotiables
 * belong in the system turn while the data + detailed task stay in the user
 * turn. This intentionally RESTATES the most important constraints already in
 * the v1 prompts (the "double down" / repetition technique) — it must never
 * contradict them.
 */
export const GENERATION_SYSTEM_ANCHOR = [
  'You are an expert career writer creating ATS-optimized resumes and cover letters',
  'that must work across ALL professions (healthcare, skilled trades, sales, education,',
  'tech, and more — never assume IT). The detailed task is in the user message; the',
  'constraints below are the most important rules, repeated for emphasis:',
  '',
  '- Use ONLY facts present in the provided profile data. Never invent metrics, numbers,',
  '  employers, dates, certifications, or a salary/start date.',
  '- Write every word in the requested target language; it must read as if a native',
  '  speaker wrote it, not a machine translation. Keep established technical terms and',
  '  product names in their original form.',
  '- Sound human and specific. No AI clichés (e.g. "passionate about", "Ich bin',
  '  begeistert"), no hedging/Konjunktiv (e.g. "würde mich freuen", "könnte"), no empty',
  '  superlatives.',
  '- Prefer concrete, profession-appropriate outcomes over generic filler. If a fact is',
  '  missing, omit it gracefully rather than fabricating.',
].join('\n');
