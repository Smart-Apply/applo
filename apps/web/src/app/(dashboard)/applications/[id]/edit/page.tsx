'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  FileText,
  Mail,
  Target,
  Check,
  Download,
  Lock,
  Loader2,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CenteredLoader } from '@/components/shared/loading';
import { Skeleton } from '@/components/ui/skeleton';
import { EditableResume, resolveResumeDesign } from '@/components/applications/editable-resume';
import { AtsOptimizer } from '@/components/applications/ats-optimizer';
import { AiAssistantPopover } from '@/components/ui/ai-assistant-popover';
import { LanguageSelector } from '@/components/applications/language-selector';
import {
  useApplication,
  useExportApplication,
  useUpdateApplicationResume,
  useUpsertCoverLetter,
  useGenerateSummary,
  useGenerateExperienceDescription,
  useGenerateProjectDescription,
} from '@/hooks/use-applications';
import { useResumeTemplates } from '@/hooks/use-templates';
import { useFeatureGate } from '@/hooks/use-tier-gate';
import { parseResumeDraft, normalizeResumeForSave } from '@/lib/resume';
import type { ResumeData } from '@/types';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { stripHtml } from '@/lib/sanitize';
import { toTiptapHtml } from '@/lib/markdown';
import { cn } from '@/lib/utils';

// Heavy Tiptap-based cover-letter document — load only on the Anschreiben tab.
const EditableCoverLetter = dynamic(
  () =>
    import('@/components/applications/editable-cover-letter').then((m) => ({
      default: m.EditableCoverLetter,
    })),
  { loading: () => <Skeleton className="mx-auto h-96 w-full max-w-[820px] rounded-2xl" />, ssr: false },
);
const CoverLetterCTA = dynamic(
  () =>
    import('@/components/applications/editable-cover-letter').then((m) => ({
      default: m.CoverLetterCTA,
    })),
  { ssr: false },
);

function normalizeHtml(html: string): string {
  if (!html) return '';
  return html.trim().replace(/>\s+</g, '><');
}

const EMPTY_RESUME: ResumeData = {
  candidateName: 'Vorname Nachname',
  email: 'du@example.com',
  phone: '',
  street: '',
  postalCode: '',
  city: '',
  country: '',
  fullAddress: '',
  linkedin: '',
  github: '',
  summary: '',
  skillCategories: [],
  experiences: [],
  projects: [],
  education: [],
  certifications: [],
};

const AUTOSAVE_MS = 800;
type Tab = 'resume' | 'cover-letter' | 'ats';

export default function ApplicationResumeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicationId = params.id as string;

  const { data: application, isLoading, error } = useApplication(applicationId);
  const updateResume = useUpdateApplicationResume(applicationId);
  const upsertCoverLetter = useUpsertCoverLetter(applicationId);
  const exportApplication = useExportApplication(applicationId);
  const { data: resumeTemplates } = useResumeTemplates();
  const generateSummary = useGenerateSummary(applicationId);
  const generateExperienceDescription = useGenerateExperienceDescription(applicationId);
  const generateProjectDescription = useGenerateProjectDescription(applicationId);

  // ATS analysis is gated by `atsOptimization` (Pro & Premium only).
  const { hasAccess: hasAtsAccess, isLoading: isAtsAccessLoading } = useFeatureGate('atsOptimization');
  const isAtsLocked = !isAtsAccessLoading && !hasAtsAccess;

  const [parsedResume, setParsedResume] = useState<ResumeData | null>(null);
  const [lastSavedResume, setLastSavedResume] = useState<ResumeData | null>(null);
  const [resumeInitialized, setResumeInitialized] = useState(false);
  const [resumeVersion, setResumeVersion] = useState<string | null>(null);

  const [coverLetterValue, setCoverLetterValue] = useState('');
  const [lastSavedCoverLetter, setLastSavedCoverLetter] = useState('');
  const [coverInitialized, setCoverInitialized] = useState(false);
  const [coverVersion, setCoverVersion] = useState<string | null>(null);

  const [instructions, setInstructions] = useState('');
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('resume');
  const [selectedLanguage, setSelectedLanguage] = useState<'de' | 'en' | 'fr' | 'es' | 'it'>('de');
  const [languageInitialized, setLanguageInitialized] = useState(false);

  // Serialised payloads we've already attempted to save. Prevents the auto-save
  // effect from hammering a failing endpoint on every `isPending` flip — each
  // distinct edit is attempted at most once until the content changes again.
  const lastAttemptedResume = useRef<string | null>(null);
  const lastAttemptedCover = useRef<string | null>(null);

  const resumeText = application?.resumeText ?? null;
  const coverLetterText = application ? (application.coverLetterText ?? '') : null;

  const accent =
    resumeTemplates?.find((t) => t.id === application?.resumeTemplateId)?.accentColor || '#1B2A49';

  // Which export template the click-to-edit surface should mimic (P1).
  const resumeDesign = resolveResumeDesign(application?.resumeTemplateId);

  // ── init language ──
  useEffect(() => {
    if (application?.language && !languageInitialized) {
      const lang = application.language as 'de' | 'en' | 'fr' | 'es' | 'it';
      if (['de', 'en', 'fr', 'es', 'it'].includes(lang)) setSelectedLanguage(lang);
      setLanguageInitialized(true);
    }
  }, [application?.language, languageInitialized]);

  const hasResumeChanges = JSON.stringify(parsedResume) !== JSON.stringify(lastSavedResume);
  const hasCoverChanges = normalizeHtml(coverLetterValue) !== normalizeHtml(lastSavedCoverLetter);
  const coverHasContent = stripHtml(coverLetterValue).trim().length > 0;

  // ── init résumé from the loaded application ──
  useEffect(() => {
    if (resumeText === null) return;
    const resumeSource = resumeText || JSON.stringify(EMPTY_RESUME);
    if (resumeInitialized && resumeVersion === resumeSource) return;
    if (resumeInitialized && hasResumeChanges && resumeVersion !== resumeSource) return;

    const draft = parseResumeDraft(resumeSource) || EMPTY_RESUME;
    const normalized = normalizeResumeForSave(draft);
    // Seed the target job title from the job posting so it shows in the editor
    // (P2); the export already falls back to it, the edit surface should too.
    const seeded = normalized.targetJobTitle?.trim()
      ? normalized
      : { ...normalized, targetJobTitle: application?.jobPosting?.title || normalized.targetJobTitle };
    startTransition(() => {
      setParsedResume(seeded);
      setLastSavedResume(seeded);
      setResumeVersion(resumeSource);
      setResumeInitialized(true);
    });
  }, [resumeText, hasResumeChanges, resumeInitialized, resumeVersion, application?.jobPosting?.title]);

  // ── init cover letter ──
  useEffect(() => {
    if (coverLetterText === null) return;
    const incoming = toTiptapHtml(coverLetterText);
    if (coverInitialized && coverVersion === incoming) return;
    if (coverInitialized && hasCoverChanges && coverVersion !== incoming) return;
    startTransition(() => {
      setCoverLetterValue(incoming);
      setLastSavedCoverLetter(incoming);
      setCoverVersion(incoming);
      setCoverInitialized(true);
    });
  }, [coverLetterText, coverInitialized, coverVersion, hasCoverChanges]);

  // ── silent auto-save: résumé ──
  const autoSaveResume = useCallback(async () => {
    if (!parsedResume) return;
    const snapshot = JSON.stringify(parsedResume);
    lastAttemptedResume.current = snapshot;
    try {
      const normalized = normalizeResumeForSave(parsedResume);
      await updateResume.mutateAsync({ resume: normalized, contentLanguage: selectedLanguage });
      // Reconcile to the normalized value so we don't loop on trim/format diffs —
      // but ONLY if nothing was edited (e.g. via the AI assistant) while this save
      // was in flight, otherwise we'd clobber the newer change. A surviving diff
      // just triggers the next auto-save cycle.
      setParsedResume((current) => (JSON.stringify(current) === snapshot ? normalized : current));
      setLastSavedResume(normalized);
    } catch (err) {
      toast.error('Lebenslauf konnte nicht gespeichert werden', {
        id: 'resume-autosave-error',
        description: (err as Error).message,
      });
    }
  }, [parsedResume, selectedLanguage, updateResume]);

  useEffect(() => {
    if (!resumeInitialized || !hasResumeChanges || updateResume.isPending) return;
    // Don't re-attempt the exact payload we already tried (e.g. after a failure).
    if (lastAttemptedResume.current === JSON.stringify(parsedResume)) return;
    const t = setTimeout(() => void autoSaveResume(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [parsedResume, hasResumeChanges, resumeInitialized, updateResume.isPending, autoSaveResume]);

  // ── silent auto-save: cover letter ──
  const autoSaveCover = useCallback(async () => {
    if (!coverHasContent) return;
    lastAttemptedCover.current = coverLetterValue;
    try {
      await upsertCoverLetter.mutateAsync({ content: coverLetterValue });
      setLastSavedCoverLetter(coverLetterValue);
    } catch {
      toast.error('Anschreiben konnte nicht gespeichert werden', { id: 'cover-autosave-error' });
    }
  }, [coverHasContent, coverLetterValue, upsertCoverLetter]);

  useEffect(() => {
    if (!coverInitialized || !hasCoverChanges || upsertCoverLetter.isPending) return;
    if (lastAttemptedCover.current === coverLetterValue) return;
    const t = setTimeout(() => void autoSaveCover(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [coverLetterValue, hasCoverChanges, coverInitialized, upsertCoverLetter.isPending, autoSaveCover]);

  // ── warn before closing the tab with an unsaved (in-flight) edit ──
  useEffect(() => {
    const hasUnsaved = hasResumeChanges || hasCoverChanges;
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasResumeChanges, hasCoverChanges]);

  // ── cover-letter generation (CTA / regenerate) ──
  const generateCoverLetter = async () => {
    setGenLoading(true);
    try {
      const updated = await upsertCoverLetter.mutateAsync({ regenerate: true });
      const html = toTiptapHtml(updated.coverLetterText || '');
      startTransition(() => {
        setCoverLetterValue(html);
        setLastSavedCoverLetter(html);
        setCoverVersion(html);
        setCoverInitialized(true);
      });
      queryClient.invalidateQueries({ queryKey: ['applications', applicationId] });
    } catch (err) {
      toast.error('Anschreiben konnte nicht generiert werden: ' + (err as Error).message);
    } finally {
      setGenLoading(false);
    }
  };

  // ── cover-letter AI assistant (instructions → regenerate) ──
  const handleApplyAIChanges = async () => {
    if (!instructions.trim()) {
      toast.error('Bitte gib Anweisungen für die AI ein');
      return;
    }
    try {
      const currentContent = coverHasContent ? coverLetterValue : undefined;
      const updated = await upsertCoverLetter.mutateAsync({
        instructions: instructions.trim(),
        content: currentContent,
        regenerate: true,
      });
      if (!updated.coverLetterText) throw new Error('Keine Antwort vom Server erhalten');
      const html = toTiptapHtml(updated.coverLetterText);
      setInstructions('');
      startTransition(() => {
        setCoverLetterValue(html);
        setCoverVersion(html);
        setLastSavedCoverLetter(html);
        setCoverInitialized(true);
      });
      setAiPopoverOpen(false);
      toast.success('AI-Änderungen übernommen');
    } catch (err) {
      toast.error('AI-Generierung fehlgeschlagen: ' + (err as Error).message);
    }
  };

  // ── insert a missing ATS keyword into the résumé (auto-save persists it) ──
  const handleAddKeyword = useCallback((term: string) => {
    setParsedResume((prev) => {
      if (!prev) return prev;
      const cats = [...(prev.skillCategories || [])];
      const idx = cats.findIndex((c) => c.type === 'Weitere Kenntnisse');
      if (idx >= 0) {
        if (!cats[idx].skills.some((s) => s.toLowerCase() === term.toLowerCase())) {
          cats[idx] = { ...cats[idx], skills: [...cats[idx].skills, term] };
        }
      } else {
        cats.push({ type: 'Weitere Kenntnisse', skills: [term] });
      }
      return { ...prev, skillCategories: cats };
    });
  }, []);

  // ── résumé AI assists (P5): summary / experience / project ──
  // The mutation hooks surface their own error toasts, so we resolve to null
  // on failure and let the editor keep the current content.
  const handleGenerateSummary = useCallback(
    async (args: { instructions: string; currentSummary?: string; regenerate?: boolean }) => {
      try {
        return (await generateSummary.mutateAsync(args)).summary;
      } catch {
        return null;
      }
    },
    [generateSummary],
  );
  const handleGenerateExperience = useCallback(
    async (args: {
      experienceIndex: number;
      experienceTitle: string;
      experienceCompany: string;
      experienceDateRange?: string;
      currentDescription?: string;
      instructions: string;
      regenerate?: boolean;
    }) => {
      try {
        return (await generateExperienceDescription.mutateAsync(args)).description;
      } catch {
        return null;
      }
    },
    [generateExperienceDescription],
  );
  const handleGenerateProject = useCallback(
    async (args: {
      projectIndex: number;
      projectName: string;
      projectDate?: string;
      currentDescription?: string;
      instructions: string;
      regenerate?: boolean;
    }) => {
      try {
        return (await generateProjectDescription.mutateAsync(args)).description;
      } catch {
        return null;
      }
    },
    [generateProjectDescription],
  );

  if (isLoading) return <CenteredLoader message="Lädt Bewerbungsdaten..." />;

  if (error || !application) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/applications')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zu Bewerbungen
        </Button>
        <Card className="shadow-soft border-border/50">
          <CardHeader>
            <CardTitle>Editor nicht verfügbar</CardTitle>
            <CardDescription>Die Bewerbung konnte nicht geladen werden.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasCover = application.coverLetterText != null || coverHasContent;
  const coverLetterWasGenerated = application.coverLetterText !== null && application.coverLetterText !== undefined;

  const hasSavedResume = !!application.resumeText && application.resumeText.trim().length > 0;
  const hasSavedCoverLetter = !!application.coverLetterText && stripHtml(application.coverLetterText).trim().length > 0;

  const exportDisabledReason = (() => {
    if (application.status === 'GENERATING') return 'Export läuft bereits. Bitte warte auf den Abschluss.';
    if (hasResumeChanges || updateResume.isPending) return 'Änderungen werden gespeichert …';
    if (coverLetterWasGenerated && (hasCoverChanges || upsertCoverLetter.isPending)) return 'Änderungen werden gespeichert …';
    if (!hasSavedResume) return 'Lebenslauf fehlt.';
    if (coverLetterWasGenerated && !hasSavedCoverLetter) return 'Anschreiben fehlt.';
    return null;
  })();
  const canExport = !exportDisabledReason && !exportApplication.isPending;

  const handleExport = async () => {
    if (!canExport) return;
    try {
      await exportApplication.mutateAsync(selectedLanguage);
      toast.success('Export gestartet! Du wirst zur Detailseite weitergeleitet...');
      setTimeout(() => router.push(`/applications/${applicationId}`), 1500);
    } catch (err) {
      console.error('Export konnte nicht gestartet werden', err);
    }
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === 'ats' && isAtsLocked) return;
    setActiveTab(tab);
  };

  // Header bits
  const title =
    parsedResume?.targetJobTitle ||
    application.targetJobTitle ||
    application.jobPosting?.title ||
    application.title ||
    'Bewerbung';
  const createdAt = application.createdAt ? new Date(application.createdAt) : new Date();
  const isToday = new Date().toDateString() === createdAt.toDateString();
  const createdLabel = isToday
    ? 'heute'
    : 'am ' + new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(createdAt);
  const subtitle = [application.jobPosting?.company, application.jobPosting?.location, `erstellt ${createdLabel}`]
    .filter(Boolean)
    .join(' · ');
  const letterDate = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(createdAt);
  const letterLocation = [parsedResume?.city, parsedResume?.country].filter(Boolean).join(', ') || parsedResume?.fullAddress;

  // Auto-save status for the current document tab.
  const tabSaving = activeTab === 'resume' ? updateResume.isPending : upsertCoverLetter.isPending;
  const tabDirty = activeTab === 'resume' ? hasResumeChanges : hasCoverChanges;
  const saveStatus = tabSaving ? 'saving' : tabDirty ? 'dirty' : 'saved';

  const tabs: { id: Tab; label: string; icon: typeof FileText; locked?: boolean }[] = [
    { id: 'resume', label: 'Lebenslauf', icon: FileText },
    { id: 'cover-letter', label: 'Anschreiben', icon: Mail },
    { id: 'ats', label: 'Optimieren', icon: Target, locked: isAtsLocked },
  ];

  return (
    <TooltipProvider>
      <div className="sa-editor mx-auto max-w-6xl animate-in fade-in duration-300">
        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/applications/${applicationId}`)}
                className="h-8 w-8 shrink-0 rounded-none border-[#e0e0e0] bg-white text-[#1b2a49] hover:bg-[#f5f6f8]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zurück zur Übersicht</TooltipContent>
          </Tooltip>
          <span className="inline-flex items-center gap-1.5 bg-[#16a34a] px-3 py-1 font-['IBM_Plex_Mono'] text-[11px] font-semibold tracking-[0.06em] text-white uppercase">
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Fertig
          </span>
        </div>
        <h1 className="font-['Archivo'] text-[26px] font-extrabold tracking-[-0.025em] text-[#1b2a49]">{title}</h1>
        <p className="mt-1 text-sm text-[#6b6969]">{subtitle}</p>

        {/* Tab bar */}
        <div className="mt-5 mb-5 flex flex-wrap items-center justify-between gap-3 border border-[#e0e0e0] bg-white p-2">
          <div role="tablist" aria-label="Editor Tabs" className="flex items-center border border-[#e0e0e0] bg-[#e0e0e0]">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              if (t.locked) {
                return (
                  <Tooltip key={t.id}>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          id={`tab-${t.id}`}
                          type="button"
                          role="tab"
                          aria-disabled="true"
                          aria-selected="false"
                          tabIndex={-1}
                          disabled
                          className="inline-flex cursor-not-allowed items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#94a3b8]"
                        >
                          <Icon className="h-4 w-4" /> {t.label} <Lock className="h-3 w-3" />
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium">Upgrade jetzt zu Premium</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Upgrade jetzt zu Premium um dieses Feature zu benutzen.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`tabpanel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => handleTabChange(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? 'bg-[#1b2a49] text-white'
                      : 'bg-white text-[#6b6969] hover:bg-[#f5f6f8] hover:text-[#1b2a49]',
                  )}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'cover-letter' && hasCover && (
              <AiAssistantPopover
                open={aiPopoverOpen}
                onOpenChange={setAiPopoverOpen}
                instructions={instructions}
                onInstructionsChange={setInstructions}
                onApply={handleApplyAIChanges}
                isLoading={upsertCoverLetter.isPending}
                placeholder="Z.B.: Betone meine Projektmanagement-Erfahrung stärker..."
                title="AI-Anweisungen"
                description="Beschreibe, wie das Anschreiben angepasst werden soll."
              />
            )}
            <LanguageSelector value={selectedLanguage} />
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <SubmitButton
                    onClick={handleExport}
                    isLoading={exportApplication.isPending || application.status === 'GENERATING'}
                    loadingText="..."
                    disabled={!canExport}
                    size="sm"
                    className="h-8 rounded-none bg-[#1b2a49] px-3 text-xs text-white hover:bg-[#22345a]"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                  </SubmitButton>
                </span>
              </TooltipTrigger>
              <TooltipContent>{exportDisabledReason || 'PDFs exportieren'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Edit hint + auto-save status (document tabs only) */}
        {activeTab !== 'ats' && (
          <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 border-l-[3px] border-l-[#5581c7] bg-[#f5f6f8] px-4 py-2.5 text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-[#33425c]">
              <Pencil className="h-4 w-4 text-[#5581c7]" />
              {activeTab === 'resume'
                ? 'Klicke einen beliebigen Text an, um ihn zu bearbeiten.'
                : 'Klicke in das Anschreiben, um Text, Anrede oder Absätze zu bearbeiten.'}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 font-['IBM_Plex_Mono'] text-[11px] font-semibold tracking-[0.06em] uppercase",
                saveStatus === 'saving' && 'text-[#6b6969]',
                saveStatus === 'dirty' && 'text-[#92400e]',
                saveStatus === 'saved' && 'text-[#16a34a]',
              )}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Speichert…
                </>
              ) : saveStatus === 'dirty' ? (
                'Nicht gespeicherte Änderungen'
              ) : (
                <>
                  <span className="livedot" /> Änderungen automatisch gespeichert
                </>
              )}
            </span>
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'resume' && parsedResume && (
          <div id="tabpanel-resume" role="tabpanel" aria-labelledby="tab-resume" className="pb-10">
            <EditableResume
              value={parsedResume}
              onChange={setParsedResume}
              accent={accent}
              design={resumeDesign}
              onGenerateSummary={handleGenerateSummary}
              onGenerateExperience={handleGenerateExperience}
              onGenerateProject={handleGenerateProject}
            />
          </div>
        )}

        {activeTab === 'cover-letter' && (
          <div id="tabpanel-cover-letter" role="tabpanel" aria-labelledby="tab-cover-letter" className="pb-10">
            {hasCover ? (
              <EditableCoverLetter
                value={coverLetterValue}
                onChange={setCoverLetterValue}
                disabled={upsertCoverLetter.isPending}
                candidateName={parsedResume?.candidateName}
                email={parsedResume?.email}
                phone={parsedResume?.phone}
                location={letterLocation}
                date={letterDate}
              />
            ) : (
              <CoverLetterCTA onGenerate={generateCoverLetter} loading={genLoading} />
            )}
          </div>
        )}

        {activeTab === 'ats' && parsedResume && (
          <div id="tabpanel-ats" role="tabpanel" aria-labelledby="tab-ats" className="h-[calc(100vh-15rem)] min-h-[520px] pb-2">
            <AtsOptimizer
              applicationId={applicationId}
              resume={parsedResume}
              accent={accent}
              design={resumeDesign}
              onAddKeyword={handleAddKeyword}
              onExport={handleExport}
              exportDisabled={!canExport}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
