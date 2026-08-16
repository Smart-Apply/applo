import { createHmac } from 'crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '../../../config/config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { GenerateOptions, LLMProvider } from '../../llm.interface';
import { LLMService } from '../../llm.service';
import { LlmUsageService } from '../../usage/llm-usage.service';
import { LlmUsageRetentionCron } from '../../usage/llm-usage-retention.cron';
import { featureForTemplate } from '../../usage/llm-feature.map';
import type { LlmUsageRecordInput } from '../../usage/llm-usage.types';
import {
  LlmFeature,
  LlmProviderKind,
  LlmRoutingLane,
  LlmCircuitState,
} from '../../../generated/prisma/client';

// Exhaustive list of the 22 live prompt templates and their expected feature
// (issue #522). Kept in sync with llm-feature.map.ts by hand — this table IS
// the regression guard for that map.
const EXPECTED_FEATURE_MAP: Array<[string, LlmFeature]> = [
  ['v1/cover-letter.md', LlmFeature.APPLICATION_COVER_LETTER],
  ['v1/editor-cover-letter.md', LlmFeature.APPLICATION_COVER_LETTER_EDIT],
  ['v1/keyword-weave.md', LlmFeature.APPLICATION_COVER_LETTER_KEYWORD_WEAVE],
  ['v1/style-rewrite.md', LlmFeature.APPLICATION_COVER_LETTER_STYLE],
  ['v1/shorten-cover-letter.md', LlmFeature.APPLICATION_COVER_LETTER_LENGTH],
  ['v1/fix-unsupported-numbers.md', LlmFeature.APPLICATION_COVER_LETTER_GROUNDING],
  ['v1/resume-rewrite.md', LlmFeature.APPLICATION_RESUME],
  ['v1/editor-resume.md', LlmFeature.APPLICATION_RESUME_EDIT],
  ['v1/resume-style-rewrite.md', LlmFeature.APPLICATION_RESUME_STYLE],
  ['v1/fix-unsupported-numbers-resume.md', LlmFeature.APPLICATION_RESUME_GROUNDING],
  ['v1/skill-selector.md', LlmFeature.APPLICATION_PROFILE_TAILOR],
  ['v1/job-facts.md', LlmFeature.APPLICATION_JOB_FACTS],
  ['v1/ats-keywords.md', LlmFeature.APPLICATION_ATS_KEYWORDS],
  ['v1/translate-resume.md', LlmFeature.APPLICATION_TRANSLATION_RESUME],
  ['v1/translate-cover-letter.md', LlmFeature.APPLICATION_TRANSLATION_COVER_LETTER],
  ['v1/ats-keywords-extract.md', LlmFeature.KEYWORDS_EXTRACTION],
  ['v1/profile-keywords.md', LlmFeature.KEYWORDS_PROFILE],
  ['v1/extract-resume.md', LlmFeature.RESUME_PARSER],
  ['v1/application-validation.md', LlmFeature.VALIDATION_CHECK],
  ['interview-question.md', LlmFeature.INTERVIEW_QUESTIONS],
  ['interview-answer-analyzer.md', LlmFeature.INTERVIEW_ANALYSIS],
  ['interview-feedback.md', LlmFeature.INTERVIEW_FEEDBACK],
];

describe('featureForTemplate', () => {
  it.each(EXPECTED_FEATURE_MAP)('maps %s to %s', (templatePath, expected) => {
    expect(featureForTemplate(templatePath)).toBe(expected);
  });

  it('defaults an unknown template to OTHER', () => {
    expect(featureForTemplate('v1/unknown.md')).toBe(LlmFeature.OTHER);
  });

  it('does not let ats-keywords.md swallow ats-keywords-extract.md (exact-key, not includes())', () => {
    expect(featureForTemplate('v1/ats-keywords-extract.md')).toBe(LlmFeature.KEYWORDS_EXTRACTION);
    expect(featureForTemplate('v1/ats-keywords.md')).toBe(LlmFeature.APPLICATION_ATS_KEYWORDS);
  });
});

describe('LLMService usage recording', () => {
  function createConfig(overrides: Partial<ConfigService> = {}): ConfigService {
    return {
      llmProvider: 'azure-openai',
      llmFastModel: undefined,
      llmFastProvider: undefined,
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

  function createProvider(response: string): LLMProvider {
    return {
      generateText: vi.fn(async (_prompt: string, options?: GenerateOptions) => {
        options?.onUsage?.({ promptTokens: 10, completionTokens: 5, cachedTokens: 0 });
        return response;
      }),
    };
  }

  it('records exactly one successful call from callText', async () => {
    const provider = createProvider('mock cover letter output');
    const record = vi.fn();
    const usageStub = { record } as unknown as LlmUsageService;
    const service = new LLMService(provider, createConfig(), null, null, usageStub);

    await service.callText('v1/cover-letter.md', {});

    expect(record).toHaveBeenCalledOnce();
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      feature: LlmFeature.APPLICATION_COVER_LETTER,
      success: true,
      usage: { promptTokens: 10, completionTokens: 5, cachedTokens: 0 },
    });
  });

  it('records exactly one failed call with an errorKind on provider failure', async () => {
    const provider: LLMProvider = {
      generateText: vi.fn(async () => {
        throw new Error('provider exploded');
      }),
    };
    const record = vi.fn();
    const usageStub = { record } as unknown as LlmUsageService;
    const service = new LLMService(provider, createConfig(), null, null, usageStub);

    await expect(service.callText('v1/cover-letter.md', {})).rejects.toThrow(
      'provider exploded',
    );

    expect(record).toHaveBeenCalledOnce();
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      feature: LlmFeature.APPLICATION_COVER_LETTER,
      success: false,
      errorKind: 'Error',
    });
  });

  // Regression: a post-dispatch failure (JSON parse) AFTER the fast lane fell
  // back to main must be attributed to main. Attributing it to the fast lane
  // would price the main lane's tokens at the side lane's rates — a ~20x cost
  // under-report, and it would invert outage attribution.
  it('attributes a post-fallback failure to the lane that actually served it', async () => {
    const fastProvider: LLMProvider = {
      generateText: vi.fn(async () => {
        throw new Error('fast lane down');
      }),
    };
    // Main answers, reports ITS tokens, but returns unparseable JSON.
    const mainProvider: LLMProvider = {
      generateText: vi.fn(async (_prompt: string, options?: GenerateOptions) => {
        options?.onUsage?.({ promptTokens: 999, completionTokens: 111, cachedTokens: 0 });
        return 'definitely not json';
      }),
    };
    const record = vi.fn();
    const usageStub = { record } as unknown as LlmUsageService;
    const service = new LLMService(
      mainProvider,
      createConfig({ llmFastModel: 'mistral-small-latest', llmFastProvider: 'mistral' }),
      fastProvider,
      null,
      usageStub,
    );

    await expect(service.callJson('v1/skill-selector.md', {})).rejects.toThrow();

    expect(record).toHaveBeenCalledOnce();
    const recorded = record.mock.calls[0]?.[0];
    expect(recorded.success).toBe(false);
    expect(recorded.lane).toBe(LlmRoutingLane.MAIN);
    expect(recorded.provider).toBe(LlmProviderKind.AZURE_OPENAI);
    expect(recorded.model).toBe('gpt-4.1');
    // The tokens recorded must be the ones main actually reported.
    expect(recorded.usage).toEqual({ promptTokens: 999, completionTokens: 111, cachedTokens: 0 });
  });

  it('never records prompt or response content', async () => {
    const secretPrompt = 'PROMPT_MARKER_SHOULD_NEVER_LEAK';
    const secretResponse = 'RESPONSE_MARKER_SHOULD_NEVER_LEAK';
    const provider = createProvider(secretResponse);
    const record = vi.fn();
    const usageStub = { record } as unknown as LlmUsageService;
    const service = new LLMService(provider, createConfig(), null, null, usageStub);

    await service.generateText(secretPrompt, { feature: LlmFeature.OTHER });

    expect(record).toHaveBeenCalledOnce();
    const serialized = JSON.stringify(record.mock.calls[0]?.[0]);
    expect(serialized).not.toContain(secretPrompt);
    expect(serialized).not.toContain(secretResponse);
  });
});

describe('LlmUsageService', () => {
  const KNOWN_SALT = 'a'.repeat(32);
  const KNOWN_USER_ID = 'user-abc-123';

  const baseInput: LlmUsageRecordInput = {
    feature: LlmFeature.OTHER,
    provider: LlmProviderKind.MOCK,
    model: 'test-model',
    lane: LlmRoutingLane.MAIN,
    latencyMs: 5,
    success: true,
    circuitState: LlmCircuitState.CLOSED,
  };

  function createFakePrisma(create: ReturnType<typeof vi.fn>): PrismaService {
    return {
      llmUsageEvent: { create },
      subscription: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
  }

  function createFakeConfig(salt: string | undefined): ConfigService {
    return { llmUsageHashSalt: salt } as unknown as ConfigService;
  }

  // record() is deliberately fire-and-forget — flush the microtask queue
  // before asserting on the mocked Prisma call.
  async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('hashes the actor as HMAC-SHA256(key=salt, msg=userId)', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = new LlmUsageService(createFakePrisma(create), createFakeConfig(KNOWN_SALT));

    await service.runWithActor({ userId: KNOWN_USER_ID }, async () => {
      service.record(baseInput);
    });
    await flush();

    expect(create).toHaveBeenCalledOnce();
    const expectedHash = createHmac('sha256', KNOWN_SALT).update(KNOWN_USER_ID).digest('hex');
    expect(create.mock.calls[0]?.[0].data.actorHash).toBe(expectedHash);
    // Never the raw identifier.
    expect(create.mock.calls[0]?.[0].data.actorHash).not.toContain(KNOWN_USER_ID);
  });

  // LlmUsageEvent.language is a STRUCTURAL field. JobPosting.language reaches
  // this sink unclamped (and on the URL-parse path is LLM-produced from an
  // attacker-controllable page), so the allow-list is a security control, not
  // a formatting nicety.
  it.each([
    ['de', 'de'],
    ['EN', 'en'],
    ['  fr  ', 'fr'],
    ['klingon', null],
    ['de; DROP TABLE users', null],
    ['x'.repeat(5000), null],
  ])('normalizes language %j to %j', async (input, expected) => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = new LlmUsageService(createFakePrisma(create), createFakeConfig(KNOWN_SALT));

    await service.runWithActor({ userId: KNOWN_USER_ID }, async () => {
      service.record({ ...baseInput, language: input });
    });
    await flush();

    expect(create.mock.calls[0]?.[0].data.language).toBe(expected);
  });

  it('writes nothing when LLM_USAGE_HASH_SALT is unset', async () => {
    const create = vi.fn();
    const service = new LlmUsageService(createFakePrisma(create), createFakeConfig(undefined));

    await service.runWithActor({ userId: KNOWN_USER_ID }, async () => {
      service.record(baseInput);
    });
    await flush();

    expect(create).not.toHaveBeenCalled();
  });
});

/**
 * Both usage classes take PrismaService as an `@Optional()` parameter typed
 * `PrismaService | null`. TypeScript emits `Object` for that union, so without
 * an explicit `@Inject` token Nest cannot derive the provider and silently
 * injects undefined — `record()` and the retention sweep then return early
 * forever, with no error. Every other test in this file uses `new`, which
 * bypasses DI, so only a container-resolved instance catches it.
 */
describe('LLM usage DI wiring', () => {
  const SALT = 'a'.repeat(64);

  it('resolves PrismaService into LlmUsageService via the Nest container', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        LlmUsageService,
        {
          provide: PrismaService,
          useValue: {
            llmUsageEvent: { create },
            subscription: { findUnique: vi.fn().mockResolvedValue(null) },
          },
        },
        { provide: ConfigService, useValue: { llmUsageHashSalt: SALT } },
      ],
    }).compile();

    const service = moduleRef.get(LlmUsageService);
    expect(service.enabled).toBe(true);

    service.record({
      feature: LlmFeature.VALIDATION_CHECK,
      provider: LlmProviderKind.AZURE_OPENAI,
      model: 'gpt-5.4-mini',
      lane: LlmRoutingLane.MID,
      latencyMs: 5,
      success: true,
      circuitState: LlmCircuitState.CLOSED,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(create).toHaveBeenCalledOnce();
  });

  it('resolves PrismaService into LlmUsageRetentionCron via the Nest container', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        LlmUsageRetentionCron,
        { provide: PrismaService, useValue: { llmUsageEvent: { deleteMany } } },
        {
          provide: ConfigService,
          useValue: { enableCronJobs: true, llmUsageRetentionDays: 90 },
        },
      ],
    }).compile();

    await moduleRef.get(LlmUsageRetentionCron).sweepExpiredUsageEvents();

    expect(deleteMany).toHaveBeenCalledOnce();
  });
});
