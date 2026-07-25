/**
 * Rate-limit (HTTP 429) failure from an LLM provider.
 *
 * Modelled as its own error type because a 429 is *expected back-pressure*,
 * not a provider outage: Azure admits requests against an estimated-token
 * budget, so a burst of parallel pipeline calls can be throttled while the
 * deployment is otherwise perfectly healthy. Counting those toward the
 * opossum circuit breaker used to open it mid-generation, which then made
 * `/health` report the LLM as down — see `LLMService`'s `errorFilter`.
 */
export class LlmRateLimitError extends Error {
  /** Honoured `Retry-After` from the provider, in milliseconds, when supplied. */
  readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'LlmRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export function isRateLimitError(error: unknown): error is LlmRateLimitError {
  return error instanceof LlmRateLimitError;
}
