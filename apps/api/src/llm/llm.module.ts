import { Module, Logger } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { LLMService } from './llm.service';
import { AzureOpenAIProvider } from './providers/azure-openai.provider';
import { AzureAIFoundryProvider } from './providers/azure-ai-foundry.provider';
import { MistralProvider } from './providers/mistral.provider';
import { MockLLMProvider } from './providers/mock.provider';
import { ConfigService } from '../config/config.service';
import { LlmUsageService } from './usage/llm-usage.service';
import { LlmUsageRetentionCron } from './usage/llm-usage-retention.cron';

export function createFastProvider(
  configService: ConfigService,
  httpService: HttpService,
): MistralProvider | AzureOpenAIProvider | null {
  const fastProvider = configService.llmFastProvider;
  if (!fastProvider || fastProvider === configService.llmProvider) {
    return null;
  }
  // The fast lane is an optimization — a misconfigured fast provider
  // (e.g. LLM_FAST_PROVIDER=mistral without MISTRAL_API_KEY) must
  // degrade to main-lane routing, never crash boot.
  try {
    if (fastProvider === 'mistral') {
      return new MistralProvider(httpService, configService);
    }
    return new AzureOpenAIProvider(httpService, configService);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    new Logger('LLMModule').warn(
      `Fast-lane provider "${fastProvider}" unavailable (${message}); fast tasks stay on the main provider`,
    );
    return null;
  }
}

/**
 * Second Azure instance for the mid lane (LLM_MID_MODEL), which may live in a
 * different Azure resource than the main deployment. Endpoint and key fall back
 * to AZURE_OPENAI_* so deploying the mid model into the main resource only
 * needs LLM_MID_MODEL. Null when unset.
 */
export function createMidProvider(
  configService: ConfigService,
  httpService: HttpService,
): AzureOpenAIProvider | null {
  const midModel = configService.llmMidModel;
  if (!midModel) {
    return null;
  }
  // Same contract as the fast lane: a misconfigured mid lane (e.g. no endpoint
  // or key) must degrade to main-lane routing, never crash boot.
  try {
    return new AzureOpenAIProvider(httpService, configService, {
      endpoint: configService.azureOpenAIMidEndpoint,
      apiKey: configService.azureOpenAIMidApiKey,
      deploymentName: midModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    new Logger('LLMModule').warn(
      `Mid-lane model "${midModel}" unavailable (${message}); mid tasks stay on the main provider`,
    );
    return null;
  }
}

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: 'LLM_PROVIDER',
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const provider = configService.llmProvider;
        if (provider === 'azure-openai') {
          return new AzureOpenAIProvider(httpService, configService);
        }
        if (provider === 'azure-ai-foundry') {
          return new AzureAIFoundryProvider(httpService, configService);
        }
        if (provider === 'mistral') {
          return new MistralProvider(httpService, configService);
        }
        return new MockLLMProvider();
      },
      inject: [ConfigService, HttpService],
    },
    // Direct Azure OpenAI provider for simple tasks (title generation, etc.)
    {
      provide: 'AZURE_OPENAI_PROVIDER',
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        if (!configService.azureOpenAIEndpoint || !configService.azureOpenAIApiKey) {
          return null;
        }
        return new AzureOpenAIProvider(httpService, configService);
      },
      inject: [ConfigService, HttpService],
    },
    // Second provider instance for LLM_FAST_MODEL when it lives on a different
    // provider than LLM_PROVIDER (e.g. prose on azure-openai, extraction on
    // Mistral). Null when unset or same as the main provider — LLMService then
    // routes fast tasks through the main provider as before.
    {
      provide: 'LLM_FAST_PROVIDER_INSTANCE',
      useFactory: createFastProvider,
      inject: [ConfigService, HttpService],
    },
    // Second Azure instance for LLM_MID_MODEL, which may live in a different
    // Azure resource than the main deployment. Null when LLM_MID_MODEL is unset
    // — LLMService then keeps every caller on the main provider as before.
    {
      provide: 'LLM_MID_PROVIDER_INSTANCE',
      useFactory: createMidProvider,
      inject: [ConfigService, HttpService],
    },
    LLMService,
    LlmUsageService,
    LlmUsageRetentionCron,
  ],
  exports: [LLMService, 'AZURE_OPENAI_PROVIDER', LlmUsageService],
})
export class LLMModule {}

