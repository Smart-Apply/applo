'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
} from 'lucide-react';
import type { JobPosting, Template } from '@/types';

// Only de/en — the generation prompts never fully supported fr/es/it
// (see docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md).
export type ApplicationLanguage = 'de' | 'en';

const LANGUAGE_OPTIONS: {
  value: ApplicationLanguage;
  labelKey: 'configureStep.language.de' | 'configureStep.language.en';
  flag: string;
}[] = [
  { value: 'de', labelKey: 'configureStep.language.de', flag: '🇩🇪' },
  { value: 'en', labelKey: 'configureStep.language.en', flag: '🇬🇧' },
];

// Helper to group templates by base template for color variants
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

interface GenerateStepProps {
  jobPosting: JobPosting;
}

export function GenerateStep({ jobPosting }: GenerateStepProps) {
  const router = useRouter();
  const t = useTranslations('wizard');
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

  // Elapsed-time counter for the loading UI. Starts when generation begins
  // and resets when the component unmounts or generation finishes.
  const isGenerating = createApplication.isPending || isRedirecting;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Derive the effective resume template (user-selected or default)
  const effectiveResumeTemplateId = selectedResumeTemplateId ?? (() => {
    if (!resumeTemplates || resumeTemplates.length === 0) return null;
    const defaultTemplate = resumeTemplates.find(t => t.isDefault) || resumeTemplates[0];
    return defaultTemplate?.id ?? null;
  })();

  // Derive matching cover letter template from resume selection (no state needed)
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

  // Language defaults handled by initial state
  // Could be enhanced to detect language from job text via backend

  const handleSubmit = async () => {
    try {
      const application = await createApplication.mutateAsync({
        jobPostingId: jobPosting.id,
        coverLetterTemplateId: generateCoverLetter ? (effectiveCoverLetterTemplateId || undefined) : undefined,
        resumeTemplateId: effectiveResumeTemplateId || undefined,
        generateCoverLetter,
        language: selectedLanguage,
      });

      // createWithGeneration completes synchronously (blocks until LLM is done),
      // so the application is already READY — redirect immediately
      setIsRedirecting(true);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      router.push(`/applications/${application.id}/edit`);
    } catch (error: unknown) {
      let message = t('configureStep.errors.unknown');
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

      // Special-case: backend rejected because the user hasn't verified
      // their email yet. Surface a tailored CTA pointing to the resend
      // action in settings instead of a generic "Forbidden" toast.
      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        toast.error(message, {
          duration: 10000,
          action: {
            label: t('configureStep.errors.resendEmail'),
            onClick: () => router.push('/settings?verify=resend'),
          },
        });
        return;
      }

      if (applicationId) {
        // The application already exists for this posting — typically a slow
        // generation whose first attempt completed server-side after the
        // connection dropped, or a previously created application. Take the
        // user straight into edit mode instead of stranding them on the
        // wizard with a duplicate-conflict error.
        setIsRedirecting(true);
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        toast.info(t('generateStep.toasts.existingApplication'));
        router.push(`/applications/${applicationId}/edit`);
        return;
      }

      toast.error(message);
    }
  };

  const isGroupSelected = (group: TemplateGroup) =>
    group.colorVariants.some(v => v.id === effectiveResumeTemplateId) ||
    group.baseTemplate.id === effectiveResumeTemplateId;

  const getSelectedVariantForGroup = (group: TemplateGroup) =>
    group.colorVariants.find(v => v.id === effectiveResumeTemplateId)?.id;

  if (clLoading || rtLoading) {
    return <CenteredLoader message={t('configureStep.loadingTemplates')} />;
  }

  // ── Generating or redirecting: show loading UI ──
  if (createApplication.isPending || isRedirecting) {
    // Estimated step durations (cumulative seconds). Heuristic only — the
    // actual timing depends on the LLM. The cover-letter editor pass adds one
    // extra LLM round-trip, so the steps + estimate differ when a cover letter
    // is generated.
    const STEPS: { label: string; doneAt: number }[] = generateCoverLetter
      ? [
          { label: t('generateStep.progress.steps.analyze'), doneAt: 6 },
          { label: t('generateStep.progress.steps.cover'), doneAt: 28 },
          { label: t('generateStep.progress.steps.resume'), doneAt: 48 },
          { label: t('generateStep.progress.steps.refineCover'), doneAt: 66 },
          { label: t('generateStep.progress.steps.save'), doneAt: 74 },
        ]
      : [
          { label: t('generateStep.progress.steps.analyze'), doneAt: 6 },
          { label: t('generateStep.progress.steps.resume'), doneAt: 45 },
          { label: t('generateStep.progress.steps.save'), doneAt: 55 },
        ];

    const totalEstimate = STEPS[STEPS.length - 1].doneAt;
    const currentStepIndex = STEPS.findIndex((s) => elapsedSeconds < s.doneAt);
    const activeIndex = currentStepIndex === -1 ? STEPS.length - 1 : currentStepIndex;
    const isOverdue = elapsedSeconds > totalEstimate + 15;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('generateStep.progress.title')}</CardTitle>
          <CardDescription>
            {isOverdue
              ? t('generateStep.progress.overdue')
              : t('generateStep.progress.estimate', { seconds: generateCoverLetter ? '45–75' : '30–55' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  {t('generateStep.progress.creating')}
                </p>
              </div>
              <span
                className="font-mono text-xs text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                {String(Math.floor(elapsedSeconds / 60)).padStart(1, '0')}:
                {String(elapsedSeconds % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="w-full h-2 bg-primary-soft dark:bg-slate-700 overflow-hidden">
              <div className="h-full bg-brand animate-progress" />
            </div>
            <ul className="space-y-2 text-sm">
              {STEPS.map((step, i) => {
                const isDone = i < activeIndex;
                const isActive = i === activeIndex;
                return (
                  <li
                    key={step.label}
                    className={cn(
                      'flex items-center gap-3 transition-colors',
                      isDone
                        ? 'text-foreground'
                        : isActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground/70',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center border transition-colors',
                        isDone
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isActive
                            ? 'border-brand bg-primary-soft/60 text-brand dark:bg-slate-800'
                            : 'border-muted-foreground/30 text-muted-foreground/50',
                      )}
                    >
                      {isDone ? (
                        <Check className="h-3 w-3" />
                      ) : isActive ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className="h-1.5 w-1.5 bg-current" />
                      )}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Idle: show summary + templates + generate button ──
  return (
    <div className="space-y-6">
      {/* Summary Card: Profile ↔ Job */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('generateStep.summary.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Profile Summary */}
            <div className="rounded-[3px] border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {t('generateStep.summary.profile')}
              </div>
              <p className="font-semibold">{user?.firstName || ''} {user?.lastName || ''}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile?.skills && profile.skills.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {t('generateStep.summary.skills', { count: profile.skills.length })}
                  </Badge>
                )}
                {profile?.experiences && profile.experiences.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {t('generateStep.summary.experiences', { count: profile.experiences.length })}
                  </Badge>
                )}
                {profile?.education && profile.education.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {t('generateStep.summary.education', { count: profile.education.length })}
                  </Badge>
                )}
              </div>
            </div>

            {/* Job Summary */}
            <div className="rounded-[3px] border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                {t('generateStep.summary.job')}
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

      {/* Options: Cover Letter + Language */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('generateStep.options.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 p-4 rounded-[3px] bg-muted/30 border">
            <Checkbox
              id="generateCoverLetter"
              checked={generateCoverLetter}
              onCheckedChange={checked => setGenerateCoverLetter(checked === true)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="generateCoverLetter" className="text-base font-medium cursor-pointer">
                {t('configureStep.options.generateCoverLetter')}
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('configureStep.options.generateCoverLetterHelp')}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-[3px] bg-muted/30 border">
            <div className="grid gap-1.5 leading-none mb-3">
              <Label className="text-base font-medium">{t('generateStep.options.languageTitle')}</Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('generateStep.options.languageHelp')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedLanguage(option.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-[3px] border-2 transition-colors text-sm font-medium',
                    selectedLanguage === option.value
                      ? 'border-primary bg-primary-soft/60 text-primary dark:bg-slate-800 dark:text-slate-100'
                      : 'border-transparent bg-background hover:bg-muted/50 hover:border-border text-muted-foreground'
                  )}
                >
                  <span className="text-base">{option.flag}</span>
                  <span>{t(option.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Picker */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('generateStep.templates.title')}</CardTitle>
              <CardDescription>
                {t('generateStep.templates.description')}
                {generateCoverLetter && ` ${t('generateStep.templates.coverLetterNote')}`}
              </CardDescription>
            </div>
            {resumeTemplateGroups.length > 3 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAllTemplates(!showAllTemplates)}>
                {showAllTemplates ? t('generateStep.templates.showLess') : t('generateStep.templates.showAll')}
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
                  ? 'font-medium text-[#A16207] dark:text-amber-300'
                  : 'text-muted-foreground',
            )}
          >
            {dailyUsage.isExhausted
              ? t('configureStep.usage.exhausted', { used: dailyUsage.used, limit: dailyUsage.limit })
              : t('configureStep.usage.remaining', { remaining: dailyUsage.remaining, limit: dailyUsage.limit })}
          </p>
        )}
        <SubmitButton
          onClick={handleSubmit}
          isLoading={createApplication.isPending}
          loadingText={t('configureStep.actions.creating')}
          size="lg"
          disabled={dailyUsage.isExhausted}
        >
          {t('configureStep.actions.create')}
          <Sparkles className="ml-2 h-4 w-4" />
        </SubmitButton>
      </div>
    </div>
  );
}
