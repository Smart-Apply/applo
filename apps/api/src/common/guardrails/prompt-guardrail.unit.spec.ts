import { describe, it, expect } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import {
  AI_PROMPT_LIMITS,
  AI_PROMPT_WARN_THRESHOLD,
  estimateTokensByChars,
  evaluatePromptUsage,
} from '@applo/shared';
import { ErrorCode } from '../constants/error-codes';
import { CodedHttpException } from '../exceptions/coded-http.exception';
import { countPromptTokens } from './prompt-token-counter';
import { assertPromptWithinLimits } from './prompt-guardrail';

/**
 * Unit coverage for the AI prompt guardrails (issue #520): the shared usage
 * evaluator, the gpt-4.1 token counter, and the authoritative server-side
 * assertion that the API endpoints call.
 */
describe('AI prompt guardrails (issue #520)', () => {
  describe('countPromptTokens', () => {
    it('returns 0 for empty or nullish input', () => {
      expect(countPromptTokens('')).toBe(0);
      expect(countPromptTokens(null)).toBe(0);
      expect(countPromptTokens(undefined)).toBe(0);
    });

    it('counts tokens with the gpt-4.1 tokenizer for natural language', () => {
      const text = 'Ich habe ein Team von fünf Entwicklern geleitet.';
      const tokens = countPromptTokens(text);
      expect(tokens).toBeGreaterThan(0);
      // Natural language is several characters per token.
      expect(tokens).toBeLessThan(text.length);
    });
  });

  describe('evaluatePromptUsage', () => {
    it('reports usage within limits as neither warning nor over', () => {
      const usage = evaluatePromptUsage({ text: 'kurzer Text', tokens: 3 }, 'interviewChat');
      expect(usage.isOverLimit).toBe(false);
      expect(usage.isWarning).toBe(false);
      expect(usage.overChars).toBe(0);
      expect(usage.overTokens).toBe(0);
      expect(usage.maxChars).toBe(AI_PROMPT_LIMITS.interviewChat.maxChars);
      expect(usage.maxTokens).toBe(AI_PROMPT_LIMITS.interviewChat.maxTokens);
    });

    it('flags a warning once usage crosses the 80% threshold (characters)', () => {
      const { maxChars } = AI_PROMPT_LIMITS.interviewChat;
      const atThreshold = 'a'.repeat(Math.ceil(maxChars * AI_PROMPT_WARN_THRESHOLD));
      const usage = evaluatePromptUsage({ text: atThreshold, tokens: 1 }, 'interviewChat');
      expect(usage.isWarning).toBe(true);
      expect(usage.isOverLimit).toBe(false);
    });

    it('detects an over-character limit and reports the overage', () => {
      const { maxChars } = AI_PROMPT_LIMITS.editModeAssistant;
      const usage = evaluatePromptUsage({ text: 'a'.repeat(maxChars + 25), tokens: 1 }, 'editModeAssistant');
      expect(usage.isOverLimit).toBe(true);
      expect(usage.overChars).toBe(25);
    });

    it('detects an over-token limit independently of characters', () => {
      const { maxTokens } = AI_PROMPT_LIMITS.default;
      const usage = evaluatePromptUsage({ text: 'short', tokens: maxTokens + 10 }, 'default');
      expect(usage.isOverLimit).toBe(true);
      expect(usage.overTokens).toBe(10);
      expect(usage.overChars).toBe(0);
    });

    it('falls back to a character-based token estimate when tokens are omitted', () => {
      const text = 'a'.repeat(40);
      const usage = evaluatePromptUsage({ text }, 'default');
      expect(usage.tokens).toBe(estimateTokensByChars(text));
    });

    it('uses the default surface limits for an unknown surface', () => {
      // @ts-expect-error — exercising the runtime fallback for an unknown surface.
      const usage = evaluatePromptUsage({ text: 'x', tokens: 1 }, 'nope');
      expect(usage.maxChars).toBe(AI_PROMPT_LIMITS.default.maxChars);
      expect(usage.maxTokens).toBe(AI_PROMPT_LIMITS.default.maxTokens);
    });
  });

  describe('assertPromptWithinLimits', () => {
    it('does not throw for prompts within limits', () => {
      expect(() =>
        assertPromptWithinLimits('Bitte betone meine Teamführung.', 'editModeAssistant'),
      ).not.toThrow();
    });

    it('does not throw for empty or undefined input', () => {
      expect(() => assertPromptWithinLimits('', 'interviewChat')).not.toThrow();
      expect(() => assertPromptWithinLimits(undefined, 'interviewChat')).not.toThrow();
    });

    it('throws AI_PROMPT_TOO_LONG with overage metadata when over the character limit', () => {
      const { maxChars } = AI_PROMPT_LIMITS.interviewChat;
      let caught: unknown;
      try {
        assertPromptWithinLimits('a'.repeat(maxChars + 100), 'interviewChat');
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(CodedHttpException);
      const exception = caught as CodedHttpException;
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.code).toBe(ErrorCode.AI_PROMPT_TOO_LONG);

      const body = exception.getResponse() as Record<string, unknown>;
      expect(body.code).toBe(ErrorCode.AI_PROMPT_TOO_LONG);
      expect(body.surface).toBe('interviewChat');
      expect(body.maxChars).toBe(maxChars);
      expect(body.overChars).toBe(100);
      expect(body.message).toContain('100 Zeichen');
    });
  });
});
