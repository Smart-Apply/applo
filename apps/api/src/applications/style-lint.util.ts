/**
 * Deterministic style linter (non-LLM) for generated CV / cover-letter text.
 *
 * The v1 prompts already forbid a long list of AI-style clichés and German
 * Konjunktiv/hedging, but a prompt rule is only a *request* — GPT-4.1 still
 * slips occasionally. This module turns those same rules into a deterministic,
 * testable check so we can MEASURE how often the model breaks them (e.g. wire
 * it into the offline eval harness or log it per generation), independent of
 * whether the LLM obeyed.
 *
 * It is intentionally NON-destructive: it only detects and reports. Stripping
 * or auto-rewriting German prose blindly risks mangling meaning, so enforcement
 * (a targeted micro-rewrite pass) is deliberately left to a later, eval-backed
 * step. This mirrors the philosophy of `GroundingValidatorService` (flag, never
 * strip).
 *
 * The phrase lists are curated to match the FORBIDDEN sections of
 * `prompts/v1/cover-letter.md` and `prompts/v1/resume-rewrite.md`.
 */

export interface StyleLintResult {
  /** Distinct AI-cliché phrases found (DE + EN), each reported once. */
  aiPhrases: string[];
  /** Distinct German hedging / Konjunktiv constructions found (only when language is German). */
  hedging: string[];
  /** Total number of distinct violations (`aiPhrases.length + hedging.length`). */
  total: number;
}

/** Robotic AI-style clichés the prompts explicitly forbid (German). Lowercase, comma-free fragments. */
const AI_PHRASES_DE: readonly string[] = [
  'ich bin begeistert',
  'begeistert von der möglichkeit',
  'ich bin überzeugt',
  'leidenschaftlich',
  'entwickelt und geliefert',
  'erfolgreich umgesetzt',
  'erfolgreich implementiert',
  'maßgeblich beigetragen',
  'signifikant beigetragen',
  'signifikant optimiert',
  'äußerst begeistert',
  'konzipierte und implementierte',
];

/** Robotic AI-style clichés the prompts explicitly forbid (English). Lowercase fragments. */
const AI_PHRASES_EN: readonly string[] = [
  'passionate about',
  'excited about the opportunity',
  'i am excited about the opportunity',
  'developed and delivered',
  'successfully implemented',
  'played a key role',
  'i am confident that i',
  'proven track record',
];

/** German hedging / Konjunktiv the cover-letter prompt forbids ("confident present tense" rule). */
const HEDGING_DE: readonly string[] = [
  'würde mich freuen',
  'würde mich sehr freuen',
  'würde ich mich freuen',
  'würde gerne',
  'möchte gerne',
  'könnte',
  'hätte',
];

/** Strip HTML tags + Markdown/JSON punctuation noise and collapse whitespace. */
function normalize(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ') // HTML tags (cover letter is stored as HTML)
    .replace(/[{}[\]"`*_#>|]/g, ' ') // Markdown / JSON structural noise
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return the distinct needles that occur in `haystack` as whole words/phrases.
 * Uses Unicode-aware letter boundaries so German umlauts (ä/ö/ü/ß) are handled
 * correctly — a plain `\b` treats `ü` as a word boundary and misfires.
 */
function findHits(haystack: string, needles: readonly string[]): string[] {
  const found = new Set<string>();
  for (const needle of needles) {
    const re = new RegExp(`(?<!\\p{L})${escapeRegExp(needle)}(?!\\p{L})`, 'u');
    if (re.test(haystack)) {
      found.add(needle);
    }
  }
  return [...found];
}

/**
 * Detect forbidden AI clichés and (for German) hedging/Konjunktiv in generated
 * text. Deterministic and side-effect-free.
 *
 * @param text     The generated cover letter or resume text (HTML/Markdown/JSON ok).
 * @param language Target language code (e.g. `de`, `en`). Hedging is German-specific.
 */
export function lintGeneratedStyle(text: string | null | undefined, language = 'de'): StyleLintResult {
  if (!text || !text.trim()) {
    return { aiPhrases: [], hedging: [], total: 0 };
  }

  const haystack = normalize(text);
  const aiPhrases = findHits(haystack, [...AI_PHRASES_DE, ...AI_PHRASES_EN]);
  const hedging = language.toLowerCase().startsWith('de') ? findHits(haystack, HEDGING_DE) : [];

  return { aiPhrases, hedging, total: aiPhrases.length + hedging.length };
}

/** Verdict of the guarded style-rewrite ("teeth") pass. */
export interface StyleRewriteEvaluation {
  /** Whether the rewrite should replace the draft. */
  accept: boolean;
  /** Distinct style violations in the original draft. */
  before: number;
  /** Distinct style violations in the rewrite (equals `before` when rejected for length). */
  after: number;
  /** Why the rewrite was accepted or rejected. */
  reason: 'too-short' | 'not-improved' | 'improved';
}

/**
 * Decide whether a style-rewrite candidate may replace the draft. This is the
 * deterministic guard that gives the linter "teeth" without ever shipping a
 * worse letter: a rewrite is accepted ONLY if it (a) preserves enough of the
 * draft's length (never guts it) AND (b) strictly reduces the deterministic
 * violation count. Otherwise the caller keeps the original draft.
 *
 * Pure and side-effect-free so it can be unit-tested and reused identically by
 * the live pipeline and the offline eval harness.
 *
 * @param draft         The pre-rewrite cover letter.
 * @param rewritten     The LLM's rewrite candidate (may be empty/undefined on failure).
 * @param language      Target language code (hedging is German-specific).
 * @param minLengthRatio Minimum fraction of the draft length the rewrite must retain.
 */
export function evaluateStyleRewrite(
  draft: string,
  rewritten: string | null | undefined,
  language = 'de',
  minLengthRatio = 0.6,
): StyleRewriteEvaluation {
  const before = lintGeneratedStyle(draft, language).total;

  if (!rewritten || rewritten.trim().length < draft.trim().length * minLengthRatio) {
    return { accept: false, before, after: before, reason: 'too-short' };
  }

  const after = lintGeneratedStyle(rewritten, language).total;
  if (after >= before) {
    return { accept: false, before, after, reason: 'not-improved' };
  }

  return { accept: true, before, after, reason: 'improved' };
}
