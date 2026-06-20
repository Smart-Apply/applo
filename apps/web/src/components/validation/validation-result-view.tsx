'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type {
  ApplicationValidationResult,
  ApplicationValidationStatus,
  ApplicationValidationVerdict,
} from '@/types';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function VerdictBadge({ verdict }: { verdict: ApplicationValidationVerdict }) {
  const map: Record<ApplicationValidationVerdict, { label: string; className: string }> = {
    strong: { label: 'Bereit zum Absenden', className: 'bg-green-600 hover:bg-green-600' },
    good: { label: 'Solide, kleine Verbesserungen', className: 'bg-amber-500 hover:bg-amber-500' },
    needs_work: { label: 'Überarbeitung empfohlen', className: 'bg-red-600 hover:bg-red-600' },
  };
  const { label, className } = map[verdict];
  return <Badge className={className}>{label}</Badge>;
}

function CategoryStatusIcon({ status }: { status: ApplicationValidationStatus }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'warn') return <AlertCircle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-red-600" />;
}

/**
 * Pure display of an application-check result. Domain-agnostic; no data
 * fetching. Used by the Bewerbungs-Check page for both a fresh run and a
 * stored history item.
 */
export function ValidationResultView({ result }: { result: ApplicationValidationResult }) {
  const sortedCategories = useMemo(
    () => [...result.categories].sort((a, b) => a.score - b.score),
    [result.categories],
  );

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <div className={`text-4xl font-bold ${scoreColor(result.overallScore)}`}>
            {result.overallScore}
          </div>
          <div className="text-xs text-gray-500">Gesamt-Score</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-semibold ${scoreColor(result.atsScore)}`}>
            {result.atsScore}
          </div>
          <div className="text-xs text-gray-500">ATS-Score*</div>
        </div>
        <div className="min-w-[12rem] flex-1 space-y-2">
          <VerdictBadge verdict={result.verdict} />
          <p className="text-sm text-gray-700">{result.summary}</p>
        </div>
      </div>

      {/* Categories */}
      {sortedCategories.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            {sortedCategories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <CategoryStatusIcon status={cat.status} />
                    {cat.label}
                  </span>
                  <span className={`font-semibold ${scoreColor(cat.score)}`}>{cat.score}</span>
                </div>
                <Progress value={cat.score} className="h-1.5" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Blockers */}
      {result.blockers.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Kritische Punkte ({result.blockers.length})
          </h4>
          <ul className="space-y-2">
            {result.blockers.map((issue, i) => (
              <li key={i} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                <p className="font-medium text-red-900">{issue.title}</p>
                <p className="mt-0.5 text-red-800">{issue.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Lightbulb className="h-4 w-4" />
            Empfehlungen ({result.recommendations.length})
          </h4>
          <ul className="space-y-2">
            {result.recommendations.map((issue, i) => (
              <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-900">{issue.title}</p>
                <p className="mt-0.5 text-amber-800">{issue.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Stärken
          </h4>
          <ul className="space-y-1">
            {result.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">
        *Der ATS-Score ist eine KI-Einschätzung, kein echter ATS-Parser-Durchlauf.
      </p>
    </div>
  );
}
