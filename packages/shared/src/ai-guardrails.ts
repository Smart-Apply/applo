/**
 * AI prompt guardrails — central configuration + usage evaluation.
 *
 * Single source of truth for the character/token limits applied to every
 * user-entered AI prompt input (issue #520). Imported by BOTH the web client
 * (live counters) and the API (authoritative server-side validation) so the
 * two can never drift.
 *
 * This module is intentionally dependency-free: the actual tokenizer
 * (`gpt-tokenizer`, model `gpt-4.1`) is integrated per-app (synchronously on
 * the API, lazily in the browser) and the resulting token count is passed into
 * `evaluatePromptUsage`. Character counts use `String.length` (UTF-16 code
 * units) to stay consistent with class-validator's `@MaxLength` on the backend.
 */

/** Every user-entered AI prompt surface that is guardrailed. */
export type AiPromptSurface = 'interviewChat' | 'editModeAssistant' | 'default';

export interface AiPromptLimit {
  /** Maximum characters (String.length — matches backend `@MaxLength`). */
  maxChars: number;
  /** Maximum estimated tokens (gpt-4.1 / o200k_base). */
  maxTokens: number;
}

/**
 * Per-surface limits. Tune here — no component or service logic needs to
 * change. Values mirror the table in issue #520.
 */
export const AI_PROMPT_LIMITS: Record<AiPromptSurface, AiPromptLimit> = {
  // Generous so full STAR-method answers fit comfortably.
  interviewChat: { maxChars: 3000, maxTokens: 900 },
  editModeAssistant: { maxChars: 2000, maxTokens: 600 },
  default: { maxChars: 1200, maxTokens: 350 },
};

/** Show a non-blocking warning once usage crosses this fraction of any limit. */
export const AI_PROMPT_WARN_THRESHOLD = 0.8;

/**
 * Coarse absolute character ceiling enforced as a cheap DoS backstop BEFORE
 * tokenization (via `@MaxLength` on the DTOs). The precise per-surface limits
 * above are the real guardrail; this only stops pathologically large payloads
 * from ever reaching the tokenizer.
 */
export const AI_PROMPT_HARD_CEILING_CHARS = 8000;

/** Resolve the limit for a surface, falling back to the default surface. */
export function getAiPromptLimit(surface: AiPromptSurface): AiPromptLimit {
  return AI_PROMPT_LIMITS[surface] ?? AI_PROMPT_LIMITS.default;
}

/**
 * Rough token estimate from character count (~4 chars/token).
 *
 * Used as (a) the documented fallback when the real tokenizer is unavailable
 * or throws, and (b) the instant client-side estimate shown before the
 * tokenizer chunk finishes loading. The authoritative count always comes from
 * `gpt-tokenizer` (model `gpt-4.1`).
 */
export function estimateTokensByChars(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export interface PromptUsage {
  /** Character count (String.length). */
  chars: number;
  /** Token count (authoritative or estimated). */
  tokens: number;
  maxChars: number;
  maxTokens: number;
  /** chars / maxChars (may exceed 1). */
  charsRatio: number;
  /** tokens / maxTokens (may exceed 1). */
  tokensRatio: number;
  /** Characters over the limit (0 when within). */
  overChars: number;
  /** Tokens over the limit (0 when within). */
  overTokens: number;
  /** True once either dimension crosses the warn threshold but is not over. */
  isWarning: boolean;
  /** True when either dimension exceeds its limit — submission must be blocked. */
  isOverLimit: boolean;
}

export interface EvaluatePromptUsageInput {
  text: string;
  /**
   * Authoritative or estimated token count. When omitted, falls back to
   * `estimateTokensByChars(text)`.
   */
  tokens?: number;
}

/**
 * Evaluate a prompt's character + token usage against a surface's limits.
 *
 * Pure and side-effect-free so it can run identically on the client (live
 * counter) and the server (authoritative check).
 */
export function evaluatePromptUsage(
  input: EvaluatePromptUsageInput,
  surface: AiPromptSurface = 'default',
): PromptUsage {
  const { maxChars, maxTokens } = getAiPromptLimit(surface);
  const text = input.text ?? '';
  const chars = text.length;
  const tokens = input.tokens ?? estimateTokensByChars(text);

  const charsRatio = maxChars > 0 ? chars / maxChars : 0;
  const tokensRatio = maxTokens > 0 ? tokens / maxTokens : 0;

  const overChars = Math.max(0, chars - maxChars);
  const overTokens = Math.max(0, tokens - maxTokens);

  const isOverLimit = overChars > 0 || overTokens > 0;
  const isWarning =
    !isOverLimit &&
    (charsRatio >= AI_PROMPT_WARN_THRESHOLD || tokensRatio >= AI_PROMPT_WARN_THRESHOLD);

  return {
    chars,
    tokens,
    maxChars,
    maxTokens,
    charsRatio,
    tokensRatio,
    overChars,
    overTokens,
    isWarning,
    isOverLimit,
  };
}
