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

export interface FixtureCoverageSummary {
  /** Priority-1 profile-supported keywords (the set we want covered). */
  wanted: number;
  /** Coverage rate BEFORE the weave pass (0-100). */
  beforeRate: number;
  /** Coverage rate of the FINAL cover letter, after weave (0-100). */
  afterRate: number;
  /** Whether the weave pass actually ran. */
  weaveApplied: boolean;
  /** Keywords the weave attempted to add. */
  weaveKeywords: string[];
}

export interface FixtureStyleSummary {
  /** Total distinct deterministic style violations (AI clichés + hedging). */
  total: number;
  aiPhrases: string[];
  hedging: string[];
}

export interface FixtureResult {
  id: string;
  profession: string;
  language: EvalLanguage;
  judge?: JudgeResult;
  grounding?: FixtureGroundingSummary;
  coverage?: FixtureCoverageSummary;
  style?: FixtureStyleSummary;
  /** True when the style-rewrite "teeth" pass replaced the draft with a cleaner one. */
  styleRewriteApplied?: boolean;
  /** Deterministic style violations in the cover letter BEFORE the teeth pass. */
  styleViolationsBefore?: number;
  /** Deterministic style violations in the FINAL cover letter (after the teeth pass). */
  styleViolationsAfter?: number;
  /** True when the résumé style-rewrite "teeth" pass replaced the payload with a cleaner one. */
  resumeStyleRewriteApplied?: boolean;
  /** Deterministic style violations in the résumé prose BEFORE the teeth pass. */
  resumeStyleViolationsBefore?: number;
  /** Deterministic style violations in the FINAL résumé prose (after the teeth pass). */
  resumeStyleViolationsAfter?: number;
  durationMs: number;
  editorApplied: boolean;
  resumeEditorApplied: boolean;
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
  coverage: {
    /** Fixtures that had at least one priority-1 profile-supported keyword. */
    fixturesWithWanted: number;
    /** Mean priority-1 coverage BEFORE the weave (over fixtures with wanted). */
    meanBeforeRate: number;
    /** Mean priority-1 coverage AFTER the weave (over fixtures with wanted). */
    meanAfterRate: number;
    /** Number of fixtures where the weave pass ran. */
    weaveAppliedCount: number;
  };
  style: {
    /** % of fixtures with zero deterministic style violations. */
    cleanRate: number;
    /** Total violations summed across fixtures. */
    totalViolations: number;
    /** Fixtures with at least one violation. */
    fixturesWithViolations: number;
    /** Number of fixtures where the style-rewrite "teeth" pass replaced the draft. */
    styleRewriteAppliedCount: number;
    /** Number of fixtures where the résumé style-rewrite "teeth" pass replaced the payload. */
    resumeStyleRewriteAppliedCount: number;
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

  // Coverage (#6) — only over fixtures that actually had priority-1 supported keywords.
  const withWanted = ok.filter((r) => r.coverage && r.coverage.wanted > 0);
  const coverage = {
    fixturesWithWanted: withWanted.length,
    meanBeforeRate: mean(withWanted.map((r) => r.coverage!.beforeRate)),
    meanAfterRate: mean(withWanted.map((r) => r.coverage!.afterRate)),
    weaveAppliedCount: ok.filter((r) => r.coverage?.weaveApplied).length,
  };

  const style = {
    cleanRate:
      ok.length === 0
        ? 0
        : Math.round((ok.filter((r) => (r.style?.total ?? 0) === 0).length / ok.length) * 100),
    totalViolations: ok.reduce((acc, r) => acc + (r.style?.total ?? 0), 0),
    fixturesWithViolations: ok.filter((r) => (r.style?.total ?? 0) > 0).length,
    styleRewriteAppliedCount: ok.filter((r) => r.styleRewriteApplied).length,
    resumeStyleRewriteAppliedCount: ok.filter((r) => r.resumeStyleRewriteApplied).length,
  };

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
    coverage,
    style,
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
  lines.push('  Priority-1 keyword coverage (#6, deterministic):');
  lines.push(`    fixtures with supported gaps   ${summary.coverage.fixturesWithWanted}`);
  lines.push(`    mean coverage before weave     ${summary.coverage.meanBeforeRate.toFixed(2)}%`);
  lines.push(`    mean coverage after weave      ${summary.coverage.meanAfterRate.toFixed(2)}%`);
  lines.push(`    weave pass applied             ${summary.coverage.weaveAppliedCount} fixtures`);
  lines.push('');
  lines.push('  Style (deterministic AI-cliché / hedging linter):');
  lines.push(`    clean (0 violations)           ${summary.style.cleanRate}%`);
  lines.push(`    fixtures with violations       ${summary.style.fixturesWithViolations}`);
  lines.push(`    total violations               ${summary.style.totalViolations}`);
  lines.push(`    style-rewrite applied          ${summary.style.styleRewriteAppliedCount} fixtures`);
  lines.push(`    résumé-style-rewrite applied   ${summary.style.resumeStyleRewriteAppliedCount} fixtures`);
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
      r.resumeEditorApplied ? 'resume-editor' : '',
      r.coverage?.weaveApplied ? `weave:${r.coverage.weaveKeywords.join('/')}` : '',
      r.styleRewriteApplied ? 'cl-style-fixed' : '',
      r.resumeStyleRewriteApplied ? 'cv-style-fixed' : '',
      r.resumeRewriteSucceeded ? '' : 'rewrite-degraded',
      r.grounding && r.grounding.unsupportedCount > 0
        ? `unsupported:${r.grounding.unsupportedValues.join('/')}`
        : '',
      r.style && r.style.total > 0
        ? `style:${[...r.style.aiPhrases, ...r.style.hedging].join('/')}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    const cov = r.coverage && r.coverage.wanted > 0
      ? `C=${r.coverage.beforeRate}→${r.coverage.afterRate}% `
      : '';
    lines.push(
      `    ✓ ${r.id.padEnd(22)} ` +
        `O=${r.judge!.overall} ` +
        `G=${r.grounding!.score}% ` +
        `${cov}` +
        `${flags}`,
    );
  }
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}
