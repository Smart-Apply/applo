import {
  formatReport,
  summarize,
  summarizeRepeats,
  wilsonInterval95,
  type FixtureResult,
} from '../../../../scripts/eval/aggregate';
import {
  compareEvalResults,
  exactMcNemar,
  formatComparison,
} from '../../../../scripts/eval/compare';

function result(
  id: string,
  repeat: number | undefined,
  grounded: boolean,
  score: number,
): FixtureResult {
  return {
    id,
    repeat,
    profession: 'Finance',
    language: 'en',
    judge: {
      scores: {
        action_verb_bullets: 5,
        quantified_or_qualitative: 5,
        summary_targeting: 5,
        cover_letter_personalization: 5,
        style_no_cliches: 5,
        language_correctness: 5,
      },
      overall: score / 20,
    },
    grounding: {
      grounded,
      score,
      totalChecked: 1,
      unsupportedCount: grounded ? 0 : 1,
      unsupportedValues: grounded ? [] : ['40%'],
    },
    length: {
      words: score * 3,
      budget: 350,
      overrun: false,
      underrun: false,
      severity: 'ok',
      governorApplied: false,
      wordsBefore: score * 3,
    },
    durationMs: 1,
    editorApplied: false,
    resumeEditorApplied: false,
    resumeRewriteSucceeded: true,
  };
}

describe('paired eval statistics', () => {
  it('uses fixture clusters rather than repeated observations as inferential units', () => {
    const armA = {
      tag: 'control',
      results: [
        result('finance', 1, false, 80),
        result('finance', 2, true, 100),
        result('sales', 1, true, 100),
        result('sales', 2, true, 100),
      ],
    };
    const armB = {
      tag: 'repair',
      results: [
        result('finance', 1, true, 100),
        result('finance', 2, true, 100),
        result('sales', 1, true, 100),
        result('sales', 2, true, 100),
      ],
    };

    const comparison = compareEvalResults(armA, armB, 'a.json', 'b.json');

    expect(comparison.pairedCount).toBe(4);
    expect(comparison.clusterCount).toBe(2);
    expect(comparison.groundingPass).toMatchObject({
      count: 2,
      improved: 1,
      regressed: 0,
    });
    expect(comparison.metrics.groundingScore).toMatchObject({
      count: 2,
      meanA: 95,
      meanB: 100,
      meanDelta: 5,
    });
  });

  it('pairs historical single runs with explicit repeat one', () => {
    const comparison = compareEvalResults(
      { tag: 'legacy', results: [result('finance', undefined, true, 100)] },
      { tag: 'current', results: [result('finance', 1, true, 100)] },
      'legacy.json',
      'current.json',
    );

    expect(comparison.pairedCount).toBe(1);
    expect(comparison.clusterCount).toBe(1);
  });

  it('excludes an entire fixture cluster when one repeat lacks a metric', () => {
    const completeA = result('finance', 1, true, 100);
    const incompleteA = result('finance', 2, true, 100);
    const completeB = result('finance', 1, true, 100);
    const incompleteB = result('finance', 2, true, 100);
    delete incompleteB.judge;

    const comparison = compareEvalResults(
      { tag: 'a', results: [completeA, incompleteA] },
      { tag: 'b', results: [completeB, incompleteB] },
      'a.json',
      'b.json',
    );

    expect(comparison.metrics.overallScore.count).toBe(0);
    expect(formatComparison(comparison)).toContain('Independent fixture clusters: 1');
  });

  it('rejects duplicate observation pair keys', () => {
    expect(() =>
      compareEvalResults(
        {
          tag: 'a',
          results: [result('finance', undefined, true, 100), result('finance', 1, true, 100)],
        },
        { tag: 'b', results: [result('finance', 1, true, 100)] },
        'a.json',
        'b.json',
      ),
    ).toThrow('duplicate pair key');
  });

  it('computes the exact two-sided McNemar tail', () => {
    expect(exactMcNemar(5, 0, 24)).toEqual({
      count: 24,
      improved: 5,
      regressed: 0,
      discordant: 5,
      pValue: 0.0625,
      verdict: 'not significant',
    });
  });
});

describe('eval aggregation edge cases', () => {
  const meta = { provider: 'test', judgeProvider: 'test', tag: 'edge' };

  it('reports no claim rate when no impact values were checked', () => {
    expect(wilsonInterval95(0, 0)).toBeNull();
    const report = formatReport(summarize([], meta));
    expect(report).toContain('n/a (no impact numbers checked)');
  });

  it('rejects a repeat with no successful fixtures', () => {
    const failed: FixtureResult = {
      id: 'finance',
      profession: 'Finance',
      language: 'en',
      durationMs: 0,
      editorApplied: false,
      resumeEditorApplied: false,
      resumeRewriteSucceeded: false,
      error: 'timeout',
    };

    expect(() => summarizeRepeats([[failed]], meta)).toThrow('no successful fixtures');
  });
});