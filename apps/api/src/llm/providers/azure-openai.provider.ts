import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../config/config.service';
import { LLMProvider, GenerateOptions, LlmCallUsage } from '../llm.interface';
import { buildV1ChatCompletionsUrl } from './azure-v1-url.util';

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
  ) {
    this.endpoint = this.configService.azureOpenAIEndpoint || '';
    this.apiKey = this.configService.azureOpenAIApiKey || '';
    this.deploymentName = this.configService.azureOpenAIDeploymentName;
    this.apiVersion = this.configService.azureOpenAIApiVersion;

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
      model: this.deploymentName,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    };
    if (options?.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<ChatCompletionResponse>(url, requestBody, {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

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
    } catch (error: any) {
      this.logger.error('Azure OpenAI generation failed', error.message);
      throw new Error(`LLM generation failed: ${error.message}`);
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
