import { type AiPromptSurface, type PromptUsage, evaluatePromptUsage } from '@smart-apply/shared';
import { ErrorCode } from '../constants/error-codes';
import { BadRequestWithCode } from '../exceptions/coded-http.exception';
import { countPromptTokens } from './prompt-token-counter';

/**
 * Build the actionable German guidance message for an over-limit prompt,
 * naming only the dimension(s) actually exceeded (e.g. "… um 120 Zeichen bzw.
 * 30 Tokens.").
 */
function buildTooLongMessage(usage: PromptUsage): string {
  const parts: string[] = [];
  if (usage.overChars > 0) parts.push(`${usage.overChars} Zeichen`);
  if (usage.overTokens > 0) parts.push(`${usage.overTokens} Tokens`);
  return `Deine Eingabe für die KI ist zu lang. Bitte kürze sie um ${parts.join(' bzw. ')}.`;
}

/**
 * Authoritative server-side guardrail for a user-entered AI prompt.
 *
 * Re-counts characters + tokens with the same shared logic the web client uses
 * for its live counter and throws a consistent `AI_PROMPT_TOO_LONG` error when
 * either limit is exceeded. Both the over-character and over-token cases share
 * a single error code so client handling stays simple; the overage details are
 * attached as metadata and embedded in the message.
 *
 * No-ops for prompts within limits (including empty/undefined input).
 */
export function assertPromptWithinLimits(
  text: string | null | undefined,
  surface: AiPromptSurface,
): void {
  const value = text ?? '';
  const usage = evaluatePromptUsage({ text: value, tokens: countPromptTokens(value) }, surface);

  if (!usage.isOverLimit) return;

  throw new BadRequestWithCode(ErrorCode.AI_PROMPT_TOO_LONG, buildTooLongMessage(usage), {
    surface,
    maxChars: usage.maxChars,
    maxTokens: usage.maxTokens,
    chars: usage.chars,
    tokens: usage.tokens,
    overChars: usage.overChars,
    overTokens: usage.overTokens,
  });
}
