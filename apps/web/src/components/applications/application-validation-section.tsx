'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useValidateApplication } from '@/hooks/use-applications';
import { useSubscription } from '@/hooks/use-subscription';
import { formatFullTimestamp } from '@/lib/format-date';
import type {
  ApplicationGenerationStatus,
  ApplicationValidationResult,
  ApplicationValidationStatus,
  ApplicationValidationVerdict,
} from '@/types';

interface ApplicationValidationSectionProps {
  applicationId: string;
  status: ApplicationGenerationStatus;
  result?: ApplicationValidationResult;
  validatedAt?: string;
}

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
 * Application validation: an AI quality + ATS review of the generated documents
 * against the job posting. Metered (Free: 5/month, Pro+: unlimited). Shows the
 * cached result and lets the user (re-)run it. Available to all tiers — the
 * gating is on the monthly quota, not the feature flag.
 */
export function ApplicationValidationSection({
  applicationId,
  status,
  result,
  validatedAt,
}: ApplicationValidationSectionProps) {
  const validate = useValidateApplication(applicationId);
  const { subscription, tier } = useSubscription();

  const validations = subscription?.validations;
  const isUnlimited = !validations || validations.limit === -1;
  const remaining = validations?.remaining ?? 0;
  const limitReached = !isUnlimited && remaining <= 0;
  const notReady = status !== 'READY';

  const sortedCategories = useMemo(
    () => (result ? [...result.categories].sort((a, b) => a.score - b.score) : []),
    [result],
  );

  const runDisabled = validate.isPending || notReady || limitReached;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Bewerbung validieren
            </CardTitle>
            <CardDescription>
              KI-Check: Wie gut passen Lebenslauf &amp; Anschreiben zur Stellenanzeige — inkl.
              ATS-Einschätzung und konkreten Verbesserungen.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button onClick={() => validate.mutate()} disabled={runDisabled} loading={validate.isPending}>
              {result ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Erneut validieren
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Jetzt validieren
                </>
              )}
            </Button>
            {!isUnlimited && (
              <span className="text-xs text-gray-500">
                {Math.max(0, remaining)} von {validations?.limit} diesen Monat
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {notReady && (
          <p className="text-sm text-gray-500">
            Die Bewerbung muss fertig generiert sein, bevor sie validiert werden kann.
          </p>
        )}

        {limitReached && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                Du hast dein monatliches Limit von {validations?.limit} Validierungen erreicht.
              </p>
              <p className="mt-1 text-amber-800">
                Mit{' '}
                <Link href="/pricing" className="font-medium underline">
                  Pro
                </Link>{' '}
                validierst du unbegrenzt.
              </p>
            </div>
          </div>
        )}

        {!result && !notReady && !limitReached && (
          <p className="text-sm text-gray-600">
            Noch keine Validierung durchgeführt.{' '}
            {tier === 'FREE'
              ? 'Im Free-Tarif sind 5 Checks pro Monat enthalten.'
              : 'Starte eine Prüfung, um umsetzbares Feedback zu erhalten.'}
          </p>
        )}

        {result && (
          <>
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
                <div className="text-xs text-gray-500">ATS-Score</div>
              </div>
              <div className="flex-1 min-w-[12rem] space-y-2">
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
                    <li
                      key={i}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
                    >
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

            {validatedAt && (
              <p className="text-xs text-gray-400">
                Zuletzt validiert: {formatFullTimestamp(validatedAt)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
