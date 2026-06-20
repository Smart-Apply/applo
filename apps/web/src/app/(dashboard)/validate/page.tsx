'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Lock, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const schema = z.object({
  resumeText: z
    .string()
    .min(50, 'Bitte füge deinen Lebenslauf ein (mind. 50 Zeichen).')
    .max(24000, 'Der Lebenslauf ist zu lang.'),
  coverLetterText: z.string().max(12000, 'Das Anschreiben ist zu lang.').optional(),
  jobContext: z.string().max(24000, 'Der Stellen-Kontext ist zu lang.').optional(),
  title: z.string().max(120, 'Der Titel ist zu lang.').optional(),
});

type FormValues = z.infer<typeof schema>;

function verdictDot(verdict: ApplicationValidationVerdict): string {
  if (verdict === 'strong') return 'bg-green-500';
  if (verdict === 'good') return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ValidatePage() {
  const [language, setLanguage] = useState<string>('auto');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { subscription, tier } = useSubscription();
  const { data: history, isLoading: historyLoading } = useValidations();
  const { data: activeRecord, isLoading: activeLoading } = useValidation(activeId);
  const createValidation = useCreateValidation();
  const deleteValidation = useDeleteValidation();

  const validations = subscription?.validations;
  const isUnlimited = !validations || validations.limit === -1;
  const remaining = validations?.remaining ?? 0;
  const limitReached = !isUnlimited && remaining <= 0;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createValidation.mutate(
      {
        resumeText: values.resumeText,
        coverLetterText: values.coverLetterText?.trim() || undefined,
        jobContext: values.jobContext?.trim() || undefined,
        title: values.title?.trim() || undefined,
        language: language === 'auto' ? undefined : language,
      },
      {
        onSuccess: (record) => setActiveId(record.id),
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Bewerbungs-Check
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Du hast deine Bewerbung schon fertig? Füge Lebenslauf und (optional) Anschreiben ein —
            die KI bewertet Qualität &amp; ATS-Tauglichkeit und sagt dir, was du verbessern kannst.
          </p>
        </div>
        {!isUnlimited && (
          <Badge variant="secondary" className="shrink-0">
            {Math.max(0, remaining)} von {validations?.limit} Checks diesen Monat
          </Badge>
        )}
      </div>

      {limitReached && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">
              Du hast dein monatliches Limit von {validations?.limit} Checks erreicht.
            </p>
            <p className="mt-1 text-amber-800">
              Mit{' '}
              <Link href="/pricing" className="font-medium underline">
                Pro
              </Link>{' '}
              prüfst du unbegrenzt.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deine Unterlagen</CardTitle>
            <CardDescription>
              Nur der Lebenslauf ist Pflicht. Mit Stellen-Kontext wird die Passung zur Stelle
              bewertet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="resumeText">
                  Lebenslauf <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="resumeText"
                  rows={10}
                  placeholder="Füge hier den Text deines Lebenslaufs ein…"
                  {...register('resumeText')}
                />
                {errors.resumeText && (
                  <p className="text-xs text-red-600">{errors.resumeText.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coverLetterText">Anschreiben (optional)</Label>
                <Textarea
                  id="coverLetterText"
                  rows={6}
                  placeholder="Optional: Text deines Anschreibens…"
                  {...register('coverLetterText')}
                />
                {errors.coverLetterText && (
                  <p className="text-xs text-red-600">{errors.coverLetterText.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobContext">Zielstelle / Stellenanzeige (optional)</Label>
                <Textarea
                  id="jobContext"
                  rows={4}
                  placeholder="z.B. Stationsleitung Pflege – oder die komplette Stellenanzeige…"
                  {...register('jobContext')}
                />
                {errors.jobContext && (
                  <p className="text-xs text-red-600">{errors.jobContext.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Titel (optional)</Label>
                  <Input id="title" placeholder="z.B. Check Bewerbung Klinikum" {...register('title')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="language">Sprache des Feedbacks</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatisch</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={createValidation.isPending}
                disabled={createValidation.isPending || limitReached}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Bewerbung prüfen
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ergebnis</CardTitle>
            <CardDescription>
              {activeRecord
                ? 'Umsetzbares Feedback zu deiner Bewerbung.'
                : 'Starte einen Check oder wähle eine frühere Prüfung aus.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {createValidation.isPending || activeLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : activeRecord ? (
              <ValidationResultView result={activeRecord.result} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                Noch kein Ergebnis. Füge deine Unterlagen ein und klicke auf „Bewerbung prüfen“.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frühere Checks</CardTitle>
          <CardDescription>
            {tier === 'FREE'
              ? 'Im Free-Tarif sind 5 Checks pro Monat enthalten.'
              : 'Deine gespeicherten Prüfungen.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !history || history.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Noch keine Prüfungen vorhanden.</p>
          ) : (
            <ul className="divide-y">
              {history.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`flex flex-1 items-center gap-3 text-left ${
                      activeId === item.id ? 'font-semibold text-primary' : ''
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${verdictDot(item.verdict)}`} />
                    <span className="flex-1 truncate text-sm">
                      {item.title || 'Bewerbungs-Check'}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                    <span className="w-10 text-right text-sm font-semibold">{item.score}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => {
                      if (activeId === item.id) setActiveId(null);
                      deleteValidation.mutate(item.id);
                    }}
                    aria-label="Prüfung löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
