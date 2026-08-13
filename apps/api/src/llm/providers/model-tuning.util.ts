/**
 * Model-aware tuning parameters for Azure OpenAI chat-completions calls.
 *
 * The GPT-5 family (e.g. `gpt-5.4-mini`) and the o-series are *reasoning
 * models* with a different parameter surface than gpt-4.1/gpt-4o:
 * - `temperature` (and top_p etc.) are rejected with HTTP 400,
 * - `max_tokens` is replaced by `max_completion_tokens`, whose budget is
 *   shared with hidden `reasoning_tokens`,
 * - `reasoning_effort` (`minimal | low | medium | high`) controls how many
 *   hidden reasoning tokens the model spends before answering. GPT-5 models
 *   support `minimal`, which behaves closest to a classic non-reasoning model
 *   (lowest latency/cost) — the right default for this generation pipeline.
 *
 * Deployment names in this repo conventionally embed the model name
 * (`gpt-5.4-mini`, `gpt-5.4-mini-staging`, `gpt-4.1-local`), so capability
 * detection keys off the configured deployment name.
 */

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'minimal';

/**
 * Extra `max_completion_tokens` headroom for reasoning models. Hidden
 * reasoning tokens draw from the same budget as the visible answer, so the
 * per-call `maxTokens` values (tuned for gpt-4.1 visible output) would
 * otherwise starve the response and return empty content with
 * `finish_reason: 'length'`. The cap only bounds the worst case — billing is
 * per actually-consumed token — so generous headroom costs nothing on the
 * happy path.
 */
const REASONING_MAX_TOKENS_HEADROOM = 4000;

/** True for model families that reject `temperature`/`max_tokens` (GPT-5*, o1/o3/o4…). */
export function isReasoningModel(deploymentName: string): boolean {
  return /gpt-5|(^|[^a-z0-9])o\d/i.test(deploymentName);
}

/** Narrow an env-provided value onto the supported reasoning efforts. */
export function normalizeReasoningEffort(value?: string): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'minimal'
    ? value
    : DEFAULT_REASONING_EFFORT;
}

/**
 * Build the sampling/limit portion of a chat-completions request body for the
 * given deployment. Classic models keep the existing `temperature` +
 * `max_tokens` behaviour; reasoning models get `max_completion_tokens` (+
 * headroom) and `reasoning_effort` instead, and `temperature` is dropped.
 */
export function buildModelTuningParams(
  deploymentName: string,
  options: { temperature?: number; maxTokens?: number },
  reasoningEffort: ReasoningEffort = DEFAULT_REASONING_EFFORT,
): Record<string, unknown> {
  if (isReasoningModel(deploymentName)) {
    const params: Record<string, unknown> = {
      reasoning_effort: reasoningEffort,
    };
    if (options.maxTokens !== undefined) {
      params.max_completion_tokens = options.maxTokens + REASONING_MAX_TOKENS_HEADROOM;
    }
    return params;
  }

  const params: Record<string, unknown> = {};
  if (options.temperature !== undefined) params.temperature = options.temperature;
  if (options.maxTokens !== undefined) params.max_tokens = options.maxTokens;
  return params;
}
