'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Globe,
  FileText,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface JobContextInputProps {
  jobContext: string;
  title: string;
  language: string;
  onJobContextChange: (text: string) => void;
  onTitleChange: (text: string) => void;
  onLanguageChange: (lang: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  limitReached: boolean;
}

type JobMode = 'link' | 'text';
type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

function SegmentedToggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-px overflow-hidden rounded-[3px] border border-border bg-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function JobContextInput({
  jobContext,
  title,
  language,
  onJobContextChange,
  onTitleChange,
  onLanguageChange,
  onBack,
  onSubmit,
  isSubmitting,
  limitReached,
}: JobContextInputProps) {
  const [jobMode, setJobMode] = useState<JobMode>('link');
  const [jobUrl, setJobUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [parsedChip, setParsedChip] = useState<{ title: string; host: string } | null>(null);

  const handleAnalyze = async () => {
    if (!jobUrl.trim()) return;
    let url: URL;
    try {
      url = new URL(jobUrl.trim().startsWith('http') ? jobUrl.trim() : `https://${jobUrl.trim()}`);
    } catch {
      setFetchStatus('error');
      return;
    }

    setFetchStatus('loading');
    try {
      // Uses job-postings/parse to extract posting text server-side.
      // Side effect: persists a JobPosting record the user can reference later.
      const posting = await api.jobPostings.parse({ url: url.toString() });
      const text = posting.rawText ?? posting.description ?? '';
      if (!text) {
        setFetchStatus('error');
        return;
      }
      onJobContextChange(text);
      setParsedChip({
        title: posting.title || url.hostname,
        host: url.hostname,
      });
      setFetchStatus('success');
    } catch {
      setFetchStatus('error');
    }
  };

  const handleRemoveLink = () => {
    setFetchStatus('idle');
    setParsedChip(null);
    setJobUrl('');
    onJobContextChange('');
  };

  const jobModeOptions = [
    { value: 'link', label: 'Link analysieren' },
    { value: 'text', label: 'Text einfügen' },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl rounded-[4px] border bg-card p-7">
      {/* Card head */}
      <div className="mb-6">
        <h2 className="font-heading text-[19px] font-bold tracking-tight text-foreground">
          Zielstelle & Feedback
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional — aber mit Stellenkontext bewertet die KI auch die Passung zur Stelle.
        </p>
      </div>

      {/* Job context */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[14.5px] font-semibold text-foreground">
            Stellenanzeige{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <SegmentedToggle
            value={jobMode}
            onChange={(v) => {
              setJobMode(v as JobMode);
              setFetchStatus('idle');
              setParsedChip(null);
            }}
            options={jobModeOptions}
          />
        </div>

        {jobMode === 'link' ? (
          <div className="space-y-2">
            {fetchStatus === 'success' && parsedChip ? (
              /* Success chip */
              <div className="flex items-center gap-3 rounded-[3px] border border-primary-soft bg-primary-soft/40 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/60">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-primary-soft text-primary dark:bg-slate-700 dark:text-slate-200">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {parsedChip.title}
                    </span>
                    <span className="flex-shrink-0 border border-[#BFE9CC] bg-[#ECFAF0] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-success dark:border-green-400/30 dark:bg-green-400/10">
                      Analysiert
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {parsedChip.host} · Anzeige erfolgreich gelesen
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="flex-shrink-0 rounded-[3px] p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Link entfernen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* URL input row */
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://example.com/jobs/..."
                    value={jobUrl}
                    onChange={(e) => {
                      setJobUrl(e.target.value);
                      if (fetchStatus === 'error') setFetchStatus('idle');
                    }}
                    className="pl-9 text-sm"
                    disabled={fetchStatus === 'loading'}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={!jobUrl.trim() || fetchStatus === 'loading'}
                  className="min-w-[110px]"
                >
                  {fetchStatus === 'loading' ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Analysiere…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Analysieren
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Error note */}
            {fetchStatus === 'error' && (
              <div className="flex items-start gap-2.5 rounded-[3px] border border-[#F3E3B3] bg-[#FDF6E7] px-4 py-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#A16207] dark:text-amber-300" />
                <div className="text-[#854D0E] dark:text-amber-300/90">
                  Der Link konnte nicht gelesen werden.{' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => {
                      setJobMode('text');
                      setFetchStatus('idle');
                    }}
                  >
                    Text der Anzeige einfügen →
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Text pane */
          <div className="relative">
            <Textarea
              rows={5}
              placeholder="z.B. Stationsleitung Pflege — oder die komplette Stellenanzeige einfügen…"
              value={jobContext}
              onChange={(e) => onJobContextChange(e.target.value)}
              className="resize-y text-sm"
            />
            <div className="mt-1 flex items-center justify-between">
              <span />
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  jobContext.length > 24000 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {jobContext.length.toLocaleString('de-DE')} / 24.000
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Title + language row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[14.5px] font-semibold text-foreground">
            Titel{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            placeholder="z.B. Bewerbung Klinikum München"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[14.5px] font-semibold text-foreground">
            Sprache des Feedbacks
          </Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="text-sm">
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

      {/* Privacy note */}
      <div className="mt-5 flex items-start gap-2.5 border-l-[3px] border-brand bg-muted px-4 py-3 text-sm text-foreground">
        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
        <p>
          Deine Unterlagen werden nur für diese Prüfung verwendet und nicht gespeichert. Ohne
          Stellenkontext bewertet die KI ausschließlich Qualität und ATS-Aufbau.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || limitReached}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Bewerbung prüfen
        </Button>
      </div>
    </div>
  );
}
