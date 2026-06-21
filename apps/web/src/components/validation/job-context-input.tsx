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
    <div
      className="inline-flex rounded-xl p-0.5"
      style={{ backgroundColor: '#F5F6F8', border: '1px solid #E6E8EE' }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-[10px] px-3 py-1 text-xs font-medium transition-all duration-200',
            value === opt.value
              ? 'bg-white text-[#1B2A49] shadow-sm'
              : 'text-[#6B6969] hover:text-[#1B2A49]',
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
    <div
      className="mx-auto w-full max-w-2xl rounded-[18px] p-7"
      style={{
        background: '#fff',
        boxShadow: '0 1px 2px rgba(27,42,73,.04), 0 6px 16px -8px rgba(27,42,73,.10)',
        border: '1px solid #E6E8EE',
      }}
    >
      {/* Card head */}
      <div className="mb-6">
        <h2 className="text-[19px] font-bold tracking-tight text-[#1B2A49]">
          Zielstelle & Feedback
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#6B6969' }}>
          Optional — aber mit Stellenkontext bewertet die KI auch die Passung zur Stelle.
        </p>
      </div>

      {/* Job context */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[14.5px] font-semibold text-[#1B2A49]">
            Stellenanzeige{' '}
            <span className="text-xs font-normal" style={{ color: '#6B6969' }}>
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
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#EAF1FE', border: '1px solid #C7D0E4' }}
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#E5E9F2' }}
                >
                  <Globe className="h-4 w-4" style={{ color: '#1B2A49' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-[#1B2A49]">
                      {parsedChip.title}
                    </span>
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: '#E7F6EC', color: '#16A34A' }}
                    >
                      Analysiert
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: '#6B6969' }}>
                    {parsedChip.host} · Anzeige erfolgreich gelesen
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="flex-shrink-0 rounded-lg p-1 text-[#6B6969] hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Link entfernen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* URL input row */
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: '#6B6969' }}
                  />
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
                  style={{ backgroundColor: '#1B2A49', color: '#fff', minWidth: '110px' }}
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
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: '#FBF1D9', border: '1px solid #F0D580' }}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div style={{ color: '#92400E' }}>
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
                className="text-xs"
                style={{ color: jobContext.length > 24000 ? '#DC2626' : '#6B6969' }}
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
          <Label className="text-[14.5px] font-semibold text-[#1B2A49]">
            Titel{' '}
            <span className="text-xs font-normal" style={{ color: '#6B6969' }}>
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
          <Label className="text-[14.5px] font-semibold text-[#1B2A49]">
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
      <div
        className="mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
        style={{ backgroundColor: '#EAF1FE', border: '1px solid #C7D0E4', color: '#1B2A49' }}
      >
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
          style={{ backgroundColor: '#1B2A49', color: '#fff' }}
        >
          <Sparkles className="h-4 w-4" />
          Bewerbung prüfen
        </Button>
      </div>
    </div>
  );
}
