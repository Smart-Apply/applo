/**
 * Helpers for the Azure OpenAI **v1 API** (the "next generation" Foundry API).
 *
 * The v1 surface is OpenAI-client compatible: the model/deployment name moves
 * into the request body and the call hits `{endpoint}/openai/v1/chat/completions`
 * instead of the legacy `{endpoint}/openai/deployments/{name}/chat/completions`.
 * `api-version` is no longer a dated, monthly-churning value — the v1 endpoint
 * accepts only `v1` (latest GA) or `preview` (always-latest preview features).
 */

/**
 * Map a configured `AZURE_OPENAI_API_VERSION` onto a value the v1 endpoint
 * accepts. Legacy dated versions (e.g. `2025-01-01-preview`) are NOT valid on
 * `/openai/v1`, so they're routed to the always-latest `preview` channel —
 * this keeps existing prod/staging secrets working after the migration.
 */
export function normalizeV1ApiVersion(apiVersion?: string): string {
  if (!apiVersion) return 'preview';
  return /^\d{4}-\d{2}-\d{2}/.test(apiVersion) ? 'preview' : apiVersion;
}

/** Build the v1 chat-completions URL for an Azure OpenAI resource endpoint. */
export function buildV1ChatCompletionsUrl(endpoint: string, apiVersion?: string): string {
  const base = endpoint.replace(/\/$/, '');
  const version = normalizeV1ApiVersion(apiVersion);
  return `${base}/openai/v1/chat/completions?api-version=${version}`;
}
