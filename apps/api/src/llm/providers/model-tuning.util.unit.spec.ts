import {
  buildModelTuningParams,
  isReasoningModel,
  normalizeReasoningEffort,
} from './model-tuning.util';

describe('isReasoningModel', () => {
  it('detects GPT-5-family deployments regardless of suffix', () => {
    expect(isReasoningModel('gpt-5.4-mini')).toBe(true);
    expect(isReasoningModel('gpt-5.4-mini-staging')).toBe(true);
    expect(isReasoningModel('gpt-5.4-mini-local')).toBe(true);
    expect(isReasoningModel('gpt-5-nano')).toBe(true);
  });

  it('detects o-series deployments', () => {
    expect(isReasoningModel('o3-mini')).toBe(true);
    expect(isReasoningModel('my-o4-mini')).toBe(true);
  });

  it('treats classic models as non-reasoning', () => {
    expect(isReasoningModel('gpt-4.1')).toBe(false);
    expect(isReasoningModel('gpt-4.1-staging')).toBe(false);
    expect(isReasoningModel('gpt-4o')).toBe(false);
    expect(isReasoningModel('gpt-4o-mini')).toBe(false);
  });
});

describe('buildModelTuningParams', () => {
  it('keeps temperature + max_tokens for classic deployments', () => {
    expect(
      buildModelTuningParams('gpt-4.1', { temperature: 0.35, maxTokens: 3000 }),
    ).toEqual({ temperature: 0.35, max_tokens: 3000 });
  });

  it('swaps to max_completion_tokens + reasoning_effort and drops temperature on GPT-5', () => {
    const params = buildModelTuningParams(
      'gpt-5.4-mini',
      { temperature: 0.35, maxTokens: 3000 },
      'minimal',
    );
    expect(params.temperature).toBeUndefined();
    expect(params.max_tokens).toBeUndefined();
    expect(params.reasoning_effort).toBe('minimal');
    // Headroom for hidden reasoning tokens sharing the completion budget.
    expect(params.max_completion_tokens).toBe(7000);
  });

  it('omits token caps that were not requested (health check without temperature)', () => {
    expect(buildModelTuningParams('gpt-5.4-mini', {})).toEqual({
      reasoning_effort: 'minimal',
    });
    expect(buildModelTuningParams('gpt-4.1', { maxTokens: 1 })).toEqual({
      max_tokens: 1,
    });
  });
});

describe('normalizeReasoningEffort', () => {
  it('passes through supported values and defaults everything else to minimal', () => {
    expect(normalizeReasoningEffort('high')).toBe('high');
    expect(normalizeReasoningEffort('minimal')).toBe('minimal');
    expect(normalizeReasoningEffort('turbo')).toBe('minimal');
    expect(normalizeReasoningEffort(undefined)).toBe('minimal');
  });
});
