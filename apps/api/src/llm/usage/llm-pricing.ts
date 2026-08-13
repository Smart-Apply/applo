import type { LlmCallUsage } from '../llm.interface';

/**
 * USD per 1M tokens, by normalised model/deployment name. Deployment suffixes
 * (`-staging`, `-local`) are stripped before lookup, so `gpt-4.1-staging`
 * resolves to the `gpt-4.1` entry. A model with no entry here has unknown
 * pricing — `estimateCostUsd` returns `null` rather than guessing.
 */
const PRICING_PER_MILLION_TOKENS: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  'gpt-4.1': { input: 2.0, cachedInput: 0.5, output: 8.0 },
  'mistral-small-latest': { input: 0.1, cachedInput: 0.1, output: 0.3 },
  'mistral-large-latest': { input: 2.0, cachedInput: 2.0, output: 6.0 },
  // gpt-5.4-mini intentionally omitted — unpriced, mid-lane rows record
  // estimatedCostUsd: null rather than a guessed number.
};

function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase().replace(/-(staging|local)$/, '');
}

/** Returns `null` when the model is unmapped or `usage` was not reported. */
export function estimateCostUsd(model: string, usage: LlmCallUsage | undefined): number | null {
  if (!usage) return null;
  const pricing = PRICING_PER_MILLION_TOKENS[normalizeModelKey(model)];
  if (!pricing) return null;

  const uncachedPromptTokens = Math.max(0, usage.promptTokens - usage.cachedTokens);
  const cost =
    (uncachedPromptTokens * pricing.input +
      usage.cachedTokens * pricing.cachedInput +
      usage.completionTokens * pricing.output) /
    1_000_000;
  return cost;
}
