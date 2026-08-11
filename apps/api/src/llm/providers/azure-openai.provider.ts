import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../config/config.service';
import { LLMProvider, GenerateOptions, LlmCallUsage } from '../llm.interface';
import { LlmRateLimitError } from '../llm-errors';
import { buildV1ChatCompletionsUrl } from './azure-v1-url.util';

/** Bounded in-call retries for HTTP 429. Must stay well inside the circuit
 *  breaker's request timeout, which wraps the whole `generateText` call. */
const RATE_LIMIT_MAX_RETRIES = 2;
const RATE_LIMIT_FALLBACK_DELAY_MS = 2000;
const RATE_LIMIT_MAX_DELAY_MS = 8000;

/** The slice of an axios error we actually read. */
interface HttpErrorLike {
  message?: string;
  response?: {
    status?: number;
    headers?: Record<string, unknown>;
    data?: unknown;
  };
}

function asHttpError(error: unknown): HttpErrorLike {
  return typeof error === 'object' && error !== null ? (error as HttpErrorLike) : {};
}

/**
 * Flatten an axios error into a loggable string that keeps Azure's own message.
 * Without this the caller only ever saw "Request failed with status code 429",
 * hiding *why* Azure refused (token-rate vs. request-rate vs. quota).
 */
function describeAxiosError(error: unknown): string {
  const err = asHttpError(error);
  const status = err.response?.status;
  const body = err.response?.data;
  const azureMessage =
    typeof body === 'string'
      ? body
      : ((body as { error?: { message?: string }; message?: string } | undefined)?.error?.message ??
        (body as { message?: string } | undefined)?.message);
  const parts = [err.message ?? 'Unknown error'];
  if (status) parts.push(`status=${status}`);
  if (azureMessage) parts.push(`azure="${String(azureMessage).slice(0, 300)}"`);
  return parts.join(' | ');
}

/** `Retry-After` is seconds (or an HTTP date) per RFC 9110. Returns ms. */
function parseRetryAfterMs(header: unknown): number | undefined {
  if (header === undefined || header === null) return undefined;
  const raw = Array.isArray(header) ? header[0] : header;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(String(raw));
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * Minimal shape of the Azure `chat/completions` response we consume. Typing it
 * (vs `any`) lets us read `usage.prompt_tokens_details.cached_tokens` for the
 * prompt-caching measurement without unsafe-any access.
 */
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

/**
 * Per-instance overrides so a second instance can target a different Azure
 * resource/deployment than the AZURE_OPENAI_* defaults (see the mid lane in
 * llm.module.ts). Omitted fields fall back to config.
 */
export interface AzureOpenAIProviderOverrides {
  endpoint?: string;
  apiKey?: string;
  deploymentName?: string;
  apiVersion?: string;
}

@Injectable()
export class AzureOpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(AzureOpenAIProvider.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;
  private readonly apiVersion: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    overrides?: AzureOpenAIProviderOverrides,
  ) {
    this.endpoint = overrides?.endpoint || this.configService.azureOpenAIEndpoint || '';
    this.apiKey = overrides?.apiKey || this.configService.azureOpenAIApiKey || '';
    this.deploymentName =
      overrides?.deploymentName || this.configService.azureOpenAIDeploymentName;
    this.apiVersion = overrides?.apiVersion || this.configService.azureOpenAIApiVersion;

    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure OpenAI configuration missing');
    }
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    // v1 Foundry API: hit /openai/v1/chat/completions and pass the deployment
    // as `model` in the body (no legacy /openai/deployments/{name} path).
    const url = buildV1ChatCompletionsUrl(this.endpoint, this.apiVersion);

    const messages: any[] = [];

    if (options?.systemMessage) {
      messages.push({
        role: 'system',
        content: options.systemMessage,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    // Structured outputs (#8): forward `response_format` when the caller asks
    // for JSON mode or a JSON schema. Schema-constrained output needs
    // api-version 2024-08-01-preview+; JSON mode needs 2023-12-01-preview+.
    // Both are satisfied by the default api-version. Providers/deployments that
    // don't support it surface a 400 here, which the LLMService JSON-repair
    // fallback then handles on a retry path.
    const requestBody: Record<string, unknown> = {
      model: options?.model ?? this.deploymentName,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    };
    if (options?.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }
    // Prompt caching (Phase 2): a stable routing hint that co-locates requests
    // sharing our byte-identical prefix (Phase 1) on the same backend so the
    // cached prefix stays warm (higher hit rate under load). Replaces the legacy
    // `user` field. See docs/implementation/PROMPT_CACHING.md.
    if (options?.promptCacheKey) {
      requestBody.prompt_cache_key = options.promptCacheKey;
    }

    try {
      const response = await this.postWithRateLimitRetry(url, requestBody);

      const content = response.data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Report normalized token usage (incl. cached input tokens from Azure's
      // automatic prompt cache) for the prompt-caching measurement. Best-effort:
      // usage accounting must never break generation. See
      // docs/implementation/PROMPT_CACHING.md (Phase 0).
      if (options?.onUsage && response.data.usage) {
        const usage = response.data.usage;
        const normalized: LlmCallUsage = {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
        };
        options.onUsage(normalized);
      }

      this.logger.log('Successfully generated text with Azure OpenAI');
      return content;
    } catch (error: unknown) {
      // A 429 survived the retries: propagate it as-is so the circuit breaker
      // can exclude it (rate limiting is back-pressure, not an outage).
      if (error instanceof LlmRateLimitError) {
        this.logger.warn(`Azure OpenAI rate limited: ${error.message}`);
        throw error;
      }
      const detail = describeAxiosError(error);
      this.logger.error(`Azure OpenAI generation failed: ${detail}`);
      throw new Error(`LLM generation failed: ${detail}`);
    }
  }

  /**
   * POST the completion, retrying HTTP 429 a bounded number of times.
   *
   * Azure gates admission on *estimated* tokens (prompt + `max_tokens`), so a
   * burst of parallel pipeline calls can be throttled even when the deployment
   * is far below its real TPM. Those 429s clear in seconds, so a short honoured
   * `Retry-After` wait recovers the generation instead of failing it.
   */
  private async postWithRateLimitRetry(
    url: string,
    requestBody: Record<string, unknown>,
  ): Promise<{ data: ChatCompletionResponse }> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await firstValueFrom(
          this.httpService.post<ChatCompletionResponse>(url, requestBody, {
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
          }),
        );
      } catch (error: unknown) {
        const err = asHttpError(error);
        if (err.response?.status !== 429) throw error;

        const retryAfterMs = parseRetryAfterMs(err.response.headers?.['retry-after']);
        if (attempt >= RATE_LIMIT_MAX_RETRIES) {
          throw new LlmRateLimitError(
            `Azure OpenAI rate limit (429) after ${attempt + 1} attempts: ${describeAxiosError(error)}`,
            retryAfterMs,
          );
        }

        const delay = Math.min(
          retryAfterMs ?? RATE_LIMIT_FALLBACK_DELAY_MS * (attempt + 1),
          RATE_LIMIT_MAX_DELAY_MS,
        );
        this.logger.warn(
          `Azure OpenAI 429 (attempt ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES + 1}) — retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Health check for Azure OpenAI
   * Validates configuration and endpoint availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Validate configuration exists
      if (!this.endpoint || !this.apiKey || !this.deploymentName) {
        this.logger.warn('Azure OpenAI health check failed: Missing configuration');
        return false;
      }

      // Make a minimal API call to verify connectivity
      const url = buildV1ChatCompletionsUrl(this.endpoint, this.apiVersion);

      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            model: this.deploymentName,
            messages: [{ role: 'user', content: 'health check' }],
            max_tokens: 1,
          },
          {
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 5000, // 5 second timeout for health check
          },
        ),
      );

      const isHealthy = response.status === 200;
      this.logger.debug(`Azure OpenAI health check: ${isHealthy ? 'OK' : 'FAILED'}`);
      return isHealthy;
    } catch (error: any) {
      this.logger.warn(`Azure OpenAI health check failed: ${error.message}`);
      return false;
    }
  }
}
