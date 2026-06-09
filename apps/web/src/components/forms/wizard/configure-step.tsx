'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CenteredLoader } from '@/components/shared/loading';
import { TemplateCard } from '@/components/templates/template-card';
import { useProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateApplicationWithGeneration } from '@/hooks/use-applications';
import { useCoverLetterTemplates, useResumeTemplates, getDefaultTemplate } from '@/hooks/use-templates';
import { useUsage } from '@/hooks/use-usage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  User,
  Briefcase,
  Loader2,
  Check,
  Clock,
  FileText,
  Target,
  Download,
  Eye,
} from 'lucide-react';
import type { JobPosting, Template } from '@/types';

export type ApplicationLanguage = 'de' | 'en' | 'fr' | 'es' | 'it';

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
}

export function ConfigureStep({ jobPosting, onStepChange }: ConfigureStepProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const createApplication = useCreateApplicationWithGeneration();
  const { data: coverLetterTemplates, isLoading: clLoading } = useCoverLetterTemplates();
  const { data: resumeTemplates, isLoading: rtLoading } = useResumeTemplates();
  const dailyUsage = useUsage('applicationsToday');

  const [selectedResumeTemplateId, setSelectedResumeTemplateId] = useState<string | null>(null);
  const [generateCoverLetter, setGenerateCoverLetter] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<ApplicationLanguage>('de');
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isGenerating = createApplication.isPending || isRedirecting;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

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
    try {
      const application = await createApplication.mutateAsync({
        jobPostingId: jobPosting.id,
        coverLetterTemplateId: generateCoverLetter ? (effectiveCoverLetterTemplateId || undefined) : undefined,
        resumeTemplateId: effectiveResumeTemplateId || undefined,
        generateCoverLetter,
        language: selectedLanguage,
      });

      setIsRedirecting(true);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
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
    const TOTAL_SECONDS = 60;
    const pct = Math.min(100, Math.round((elapsedSeconds / TOTAL_SECONDS) * 100));
    const currentStepIdx = filteredSteps.findIndex(s => elapsedSeconds < s.doneAt);
    const activeIdx = currentStepIdx === -1 ? filteredSteps.length - 1 : currentStepIdx;
    const etaSec = Math.max(0, TOTAL_SECONDS - elapsedSeconds);
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
                    className="transition-[stroke-dashoffset] duration-150 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tracking-tight leading-none">{pct}%</span>
                  <span className="text-xs text-muted-foreground font-semibold mt-0.5">erstellt</span>
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold">
                  {pct < 100 ? filteredSteps[activeIdx].label : 'Fertig!'}
                </h2>
                <div className="inline-flex items-center gap-2 mt-2 text-sm text-muted-foreground bg-muted/50 border border-border/50 px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  Geschätzte Restzeit: ~{etaSec} Sek.
                </div>
                <p className="text-sm font-semibold text-muted-foreground mt-2">
                  Bitte schließe dieses Fenster nicht.
                </p>
              </div>
            </div>

            {/* Step list */}
            <div className="mt-7 space-y-2.5">
              {filteredSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isDone = i < activeIdx;
                const isActive = i === activeIdx;

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
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="shadow-soft border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Dein Profil
              </div>
              <p className="font-semibold">{user?.firstName || ''} {user?.lastName || ''}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile?.skills && profile.skills.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {profile.skills.length} Skills
                  </Badge>
                )}
                {profile?.experiences && profile.experiences.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {profile.experiences.length} Erfahrungen
                  </Badge>
                )}
                {profile?.education && profile.education.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {profile.education.length} Bildung
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                Diese Stelle
              </div>
              <p className="font-semibold">{jobPosting.title}</p>
              <p className="text-sm text-muted-foreground">{jobPosting.company}</p>
              {jobPosting.location && (
                <p className="text-xs text-muted-foreground">{jobPosting.location}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card className="shadow-soft border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Optionen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex items-start space-x-3 p-4 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => setGenerateCoverLetter(!generateCoverLetter)}
          >
            <Checkbox
              id="generateCoverLetter"
              checked={generateCoverLetter}
              onCheckedChange={checked => setGenerateCoverLetter(checked === true)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="generateCoverLetter" className="text-base font-medium cursor-pointer">
                Anschreiben generieren
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Erstellt ein auf die Stelle zugeschnittenes Anschreiben.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50">
            <div className="grid gap-1.5 leading-none mb-3">
              <Label className="text-base font-medium">Sprache der Bewerbung</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedLanguage(option.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 text-sm font-medium',
                    selectedLanguage === option.value
                      ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                      : 'border-border/50 bg-background hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  <span className="text-base">{option.flag}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Picker */}
      <Card className="shadow-soft border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Design auswählen</CardTitle>
              <CardDescription>
                Wähle eine Vorlage für deinen Lebenslauf.
                {generateCoverLetter && ' Das Anschreiben wird automatisch im passenden Design erstellt.'}
              </CardDescription>
            </div>
            {resumeTemplateGroups.length > 3 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAllTemplates(!showAllTemplates)}>
                {showAllTemplates ? 'Weniger' : 'Alle anzeigen'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(showAllTemplates ? resumeTemplateGroups : resumeTemplateGroups.slice(0, 3)).map(group => (
              <TemplateCard
                key={group.baseTemplate.id}
                template={group.baseTemplate}
                isSelected={isGroupSelected(group)}
                onSelect={setSelectedResumeTemplateId}
                colorVariants={group.colorVariants.length > 1 ? group.colorVariants : undefined}
                selectedVariantId={getSelectedVariantForGroup(group)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col items-end gap-2">
        {!dailyUsage.isUnlimited && !dailyUsage.isLoading && (
          <p
            className={cn(
              'text-xs',
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
  );
}
