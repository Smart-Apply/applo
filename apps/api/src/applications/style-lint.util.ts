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
import {
  COVER_LETTER_CRITICAL_FACTOR,
  COVER_LETTER_LENGTH_TOLERANCE,
  COVER_LETTER_LENGTH_TOLERANCE_DE,
} from './constants';
import { isKeywordPresent } from './keyword-coverage.util';

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

/**
 * German résumé bullets must NOT open with a finite past-tense verb
 * ("Entwickelte…", "Implementierte…") — that is the English action-verb
 * convention misapplied to German, where it reads as anglicised Denglisch.
 * Idiomatic German CVs use Nominalstil (noun-led: "Entwicklung…", "Aufbau…").
 * This deterministic detector flags the offending bullets so the résumé
 * style-rewrite pass can convert them and the eval can measure the rate.
 *
 * Detection is intentionally PRECISION-biased (a curated set of common CV verbs
 * plus the `-ierte` weak-verb suffix, which as a bullet's first word is
 * effectively always a verb) so it never false-flags a correct noun-led bullet.
 */
const GERMAN_PAST_TENSE_CV_VERBS: ReadonlySet<string> = new Set([
  'entwickelte', 'erstellte', 'leitete', 'betreute', 'verantwortete', 'baute',
  'führte', 'setzte', 'steuerte', 'verbesserte', 'erhöhte', 'senkte', 'steigerte',
  'gestaltete', 'bearbeitete', 'verwaltete', 'pflegte', 'schulte', 'unterstützte',
  'begleitete', 'ermöglichte', 'gewährleistete', 'plante', 'gründete', 'erweiterte',
  'überwachte', 'prüfte', 'testete', 'übernahm', 'schuf', 'gewann', 'hielt',
  'begann', 'schrieb', 'entwarf', 'trug',
]);

/** Extract the lowercased first word of a bullet, stripping leading list markers. */
function bulletFirstWord(bullet: string): string {
  const cleaned = bullet.replace(/^[\s\-•*–—·.()[\]"'`]+/u, '');
  const match = cleaned.match(/^[\p{L}]+/u);
  return match ? match[0].toLowerCase() : '';
}

/** Does a (lowercased) word look like a German finite past-tense verb a bullet shouldn't open with? */
function isGermanPastTenseVerbOpener(word: string): boolean {
  if (GERMAN_PAST_TENSE_CV_VERBS.has(word)) return true;
  // `-ierte` is the past tense of the large `-ieren` verb family (implementierte,
  // optimierte, realisierte…) and, as a bullet's FIRST word, is effectively always
  // a verb — no common German noun opens a CV bullet with an `-ierte` word.
  return word.length >= 6 && /ierte$/u.test(word);
}

/**
 * Return the subset of German bullets that open with a finite past-tense verb
 * (the anglicised "Entwickelte…" style). Empty for non-German languages.
 *
 * @param bullets  Achievement / highlight strings (one bullet each).
 * @param language Target language code (the check is German-specific).
 */
export function detectGermanVerbFirstBullets(bullets: string[], language = 'de'): string[] {
  if (!language.toLowerCase().startsWith('de')) return [];
  const hits: string[] = [];
  for (const bullet of bullets) {
    if (bullet && isGermanPastTenseVerbOpener(bulletFirstWord(bullet))) {
      hits.push(bullet);
    }
  }
  return hits;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Cover-letter length lint + guarded shorten evaluation.
 *
 * The 350–400-word cap lived ONLY in the prompts; nothing measured the output
 * ("Vorschläge … grundsätzlich immer viel zu lang" — the competitor-review
 * class of failure). Same philosophy as the style lint above: measure
 * deterministically what prompts merely request, and give it guarded teeth.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LengthLintResult {
  /** Body words — salutation line and closing block excluded. */
  words: number;
  /** The resolved word budget (see `COVER_LETTER_BUDGETS`). */
  budget: number;
  /** Absolute word slack on top of the budget before `overrun` flips. */
  tolerance: number;
  /** `words > budget + tolerance`. */
  overrun: boolean;
  /** `critical` = the "2-page" class (`words >= budget × 1.5`). */
  severity: 'ok' | 'warn' | 'critical';
}

/** Salutation contract from `buildSalutation` / the cover-letter prompt. */
const SALUTATION_LINE_RE =
  /^(sehr geehrte|liebe[rs]?\s|dear\s|hello\s|hi\s)/i;

/** Closing block markers ("Mit freundlichen Grüßen" + the name lines after). */
const CLOSING_LINE_RE =
  /^(mit freundlichen grüßen|mit besten grüßen|freundliche grüße|viele grüße|beste grüße|sincerely|best regards|kind regards|warm regards|with best regards|yours sincerely|yours faithfully|regards)\b/i;

/**
 * Split cover-letter text (Markdown OR stored HTML) into trimmed, non-empty
 * plain-text lines. HTML block ends / line breaks become line boundaries so the
 * salutation and closing detection sees the same "lines" a reader would.
 */
function toPlainLines(text: string): string[] {
  return text
    .replace(/<\s*(?:br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The letter's first plain line when it matches the salutation contract. */
export function extractSalutationLine(text: string | null | undefined): string | null {
  if (!text) return null;
  const first = toPlainLines(text)[0];
  return first && SALUTATION_LINE_RE.test(first) ? first : null;
}

/**
 * Count the BODY words of a cover letter: strips the salutation line and the
 * closing block (marker line + everything after it, i.e. the signature name),
 * matching the prompt's own "excluding greeting/closing" budget definition.
 * Tokens must contain at least one letter or digit — stray dashes don't count.
 */
export function countCoverLetterBodyWords(text: string | null | undefined): number {
  if (!text || !text.trim()) return 0;

  let lines = toPlainLines(text);
  if (lines.length > 0 && SALUTATION_LINE_RE.test(lines[0])) {
    lines = lines.slice(1);
  }
  const closingIndex = lines.findIndex((line) => CLOSING_LINE_RE.test(line));
  if (closingIndex !== -1) {
    lines = lines.slice(0, closingIndex);
  }

  const body = lines
    .join(' ')
    .replace(/[{}[\]"`*_#>|]/g, ' ') // Markdown / JSON structural noise
    .trim();
  if (!body) return 0;

  return body.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * Deterministic cover-letter length check. Pure and side-effect-free so the
 * live pipeline (`runStyleCheck` + the shorten-pass trigger) and the offline
 * eval harness measure with the identical rule.
 *
 * @param text     Cover letter as Markdown or stored HTML.
 * @param budget   Word budget (see `COVER_LETTER_BUDGETS` / `resolveCoverLetterBudget`).
 * @param language Target language code — German gets the slightly wider
 *                 tolerance band (`COVER_LETTER_LENGTH_TOLERANCE_DE`).
 */
export function lintCoverLetterLength(
  text: string | null | undefined,
  budget: number,
  language = 'de',
): LengthLintResult {
  const words = countCoverLetterBodyWords(text);
  const toleranceFactor = language.toLowerCase().startsWith('de')
    ? COVER_LETTER_LENGTH_TOLERANCE_DE
    : COVER_LETTER_LENGTH_TOLERANCE;
  const tolerance = Math.round(budget * toleranceFactor);
  const overrun = words > budget + tolerance;
  const critical = words >= Math.round(budget * COVER_LETTER_CRITICAL_FACTOR);

  return {
    words,
    budget,
    tolerance,
    overrun,
    severity: critical ? 'critical' : overrun ? 'warn' : 'ok',
  };
}

/** Verdict of the guarded shorten ("length governor") pass. */
export interface ShortenRewriteEvaluation {
  /** Whether the shortened letter may replace the draft. */
  accept: boolean;
  /** Body words of the pre-shorten draft. */
  wordsBefore: number;
  /** Body words of the shorten candidate (equals `wordsBefore` when empty). */
  wordsAfter: number;
  /** Why the candidate was accepted or rejected. */
  reason:
    | 'empty'
    | 'gutted'
    | 'salutation-changed'
    | 'still-over-budget'
    | 'style-regressed'
    | 'keyword-dropped'
    | 'shortened';
}

/**
 * Decide whether a shorten-pass candidate may replace the overrun draft — the
 * deterministic guard that keeps the length governor non-destructive. Accepts
 * ONLY when the candidate (a) isn't gutted, (b) keeps the salutation line
 * verbatim (the same contract the cover-letter prompt enforces), (c) actually
 * lands within budget + tolerance, (d) doesn't increase the deterministic
 * style-violation count, and (e) still contains every previously-woven
 * priority-1 keyword. On any failure the caller keeps the pre-shorten draft.
 *
 * Pure and side-effect-free so the live pipeline and the offline eval harness
 * apply the identical acceptance rule.
 *
 * @param draft            The pre-shorten cover letter (known overrun).
 * @param shortened        The LLM's shorten candidate (may be empty on failure).
 * @param budget           Word budget the candidate must land within.
 * @param language         Target language code (tolerance + hedging rules).
 * @param mustKeepKeywords Keywords that must survive (e.g. the woven priority-1
 *                         profile-supported set present in the draft).
 * @param minLengthRatio   Minimum fraction of the draft the candidate must retain.
 */
export function evaluateShortenRewrite(
  draft: string,
  shortened: string | null | undefined,
  budget: number,
  language = 'de',
  mustKeepKeywords: readonly string[] = [],
  minLengthRatio = 0.5,
): ShortenRewriteEvaluation {
  const wordsBefore = countCoverLetterBodyWords(draft);

  if (!shortened || !shortened.trim()) {
    return { accept: false, wordsBefore, wordsAfter: wordsBefore, reason: 'empty' };
  }

  const wordsAfter = countCoverLetterBodyWords(shortened);

  if (shortened.trim().length < draft.trim().length * minLengthRatio) {
    return { accept: false, wordsBefore, wordsAfter, reason: 'gutted' };
  }

  const draftSalutation = extractSalutationLine(draft);
  if (draftSalutation && extractSalutationLine(shortened) !== draftSalutation) {
    return { accept: false, wordsBefore, wordsAfter, reason: 'salutation-changed' };
  }

  if (lintCoverLetterLength(shortened, budget, language).overrun) {
    return { accept: false, wordsBefore, wordsAfter, reason: 'still-over-budget' };
  }

  const styleBefore = lintGeneratedStyle(draft, language).total;
  const styleAfter = lintGeneratedStyle(shortened, language).total;
  if (styleAfter > styleBefore) {
    return { accept: false, wordsBefore, wordsAfter, reason: 'style-regressed' };
  }

  for (const keyword of mustKeepKeywords) {
    if (!isKeywordPresent(shortened, keyword)) {
      return { accept: false, wordsBefore, wordsAfter, reason: 'keyword-dropped' };
    }
  }

  return { accept: true, wordsBefore, wordsAfter, reason: 'shortened' };
}
