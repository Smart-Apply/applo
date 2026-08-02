import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { LLMService } from './llm.service';
import { AzureOpenAIProvider } from './providers/azure-openai.provider';
import { AzureAIFoundryProvider } from './providers/azure-ai-foundry.provider';
import { MistralProvider } from './providers/mistral.provider';
import { MockLLMProvider } from './providers/mock.provider';
import { ConfigService } from '../config/config.service';

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
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const fastProvider = configService.llmFastProvider;
        if (!fastProvider || fastProvider === configService.llmProvider) {
          return null;
        }
        if (fastProvider === 'mistral') {
          return new MistralProvider(httpService, configService);
        }
        return new AzureOpenAIProvider(httpService, configService);
      },
      inject: [ConfigService, HttpService],
    },
    LLMService,
  ],
  exports: [LLMService, 'AZURE_OPENAI_PROVIDER'],
})
export class LLMModule {}

