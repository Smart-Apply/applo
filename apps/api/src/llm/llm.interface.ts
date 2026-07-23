export interface LLMProvider {
  /**
   * Generate text completion from a prompt
   * @param prompt - The prompt to generate from
   * @param options - Additional options
   * @returns Generated text
   */
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Health check for the LLM provider
   * @returns true if the provider is healthy, false otherwise
   */
  healthCheck?(): Promise<boolean>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
  /**
   * Azure OpenAI `response_format` for structured outputs (#8).
   * - `{ type: 'json_object' }` — JSON mode: the model must emit syntactically
   *   valid JSON (no code fences, no prose). Requires the word "json" somewhere
   *   in the messages (the caller guarantees this).
   * - `{ type: 'json_schema', json_schema: {...} }` — schema-constrained output:
   *   responses are valid against the schema by construction (api-version
   *   2024-08-01-preview or newer).
   * Providers that don't support it (mock) ignore this field.
   */
  responseFormat?: ResponseFormat;
  /**
   * Optional usage sink invoked after a successful call with normalized token
   * usage (incl. cached input tokens). Used only by the prompt-caching
   * measurement (LOG_LLM_CALLS) — no-op in the hot path when unset. See
   * docs/implementation/PROMPT_CACHING.md (Phase 0).
   */
  onUsage?: (usage: LlmCallUsage) => void;
}

export type ResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema';
      json_schema: {
        name: string;
        strict: boolean;
        schema: Record<string, unknown>;
      };
    };

/**
 * Normalized per-call token usage, provider-agnostic. `cachedTokens` is the
 * portion of `promptTokens` served from the provider's automatic prompt cache
 * (Azure: `usage.prompt_tokens_details.cached_tokens`). Consumed by the
 * prompt-caching measurement — see docs/implementation/PROMPT_CACHING.md.
 */
export interface LlmCallUsage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
}
