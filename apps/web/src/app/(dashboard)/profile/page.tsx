'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/auth-store';
import { getLanguageLevelLabel } from '@/lib/translations';
import {
  calculateProfileStrength,
  sortCriteriaByImpact,
  type ProfileCriterion,
  type ProfileCriterionKey,
} from '@/lib/profile-utils';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { ProfilePhotoAvatar } from '@/components/profile/profile-photo-avatar';
import { ProfileSkeleton } from '@/components/shared/skeletons';
import { ApploRig } from '@/components/ui/applo-rig';
import type { ApploState } from '@/components/ui/applo-rig';
import { sanitizeUrl, sanitizeHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Briefcase,
  Plus,
  Upload,
  X,
  Pencil,
  Languages,
  Code2,
  ChevronDown,
  Award,
  Loader2,
  FolderKanban,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Check,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/format-date';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useParseResume } from '@/hooks/use-parse-resume';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { ExperienceEditorDialog } from '@/components/profile/experience-editor-dialog';
import { EducationEditorDialog } from '@/components/profile/education-editor-dialog';
import { ProjectEditorDialog } from '@/components/profile/project-editor-dialog';
import { CertificateEditorDialog } from '@/components/profile/certificate-editor-dialog';
import { ContactEditorDialog, type ContactValues } from '@/components/profile/contact-editor-dialog';
import type {
  UpdateProfileDto,
  EducationDto,
  Experience,
  Education,
  Project,
  Certificate,
  Profile,
} from '@/types';
import { useTranslations } from 'next-intl';

function InlineSkillInput({
  existingSkills,
  onAdd,
}: {
  existingSkills: string[];
  onAdd: (name: string) => void;
}) {
  const t = useTranslations('profile');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(
    () => new Set(existingSkills.map((s) => s.toLowerCase())),
    [existingSkills],
  );

  const skillSuggestions = t.raw('page.skillSuggestions') as string[];
  const suggestions =
    value.trim().length > 0
      ? skillSuggestions.filter(
          (s) =>
            s.toLowerCase().includes(value.toLowerCase()) && !existing.has(s.toLowerCase()),
        ).slice(0, 6)
      : skillSuggestions.filter((s) => !existing.has(s.toLowerCase())).slice(0, 6);

  const submit = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (existing.has(trimmed.toLowerCase())) {
        toast.error(t('page.inline.duplicateSkill'));
        return;
      }
      onAdd(trimmed);
      setValue('');
      setHighlightIdx(-1);
      inputRef.current?.focus();
    },
    [existing, onAdd, t],
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setValue('');
        setHighlightIdx(-1);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('page.add.skill')}
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative mt-4">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlightIdx(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
                submit(suggestions[highlightIdx]);
              } else if (value.trim()) {
                submit(value);
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIdx((prev) => Math.max(prev - 1, -1));
            } else if (e.key === 'Escape') {
              setOpen(false);
              setValue('');
              setHighlightIdx(-1);
            }
          }}
          placeholder={t('page.inline.skillPlaceholder')}
          className="h-9 text-sm"
        />
        <Button
          size="sm"
          disabled={!value.trim()}
          onClick={() => submit(value)}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('actions.add')}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[4px] border border-border bg-card p-1 shadow-md">
          <p className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">
            {t('page.inline.suggestions')}
          </p>
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(s);
              }}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`flex w-full items-center rounded-[3px] px-2 py-1.5 text-left text-sm transition-colors ${
                i === highlightIdx
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LANGUAGE_LEVELS = [
  'NATIVE',
  'FLUENT',
  'ADVANCED',
  'INTERMEDIATE',
  'BASIC',
] as const;

function InlineLanguageInput({
  existingLanguages,
  onAdd,
}: {
  existingLanguages: string[];
  onAdd: (name: string, level: string) => void;
}) {
  const t = useTranslations('profile');
  const [step, setStep] = useState<'closed' | 'name' | 'level'>('closed');
  const [name, setName] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(
    () => new Set(existingLanguages.map((s) => s.toLowerCase())),
    [existingLanguages],
  );

  const languageSuggestions = t.raw('page.languageSuggestions') as string[];
  const suggestions =
    name.trim().length > 0
      ? languageSuggestions.filter(
          (s) =>
            s.toLowerCase().includes(name.toLowerCase()) && !existing.has(s.toLowerCase()),
        ).slice(0, 6)
      : languageSuggestions.filter((s) => !existing.has(s.toLowerCase())).slice(0, 6);

  const selectLanguage = useCallback(
    (langName: string) => {
      const trimmed = langName.trim();
      if (!trimmed) return;
      if (existing.has(trimmed.toLowerCase())) {
        toast.error(t('page.inline.duplicateLanguage'));
        return;
      }
      setName(trimmed);
      setStep('level');
      setHighlightIdx(-1);
    },
    [existing, t],
  );

  const addWithLevel = useCallback(
    (level: string) => {
      if (!name.trim()) return;
      onAdd(name.trim(), level);
      setName('');
      setStep('closed');
      setHighlightIdx(-1);
    },
    [name, onAdd],
  );

  const reset = useCallback(() => {
    setStep('closed');
    setName('');
    setHighlightIdx(-1);
  }, []);

  useEffect(() => {
    if (step === 'name') inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        reset();
      }
    }
    if (step !== 'closed') document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [step, reset]);

  if (step === 'closed') {
    return (
      <button
        onClick={() => setStep('name')}
        className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('page.add.language')}
      </button>
    );
  }

  if (step === 'level') {
    return (
      <div ref={containerRef} className="mt-4 space-y-3">
        <p className="text-sm text-foreground">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground">{t('page.inline.askLanguageLevel')}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => addWithLevel(level)}
              className="rounded-[3px] border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              {getLanguageLevelLabel(level)}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setStep('name'); setName(''); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← {t('actions.back')}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative mt-4">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setHighlightIdx(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
              selectLanguage(suggestions[highlightIdx]);
            } else if (name.trim()) {
              selectLanguage(name);
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((prev) => Math.max(prev - 1, -1));
          } else if (e.key === 'Escape') {
            reset();
          }
        }}
        placeholder={t('page.inline.languagePlaceholder')}
        className="h-9 text-sm"
      />

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[4px] border border-border bg-card p-1 shadow-md">
          <p className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">
            {t('page.inline.suggestions')}
          </p>
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                selectLanguage(s);
              }}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`flex w-full items-center rounded-[3px] px-2 py-1.5 text-left text-sm transition-colors ${
                i === highlightIdx
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageRow({
  lang,
  onRemove,
  onUpdateLevel,
}: {
  lang: { name: string; level?: string };
  onRemove: () => void;
  onUpdateLevel: (level: string) => void;
}) {
  const t = useTranslations('profile');
  const [picking, setPicking] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPicking(false);
      }
    }
    if (picking) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [picking]);

  const label = getLanguageLevelLabel(lang.level);

  if (picking) {
    return (
      <div ref={rowRef} className="space-y-2 rounded-[3px] bg-muted/40 p-2.5">
        <p className="text-sm font-medium text-foreground">{lang.name}</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => {
                onUpdateLevel(level);
                setPicking(false);
              }}
              className={`rounded-[3px] border px-2.5 py-1 text-xs font-medium transition-colors ${
                lang.level === level
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {getLanguageLevelLabel(level)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group/lang flex items-center justify-between text-sm">
      <span className="font-medium text-foreground">{lang.name}</span>
      <div className="flex items-center gap-2">
        {label ? (
          <button
            onClick={() => setPicking(true)}
            aria-label={t('page.a11y.changeLanguageLevel', { name: lang.name })}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </button>
        ) : (
          <button
            onClick={() => setPicking(true)}
            aria-label={t('page.a11y.changeLanguageLevel', { name: lang.name })}
            className="text-xs italic text-primary/60 transition-colors hover:text-primary"
          >
            {t('page.inline.chooseLevel')}
          </button>
        )}
        <button
          onClick={onRemove}
          aria-label={t('page.a11y.removeLanguage', { name: lang.name })}
          className="rounded-[3px] p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/lang:opacity-100 focus-visible:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function CompanyMark({ name }: { name: string }) {
  const initials = name
    .split(/[\s]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-primary text-xs font-bold text-primary-foreground">
      {initials}
    </div>
  );
}

/** Profile-strength ring — Applo-blue until complete, then green. */
function StrengthRing({ pct, labelledBy }: { pct: number; labelledBy: string }) {
  const done = pct >= 100;
  const color = done ? 'var(--success)' : 'var(--brand)';
  return (
    <div
      role="progressbar"
      aria-labelledby={labelledBy}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="grid h-[84px] w-[84px] place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, var(--muted) 0deg)` }}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-card">
        <span className="font-mono text-xl font-bold tabular-nums" style={{ color }}>
          {pct}
          <small className="ml-0.5 text-xs font-semibold">%</small>
        </span>
      </div>
    </div>
  );
}

/** Collapsible profile section card with an optional Applo "Was bringt das?" trigger. */
function CollapsibleCard({
  cardRef,
  icon: Icon,
  title,
  meta,
  active = false,
  open,
  onToggle,
  collapsible = true,
  onAsk,
  action,
  children,
}: {
  cardRef?: (el: HTMLDivElement | null) => void;
  icon: typeof Briefcase;
  title: string;
  meta?: string;
  active?: boolean;
  open: boolean;
  onToggle: () => void;
  collapsible?: boolean;
  onAsk?: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations('profile');
  return (
    <div
      ref={cardRef}
      className={cn(
        'scroll-mt-24 rounded-[4px] border bg-card transition-colors duration-200',
        active ? 'tour-active border-brand' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2.5 px-6 py-5">
        <button
          type="button"
          onClick={collapsible ? onToggle : undefined}
          aria-expanded={collapsible ? open : undefined}
          className={cn('flex min-w-0 flex-1 items-center gap-2 text-left', !collapsible && 'cursor-default')}
        >
          {collapsible && (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                open ? '' : '-rotate-90',
              )}
            />
          )}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{title}</h2>
          {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
        </button>
        {onAsk && (
          <button
            type="button"
            onClick={onAsk}
            title={t('page.askTitle')}
            aria-label={t('page.a11y.explainSection', { section: title })}
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-[3px] border transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        )}
        {action}
      </div>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

interface Criterion extends ProfileCriterion {
  /** Section the criterion is edited in — target of the row's jump-to click. */
  sectionId: string;
  label: string;
  hint: string;
}

/** Exhaustive by construction: a new criterion key won't compile until mapped. */
const CRITERION_SECTION: Record<ProfileCriterionKey, string> = {
  contact: 'identity',
  phone: 'identity',
  address: 'identity',
  about: 'about',
  skills: 'skills',
  experience: 'experience',
  education: 'education',
  linkedin: 'identity',
};

/**
 * Normalize an education year to a 4-digit number. The API serializes the year
 * as a full ISO date string, while the inline editor produces a plain year, so
 * accept both shapes here.
 */
function eduYear(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const asDate = new Date(value as string);
  if (!Number.isNaN(asDate.getTime())) return asDate.getFullYear();
  const asNumber = parseInt(String(value), 10);
  return Number.isNaN(asNumber) ? undefined : asNumber;
}

/** Map the education read model (mixed year shapes) to the write DTO (YYYY-01-01). */
function educationToDto(list: Education[]): EducationDto[] {
  return list.map((e) => {
    const sy = eduYear(e.startYear);
    const ey = eduYear(e.endYear);
    return {
      ...(e.id && { id: e.id }),
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy,
      startYear: sy ? `${sy}-01-01` : undefined,
      endYear: ey ? `${ey}-01-01` : undefined,
      gpa: e.gpa,
      description: e.description,
    };
  });
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((state) => state.user);
  const [cvDialogOpen, setCvDialogOpen] = useState(false);
  const parseResume = useParseResume();

  // ── Inline editing state (replaces the former /profile/edit route) ──────
  const [contactOpen, setContactOpen] = useState(false);
  const [aboutEditing, setAboutEditing] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  type EditorState = { open: boolean; index: number | null };
  const closedEditor: EditorState = { open: false, index: null };
  const [expEditor, setExpEditor] = useState<EditorState>(closedEditor);
  const [eduEditor, setEduEditor] = useState<EditorState>(closedEditor);
  const [projEditor, setProjEditor] = useState<EditorState>(closedEditor);
  const [certEditor, setCertEditor] = useState<EditorState>(closedEditor);

  // ── Applo coach state ──────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  // Section ids the user has collapsed; all except "about" start collapsed.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(['experience', 'skills', 'education', 'projects', 'certificates', 'languages']),
  );
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const cvUploading = parseResume.isPending || updateProfile.isPending;

  // Latest profile snapshot for callbacks that run after a mutation settled
  // (e.g. the "Undo" action of a delete toast).
  const profileRef = useRef<Profile | undefined>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const [scrolled, setScrolled] = useState(false);
  // The dashboard layout's <main> grows to fit its content (the md:h-screen is
  // overridden by the surrounding flex column), so the window is what actually
  // scrolls — not <main>. Watch window scroll position directly.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCvUpload = useCallback(
    async (file: File) => {
      try {
        const data = await parseResume.mutateAsync(file);
        const updateData: UpdateProfileDto = {};

        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;
        if (data.phone) updateData.phone = data.phone;
        if (data.street) updateData.street = data.street;
        if (data.postalCode) updateData.postalCode = data.postalCode;
        if (data.city) updateData.city = data.city;
        if (data.country) updateData.country = data.country;
        if (data.linkedinUrl) updateData.linkedinUrl = data.linkedinUrl;
        if (data.githubUrl) updateData.githubUrl = data.githubUrl;
        if (data.portfolioUrl) updateData.portfolioUrl = data.portfolioUrl;
        if (data.summary) updateData.summary = data.summary;
        if (data.skills && data.skills.length > 0) {
          updateData.skills = data.skills.map((s) => ({ name: s.name, level: s.level }));
        }
        if (data.experiences && data.experiences.length > 0) {
          updateData.experiences = data.experiences;
        }
        if (data.education && data.education.length > 0) {
          updateData.education = data.education;
        }
        if (data.certificates && data.certificates.length > 0) {
          updateData.certificates = data.certificates;
        }
        if (data.projects && data.projects.length > 0) {
          updateData.projects = data.projects;
        }
        if (data.languages && data.languages.length > 0) {
          updateData.languages = data.languages;
        }

        await updateProfile.mutateAsync(updateData);
        toast.success(t('page.cvUpload.success'));
        setCvDialogOpen(false);
        parseResume.reset();
      } catch {
        toast.error(t('page.cvUpload.error'));
      }
    },
    [parseResume, updateProfile, t],
  );

  const handleAddSkill = useCallback(
    (name: string) => {
      const currentSkills = profile?.skills ?? [];
      const updatedSkills = [...currentSkills, { name }].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      updateProfile.mutate({ skills: updatedSkills });
    },
    [profile?.skills, updateProfile],
  );

  /**
   * Deleting a profile entry is reversible: the removed item is kept in the
   * toast's closure, so "Undo" restores it at its original position without a
   * round trip to fetch it back. The restored entry is created fresh (its old
   * row is already gone server-side), so its `id` is dropped.
   */
  const removeWithUndo = useCallback(
    <T extends { id?: string }>(
      index: number,
      message: string,
      select: (p: Profile | undefined) => T[] | undefined,
      persist: (list: T[]) => void,
    ) => {
      const list = select(profileRef.current) ?? [];
      const removed = list[index];
      if (!removed) return;
      persist(list.filter((_, i) => i !== index));
      toast.success(message, {
        duration: 10000,
        action: {
          label: t('page.removed.undo'),
          onClick: () => {
            // Defensive: if the optimistic cache still holds the deleted row
            // (mutation not yet applied), drop it so undo can't duplicate it.
            const current = (select(profileRef.current) ?? []).filter(
              (item) => item !== removed && (!removed.id || item.id !== removed.id),
            );
            const { id: _id, ...rest } = removed;
            current.splice(Math.min(index, current.length), 0, rest as T);
            persist(current);
          },
        },
      });
    },
    [t],
  );

  const handleRemoveSkill = useCallback(
    (name: string) => {
      const list = profileRef.current?.skills ?? [];
      const index = list.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
      if (index === -1) return;
      removeWithUndo(
        index,
        t('page.removed.skill', { name: list[index].name }),
        (p) => p?.skills,
        (skills) => updateProfile.mutate({ skills }),
      );
    },
    [removeWithUndo, t, updateProfile],
  );

  const handleRemoveExperience = useCallback(
    (index: number) => {
      removeWithUndo(
        index,
        t('page.removed.experience', {
          name: profileRef.current?.experiences?.[index]?.title ?? '',
        }),
        (p) => p?.experiences,
        (experiences) => updateProfile.mutate({ experiences }),
      );
    },
    [removeWithUndo, t, updateProfile],
  );

  const handleRemoveProject = useCallback(
    (index: number) => {
      removeWithUndo(
        index,
        t('page.removed.project', { name: profileRef.current?.projects?.[index]?.name ?? '' }),
        (p) => p?.projects,
        (projects) => updateProfile.mutate({ projects }),
      );
    },
    [removeWithUndo, t, updateProfile],
  );

  const handleRemoveCertificate = useCallback(
    (index: number) => {
      removeWithUndo(
        index,
        t('page.removed.certificate', {
          name: profileRef.current?.certificates?.[index]?.name ?? '',
        }),
        (p) => p?.certificates,
        (certificates) => updateProfile.mutate({ certificates }),
      );
    },
    [removeWithUndo, t, updateProfile],
  );

  const handleRemoveEducation = useCallback(
    (index: number) => {
      removeWithUndo(
        index,
        t('page.removed.education', { name: profileRef.current?.education?.[index]?.degree ?? '' }),
        (p) => p?.education,
        (education) => updateProfile.mutate({ education: educationToDto(education) }),
      );
    },
    [removeWithUndo, t, updateProfile],
  );

  const handleRemoveLanguage = useCallback(
    (index: number) => {
      removeWithUndo(
        index,
        t('page.removed.language', { name: profileRef.current?.languages?.[index]?.name ?? '' }),
        (p) => p?.languages,
        (languages) => updateProfile.mutate({ languages }),
      );
    },
    [removeWithUndo, t, updateProfile],
  );

  const handleAddLanguage = useCallback(
    (name: string, level: string) => {
      const currentLanguages = profile?.languages ?? [];
      const updatedLanguages = [...currentLanguages, { name, level }];
      updateProfile.mutate({ languages: updatedLanguages });
    },
    [profile?.languages, updateProfile],
  );

  // ── Inline add/edit handlers — each persists its section immediately ─────
  const handleSaveExperience = useCallback(
    (exp: Experience) => {
      const list = [...(profile?.experiences ?? [])];
      if (expEditor.index !== null) list[expEditor.index] = exp;
      else list.push(exp);
      updateProfile.mutate({ experiences: list });
    },
    [profile?.experiences, expEditor.index, updateProfile],
  );

  const handleSaveEducation = useCallback(
    (edu: Education) => {
      const list = [...(profile?.education ?? [])];
      if (eduEditor.index !== null) list[eduEditor.index] = edu;
      else list.push(edu);
      updateProfile.mutate({ education: educationToDto(list) });
    },
    [profile?.education, eduEditor.index, updateProfile],
  );

  const handleSaveProject = useCallback(
    (proj: Project) => {
      const list = [...(profile?.projects ?? [])];
      if (projEditor.index !== null) list[projEditor.index] = proj;
      else list.push(proj);
      updateProfile.mutate({ projects: list });
    },
    [profile?.projects, projEditor.index, updateProfile],
  );

  const handleSaveCertificate = useCallback(
    (cert: Certificate) => {
      const list = [...(profile?.certificates ?? [])];
      if (certEditor.index !== null) list[certEditor.index] = cert;
      else list.push(cert);
      updateProfile.mutate({ certificates: list });
    },
    [profile?.certificates, certEditor.index, updateProfile],
  );

  const handleSaveContact = useCallback(
    async (values: ContactValues) => {
      try {
        await updateProfile.mutateAsync({
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          street: values.street?.trim() || undefined,
          postalCode: values.postalCode?.trim() || undefined,
          city: values.city?.trim() || undefined,
          country: values.country?.trim() || undefined,
          linkedinUrl: values.linkedinUrl?.trim() || undefined,
          githubUrl: values.githubUrl?.trim() || undefined,
          portfolioUrl: values.portfolioUrl?.trim() || undefined,
        });
        setContactOpen(false);
      } catch {
        // Errors surface through the mutation's toast; keep the dialog open.
      }
    },
    [updateProfile],
  );

  const startAboutEdit = useCallback(() => {
    setAboutDraft(profile?.summary ?? '');
    setAboutEditing(true);
  }, [profile?.summary]);

  const handleSaveAbout = useCallback(() => {
    updateProfile.mutate({ summary: aboutDraft.trim() || undefined });
    setAboutEditing(false);
  }, [aboutDraft, updateProfile]);

  // ── Profile check — score and rows both come from calculateProfileStrength,
  // so the checklist can never disagree with the percentage it explains. ──
  const { profileStrength, criteria } = useMemo(() => {
    const { score, criteria: source } = calculateProfileStrength(profile, user);
    return {
      profileStrength: score,
      criteria: sortCriteriaByImpact(source).map<Criterion>((c) => ({
        ...c,
        sectionId: CRITERION_SECTION[c.key],
        label: t(`page.criteria.${c.key}`),
        hint: t(`page.hints.${c.key}`),
      })),
    };
  }, [profile, user, t]);

  const openItems = criteria.filter((c) => !c.completed);
  const nextOpen = openItems[0] ?? null;
  const isComplete = profileStrength >= 100;

  // ── Applo tour script (main-column sections) ───────────────────────────
  const tour = useMemo(
    () => [
      { id: 'identity', msg: t.rich('page.tour.identity', { bold: (chunks) => <b>{chunks}</b> }) },
      { id: 'about', msg: t.rich('page.tour.about', { bold: (chunks) => <b>{chunks}</b> }) },
      { id: 'experience', msg: t.rich('page.tour.experience', { bold: (chunks) => <b>{chunks}</b> }) },
      { id: 'skills', msg: t.rich('page.tour.skills', { bold: (chunks) => <b>{chunks}</b> }) },
      { id: 'education', msg: t.rich('page.tour.education', { bold: (chunks) => <b>{chunks}</b> }) },
      { id: 'projects', msg: t.rich('page.tour.projects', { bold: (chunks) => <b>{chunks}</b> }) },
      { id: 'certificates', msg: t.rich('page.tour.certificates', { bold: (chunks) => <b>{chunks}</b> }) },
    ],
    [t],
  );

  const firstName = user?.firstName || user?.email?.split('@')[0] || t('page.defaultName');

  const sectionMsg: Record<string, ReactNode> = {
    identity: t.rich(profile?.phone ? 'page.coach.identityComplete' : 'page.coach.identityMissing', { bold: (chunks) => <b>{chunks}</b> }),
    about: t.rich('page.coach.about', { bold: (chunks) => <b>{chunks}</b> }),
    experience: t.rich('page.coach.experience', { bold: (chunks) => <b>{chunks}</b> }),
    skills: t.rich('page.coach.skills', { bold: (chunks) => <b>{chunks}</b> }),
    education: t.rich('page.coach.education', { bold: (chunks) => <b>{chunks}</b> }),
  };

  let message: ReactNode;
  if (tourStep !== null) {
    message = tour[tourStep].msg;
  } else if (isComplete) {
    message = t.rich('page.coach.complete', { name: firstName, bold: (chunks) => <b>{chunks}</b> });
  } else if (activeSection && sectionMsg[activeSection]) {
    message = sectionMsg[activeSection];
  } else {
    message = t.rich('page.coach.intro', { bold: (chunks) => <b>{chunks}</b> });
  }

  // ── Applo pose — derived from coach state, with two one-shot timers ──────
  // The timers mutate state only inside setTimeout (never synchronously in an
  // effect body) so we stay clear of react-hooks/set-state-in-effect.
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isComplete) return;
    const t = setTimeout(() => setCelebrated(true), 1400);
    return () => clearTimeout(t);
  }, [isComplete]);

  const pose: ApploState = !introDone
    ? 'wave'
    : isComplete
      ? celebrated
        ? 'done'
        : 'success'
      : tourStep !== null || activeSection
        ? 'think'
        : 'idle';

  // ── Navigation / hand-holding ──────────────────────────────────────────
  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };
  const scrollToSection = useCallback((id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const isOpen = (id: string) => !collapsed.has(id);
  const toggleSection = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const openSection = useCallback((id: string) => {
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  const focusSection = useCallback(
    (id: string) => {
      openSection(id);
      setActiveSection(id);
      scrollToSection(id);
    },
    [openSection, scrollToSection],
  );
  const goToNext = () => { if (nextOpen) focusSection(nextOpen.sectionId); };
  const startTour = () => { setTourStep(0); openSection(tour[0].id); setActiveSection(tour[0].id); scrollToSection(tour[0].id); };
  const tourNext = () => {
    if (tourStep === null) return;
    if (tourStep >= tour.length - 1) {
      setTourStep(null);
      setActiveSection(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const n = tourStep + 1;
    setTourStep(n);
    openSection(tour[n].id);
    setActiveSection(tour[n].id);
    scrollToSection(tour[n].id);
  };
  const endTour = () => { setTourStep(null); setActiveSection(null); };

  if (isLoading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className="rounded-[4px] border border-[#F3C9C9] bg-[#FDEEEE] p-6 text-center text-destructive dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
        {t('page.error')}
      </div>
    );
  }

  const initials =
    `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`
      .toUpperCase()
      .trim() || (user?.email?.charAt(0).toUpperCase() ?? '?');

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  const location = [profile?.city, profile?.country].filter(Boolean).join(', ');
  const currentPosition = profile?.experiences?.[0]?.title;

  const linkedinDisplay = profile?.linkedinUrl
    ?.replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '');

  const contactDefaults: ContactValues = {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: profile?.phone ?? '',
    street: profile?.street ?? '',
    postalCode: profile?.postalCode ?? '',
    city: profile?.city ?? '',
    country: profile?.country ?? '',
    linkedinUrl: profile?.linkedinUrl ?? '',
    githubUrl: profile?.githubUrl ?? '',
    portfolioUrl: profile?.portfolioUrl ?? '',
  };

  // Seed the education editor with normalized numeric years so the year inputs
  // don't show raw ISO strings coming from the API.
  const eduInitial =
    eduEditor.index !== null && profile?.education?.[eduEditor.index]
      ? {
          ...profile.education[eduEditor.index],
          startYear: eduYear(profile.education[eduEditor.index].startYear),
          endYear: eduYear(profile.education[eduEditor.index].endYear) ?? null,
        }
      : null;
  const expInitial =
    expEditor.index !== null ? (profile?.experiences?.[expEditor.index] ?? null) : null;
  const projInitial =
    projEditor.index !== null ? (profile?.projects?.[projEditor.index] ?? null) : null;
  const certInitial =
    certEditor.index !== null ? (profile?.certificates?.[certEditor.index] ?? null) : null;

  const sectionCard = (id: string) =>
    cn(
      'scroll-mt-24 rounded-[4px] border bg-card p-6 transition-colors duration-200',
      activeSection === id ? 'tour-active border-brand' : 'border-border',
    );

  return (
    <div className="space-y-5 pb-10">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <nav aria-label={t('page.a11y.breadcrumb')} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Applo
          </Link>
          <span>→</span>
          <span className="font-medium text-foreground">{t('page.breadcrumb')}</span>
        </nav>
        <Button
          variant="outline"
          size="sm"
          className="group gap-1.5 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => setCvDialogOpen(true)}
        >
          <Upload className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          {t('page.uploadCv')}
        </Button>
      </div>

      {/* ── Applo coach ── */}
      {tourStep !== null && <div className="h-[188px] sm:h-[196px]" />}
      <div
        className={cn(
          'relative overflow-hidden rounded-[4px] border bg-card p-4 sm:p-5',
          isComplete ? 'border-[#BFE9CC] dark:border-green-400/30' : 'border-border',
          tourStep !== null && 'fixed left-4 right-4 top-4 z-30 shadow-xl md:left-[336px]',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isComplete
              ? 'radial-gradient(420px 150px at 8% 0%, rgba(22,163,74,0.08), transparent 70%)'
              : 'radial-gradient(420px 150px at 8% 0%, rgba(85,129,199,0.08), transparent 70%)',
          }}
        />
        <div className="relative grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-5 lg:grid-cols-[auto_1fr_auto]">
          <div
            className="grid h-[140px] w-[120px] place-items-center rounded-[4px]"
            style={{ background: 'radial-gradient(58% 52% at 50% 45%, rgba(85,129,199,0.12), transparent 72%)' }}
          >
            <ApploRig key={pose} state={pose} size={120} />
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-brand">
              <span className="h-1.5 w-1.5 bg-brand" />
              {t('page.coachLabel')}
            </div>
            <p key={`${tourStep}-${activeSection}-${isComplete}`} className="mb-3.5 max-w-[60ch] text-[15px] leading-relaxed text-foreground">
              {message}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {tourStep !== null ? (
                <>
                  <Button size="sm" className="gap-1.5" onClick={tourNext}>
                    {tourStep >= tour.length - 1 ? t('page.endTour') : t('page.next')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={endTour}>
                    {t('page.skip')}
                  </Button>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {tourStep + 1} / {tour.length}
                  </span>
                </>
              ) : isComplete ? (
                <Button size="sm" className="gap-1.5" onClick={startTour}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('page.completeTour')}
                </Button>
              ) : (
                <>
                  {nextOpen && (
                    <Button size="sm" className="gap-1.5" onClick={goToNext}>
                      {t('page.nextOpen', { label: nextOpen.label })}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1.5 text-primary hover:text-primary" onClick={startTour}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('page.guidedTour')}
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="hidden flex-col items-center gap-2 self-center border-l border-border pl-5 lg:flex">
            <StrengthRing pct={profileStrength} labelledBy="profile-strength-label" />
            <span id="profile-strength-label" className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{t('page.profileStrength')}</span>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* ════════ Left column (2/3) ════════ */}
        <div className="space-y-5 lg:col-span-2">
          {/* Identity */}
          <div ref={setRef('identity')} className={sectionCard('identity')}>
            <div className="mb-6 flex items-start gap-4">
              <ProfilePhotoAvatar initials={initials} hasPhoto={Boolean(profile?.hasPhoto)} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-xl font-bold text-foreground">{fullName}</h1>
                  <button
                    onClick={() => setContactOpen(true)}
                    aria-label={t('page.a11y.editContact')}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <StatusChip tone="success" className="mt-1.5">
                  {t('page.openForRoles')}
                </StatusChip>
                {location && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              {currentPosition && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex w-40 shrink-0 items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{t('page.currentPosition')}</span>
                  </div>
                  <span className="font-medium text-foreground">{currentPosition}</span>
                </div>
              )}
              {user?.email && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex w-40 shrink-0 items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{t('labels.email')}</span>
                  </div>
                  <span className="flex-1 font-medium text-foreground">{user.email}</span>
                  <Check className="h-4 w-4 text-success" />
                </div>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex w-40 shrink-0 items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{t('labels.phone')}</span>
                </div>
                {profile?.phone ? (
                  <>
                    <span className="flex-1 font-medium text-foreground">{profile.phone}</span>
                    <Check className="h-4 w-4 text-success" />
                  </>
                ) : (
                  <>
                    <span className="flex-1" />
                    <button
                      onClick={() => setContactOpen(true)}
                      aria-label={t('page.a11y.addPhone')}
                      className="border border-[#F3E3B3] bg-[#FDF6E7] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-[#A16207] transition-colors hover:bg-[#FBEECB] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                    >
                      {t('page.missing')}
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex w-40 shrink-0 items-center gap-2 text-muted-foreground">
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn</span>
                </div>
                {profile?.linkedinUrl ? (
                  <>
                    {sanitizeUrl(profile.linkedinUrl) ? (
                      <a
                        href={sanitizeUrl(profile.linkedinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {linkedinDisplay}
                      </a>
                    ) : (
                      <span className="flex-1 font-medium text-foreground">{linkedinDisplay}</span>
                    )}
                    <Check className="h-4 w-4 text-success" />
                  </>
                ) : (
                  <>
                    <span className="flex-1" />
                    <button
                      onClick={() => setContactOpen(true)}
                      aria-label={t('page.a11y.addLinkedin')}
                      className="border border-[#F3E3B3] bg-[#FDF6E7] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-[#A16207] transition-colors hover:bg-[#FBEECB] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                    >
                      {t('page.missing')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Über mich */}
          <CollapsibleCard
            cardRef={setRef('about')}
            icon={Sparkles}
            title={t('page.sections.about')}
            meta={profile?.summary ? t('units.characters', { count: profile.summary.length }) : undefined}
            active={activeSection === 'about'}
            open={true}
            onToggle={() => {}}
            collapsible={false}
            onAsk={() => setActiveSection('about')}
            action={
              !aboutEditing && (
                <button
                  onClick={startAboutEdit}
                  aria-label={t('page.a11y.editAbout')}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )
            }
          >
            {aboutEditing ? (
              <div className="space-y-3">
                <Textarea
                  autoFocus
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  placeholder={t('edit.basic.summaryPlaceholder')}
                  className="min-h-[140px] resize-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{t('edit.basic.summaryDescription')}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setAboutEditing(false)}>
                      {t('actions.cancel')}
                    </Button>
                    <Button size="sm" onClick={handleSaveAbout}>
                      {t('actions.save')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : profile?.summary ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
            ) : (
              <button
                onClick={startAboutEdit}
                className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('page.empty.about')}
              </button>
            )}
          </CollapsibleCard>

          {/* Berufserfahrung */}
          <CollapsibleCard
            cardRef={setRef('experience')}
            icon={Briefcase}
            title={t('page.sections.experience')}
            meta={(profile?.experiences?.length ?? 0) > 0 ? t('units.stations', { count: profile!.experiences!.length }) : undefined}
            active={activeSection === 'experience'}
            open={isOpen('experience')}
            onToggle={() => toggleSection('experience')}
            onAsk={() => setActiveSection('experience')}
          >
            {(profile?.experiences?.length ?? 0) > 0 ? (
              <div className="space-y-6">
                {profile!.experiences!.map((exp, i) => (
                  <div key={i} className="group/exp flex gap-4">
                    <CompanyMark name={exp.company} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                          <p className="text-sm text-muted-foreground">{exp.company}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {formatDate(exp.startDate, 'MMM yyyy')}
                          </span>
                          <button
                            onClick={() => setExpEditor({ open: true, index: i })}
                            aria-label={t('page.a11y.editExperience', { name: exp.title })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/exp:opacity-100 focus-visible:opacity-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveExperience(i)}
                            aria-label={t('page.a11y.removeExperience', { name: exp.title })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/exp:opacity-100 focus-visible:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {exp.description && (
                        <div
                          className="prose prose-sm mt-2 max-w-none text-sm leading-relaxed text-muted-foreground line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('page.empty.experience')}
              </p>
            )}

            <button
              onClick={() => setExpEditor({ open: true, index: null })}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('page.add.experience')}
            </button>
          </CollapsibleCard>

          {/* Fähigkeiten */}
          <CollapsibleCard
            cardRef={setRef('skills')}
            icon={Code2}
            title={t('page.sections.skills')}
            meta={(profile?.skills?.length ?? 0) > 0 ? t('units.skills', { count: profile!.skills!.length }) : undefined}
            active={activeSection === 'skills'}
            open={isOpen('skills')}
            onToggle={() => toggleSection('skills')}
            onAsk={() => setActiveSection('skills')}
          >

            {(profile?.skills?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile!.skills!.map((skill, i) => (
                  <span
                    key={i}
                    className="group relative inline-flex items-center rounded-[3px] border border-primary bg-primary/10 py-1.5 pl-3 pr-7 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {skill.name}
                    <button
                      onClick={() => handleRemoveSkill(skill.name)}
                      aria-label={t('page.a11y.removeSkill', { name: skill.name })}
                      className="absolute right-1.5 shrink-0 rounded-[2px] p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('page.empty.skills')}
              </p>
            )}

            <InlineSkillInput
              existingSkills={(profile?.skills ?? []).map((s) => s.name)}
              onAdd={handleAddSkill}
            />
          </CollapsibleCard>

          {/* Ausbildung */}
          <CollapsibleCard
            cardRef={setRef('education')}
            icon={GraduationCap}
            title={t('page.sections.education')}
            meta={(profile?.education?.length ?? 0) > 0 ? t('units.degrees', { count: profile!.education!.length }) : undefined}
            active={activeSection === 'education'}
            open={isOpen('education')}
            onToggle={() => toggleSection('education')}
            onAsk={() => setActiveSection('education')}
          >

            {(profile?.education?.length ?? 0) > 0 ? (
              <div className="space-y-5">
                {profile!.education!.map((edu, i) => (
                  <div key={i} className="group/edu flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{edu.degree}</p>
                          <p className="text-sm text-muted-foreground">{edu.institution}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {(edu.startYear || edu.endYear) && (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {[eduYear(edu.startYear), eduYear(edu.endYear) ?? t('labels.emptyCurrent')]
                                .filter(Boolean)
                                .join(' – ')}
                            </span>
                          )}
                          <button
                            onClick={() => setEduEditor({ open: true, index: i })}
                            aria-label={t('page.a11y.editEducation', { name: edu.degree })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/edu:opacity-100 focus-visible:opacity-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveEducation(i)}
                            aria-label={t('page.a11y.removeEducation', { name: edu.degree })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/edu:opacity-100 focus-visible:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {(edu.fieldOfStudy || edu.description) && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {[edu.fieldOfStudy, edu.description].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('page.empty.education')}
              </p>
            )}

            <button
              onClick={() => setEduEditor({ open: true, index: null })}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('page.add.education')}
            </button>
          </CollapsibleCard>

          {/* Projekte */}
          <CollapsibleCard
            cardRef={setRef('projects')}
            icon={FolderKanban}
            title={t('page.sections.projects')}
            meta={(profile?.projects?.length ?? 0) > 0 ? t('units.projects', { count: profile!.projects!.length }) : undefined}
            active={activeSection === 'projects'}
            onAsk={() => setActiveSection('projects')}
            open={isOpen('projects')}
            onToggle={() => toggleSection('projects')}
          >

            {(profile?.projects?.length ?? 0) > 0 ? (
              <div className="space-y-5">
                {profile!.projects!.map((proj, i) => (
                  <div key={i} className="group/proj flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-primary text-xs font-bold text-primary-foreground">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{proj.name}</p>
                            {proj.url && sanitizeUrl(proj.url) && (
                              <a
                                href={sanitizeUrl(proj.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('page.a11y.openProject', { name: proj.name })}
                                className="text-muted-foreground transition-colors hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {proj.description && (
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                              {proj.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setProjEditor({ open: true, index: i })}
                            aria-label={t('page.a11y.editProject', { name: proj.name })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/proj:opacity-100 focus-visible:opacity-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveProject(i)}
                            aria-label={t('page.a11y.removeProject', { name: proj.name })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/proj:opacity-100 focus-visible:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {proj.technologies.map((tech, ti) => (
                            <span
                              key={ti}
                              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('page.empty.projects')}
              </p>
            )}

            <button
              onClick={() => setProjEditor({ open: true, index: null })}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('page.add.project')}
            </button>
          </CollapsibleCard>

          {/* Zertifikate */}
          <CollapsibleCard
            cardRef={setRef('certificates')}
            icon={Award}
            title={t('page.sections.certificates')}
            meta={(profile?.certificates?.length ?? 0) > 0 ? t('units.certificates', { count: profile!.certificates!.length }) : undefined}
            active={activeSection === 'certificates'}
            onAsk={() => setActiveSection('certificates')}
            open={isOpen('certificates')}
            onToggle={() => toggleSection('certificates')}
          >

            {(profile?.certificates?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {profile!.certificates!.map((cert, i) => (
                  <div key={i} className="group/cert flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-primary text-xs font-bold text-primary-foreground">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {cert.dateObtained && (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {formatDate(cert.dateObtained, 'MMM yyyy')}
                            </span>
                          )}
                          <button
                            onClick={() => setCertEditor({ open: true, index: i })}
                            aria-label={t('page.a11y.editCertificate', { name: cert.name })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/cert:opacity-100 focus-visible:opacity-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveCertificate(i)}
                            aria-label={t('page.a11y.removeCertificate', { name: cert.name })}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/cert:opacity-100 focus-visible:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {cert.credentialId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ID: {cert.credentialId}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('page.empty.certificates')}
              </p>
            )}

            <button
              onClick={() => setCertEditor({ open: true, index: null })}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('page.add.certificate')}
            </button>
          </CollapsibleCard>
        </div>

        {/* ════════ Right sidebar (1/3) ════════ */}
        <div className="space-y-5">
          {/* Transparent profile check — resolves into a completion state at 100 % */}
          <div className={cn('rounded-[4px] border bg-card p-6', isComplete ? 'border-[#BFE9CC] dark:border-green-400/30' : 'border-border')}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <span className="grid h-5 w-5 shrink-0 place-items-center bg-[#ECFAF0] text-success dark:bg-green-400/10">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <Sparkles className="h-4 w-4 text-brand" />
                )}
                <h2 id="profile-check-title" className="font-semibold text-foreground">
                  {isComplete ? t('page.profileCheck.completeTitle') : t('page.profileCheck.title')}
                </h2>
              </div>
              <span className={cn('font-mono text-xl font-bold tabular-nums', isComplete ? 'text-success' : 'text-brand')}>
                {profileStrength}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-labelledby="profile-check-title"
              aria-valuenow={profileStrength}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mb-3 h-1.5 overflow-hidden bg-primary-soft dark:bg-slate-700"
            >
              <div
                className={cn('h-full transition-all duration-500', isComplete ? 'bg-success' : 'bg-brand')}
                style={{ width: `${profileStrength}%` }}
              />
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              {isComplete
                ? t('page.profileCheck.completeBody')
                : t('units.stepsRemaining', { count: openItems.length })}
            </p>
            <div className="mb-4 flex flex-col gap-0.5">
              {criteria.map((c) => {
                const isBiggestWin = c.key === nextOpen?.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => focusSection(c.sectionId)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-[3px] px-2.5 py-2 text-left transition-colors hover:bg-muted',
                      isBiggestWin && 'bg-primary-soft/60 dark:bg-brand/10',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center',
                        c.completed ? 'bg-[#ECFAF0] text-success dark:bg-green-400/10' : '',
                      )}
                    >
                      {c.completed ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="box-border h-3.5 w-3.5 border-[1.5px] border-muted-foreground/50" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="text-[13px] font-medium text-foreground">{c.label}</span>
                        {isBiggestWin && (
                          <span className="flex items-center gap-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[.08em] text-brand-strong">
                            <Zap className="h-2.5 w-2.5" />
                            {t('page.profileCheck.biggestWin')}
                          </span>
                        )}
                      </span>
                      {isBiggestWin && (
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                          {c.hint}
                        </span>
                      )}
                    </span>
                    <span className={cn('mt-0.5 font-mono text-[11px] font-bold tabular-nums', c.completed ? 'text-muted-foreground' : 'text-brand-strong')}>
                      +{c.weight}%
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={cn(
                'flex gap-2.5 border-l-[3px] p-3 text-[11.5px] leading-relaxed text-foreground',
                isComplete ? 'border-success bg-[#ECFAF0] dark:bg-green-400/10' : 'border-brand bg-muted',
              )}
            >
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center bg-card', isComplete ? 'text-success' : 'text-brand')}>
                <Zap className="h-3 w-3" />
              </span>
              <span>
                {t.rich('page.profileCheck.why', {
                 bold: (chunks) => <b className="font-bold">{chunks}</b>,
                })}
              </span>
            </div>
          </div>

          {/* Sprachen */}
          <CollapsibleCard
            icon={Languages}
            title={t('page.sections.languages')}
            meta={(profile?.languages?.length ?? 0) > 0 ? `${profile!.languages!.length}` : undefined}
            open={isOpen('languages')}
            onToggle={() => toggleSection('languages')}
          >

            {(profile?.languages?.length ?? 0) > 0 ? (
              <div className="space-y-2.5">
                {profile!.languages!.map((lang, i) => (
                  <LanguageRow
                    key={i}
                    lang={lang}
                    onRemove={() => handleRemoveLanguage(i)}
                    onUpdateLevel={(level) => {
                      const updated = [...(profile?.languages ?? [])];
                      updated[i] = { ...updated[i], level };
                      updateProfile.mutate({ languages: updated });
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-muted-foreground">
                {t('page.empty.languages')}
              </p>
            )}

            <InlineLanguageInput
              existingLanguages={(profile?.languages ?? []).map((l) => l.name)}
              onAdd={handleAddLanguage}
            />
          </CollapsibleCard>

          {/* Datenschutz */}
          <div className="rounded-[4px] border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {t('page.privacy.title')}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('page.privacy.body')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Floating "back to top" during tour ── */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        // Hidden state is opacity-only (to keep the fade), so it must also be
        // taken out of the tab order — otherwise focus lands on nothing.
        tabIndex={scrolled ? undefined : -1}
        aria-hidden={scrolled ? undefined : true}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[4px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90',
          scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
      >
        <ChevronDown className="h-4 w-4 rotate-180" />
        {t('page.backToTop')}
      </button>

      {/* ── Inline section editors ── */}
      <ContactEditorDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        email={user?.email}
        defaultValues={contactDefaults}
        onSubmit={handleSaveContact}
        pending={updateProfile.isPending}
      />
      <ExperienceEditorDialog
        open={expEditor.open}
        onOpenChange={(open) => setExpEditor((prev) => ({ ...prev, open }))}
        initial={expInitial}
        onSubmit={handleSaveExperience}
      />
      <EducationEditorDialog
        open={eduEditor.open}
        onOpenChange={(open) => setEduEditor((prev) => ({ ...prev, open }))}
        initial={eduInitial}
        onSubmit={handleSaveEducation}
      />
      <ProjectEditorDialog
        open={projEditor.open}
        onOpenChange={(open) => setProjEditor((prev) => ({ ...prev, open }))}
        initial={projInitial}
        onSubmit={handleSaveProject}
      />
      <CertificateEditorDialog
        open={certEditor.open}
        onOpenChange={(open) => setCertEditor((prev) => ({ ...prev, open }))}
        initial={certInitial}
        onSubmit={handleSaveCertificate}
      />

      {/* ── CV Upload Dialog ── */}
      <Dialog
        open={cvDialogOpen}
        onOpenChange={(open) => {
          if (!cvUploading) {
            setCvDialogOpen(open);
            if (!open) parseResume.reset();
          }
        }}
      >
        <DialogContent showCloseButton={!cvUploading}>
          <DialogHeader>
            <DialogTitle>{t('page.cvUpload.title')}</DialogTitle>
            <DialogDescription>
              {t('page.cvUpload.description')}
            </DialogDescription>
          </DialogHeader>

          {cvUploading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                {parseResume.isPending
                  ? t('page.cvUpload.parsing')
                  : t('page.cvUpload.updating')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('page.cvUpload.wait')}
              </p>
            </div>
          ) : (
            <FileUpload
              onFileSelect={handleCvUpload}
              onFileRemove={() => parseResume.reset()}
              hint={t('page.cvUpload.hint')}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
