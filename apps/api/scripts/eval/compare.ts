/** Paired comparison for two eval result files produced from the same fixtures. */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { FixtureResult } from './aggregate';

interface EvalResultFile {
  tag: string;
  results: FixtureResult[];
}

export interface PairedFixture {
  key: string;
  id: string;
  repeat?: number;
  armA: FixtureResult;
  armB: FixtureResult;
}

export interface PairedMetricComparison {
  count: number;
  meanA: number;
  meanB: number;
  meanDelta: number;
  ci95: { lower: number; upper: number };
  verdict: 'significant' | 'not significant' | 'insufficient data';
}

export interface McNemarComparison {
  count: number;
  improved: number;
  regressed: number;
  discordant: number;
  pValue: number;
  verdict: 'significant' | 'not significant';
}

export interface EvalComparison {
  armA: { tag: string; file: string };
  armB: { tag: string; file: string };
  /** Matched generated observations, including repeats. */
  pairedCount: number;
  /** Independent fixture clusters used as the inferential unit. */
  clusterCount: number;
  onlyA: string[];
  onlyB: string[];
  groundingPass: McNemarComparison;
  metrics: {
    groundingScore: PairedMetricComparison;
    overallScore: PairedMetricComparison;
    wordCount: PairedMetricComparison;
  };
  pairs: PairedFixture[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function loadResultFile(filePath: string): EvalResultFile {
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
    throw new Error(`${filePath} is not an eval result file (missing results array)`);
  }

  for (const result of parsed.results) {
    if (!isRecord(result) || typeof result.id !== 'string') {
      throw new Error(`${filePath} contains a result without a string fixture id`);
    }
  }

  return {
    tag: typeof parsed.tag === 'string' ? parsed.tag : path.basename(filePath),
    results: parsed.results as FixtureResult[],
  };
}

function pairKey(result: FixtureResult): string {
  return result.repeat === undefined || result.repeat === 1
    ? result.id
    : `${result.id}::r${result.repeat}`;
}

function indexResults(results: FixtureResult[], arm: string): Map<string, FixtureResult> {
  const index = new Map<string, FixtureResult>();
  for (const result of results) {
    const key = pairKey(result);
    if (index.has(key)) {
      throw new Error(`${arm} contains duplicate pair key "${key}"`);
    }
    index.set(key, result);
  }
  return index;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clusterPairsByFixture(pairs: PairedFixture[]): PairedFixture[][] {
  const clusters = new Map<string, PairedFixture[]>();
  for (const pair of pairs) {
    const cluster = clusters.get(pair.id) ?? [];
    cluster.push(pair);
    clusters.set(pair.id, cluster);
  }
  return [...clusters.values()];
}

const T_CRITICAL_95 = [
  Number.NaN,
  12.706,
  4.303,
  3.182,
  2.776,
  2.571,
  2.447,
  2.365,
  2.306,
  2.262,
  2.228,
  2.201,
  2.179,
  2.16,
  2.145,
  2.131,
  2.12,
  2.11,
  2.101,
  2.093,
  2.086,
  2.08,
  2.074,
  2.069,
  2.064,
  2.06,
  2.056,
  2.052,
  2.048,
  2.045,
  2.042,
];

function tCritical95(degreesOfFreedom: number): number {
  if (degreesOfFreedom <= 30) return T_CRITICAL_95[degreesOfFreedom];
  if (degreesOfFreedom <= 40) return 2.04;
  if (degreesOfFreedom <= 60) return 2.021;
  if (degreesOfFreedom <= 120) return 2;
  return 1.98;
}

export function comparePairedMetric(
  pairs: PairedFixture[],
  readValue: (result: FixtureResult) => number | undefined,
): PairedMetricComparison {
  const values = clusterPairsByFixture(pairs).flatMap((cluster) => {
    const observations = cluster.map((pair) => ({
      valueA: readValue(pair.armA),
      valueB: readValue(pair.armB),
    }));
    if (
      observations.some(
        ({ valueA, valueB }) => valueA === undefined || valueB === undefined,
      )
    ) {
      return [];
    }
    return [
      {
        valueA: mean(observations.map(({ valueA }) => valueA!)),
        valueB: mean(observations.map(({ valueB }) => valueB!)),
      },
    ];
  });

  if (values.length === 0) {
    return {
      count: 0,
      meanA: 0,
      meanB: 0,
      meanDelta: 0,
      ci95: { lower: 0, upper: 0 },
      verdict: 'insufficient data',
    };
  }

  const deltas = values.map(({ valueA, valueB }) => valueB - valueA);
  const meanA = mean(values.map(({ valueA }) => valueA));
  const meanB = mean(values.map(({ valueB }) => valueB));
  const meanDelta = mean(deltas);
  if (deltas.length < 2) {
    return {
      count: deltas.length,
      meanA: round(meanA),
      meanB: round(meanB),
      meanDelta: round(meanDelta),
      ci95: { lower: round(meanDelta), upper: round(meanDelta) },
      verdict: 'insufficient data',
    };
  }

  const variance =
    deltas.reduce((sum, delta) => sum + (delta - meanDelta) ** 2, 0) / (deltas.length - 1);
  const margin = tCritical95(deltas.length - 1) * Math.sqrt(variance / deltas.length);
  const lower = meanDelta - margin;
  const upper = meanDelta + margin;

  return {
    count: deltas.length,
    meanA: round(meanA),
    meanB: round(meanB),
    meanDelta: round(meanDelta),
    ci95: { lower: round(lower), upper: round(upper) },
    verdict: lower > 0 || upper < 0 ? 'significant' : 'not significant',
  };
}

/** Exact two-sided McNemar p-value via the conditional Binomial(n, 0.5) test. */
export function exactMcNemar(
  improved: number,
  regressed: number,
  count = improved + regressed,
): McNemarComparison {
  const discordant = improved + regressed;
  if (discordant === 0) {
    return { count, improved, regressed, discordant, pValue: 1, verdict: 'not significant' };
  }

  const tailEnd = Math.min(improved, regressed);
  let probability = 0.5 ** discordant;
  let cumulative = probability;
  for (let successes = 1; successes <= tailEnd; successes++) {
    probability *= (discordant - successes + 1) / successes;
    cumulative += probability;
  }
  const pValue = Math.min(1, 2 * cumulative);

  return {
    count,
    improved,
    regressed,
    discordant,
    pValue: round(pValue, 4),
    verdict: pValue < 0.05 ? 'significant' : 'not significant',
  };
}

export function compareEvalResults(
  armA: EvalResultFile,
  armB: EvalResultFile,
  fileA: string,
  fileB: string,
): EvalComparison {
  const indexA = indexResults(armA.results, 'arm A');
  const indexB = indexResults(armB.results, 'arm B');
  const keysA = [...indexA.keys()];
  const keysB = [...indexB.keys()];
  const sharedKeys = keysA.filter((key) => indexB.has(key)).sort();
  if (sharedKeys.length === 0) {
    throw new Error('The result files have no matching fixture ids');
  }

  const pairs = sharedKeys.map((key): PairedFixture => {
    const resultA = indexA.get(key)!;
    const resultB = indexB.get(key)!;
    return {
      key,
      id: resultA.id,
      repeat: resultA.repeat,
      armA: resultA,
      armB: resultB,
    };
  });
  const clusters = clusterPairsByFixture(pairs);
  const groundingClusters = clusters.flatMap((cluster) => {
    if (
      cluster.some(
        (pair) => pair.armA.grounding === undefined || pair.armB.grounding === undefined,
      )
    ) {
      return [];
    }
    return [
      {
        groundedA: cluster.every((pair) => pair.armA.grounding!.grounded),
        groundedB: cluster.every((pair) => pair.armB.grounding!.grounded),
      },
    ];
  });
  const improved = groundingClusters.filter(
    ({ groundedA, groundedB }) => !groundedA && groundedB,
  ).length;
  const regressed = groundingClusters.filter(
    ({ groundedA, groundedB }) => groundedA && !groundedB,
  ).length;

  return {
    armA: { tag: armA.tag, file: fileA },
    armB: { tag: armB.tag, file: fileB },
    pairedCount: pairs.length,
    clusterCount: clusters.length,
    onlyA: keysA.filter((key) => !indexB.has(key)).sort(),
    onlyB: keysB.filter((key) => !indexA.has(key)).sort(),
    groundingPass: exactMcNemar(improved, regressed, groundingClusters.length),
    metrics: {
      groundingScore: comparePairedMetric(pairs, (result) => result.grounding?.score),
      overallScore: comparePairedMetric(pairs, (result) => result.judge?.overall),
      wordCount: comparePairedMetric(pairs, (result) => result.length?.words),
    },
    pairs,
  };
}

function formatMetric(label: string, metric: PairedMetricComparison): string {
  return (
    `    ${label.padEnd(20)} n=${String(metric.count).padEnd(3)}  ` +
    `A=${metric.meanA.toFixed(2)}  B=${metric.meanB.toFixed(2)}  ` +
    `Δ=${metric.meanDelta.toFixed(2)}  95% CI [${metric.ci95.lower.toFixed(2)}, ` +
    `${metric.ci95.upper.toFixed(2)}]  ${metric.verdict}`
  );
}

export function formatComparison(comparison: EvalComparison): string {
  const lines = [
    '',
    '═══════════════════════════════════════════════════════════',
    '  PAIRED EVAL COMPARISON (B − A)',
    '═══════════════════════════════════════════════════════════',
    `  A: ${comparison.armA.tag} (${comparison.armA.file})`,
    `  B: ${comparison.armB.tag} (${comparison.armB.file})`,
    `  Generated observation pairs: ${comparison.pairedCount}`,
    `  Independent fixture clusters: ${comparison.clusterCount}`,
  ];
  if (comparison.onlyA.length || comparison.onlyB.length) {
    lines.push(
      `  Unmatched: A-only=${comparison.onlyA.length}, B-only=${comparison.onlyB.length}`,
    );
  }

  const mcnemar = comparison.groundingPass;
  lines.push('');
  lines.push(
    `  Grounding pass by fixture (all repeats clean; exact McNemar, n=${mcnemar.count}, ` +
      `excluded=${comparison.clusterCount - mcnemar.count}):`,
  );
  lines.push(`    A fail → B pass              ${mcnemar.improved}`);
  lines.push(`    A pass → B fail              ${mcnemar.regressed}`);
  lines.push(
    `    discordant=${mcnemar.discordant}  p=${mcnemar.pValue.toFixed(4)}  ` +
      `${mcnemar.verdict}`,
  );
  lines.push('');
  lines.push('  Paired continuous metrics:');
  lines.push(formatMetric('grounding score', comparison.metrics.groundingScore));
  lines.push(formatMetric('judge overall', comparison.metrics.overallScore));
  lines.push(formatMetric('word count', comparison.metrics.wordCount));
  lines.push('');
  lines.push('  Per fixture:');
  for (const pair of comparison.pairs) {
    const label = pair.repeat === undefined ? pair.id : `${pair.id}[r${pair.repeat}]`;
    const groundingA = pair.armA.grounding;
    const groundingB = pair.armB.grounding;
    const groundingDelta =
      groundingA && groundingB ? groundingB.score - groundingA.score : undefined;
    const overallDelta =
      pair.armA.judge && pair.armB.judge
        ? pair.armB.judge.overall - pair.armA.judge.overall
        : undefined;
    const wordDelta =
      pair.armA.length && pair.armB.length
        ? pair.armB.length.words - pair.armA.length.words
        : undefined;
    lines.push(
      `    ${label.padEnd(28)} ` +
        `GΔ=${groundingDelta === undefined ? 'n/a' : groundingDelta.toFixed(0)}  ` +
        `OΔ=${overallDelta === undefined ? 'n/a' : overallDelta.toFixed(2)}  ` +
        `WΔ=${wordDelta === undefined ? 'n/a' : wordDelta.toFixed(0)}`,
    );
  }
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.length !== 2) {
    throw new Error('Usage: pnpm eval:compare <arm-a.json> <arm-b.json>');
  }

  const [fileA, fileB] = args.map((file) => path.resolve(file));
  const comparison = compareEvalResults(
    loadResultFile(fileA),
    loadResultFile(fileB),
    fileA,
    fileB,
  );
  console.log(formatComparison(comparison));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}