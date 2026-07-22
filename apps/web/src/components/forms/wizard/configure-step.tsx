'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CenteredLoader } from '@/components/shared/loading';
import { useCreateApplicationWithGeneration } from '@/hooks/use-applications';
import { useCoverLetterTemplates, useResumeTemplates, getDefaultTemplate } from '@/hooks/use-templates';
import { useUsage } from '@/hooks/use-usage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  User,
  Loader2,
  Check,
  ChevronLeft,
  Clock,
  FileText,
  Target,
  Download,
  Maximize2,
} from 'lucide-react';
import type { JobPosting, Template } from '@/types';

// Only de/en — the generation prompts never fully supported fr/es/it
// (see docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md).
export type ApplicationLanguage = 'de' | 'en';

/** Faked generation progress: estimated total duration of the pipeline. */
const TOTAL_SECONDS = 60;

/**
 * The fake progress never claims more than this while the pipeline is still
 * running — 100% is reserved for the real completion, which then animates
 * the ring shut instead of jumping straight to the redirect.
 */
const PENDING_MAX_PCT = 95;

/** How long the "Fertig!" state (ring → 100%, steps green) plays before navigating. */
const FINISH_ANIMATION_MS = 1600;

/**
 * Classic designs that are meant to stay monochrome — the wizard doesn't
 * offer their color swatches. The variants still exist in the DB/API, so
 * applications that already reference one keep working.
 */
const MONOCHROME_TEMPLATES = new Set(['classic-ats-resume', 'harvard-classic-resume']);

const LANGUAGE_OPTIONS: { value: ApplicationLanguage; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

const COVER_LETTER_LENGTH_OPTIONS: {
  value: 'kurz' | 'standard';
  label: string;
  hint: string;
}[] = [
  {
    value: 'kurz',
    label: 'Kompakt (~250 Wörter)',
    hint: 'Auf den Punkt — ideal, wenn die Stelle wenig Anforderungen nennt.',
  },
  {
    value: 'standard',
    label: 'Standard (~350 Wörter)',
    hint: 'Die klassische Länge für eine Seite.',
  },
];

interface TemplateGroup {
  baseTemplate: Template;
  colorVariants: { id: string; accentColor: string; colorVariantName: string }[];
}

/** Template preview image served by the API (same source as the PDF render). */
function templatePreviewUrl(templateId: string): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';
  return `${base}/api/v1/templates/${templateId}/preview`;
}

function groupTemplatesByBase(templates: Template[]): TemplateGroup[] {
  const groups = new Map<string, TemplateGroup>();

  for (const template of templates) {
    const groupKey = template.baseTemplateId || template.id;

    if (!groups.has(groupKey)) {
      const baseTemplate = template.baseTemplateId
        ? templates.find(t => t.id === template.baseTemplateId) || template
        : template;
      groups.set(groupKey, { baseTemplate, colorVariants: [] });
    }

    if (template.accentColor) {
      const group = groups.get(groupKey)!;
      if (!group.colorVariants.find(v => v.id === template.id)) {
        group.colorVariants.push({
          id: template.id,
          accentColor: template.accentColor,
          colorVariantName: template.colorVariantName || '',
        });
      }
    }
  }

  for (const group of groups.values()) {
    group.colorVariants.sort((a, b) => {
      if (a.id === group.baseTemplate.id) return -1;
      if (b.id === group.baseTemplate.id) return 1;
      return a.colorVariantName.localeCompare(b.colorVariantName);
    });
  }

  return Array.from(groups.values());
}

interface ConfigureStepProps {
  jobPosting: JobPosting;
  onStepChange: (step: 'job' | 'configure' | 'generate') => void;
  /** Reports generating/finishing so the wizard can drive the Applo guide above the step path. */
  onGenerationStateChange?: (generating: boolean, finishing: boolean) => void;
}

export function ConfigureStep({
  jobPosting,
  onStepChange,
  onGenerationStateChange,
}: ConfigureStepProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createApplication = useCreateApplicationWithGeneration();
  const { data: coverLetterTemplates, isLoading: clLoading } = useCoverLetterTemplates();
  const { data: resumeTemplates, isLoading: rtLoading } = useResumeTemplates();
  const dailyUsage = useUsage('applicationsToday');

  const [selectedResumeTemplateId, setSelectedResumeTemplateId] = useState<string | null>(null);
  const [generateCoverLetter, setGenerateCoverLetter] = useState(true);
  const [coverLetterLength, setCoverLetterLength] = useState<'kurz' | 'standard'>('standard');
  const [selectedLanguage, setSelectedLanguage] = useState<ApplicationLanguage>('de');
  const [hoverGroupKey, setHoverGroupKey] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  // Click the live preview to open the CV full-size in a dialog.
  const [zoomOpen, setZoomOpen] = useState(false);

  const isGenerating = createApplication.isPending || isRedirecting;
  // Fractional seconds, ticked at 200ms so the progress ring moves smoothly
  // instead of jumping once per second. Reset happens in handleSubmit (event
  // handler) — setting state synchronously inside the effect cascades renders.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!isGenerating) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds((Date.now() - start) / 1000);
    }, 200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Drive the wizard-level Applo guide (process → success once actually done).
  const isFinishing = isGenerating && isRedirecting;
  useEffect(() => {
    onGenerationStateChange?.(isGenerating, isFinishing);
  }, [isGenerating, isFinishing, onGenerationStateChange]);

  const resumeTemplateGroups = resumeTemplates ? groupTemplatesByBase(resumeTemplates) : [];

  const effectiveResumeTemplateId = selectedResumeTemplateId ?? (() => {
    if (!resumeTemplates || resumeTemplates.length === 0) return null;
    const defaultTemplate = resumeTemplates.find(t => t.isDefault) || resumeTemplates[0];
    return defaultTemplate?.id ?? null;
  })();

  const effectiveCoverLetterTemplateId = (() => {
    if (!effectiveResumeTemplateId || !resumeTemplates || !coverLetterTemplates) return null;
    const selectedResume = resumeTemplates.find(t => t.id === effectiveResumeTemplateId);
    if (!selectedResume) return null;

    const resumeIdWithoutType = effectiveResumeTemplateId.replace(/-resume$/, '');
    const matchingId = `${resumeIdWithoutType}-cover-letter`;
    const exactMatch = coverLetterTemplates.find(t => t.id === matchingId);
    if (exactMatch) return exactMatch.id;

    const categoryMatch = coverLetterTemplates.find(
      t => t.category.toLowerCase() === selectedResume.category.toLowerCase()
    );
    if (categoryMatch) return categoryMatch.id;

    const defaultCL = getDefaultTemplate(coverLetterTemplates);
    return defaultCL?.id ?? null;
  })();

  const handleSubmit = async () => {
    setElapsedSeconds(0);
    try {
      const application = await createApplication.mutateAsync({
        jobPostingId: jobPosting.id,
        coverLetterTemplateId: generateCoverLetter ? (effectiveCoverLetterTemplateId || undefined) : undefined,
        resumeTemplateId: effectiveResumeTemplateId || undefined,
        generateCoverLetter,
        coverLetterLength,
        language: selectedLanguage,
      });

      // Flip the loading screen into its "Fertig!" state (ring animates to
      // 100%, steps turn green) and give that animation time to play —
      // previously we navigated away immediately and the ring jumped from
      // wherever it was straight out of the page.
      setIsRedirecting(true);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      await new Promise(resolve => setTimeout(resolve, FINISH_ANIMATION_MS));
      router.push(`/applications/${application.id}/edit`);
    } catch (error: unknown) {
      let message = 'Ein unbekannter Fehler ist aufgetreten';
      let applicationId: string | null = null;
      let errorCode: string | undefined;
      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        const errData = err.data as Record<string, unknown> | undefined;
        if (errData?.message) message = String(errData.message);
        else if (err.message) message = String(err.message);
        if (errData?.applicationId) applicationId = String(errData.applicationId);
        if (errData?.code) errorCode = String(errData.code);
        else if (errData?.error) errorCode = String(errData.error);
      }

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        toast.error(message, {
          duration: 10000,
          action: {
            label: 'E-Mail erneut senden',
            onClick: () => router.push('/settings?verify=resend'),
          },
        });
        return;
      }

      if (applicationId) {
        toast.error(message, {
          duration: 8000,
          action: {
            label: 'Zur Bewerbung',
            onClick: () => router.push(`/applications/${applicationId}`),
          },
        });
      } else {
        toast.error(message);
      }
    }
  };

  const isGroupSelected = (group: TemplateGroup) =>
    group.colorVariants.some(v => v.id === effectiveResumeTemplateId) ||
    group.baseTemplate.id === effectiveResumeTemplateId;

  const getSelectedVariantForGroup = (group: TemplateGroup) =>
    group.colorVariants.find(v => v.id === effectiveResumeTemplateId)?.id;

  // Live preview shows the hovered design, otherwise the selected one.
  const selectedGroup = resumeTemplateGroups.find(isGroupSelected) ?? resumeTemplateGroups[0];
  const shownGroup =
    (hoverGroupKey &&
      resumeTemplateGroups.find(g => g.baseTemplate.id === hoverGroupKey)) ||
    selectedGroup;
  const shownTemplateId = shownGroup
    ? shownGroup === selectedGroup
      ? (effectiveResumeTemplateId ?? shownGroup.baseTemplate.id)
      : shownGroup.baseTemplate.id
    : null;

  if (clLoading || rtLoading) {
    return <CenteredLoader message="Vorlagen werden geladen..." />;
  }

  // ── Loading screen with circular progress ring ──
  if (isGenerating) {
    const STEPS = [
      { key: 'analyze', label: 'Profil und Stellenanzeige werden analysiert', icon: Target, doneAt: 6 },
      { key: 'cover', label: 'Anschreiben wird mit KI generiert', icon: FileText, doneAt: 28 },
      { key: 'resume', label: 'Lebenslauf wird auf die Stelle zugeschnitten', icon: User, doneAt: 50 },
      { key: 'save', label: 'Dokumente werden gespeichert', icon: Download, doneAt: 60 },
    ];

    const filteredSteps = generateCoverLetter ? STEPS : STEPS.filter(s => s.key !== 'cover');
    // While pending the fake progress saturates at PENDING_MAX_PCT; only the
    // real completion (isRedirecting) drives the ring to 100%.
    const pct = isRedirecting
      ? 100
      : Math.min(PENDING_MAX_PCT, (elapsedSeconds / TOTAL_SECONDS) * 100);
    const currentStepIdx = filteredSteps.findIndex(s => elapsedSeconds < s.doneAt);
    const activeIdx = currentStepIdx === -1 ? filteredSteps.length - 1 : currentStepIdx;
    const etaSec = Math.max(0, Math.ceil(TOTAL_SECONDS - elapsedSeconds));
    const R = 50;
    const C = 2 * Math.PI * R;

    return (
      <div className="max-w-[720px] mx-auto space-y-4">
        <Card className="gap-0 rounded-[4px] border-[#E0E0E0] bg-white py-0 shadow-none">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              {/* Circular progress ring — blue while running, green at 100% */}
              <div className="relative w-[116px] h-[116px] shrink-0">
                <svg width="116" height="116" viewBox="0 0 116 116">
                  <circle cx="58" cy="58" r={R} fill="none" stroke="#E5E9F2" strokeWidth="9" />
                  <circle
                    cx="58" cy="58" r={R} fill="none"
                    stroke={isRedirecting ? '#16A34A' : '#5581C7'} strokeWidth="9" strokeLinecap="butt"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - pct / 100)}
                    transform="rotate(-90 58 58)"
                    className={cn(
                      'transition-[stroke-dashoffset]',
                      // Slow ease-out for the final fill to 100%, linear creep otherwise.
                      isRedirecting ? 'duration-700 ease-out' : 'duration-200 ease-linear',
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-[28px] font-semibold leading-none tracking-[-.02em]">{Math.round(pct)}%</span>
                  <span className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[.14em] text-[#A0A0A0]">erstellt</span>
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="font-heading text-[21px] font-bold tracking-[-.01em]">
                  {isRedirecting ? 'Fertig!' : filteredSteps[activeIdx].label}
                </h2>
                <div className="mt-2.5 inline-flex items-center gap-2 border border-[#E0E0E0] bg-[#F5F6F8] px-3 py-1.5 text-[13px] font-medium text-muted-foreground">
                  {isRedirecting ? (
                    <>
                      <Check className="h-4 w-4 text-[#16A34A]" strokeWidth={2.8} />
                      Bewerbung erstellt – du wirst weitergeleitet …
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4" />
                      {etaSec > 0 ? `Geschätzte Restzeit: ~${etaSec} Sek.` : 'Gleich geschafft …'}
                    </>
                  )}
                </div>
                {!isRedirecting && (
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    Bitte schließe dieses Fenster nicht.
                  </p>
                )}
              </div>
            </div>

            {/* Step list — hairline 1px-gap rows */}
            <div className="mt-7 flex flex-col gap-px border border-[#E0E0E0] bg-[#E0E0E0]">
              {filteredSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isDone = isRedirecting || i < activeIdx;
                const isActive = !isRedirecting && i === activeIdx;

                return (
                  <div
                    key={step.key}
                    className={cn(
                      'flex items-center gap-3.5 px-4 py-3.5 transition-colors',
                      isDone && 'bg-[#F2FBF5]',
                      isActive && 'bg-[#F1F6FE]',
                      !isDone && !isActive && 'bg-white',
                    )}
                  >
                    <span className={cn(
                      'grid h-[30px] w-[30px] shrink-0 place-items-center',
                      isDone && 'bg-[#16A34A] text-white',
                      isActive && 'bg-[#1B2A49] text-white',
                      !isDone && !isActive && 'bg-[#F5F6F8] text-[#A0A0A0]',
                    )}>
                      {isDone ? (
                        <Check className="h-4 w-4" strokeWidth={2.8} />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </span>
                    <span className={cn(
                      'flex-1 text-[13.5px] font-semibold',
                      (isDone || isActive) ? 'text-foreground' : 'text-[#A0A0A0]',
                    )}>
                      {step.label}
                    </span>
                    {isDone && (
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-[#16A34A]">
                        Fertig
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-[#A0A0A0]">
          Fertige Schritte werden nach Abschluss automatisch als erledigt markiert.
        </p>
      </div>
    );
  }

  // ── Configuration form ──
  return (
    <div className="space-y-4">
      {/* One window: options + design picker together in three columns
          (options | template list | live preview) so the whole step fits
          on a single screen. */}
      <div>
        <Card className="gap-0 rounded-[4px] border-[#E0E0E0] bg-white py-0 shadow-none">
          <CardHeader className="border-b border-[#E0E0E0] px-5 py-4">
            <CardTitle className="font-heading text-base font-bold">Konfigurieren</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:items-start">
              {/* Options bar spans both columns; the rail and preview below each
                  fill one column, so they line up exactly with the two fields. */}
              <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
                <div
                  className="flex cursor-pointer items-start gap-3 border border-[#E0E0E0] p-3.5 transition-colors hover:bg-[#FAFAFA]"
                  onClick={() => setGenerateCoverLetter(!generateCoverLetter)}
                >
                  <Checkbox
                    id="generateCoverLetter"
                    checked={generateCoverLetter}
                    onCheckedChange={checked => setGenerateCoverLetter(checked === true)}
                    className="mt-0.5 rounded-none border-[#B0B0B0] data-[state=checked]:border-[#1B2A49] data-[state=checked]:bg-[#1B2A49]"
                  />
                  <div className="grid w-full gap-1 leading-none">
                    <Label htmlFor="generateCoverLetter" className="cursor-pointer text-sm font-semibold">
                      Anschreiben generieren
                    </Label>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Erstellt ein auf die Stelle zugeschnittenes Anschreiben.
                    </p>
                    {generateCoverLetter && (
                      <div
                        className="mt-2 flex flex-wrap items-center gap-1.5"
                        onClick={event => event.stopPropagation()}
                      >
                        {COVER_LETTER_LENGTH_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCoverLetterLength(option.value)}
                            title={option.hint}
                            className={cn(
                              'inline-flex items-center border px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[.04em] transition-colors',
                              coverLetterLength === option.value
                                ? 'border-[#1B2A49] bg-[#1B2A49] text-white'
                                : 'border-[#E0E0E0] bg-white text-[#6B6969] hover:bg-[#F5F6F8]',
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 border border-[#E0E0E0] p-3.5">
                  <Label className="shrink-0 text-sm font-semibold">Sprache</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {LANGUAGE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedLanguage(option.value)}
                        title={option.label}
                        aria-label={option.label}
                        className={cn(
                          'inline-flex items-center border px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[.04em] transition-colors',
                          selectedLanguage === option.value
                            ? 'border-[#1B2A49] bg-[#1B2A49] text-white'
                            : 'border-[#E0E0E0] bg-white text-[#6B6969] hover:bg-[#F5F6F8]',
                        )}
                      >
                        {option.value.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Template list — fills the left column (under "Anschreiben generieren").
                  Scroll-capped so the column never grows past the preview. */}
              <div className="space-y-2.5 lg:max-h-[calc(100vh-470px)] lg:overflow-y-auto lg:pr-1">
                {resumeTemplateGroups.map(group => {
                  const selected = isGroupSelected(group);
                  return (
                    <div
                      key={group.baseTemplate.id}
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setHoverGroupKey(group.baseTemplate.id)}
                      onMouseLeave={() => setHoverGroupKey(null)}
                      onClick={() =>
                        setSelectedResumeTemplateId(
                          getSelectedVariantForGroup(group) ?? group.baseTemplate.id,
                        )
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedResumeTemplateId(
                            getSelectedVariantForGroup(group) ?? group.baseTemplate.id,
                          );
                        }
                      }}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 border p-3 transition-colors',
                        selected
                          ? 'border-[#1B2A49] bg-[#F7F9FC]'
                          : 'border-[#E0E0E0] bg-white hover:bg-[#FAFAFA]',
                      )}
                    >
                      <div className="relative h-[70px] w-[52px] shrink-0 overflow-hidden border border-[#E0E0E0] bg-white">
                        <Image
                          src={templatePreviewUrl(group.baseTemplate.id)}
                          alt={`${group.baseTemplate.name} Miniatur`}
                          fill
                          unoptimized
                          className="object-cover object-top"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {group.baseTemplate.name.replace(/\s*\([^)]*\)\s*$/, '')}
                          </p>
                          <Badge
                            variant="secondary"
                            className="shrink-0 rounded-none border border-[#E0E0E0] bg-[#F5F6F8] px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[.08em] text-[#6B6969]"
                          >
                            {group.baseTemplate.category}
                          </Badge>
                        </div>
                        {group.baseTemplate.description && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {group.baseTemplate.description}
                          </p>
                        )}
                        {/* The API may return only variants (no base row), so the
                            group is identified by baseTemplateId, not the id of
                            the representative template. */}
                        {selected &&
                          group.colorVariants.length > 1 &&
                          !MONOCHROME_TEMPLATES.has(
                            group.baseTemplate.baseTemplateId ?? group.baseTemplate.id,
                          ) && (
                          <div
                            className="mt-2 flex items-center gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="font-mono text-[10px] uppercase tracking-[.06em] text-[#A0A0A0]">Farbe</span>
                            {group.colorVariants.map(variant => {
                              const variantSelected = variant.id === effectiveResumeTemplateId;
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  title={variant.colorVariantName}
                                  onClick={() => setSelectedResumeTemplateId(variant.id)}
                                  className={cn(
                                    'h-[18px] w-[18px] border-2 transition-transform hover:scale-110',
                                    variantSelected ? 'border-[#1B2A49]' : 'border-[#E0E0E0]',
                                  )}
                                  style={{ backgroundColor: variant.accentColor }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border transition-colors',
                          selected
                            ? 'border-[#1B2A49] bg-[#1B2A49] text-white'
                            : 'border-[#E0E0E0] bg-white',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3.4} />}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live preview pane — fills the right column (under "Sprache"),
                  so it's exactly as wide as the language field above. The CV page
                  stays height-constrained and centered inside it. */}
              <div className="flex flex-col border border-[#E0E0E0] bg-[#FAFAFA] p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-[13px] text-muted-foreground">
                    Vorschau:{' '}
                    <span className="font-semibold text-foreground">
                      {shownGroup?.baseTemplate.name.replace(/\s*\([^)]*\)\s*$/, '')}
                    </span>
                  </p>
                  <span className="inline-flex items-center gap-1.5 border border-[#E0E0E0] bg-white px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[.08em] text-[#6B6969]">
                    <span className="h-1.5 w-1.5 animate-pulse bg-[#16A34A]" />
                    Live
                  </span>
                </div>
                {shownTemplateId && (
                  <div className="flex flex-1 items-start justify-center">
                    <button
                      type="button"
                      onClick={() => setZoomOpen(true)}
                      title="Zum Vergrößern klicken"
                      className="group relative aspect-[8.5/11] h-[560px] max-h-[calc(100vh-540px)] cursor-zoom-in overflow-hidden border border-[#B0B0B0] bg-white shadow-[8px_8px_0_#E5E9F2] transition-shadow hover:shadow-[8px_8px_0_#D8E0EF]"
                    >
                      <Image
                        key={shownTemplateId}
                        src={templatePreviewUrl(shownTemplateId)}
                        alt="Template Vorschau"
                        fill
                        unoptimized
                        className="object-cover animate-in fade-in duration-300"
                      />
                      <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 bg-[#1B2A49]/80 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[.06em] text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        <Maximize2 className="h-3 w-3" /> Vergrößern
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Full-size CV preview — opened by clicking the live preview. */}
              <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
                <DialogContent className="w-fit max-w-[96vw] border-none bg-transparent p-0 shadow-none sm:max-w-[96vw]">
                  <DialogTitle className="sr-only">
                    Vorschau: {shownGroup?.baseTemplate.name.replace(/\s*\([^)]*\)\s*$/, '')}
                  </DialogTitle>
                  {shownTemplateId && (
                    <div className="relative aspect-[8.5/11] h-[88vh] max-h-[88vh] overflow-hidden rounded-lg border border-border/50 bg-white shadow-2xl">
                      <Image
                        key={shownTemplateId}
                        src={templatePreviewUrl(shownTemplateId)}
                        alt="Template Vorschau groß"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer: back on the left, usage + submit on the right — one row
          instead of a submit block plus a separate wizard back-row. */}
      <div className="flex items-center justify-between gap-4 border-t border-[#E0E0E0] pt-5">
        <Button variant="outline" onClick={() => onStepChange('job')} className="rounded-[3px] border-[#1B2A49] font-semibold hover:bg-[#E5E9F2]">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück
        </Button>
        <div className="flex items-center gap-4">
          {!dailyUsage.isUnlimited && !dailyUsage.isLoading && (
            <p
              className={cn(
                'text-right font-mono text-[11px] tracking-[.04em]',
                dailyUsage.isExhausted
                  ? 'font-medium text-destructive'
                  : dailyUsage.isLow
                    ? 'font-medium text-amber-600'
                    : 'text-muted-foreground',
              )}
            >
              {dailyUsage.isExhausted
                ? `Tageslimit erreicht (${dailyUsage.used}/${dailyUsage.limit}). Bitte komm in 24 Stunden wieder.`
                : `Heute noch ${dailyUsage.remaining} von ${dailyUsage.limit} Bewerbungen möglich`}
            </p>
          )}
          <SubmitButton
            onClick={handleSubmit}
            isLoading={createApplication.isPending}
            loadingText="Erstelle Bewerbung..."
            size="lg"
            disabled={dailyUsage.isExhausted}
            className="rounded-[3px] px-6 font-semibold"
          >
            Bewerbung erstellen
            <Sparkles className="ml-1 h-4 w-4" />
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
