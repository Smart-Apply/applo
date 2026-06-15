/**
 * Aggregation + reporting for the eval harness (item #10).
 *
 * Turns per-fixture judge + grounding results into mean rubric scores, a
 * grounding pass-rate, and a per-language breakdown — the numbers we record as a
 * baseline in the tracker and re-run after each phase.
 */
import { RUBRIC_DIMENSIONS, type JudgeResult, type RubricDimension } from './judge';
import type { EvalLanguage } from './fixture.types';

export interface FixtureGroundingSummary {
  grounded: boolean;
  score: number;
  totalChecked: number;
  unsupportedCount: number;
  unsupportedValues: string[];
}

export interface FixtureResult {
  id: string;
  profession: string;
  language: EvalLanguage;
  judge?: JudgeResult;
  grounding?: FixtureGroundingSummary;
  durationMs: number;
  editorApplied: boolean;
  resumeRewriteSucceeded: boolean;
  error?: string;
}

export interface LanguageBreakdown {
  count: number;
  overallMean: number;
  groundingPassRate: number;
}

export interface EvalSummary {
  generatedAt: string;
  provider: string;
  tag: string;
  fixtureCount: number;
  okCount: number;
  errorCount: number;
  rubricMeans: Record<RubricDimension, number>;
  overallMean: number;
  grounding: {
    passRate: number;
    meanScore: number;
    fixturesWithUnsupported: number;
  };
  byLanguage: Record<string, LanguageBreakdown>;
  results: FixtureResult[];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function summarize(
  results: FixtureResult[],
  meta: { provider: string; tag: string },
): EvalSummary {
  const ok = results.filter((r) => !r.error && r.judge && r.grounding);

  const rubricMeans = {} as Record<RubricDimension, number>;
  for (const dim of RUBRIC_DIMENSIONS) {
    rubricMeans[dim] = mean(ok.map((r) => r.judge!.scores[dim]));
  }

  const overallMean = mean(ok.map((r) => r.judge!.overall));
  const groundingPassRate =
    ok.length === 0
      ? 0
      : Math.round((ok.filter((r) => r.grounding!.grounded).length / ok.length) * 100);
  const groundingMeanScore = mean(ok.map((r) => r.grounding!.score));
  const fixturesWithUnsupported = ok.filter((r) => r.grounding!.unsupportedCount > 0).length;

  const byLanguage: Record<string, LanguageBreakdown> = {};
  for (const lang of ['de', 'en'] as EvalLanguage[]) {
    const subset = ok.filter((r) => r.language === lang);
    if (subset.length === 0) continue;
    byLanguage[lang] = {
      count: subset.length,
      overallMean: mean(subset.map((r) => r.judge!.overall)),
      groundingPassRate: Math.round(
        (subset.filter((r) => r.grounding!.grounded).length / subset.length) * 100,
      ),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    provider: meta.provider,
    tag: meta.tag,
    fixtureCount: results.length,
    okCount: ok.length,
    errorCount: results.length - ok.length,
    rubricMeans,
    overallMean,
    grounding: {
      passRate: groundingPassRate,
      meanScore: groundingMeanScore,
      fixturesWithUnsupported,
    },
    byLanguage,
    results,
  };
}

/** Render a human-readable console report. */
export function formatReport(summary: EvalSummary): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`  LLM OUTPUT QUALITY — EVAL REPORT (${summary.tag})`);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`  Provider:   ${summary.provider}`);
  lines.push(`  Generated:  ${summary.generatedAt}`);
  lines.push(`  Fixtures:   ${summary.okCount} ok / ${summary.fixtureCount} total` +
    (summary.errorCount ? `  (${summary.errorCount} errored)` : ''));
  lines.push('');
  lines.push('  Rubric means (1–5):');
  for (const dim of RUBRIC_DIMENSIONS) {
    lines.push(`    ${dim.padEnd(30)} ${summary.rubricMeans[dim].toFixed(2)}`);
  }
  lines.push(`    ${'OVERALL'.padEnd(30)} ${summary.overallMean.toFixed(2)}`);
  lines.push('');
  lines.push('  Grounding (#7, deterministic):');
  lines.push(`    pass rate (fully grounded)     ${summary.grounding.passRate}%`);
  lines.push(`    mean grounding score           ${summary.grounding.meanScore.toFixed(2)}`);
  lines.push(`    fixtures with unsupported #s   ${summary.grounding.fixturesWithUnsupported}`);
  lines.push('');
  lines.push('  By language:');
  for (const [lang, b] of Object.entries(summary.byLanguage)) {
    lines.push(
      `    ${lang}  n=${b.count}  overall=${b.overallMean.toFixed(2)}  grounded=${b.groundingPassRate}%`,
    );
  }
  lines.push('');
  lines.push('  Per fixture (overall | grounding | flags):');
  for (const r of summary.results) {
    if (r.error) {
      lines.push(`    ✖ ${r.id.padEnd(22)} ERROR: ${r.error}`);
      continue;
    }
    const flags = [
      r.editorApplied ? 'editor' : '',
      r.resumeRewriteSucceeded ? '' : 'rewrite-degraded',
      r.grounding && r.grounding.unsupportedCount > 0
        ? `unsupported:${r.grounding.unsupportedValues.join('/')}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    lines.push(
      `    ✓ ${r.id.padEnd(22)} ` +
        `O=${r.judge!.overall} ` +
        `G=${r.grounding!.score}% ` +
        `${flags}`,
    );
  }
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}
