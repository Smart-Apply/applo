import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '../../../config/config.service';
import type { GenerateOptions, LLMProvider } from '../../llm.interface';
import { createFastProvider } from '../../llm.module';
import { LLMService } from '../../llm.service';
import type { LlmUsageService } from '../../usage/llm-usage.service';

const VALID_TAILORED_PROFILE = '{"target_role":"Nurse","target_company":"Clinic"}';

// LLMService only ever calls `.record()` on its usage collaborator — a
// no-op stub is enough to unit-test lane routing without a real Prisma-backed
// LlmUsageService (issue #522).
const usageStub = { record: vi.fn() } as unknown as LlmUsageService;

function createConfig(overrides: Partial<ConfigService> = {}): ConfigService {
  return {
    llmProvider: 'azure-openai',
    llmFastModel: 'mistral-small-latest',
    llmFastProvider: 'mistral',
    azureOpenAIDeploymentName: 'gpt-4.1',
    mistralModel: 'mistral-large-latest',
    llmCircuitBreakerTimeout: 5_000,
    llmCircuitBreakerErrorThreshold: 50,
    llmCircuitBreakerResetTimeout: 1_000,
    llmCircuitBreakerRollingCountTimeout: 10_000,
    llmCircuitBreakerRollingCountBuckets: 10,
    ...overrides,
  } as ConfigService;
}

function createProvider(response: string): LLMProvider & {
  generateText: ReturnType<typeof vi.fn>;
} {
  return {
    generateText: vi.fn(async (_prompt: string, _options?: GenerateOptions) => response),
  };
}

describe('LLMService fast-model routing', () => {
  it('uses the main default when a separate fast provider is unavailable', async () => {
    const mainProvider = createProvider(VALID_TAILORED_PROFILE);
    const config = createConfig();
    const fastProvider = createFastProvider(config, {} as HttpService);
    const service = new LLMService(mainProvider, config, fastProvider, null, usageStub);

    expect(fastProvider).toBeNull();
    expect(service.isFastRouted('v1/skill-selector.md')).toBe(false);
    await service.callJson('v1/skill-selector.md', {});

    expect(mainProvider.generateText).toHaveBeenCalledOnce();
    expect(mainProvider.generateText.mock.calls[0]?.[1]).not.toHaveProperty('model');
  });

  it('keeps same-provider fast-model routing enabled', async () => {
    const mainProvider = createProvider(VALID_TAILORED_PROFILE);
    const service = new LLMService(
      mainProvider,
      createConfig({ llmFastProvider: 'azure-openai' }),
      null,
      null,
      usageStub,
    );

    expect(service.isFastRouted('v1/skill-selector.md')).toBe(true);
    await service.callJson('v1/skill-selector.md', {});

    expect(mainProvider.generateText.mock.calls[0]?.[1]).toHaveProperty(
      'model',
      'mistral-small-latest',
    );
  });

  it('strips the foreign model when a separate fast provider fails at runtime', async () => {
    const mainProvider = createProvider(VALID_TAILORED_PROFILE);
    const fastProvider = createProvider(VALID_TAILORED_PROFILE);
    fastProvider.generateText.mockRejectedValueOnce(new Error('fast provider unavailable'));
    const service = new LLMService(mainProvider, createConfig(), fastProvider, null, usageStub);

    expect(service.isFastRouted('v1/skill-selector.md')).toBe(true);
    await service.callJson('v1/skill-selector.md', {});

    expect(fastProvider.generateText.mock.calls[0]?.[1]).toHaveProperty(
      'model',
      'mistral-small-latest',
    );
    expect(mainProvider.generateText.mock.calls[0]?.[1]).not.toHaveProperty('model');
  });
});