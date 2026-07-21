'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, History, Trash2, Lock, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckStepper } from '@/components/validation/check-stepper';
import { DocumentInput } from '@/components/validation/document-input';
import { JobContextInput } from '@/components/validation/job-context-input';
import { LoadingScreen } from '@/components/validation/loading-screen';
import { ValidationResultView } from '@/components/validation/validation-result-view';
import {
  useValidations,
  useValidation,
  useCreateValidation,
  useDeleteValidation,
} from '@/hooks/use-validations';
import { useSubscription } from '@/hooks/use-subscription';
import { formatDate } from '@/lib/format-date';
import type { ApplicationValidationVerdict } from '@/types';

type WizardStep = 'step1' | 'step2' | 'loading' | 'result' | 'history';

function verdictDot(verdict: ApplicationValidationVerdict): string {
  if (verdict === 'strong') return '#16A34A';
  if (verdict === 'good') return '#D9920A';
  return '#DC2626';
}

function verdictScoreColor(verdict: ApplicationValidationVerdict): string {
  if (verdict === 'strong') return '#16A34A';
  if (verdict === 'good') return '#D9920A';
  return '#DC2626';
}

export default function ValidatePage() {
  const [step, setStep] = useState<WizardStep>('step1');
  const [activeId, setActiveId] = useState<string | null>(null);

  const [resumeText, setResumeText] = useState('');
  const [coverLetterText, setCoverLetterText] = useState('');
  const [jobContext, setJobContext] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('auto');

  const { subscription, tier } = useSubscription();
  const { data: history, isLoading: historyLoading } = useValidations();
  const { data: activeRecord, isLoading: activeLoading } = useValidation(activeId);
  const createValidation = useCreateValidation();
  const deleteValidation = useDeleteValidation();

  const validations = subscription?.validations;
  const isUnlimited = !validations || validations.limit === -1;
  const remaining = validations?.remaining ?? 0;
  const limitReached = !isUnlimited && remaining <= 0;

  const handleRunCheck = () => {
    setStep('loading');
    createValidation.mutate(
      {
        resumeText,
        coverLetterText: coverLetterText.trim() || undefined,
        jobContext: jobContext.trim() || undefined,
        title: title.trim() || undefined,
        language: language === 'auto' ? undefined : language,
      },
      {
        onSuccess: (record) => {
          setActiveId(record.id);
          setStep('result');
        },
        onError: () => {
          setStep('step2');
        },
      },
    );
  };

  const handleNewCheck = () => {
    setResumeText('');
    setCoverLetterText('');
    setJobContext('');
    setTitle('');
    setLanguage('auto');
    setActiveId(null);
    setStep('step1');
  };

  const handleOpenHistory = (id: string) => {
    setActiveId(id);
    setStep('result');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-primary dark:border-slate-600 dark:bg-slate-800">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-[26px] font-extrabold leading-tight tracking-[-.025em] text-foreground">
              Bewerbungs-Check
            </h1>
            <p className="mt-0.5 text-[15px] text-muted-foreground">
              KI-Bewertung für Qualität &amp; ATS-Tauglichkeit deiner eigenen Bewerbung.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isUnlimited && (
            <Badge variant="secondary">
              {Math.max(0, remaining)} / {validations?.limit} Checks
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(step === 'history' ? 'step1' : 'history')}
            className="gap-1.5"
          >
            {step === 'history' ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Neuer Check
              </>
            ) : (
              <>
                <History className="h-3.5 w-3.5" />
                Frühere Checks
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quota exceeded banner */}
      {limitReached && step !== 'history' && (
        <div className="flex items-start gap-3 rounded-[4px] border border-[#F3E3B3] bg-[#FDF6E7] p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#A16207] dark:text-amber-300" />
          <div className="text-sm text-[#854D0E] dark:text-amber-300/90">
            <p className="font-medium">
              Du hast dein monatliches Limit von {validations?.limit} Checks erreicht.
            </p>
            <p className="mt-0.5">
              Mit{' '}
              <Link href="/pricing" className="font-medium underline">
                Pro
              </Link>{' '}
              prüfst du unbegrenzt.
            </p>
          </div>
        </div>
      )}

      {/* Stepper (hidden on history) */}
      {step !== 'history' && <CheckStepper step={step} />}

      {/* Step 1: Unterlagen */}
      {step === 'step1' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <DocumentInput
            resumeText={resumeText}
            coverLetterText={coverLetterText}
            onResumeChange={setResumeText}
            onCoverLetterChange={setCoverLetterText}
            onNext={() => setStep('step2')}
          />
        </div>
      )}

      {/* Step 2: Zielstelle */}
      {step === 'step2' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <JobContextInput
            jobContext={jobContext}
            title={title}
            language={language}
            onJobContextChange={setJobContext}
            onTitleChange={setTitle}
            onLanguageChange={setLanguage}
            onBack={() => setStep('step1')}
            onSubmit={handleRunCheck}
            isSubmitting={createValidation.isPending}
            limitReached={limitReached}
          />
        </div>
      )}

      {/* Loading */}
      {step === 'loading' && (
        <div className="animate-in fade-in duration-300">
          <LoadingScreen />
        </div>
      )}

      {/* Result */}
      {step === 'result' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-[4px]" />
              <Skeleton className="h-32 w-full rounded-[4px]" />
            </div>
          ) : activeRecord ? (
            <ValidationResultView result={activeRecord.result} onNewCheck={handleNewCheck} />
          ) : null}
        </div>
      )}

      {/* History */}
      {step === 'history' && (
        <div className="animate-in fade-in duration-300">
          <div className="rounded-[4px] border bg-card p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-[19px] font-bold text-foreground">Frühere Checks</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {tier === 'FREE'
                    ? 'Im Free-Tarif sind 5 Checks pro Monat enthalten.'
                    : 'Deine gespeicherten Prüfungen.'}
                </p>
              </div>
              <Button size="sm" onClick={handleNewCheck} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Neuer Check
              </Button>
            </div>

            {historyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-[4px]" />
                <Skeleton className="h-14 w-full rounded-[4px]" />
              </div>
            ) : !history || history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Noch keine Prüfungen vorhanden.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-[3px] border px-4 py-3"
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0"
                      style={{ backgroundColor: verdictDot(item.verdict) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.title ?? 'Bewerbungs-Check'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <span
                      className="font-mono text-sm font-semibold tabular-nums"
                      style={{ color: verdictScoreColor(item.verdict) }}
                    >
                      {item.score}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenHistory(item.id)}
                      className="gap-1 text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Öffnen
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteValidation.mutate(item.id)}
                      aria-label="Prüfung löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
