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
  Eye,
  Maximize2,
} from 'lucide-react';
import type { JobPosting, Template } from '@/types';

export type ApplicationLanguage = 'de' | 'en' | 'fr' | 'es' | 'it';

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

const LANGUAGE_OPTIONS: { value: ApplicationLanguage; label: string; flag: string }[] = [
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
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
      <div className="max-w-[720px] mx-auto space-y-6">
        <Card className="shadow-soft border-border/50">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center gap-6">
              {/* Circular progress ring */}
              <div className="relative w-[116px] h-[116px] shrink-0">
                <svg width="116" height="116" viewBox="0 0 116 116">
                  <circle cx="58" cy="58" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
                  <circle
                    cx="58" cy="58" r={R} fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round"
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
                  <span className="text-3xl font-extrabold tracking-tight leading-none">{Math.round(pct)}%</span>
                  <span className="text-xs text-muted-foreground font-semibold mt-0.5">erstellt</span>
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold">
                  {isRedirecting ? 'Fertig!' : filteredSteps[activeIdx].label}
                </h2>
                <div className="inline-flex items-center gap-2 mt-2 text-sm text-muted-foreground bg-muted/50 border border-border/50 px-3 py-1.5 rounded-full">
                  {isRedirecting ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" strokeWidth={2.8} />
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
                  <p className="text-sm font-semibold text-muted-foreground mt-2">
                    Bitte schließe dieses Fenster nicht.
                  </p>
                )}
              </div>
            </div>

            {/* Step list */}
            <div className="mt-7 space-y-2.5">
              {filteredSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isDone = isRedirecting || i < activeIdx;
                const isActive = !isRedirecting && i === activeIdx;

                return (
                  <div
                    key={step.key}
                    className={cn(
                      'flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all',
                      isDone && 'border-green-200 bg-green-50/60',
                      isActive && 'border-blue-200 bg-blue-50/40',
                      !isDone && !isActive && 'border-border bg-background',
                    )}
                  >
                    <span className={cn(
                      'inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg',
                      isDone && 'bg-green-500 text-white',
                      isActive && 'bg-primary text-primary-foreground',
                      !isDone && !isActive && 'bg-muted text-muted-foreground',
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
                      'text-sm font-semibold flex-1',
                      !isDone && !isActive && 'text-muted-foreground/50',
                    )}>
                      {step.label}
                    </span>
                    {isDone && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                        <Eye className="h-3.5 w-3.5" /> Fertig
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
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
        <Card className="shadow-soft border-border/50 gap-2 py-3">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Konfigurieren</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:items-start">
              {/* Options bar spans both columns; the rail and preview below each
                  fill one column, so they line up exactly with the two fields. */}
              <div className="grid gap-2.5 sm:grid-cols-2 sm:col-span-2">
                <div
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setGenerateCoverLetter(!generateCoverLetter)}
                >
                  <Checkbox
                    id="generateCoverLetter"
                    checked={generateCoverLetter}
                    onCheckedChange={checked => setGenerateCoverLetter(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor="generateCoverLetter" className="text-sm font-medium cursor-pointer">
                      Anschreiben generieren
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Erstellt ein auf die Stelle zugeschnittenes Anschreiben.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50">
                  <Label className="text-sm font-medium shrink-0">Sprache</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {LANGUAGE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedLanguage(option.value)}
                        title={option.label}
                        aria-label={option.label}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg border transition-all duration-200 text-xs font-semibold',
                          selectedLanguage === option.value
                            ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                            : 'border-border/50 bg-background hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <span className="text-sm">{option.flag}</span>
                        <span>{option.value.toUpperCase()}</span>
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
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                          : 'border-border/50 bg-background hover:border-border hover:bg-muted/30',
                      )}
                    >
                      <div className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
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
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {group.baseTemplate.category}
                          </Badge>
                        </div>
                        {group.baseTemplate.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
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
                            <span className="text-xs text-muted-foreground">Farbe:</span>
                            {group.colorVariants.map(variant => {
                              const variantSelected = variant.id === effectiveResumeTemplateId;
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  title={variant.colorVariantName}
                                  onClick={() => setSelectedResumeTemplateId(variant.id)}
                                  className={cn(
                                    'h-5 w-5 rounded-full border-2 transition-all hover:scale-110',
                                    variantSelected
                                      ? 'border-primary ring-2 ring-primary/25'
                                      : 'border-border hover:border-muted-foreground',
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
                          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-background',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live preview pane — fills the right column (under "Sprache"),
                  so it's exactly as wide as the language field above. The CV page
                  stays height-constrained and centered inside it. */}
              <div className="flex flex-col rounded-xl border border-border/50 bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-sm text-muted-foreground">
                    Vorschau:{' '}
                    <span className="font-semibold text-foreground">
                      {shownGroup?.baseTemplate.name.replace(/\s*\([^)]*\)\s*$/, '')}
                    </span>
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Live
                  </span>
                </div>
                {shownTemplateId && (
                  <div className="flex flex-1 items-start justify-center">
                    <button
                      type="button"
                      onClick={() => setZoomOpen(true)}
                      title="Zum Vergrößern klicken"
                      className="group relative aspect-[8.5/11] h-[560px] max-h-[calc(100vh-540px)] cursor-zoom-in overflow-hidden rounded-lg border border-border/50 bg-white shadow-xl ring-1 ring-black/5 transition-shadow hover:shadow-2xl"
                    >
                      <Image
                        key={shownTemplateId}
                        src={templatePreviewUrl(shownTemplateId)}
                        alt="Template Vorschau"
                        fill
                        unoptimized
                        className="object-cover animate-in fade-in duration-300"
                      />
                      <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
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
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
        <Button variant="outline" onClick={() => onStepChange('job')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div className="flex items-center gap-3">
          {!dailyUsage.isUnlimited && !dailyUsage.isLoading && (
            <p
              className={cn(
                'text-xs text-right',
                dailyUsage.isExhausted
                  ? 'text-destructive font-medium'
                  : dailyUsage.isLow
                    ? 'text-amber-600 font-medium'
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
            className="shadow-lg hover:shadow-xl transition-all"
          >
            Bewerbung erstellen
            <Sparkles className="ml-2 h-4 w-4" />
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
