import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../config/config.service';
import { LLMProvider, GenerateOptions, LlmCallUsage } from '../llm.interface';

type MistralChatMessage = { role: 'system' | 'user'; content: string };

/**
 * Mistral provider (OpenAI-wire-compatible chat completions).
 *
 * Deliberately thin — Mistral's `/chat/completions` surface mirrors OpenAI's,
 * so this reuses the same message/`response_format` shape as
 * {@link AzureOpenAIProvider}. It targets BOTH deployment paths with one code
 * path, switched purely by config:
 *
 * - **Mistral La Plateforme** (direct): set `MISTRAL_ENDPOINT=https://api.mistral.ai/v1`
 *   and leave `MISTRAL_API_VERSION` unset. Auth is `Authorization: Bearer <key>`.
 * - **Azure AI Foundry** (Mistral sold by Azure, EU Data Zone): point
 *   `MISTRAL_ENDPOINT` at the Foundry model-inference base
 *   (`https://<resource>.services.ai.azure.com/models`) and set
 *   `MISTRAL_API_VERSION` — Azure requires the `?api-version=` query param and
 *   also accepts bearer key auth on the inference endpoint.
 *
 * Structured outputs: `response_format` (JSON mode + json_schema) is forwarded
 * unchanged. Mistral supports both, but strict `json_schema` parity with the
 * Azure OpenAI deployment is NOT guaranteed — run the A/B eval on the real
 * German prompt chain before switching (see docs/guides/LLM_MODEL_SELECTION.md).
 * The LLMService `parseJsonResponse` regex repair remains the safety net.
 */
@Injectable()
export class MistralProvider implements LLMProvider {
  private readonly logger = new Logger(MistralProvider.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiVersion?: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.endpoint = (this.configService.mistralEndpoint || '').replace(/\/$/, '');
    this.apiKey = this.configService.mistralApiKey || '';
    this.model = this.configService.mistralModel;
    this.apiVersion = this.configService.mistralApiVersion;

    if (!this.endpoint || !this.apiKey) {
      throw new Error('Mistral configuration missing (MISTRAL_ENDPOINT / MISTRAL_API_KEY)');
    }
  }

  /** Build the chat-completions URL, appending `?api-version=` only for Azure Foundry. */
  private buildUrl(): string {
    const url = `${this.endpoint}/chat/completions`;
    return this.apiVersion ? `${url}?api-version=${this.apiVersion}` : url;
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const url = this.buildUrl();

    const messages: MistralChatMessage[] = [];

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

    const requestBody: Record<string, unknown> = {
      model: options?.model ?? this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    };
    if (options?.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, requestBody, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const content = response.data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in Mistral response');
      }

      // Same normalized usage contract as AzureOpenAIProvider, so the eval
      // harness can price a Mistral run. Mistral reports prefix-cache reads as
      // `prompt_tokens_details.cached_tokens` when present; absent = 0, which
      // costs full input price in the estimate rather than silently
      // under-reporting. Best-effort: accounting must never break generation.
      if (options?.onUsage && response.data.usage) {
        const usage = response.data.usage;
        const normalized: LlmCallUsage = {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
        };
        options.onUsage(normalized);
      }

      this.logger.log('Successfully generated text with Mistral');
      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Mistral generation failed', message);
      throw new Error(`LLM generation failed: ${message}`);
    }
  }

  /**
   * Health check for Mistral.
   * Validates configuration and endpoint availability with a minimal request.
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.endpoint || !this.apiKey || !this.model) {
        this.logger.warn('Mistral health check failed: Missing configuration');
        return false;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          this.buildUrl(),
          {
            model: this.model,
            messages: [{ role: 'user', content: 'health check' }],
            max_tokens: 1,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          },
        ),
      );

      const isHealthy = response.status === 200;
      this.logger.debug(`Mistral health check: ${isHealthy ? 'OK' : 'FAILED'}`);
      return isHealthy;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Mistral health check failed: ${message}`);
      return false;
    }
  }
}
