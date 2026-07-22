'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/auth-store';
import { getLanguageLevelLabel } from '@/lib/translations';
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
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/format-date';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
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
import type { UpdateProfileDto, EducationDto } from '@/types';

const SKILL_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby',
  'Swift', 'Kotlin', 'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Node.js', 'NestJS',
  'Express', 'Django', 'Flask', 'Spring Boot', 'Laravel', '.NET', 'Ruby on Rails',
  'HTML', 'CSS', 'Tailwind CSS', 'SASS', 'Bootstrap',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase', 'Supabase',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Terraform', 'CI/CD',
  'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence',
  'REST API', 'GraphQL', 'gRPC', 'WebSockets',
  'Linux', 'Bash', 'PowerShell',
  'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
  'Agile', 'Scrum', 'Kanban', 'Projektmanagement',
  'SAP', 'Salesforce', 'Power BI', 'Tableau', 'Excel', 'Microsoft Office',
  'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch',
  'Verhandlungsführung', 'Kommunikation', 'Teamführung', 'Kundenbetreuung',
];

function InlineSkillInput({
  existingSkills,
  onAdd,
}: {
  existingSkills: string[];
  onAdd: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(
    () => new Set(existingSkills.map((s) => s.toLowerCase())),
    [existingSkills],
  );

  const suggestions =
    value.trim().length > 0
      ? SKILL_SUGGESTIONS.filter(
          (s) =>
            s.toLowerCase().includes(value.toLowerCase()) && !existing.has(s.toLowerCase()),
        ).slice(0, 6)
      : SKILL_SUGGESTIONS.filter((s) => !existing.has(s.toLowerCase())).slice(0, 6);

  const submit = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (existing.has(trimmed.toLowerCase())) {
        toast.error('Dieser Skill existiert bereits');
        return;
      }
      onAdd(trimmed);
      setValue('');
      setHighlightIdx(-1);
      inputRef.current?.focus();
    },
    [existing, onAdd],
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
        Skill hinzufügen
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
          placeholder="z.B. React, Python, Projektmanagement…"
          className="h-9 text-sm"
        />
        <Button
          size="sm"
          disabled={!value.trim()}
          onClick={() => submit(value)}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Hinzufügen
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[4px] border border-border bg-card p-1 shadow-md">
          <p className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">
            Vorschläge
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

const LANGUAGE_SUGGESTIONS = [
  'Deutsch', 'Englisch', 'Französisch', 'Spanisch', 'Italienisch', 'Portugiesisch',
  'Niederländisch', 'Polnisch', 'Russisch', 'Türkisch', 'Arabisch', 'Chinesisch',
  'Japanisch', 'Koreanisch', 'Hindi', 'Griechisch', 'Tschechisch', 'Schwedisch',
  'Dänisch', 'Norwegisch', 'Finnisch', 'Rumänisch', 'Ungarisch', 'Kroatisch',
  'Serbisch', 'Ukrainisch', 'Bulgarisch', 'Hebräisch', 'Vietnamesisch', 'Thailändisch',
];

const LANGUAGE_LEVELS = [
  { value: 'NATIVE', label: 'Muttersprache' },
  { value: 'FLUENT', label: 'Fließend' },
  { value: 'ADVANCED', label: 'Fortgeschritten' },
  { value: 'INTERMEDIATE', label: 'Gut' },
  { value: 'BASIC', label: 'Grundkenntnisse' },
];

function InlineLanguageInput({
  existingLanguages,
  onAdd,
}: {
  existingLanguages: string[];
  onAdd: (name: string, level: string) => void;
}) {
  const [step, setStep] = useState<'closed' | 'name' | 'level'>('closed');
  const [name, setName] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(
    () => new Set(existingLanguages.map((s) => s.toLowerCase())),
    [existingLanguages],
  );

  const suggestions =
    name.trim().length > 0
      ? LANGUAGE_SUGGESTIONS.filter(
          (s) =>
            s.toLowerCase().includes(name.toLowerCase()) && !existing.has(s.toLowerCase()),
        ).slice(0, 6)
      : LANGUAGE_SUGGESTIONS.filter((s) => !existing.has(s.toLowerCase())).slice(0, 6);

  const selectLanguage = useCallback(
    (langName: string) => {
      const trimmed = langName.trim();
      if (!trimmed) return;
      if (existing.has(trimmed.toLowerCase())) {
        toast.error('Diese Sprache existiert bereits');
        return;
      }
      setName(trimmed);
      setStep('level');
      setHighlightIdx(-1);
    },
    [existing],
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
        Sprache hinzufügen
      </button>
    );
  }

  if (step === 'level') {
    return (
      <div ref={containerRef} className="mt-4 space-y-3">
        <p className="text-sm text-foreground">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground"> — Wie gut sprichst du diese Sprache?</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => addWithLevel(l.value)}
              className="rounded-[3px] border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setStep('name'); setName(''); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Zurück
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
        placeholder="z.B. Englisch, Französisch…"
        className="h-9 text-sm"
      />

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[4px] border border-border bg-card p-1 shadow-md">
          <p className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">
            Vorschläge
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
          {LANGUAGE_LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => {
                onUpdateLevel(l.value);
                setPicking(false);
              }}
              className={`rounded-[3px] border px-2.5 py-1 text-xs font-medium transition-colors ${
                lang.level === l.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {l.label}
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
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </button>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="text-xs italic text-primary/60 transition-colors hover:text-primary"
          >
            Einstufung wählen
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded-[3px] p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/lang:opacity-100"
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
function StrengthRing({ pct }: { pct: number }) {
  const done = pct >= 100;
  const color = done ? 'var(--success)' : 'var(--brand)';
  return (
    <div
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
            title="Was bringt das?"
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

interface Criterion {
  id: string;
  label: string;
  weight: number;
  done: boolean;
  hint: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((state) => state.user);
  const [cvDialogOpen, setCvDialogOpen] = useState(false);
  const parseResume = useParseResume();

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
        toast.success('Lebenslauf erfolgreich importiert!');
        setCvDialogOpen(false);
        parseResume.reset();
      } catch {
        toast.error('Lebenslauf konnte nicht verarbeitet werden.');
      }
    },
    [parseResume, updateProfile],
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

  const handleRemoveSkill = useCallback(
    (name: string) => {
      const updatedSkills = (profile?.skills ?? []).filter(
        (s) => s.name.toLowerCase() !== name.toLowerCase(),
      );
      updateProfile.mutate({ skills: updatedSkills });
    },
    [profile?.skills, updateProfile],
  );

  const handleRemoveExperience = useCallback(
    (index: number) => {
      const updated = (profile?.experiences ?? []).filter((_, i) => i !== index);
      updateProfile.mutate({ experiences: updated });
    },
    [profile?.experiences, updateProfile],
  );

  const handleRemoveProject = useCallback(
    (index: number) => {
      const updated = (profile?.projects ?? []).filter((_, i) => i !== index);
      updateProfile.mutate({ projects: updated });
    },
    [profile?.projects, updateProfile],
  );

  const handleRemoveCertificate = useCallback(
    (index: number) => {
      const updated = (profile?.certificates ?? []).filter((_, i) => i !== index);
      updateProfile.mutate({ certificates: updated });
    },
    [profile?.certificates, updateProfile],
  );

  const handleRemoveEducation = useCallback(
    (index: number) => {
      // Map the read model (numeric years) back to the write DTO (string years),
      // mirroring how the edit page persists education.
      const updated: EducationDto[] = (profile?.education ?? [])
        .filter((_, i) => i !== index)
        .map((e) => ({
          id: e.id,
          degree: e.degree,
          institution: e.institution,
          fieldOfStudy: e.fieldOfStudy,
          startYear: e.startYear ? `${e.startYear}-01-01` : undefined,
          endYear: e.endYear ? `${e.endYear}-01-01` : undefined,
          gpa: e.gpa,
          description: e.description,
        }));
      updateProfile.mutate({ education: updated });
    },
    [profile?.education, updateProfile],
  );

  const handleRemoveLanguage = useCallback(
    (index: number) => {
      const updated = (profile?.languages ?? []).filter((_, i) => i !== index);
      updateProfile.mutate({ languages: updated });
    },
    [profile?.languages, updateProfile],
  );

  const handleAddLanguage = useCallback(
    (name: string, level: string) => {
      const currentLanguages = profile?.languages ?? [];
      const updatedLanguages = [...currentLanguages, { name, level }];
      updateProfile.mutate({ languages: updatedLanguages });
    },
    [profile?.languages, updateProfile],
  );

  // ── Transparent, weighted profile-check (mirrors calculateProfileStrength) ──
  const criteria: Criterion[] = useMemo(() => {
    const hasBasic = !!(user?.firstName && user?.lastName && user?.email);
    const hasPhone = !!profile?.phone;
    const hasAddress = !!(profile?.city || profile?.street);
    const hasSummary = !!profile?.summary;
    const hasSkills = (profile?.skills?.length ?? 0) > 0;
    const hasExperience = (profile?.experiences?.length ?? 0) > 0;
    const hasEducation = (profile?.education?.length ?? 0) > 0;
    const hasLinkedin = !!profile?.linkedinUrl;
    return [
      { id: 'identity', label: 'Kontaktdaten', weight: 10, done: hasBasic, hint: 'Name & E-Mail landen in jeder Bewerbung.' },
      { id: 'identity', label: 'Telefonnummer', weight: 10, done: hasPhone, hint: 'Erhöht deine Rückmeldequote spürbar.' },
      { id: 'identity', label: 'Adresse', weight: 10, done: hasAddress, hint: 'Dein Ort hilft beim Matching regionaler Stellen.' },
      { id: 'about', label: 'Über mich', weight: 15, done: hasSummary, hint: 'Mein wichtigster Input für deine Anschreiben.' },
      { id: 'skills', label: 'Fähigkeiten', weight: 15, done: hasSkills, hint: 'Recruiter filtern zuerst nach Skills.' },
      { id: 'experience', label: 'Berufserfahrung', weight: 15, done: hasExperience, hint: 'Konkrete Erfolge überzeugen am meisten.' },
      { id: 'education', label: 'Ausbildung', weight: 15, done: hasEducation, hint: 'Schaltet passende Stellenfilter frei.' },
      { id: 'identity', label: 'LinkedIn', weight: 10, done: hasLinkedin, hint: 'Verknüpft dein öffentliches Profil.' },
    ];
  }, [profile, user]);

  const profileStrength = criteria.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
  const openItems = criteria.filter((c) => !c.done);
  const nextOpen = openItems[0] ?? null;
  const isComplete = profileStrength >= 100;

  // ── Applo tour script (main-column sections) ───────────────────────────
  const tour = useMemo(
    () => [
      { id: 'identity', msg: <>Fangen wir oben an: deine <b>Kontaktdaten</b> übernehme ich 1:1 in jede Bewerbung. Eine Telefonnummer bringt dir mehr Rückmeldungen.</> },
      { id: 'about', msg: <>Dein <b>Steckbrief</b> ist mein wichtigster Input. 2–3 Sätze über deine Stärken reichen — den Rest formuliere ich pro Stelle neu.</> },
      { id: 'experience', msg: <>Bei der <b>Berufserfahrung</b> zählen konkrete Erfolge mit Zahlen. Ich hebe automatisch hervor, was zur jeweiligen Stelle passt.</> },
      { id: 'skills', msg: <>Pflege deine <b>Fähigkeiten</b> — Recruiter filtern zuerst danach, und ich matche dich gezielter auf passende Stellen.</> },
      { id: 'education', msg: <>Deine <b>Ausbildung</b> rundet das Profil ab und schaltet weitere Stellenfilter frei.</> },
      { id: 'projects', msg: <>Mit <b>Projekten</b> zeigst du, was du praktisch draufhast — gerade ohne lange Berufserfahrung ein starkes Argument. Ich greife sie passend zur Stelle auf.</> },
      { id: 'certificates', msg: <>Zum Schluss deine <b>Zertifikate</b> — sie belegen dein Können offiziell. Ich erwähne sie dort, wo sie für die Stelle den Unterschied machen.</> },
    ],
    [],
  );

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'du';

  const sectionMsg: Record<string, ReactNode> = {
    identity: <>Deine <b>Kontaktdaten</b> landen direkt in jeder Bewerbung. {profile?.phone ? 'Top — alles vollständig.' : 'Ergänze deine Telefonnummer für mehr Rückmeldungen.'}</>,
    about: <>Dein <b>Steckbrief</b> ist mein wichtigster Input. Schreib 2–3 Sätze über deine Stärken — pro Stelle texte ich daraus ein passendes Anschreiben.</>,
    experience: <>Konkrete Erfolge mit <b>Zahlen</b> überzeugen am meisten. Ich wähle pro Bewerbung automatisch die relevantesten Punkte aus.</>,
    skills: <>Recruiter filtern zuerst nach <b>Skills</b>. Je vollständiger deine Liste, desto besser matche ich dich auf passende Stellen.</>,
    education: <>Deine <b>Ausbildung</b> rundet das Profil ab und passt zu mehr Stellenfiltern.</>,
  };

  let message: ReactNode;
  if (tourStep !== null) {
    message = tour[tourStep].msg;
  } else if (isComplete) {
    message = <>Stark, {firstName}! Dein Profil ist zu <b>100 %</b> vollständig. Jetzt kann ich deine Bewerbungen so treffsicher wie möglich für dich schreiben.</>;
  } else if (activeSection && sectionMsg[activeSection]) {
    message = sectionMsg[activeSection];
  } else {
    message = <>Hi, ich bin <b>Applo</b> — dein Profil-Coach. Je mehr ich über dich weiß, desto besser passe ich deine Bewerbungen an. Lass uns dein Profil startklar machen.</>;
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
  const goToNext = () => { if (nextOpen) focusSection(nextOpen.id); };
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
        Profil konnte nicht geladen werden. Bitte versuche es später erneut.
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

  const sectionCard = (id: string) =>
    cn(
      'scroll-mt-24 rounded-[4px] border bg-card p-6 transition-colors duration-200',
      activeSection === id ? 'tour-active border-brand' : 'border-border',
    );

  return (
    <div className="space-y-5 pb-10">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Applo
          </Link>
          <span>→</span>
          <span className="font-medium text-foreground">Mein Profil</span>
        </nav>
        <Button
          variant="outline"
          size="sm"
          className="group gap-1.5 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => setCvDialogOpen(true)}
        >
          <Upload className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          CV hochladen
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
              Applo · dein Profil-Coach
            </div>
            <p key={`${tourStep}-${activeSection}-${isComplete}`} className="mb-3.5 max-w-[60ch] text-[15px] leading-relaxed text-foreground">
              {message}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {tourStep !== null ? (
                <>
                  <Button size="sm" className="gap-1.5" onClick={tourNext}>
                    {tourStep >= tour.length - 1 ? 'Rundgang beenden' : 'Weiter'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={endTour}>
                    Überspringen
                  </Button>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {tourStep + 1} / {tour.length}
                  </span>
                </>
              ) : isComplete ? (
                <Button size="sm" className="gap-1.5" onClick={startTour}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Profil noch einmal durchgehen
                </Button>
              ) : (
                <>
                  {nextOpen && (
                    <Button size="sm" className="gap-1.5" onClick={goToNext}>
                      Als Nächstes: {nextOpen.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1.5 text-primary hover:text-primary" onClick={startTour}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Geführter Rundgang
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="hidden flex-col items-center gap-2 self-center border-l border-border pl-5 lg:flex">
            <StrengthRing pct={profileStrength} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Profil-Stärke</span>
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
                    onClick={() => router.push('/profile/edit')}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <StatusChip tone="success" className="mt-1.5">
                  Offen für neue Rollen
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
                    <span>Aktuelle Position</span>
                  </div>
                  <span className="font-medium text-foreground">{currentPosition}</span>
                </div>
              )}
              {user?.email && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex w-40 shrink-0 items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>E-Mail</span>
                  </div>
                  <span className="flex-1 font-medium text-foreground">{user.email}</span>
                  <Check className="h-4 w-4 text-success" />
                </div>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex w-40 shrink-0 items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>Telefon</span>
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
                      onClick={() => router.push('/profile/edit')}
                      className="border border-[#F3E3B3] bg-[#FDF6E7] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-[#A16207] transition-colors hover:bg-[#FBEECB] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                    >
                      fehlt
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
                      onClick={() => router.push('/profile/edit')}
                      className="border border-[#F3E3B3] bg-[#FDF6E7] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-[#A16207] transition-colors hover:bg-[#FBEECB] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
                    >
                      fehlt
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
            title="Über mich"
            meta={profile?.summary ? `${profile.summary.length} Zeichen` : undefined}
            active={activeSection === 'about'}
            open={true}
            onToggle={() => {}}
            collapsible={false}
            onAsk={() => setActiveSection('about')}
            action={
              <button
                onClick={() => router.push('/profile/edit')}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            }
          >
            {profile?.summary ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
            ) : (
              <button
                onClick={() => router.push('/profile/edit')}
                className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Steckbrief schreiben — Applos wichtigster Input
              </button>
            )}
          </CollapsibleCard>

          {/* Berufserfahrung */}
          <CollapsibleCard
            cardRef={setRef('experience')}
            icon={Briefcase}
            title="Berufserfahrung"
            meta={(profile?.experiences?.length ?? 0) > 0 ? `${profile!.experiences!.length} Stationen` : undefined}
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
                            onClick={() => handleRemoveExperience(i)}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/exp:opacity-100"
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
                Noch keine Berufserfahrung eingetragen.
              </p>
            )}

            <button
              onClick={() => router.push('/profile/edit?tab=experience')}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Berufserfahrung hinzufügen
            </button>
          </CollapsibleCard>

          {/* Fähigkeiten */}
          <CollapsibleCard
            cardRef={setRef('skills')}
            icon={Code2}
            title="Fähigkeiten"
            meta={(profile?.skills?.length ?? 0) > 0 ? `${profile!.skills!.length} Skills` : undefined}
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
                      className="absolute right-1.5 shrink-0 rounded-[2px] p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Noch keine Fähigkeiten eingetragen.
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
            title="Ausbildung"
            meta={(profile?.education?.length ?? 0) > 0 ? `${profile!.education!.length} Abschlüsse` : undefined}
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
                              {[edu.startYear, edu.endYear ?? 'heute'].filter(Boolean).join(' – ')}
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveEducation(i)}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/edu:opacity-100"
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
                Noch keine Ausbildung eingetragen.
              </p>
            )}

            <button
              onClick={() => router.push('/profile/edit?tab=education')}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Ausbildung hinzufügen
            </button>
          </CollapsibleCard>

          {/* Projekte */}
          <CollapsibleCard
            cardRef={setRef('projects')}
            icon={FolderKanban}
            title="Projekte"
            meta={(profile?.projects?.length ?? 0) > 0 ? `${profile!.projects!.length} Projekte` : undefined}
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
                        <button
                          onClick={() => handleRemoveProject(i)}
                          className="shrink-0 rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/proj:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
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
                Noch keine Projekte eingetragen.
              </p>
            )}

            <button
              onClick={() => router.push('/profile/edit?tab=projects')}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Projekt hinzufügen
            </button>
          </CollapsibleCard>

          {/* Zertifikate */}
          <CollapsibleCard
            cardRef={setRef('certificates')}
            icon={Award}
            title="Zertifikate"
            meta={(profile?.certificates?.length ?? 0) > 0 ? `${profile!.certificates!.length} Zertifikate` : undefined}
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
                            onClick={() => handleRemoveCertificate(i)}
                            className="rounded-[3px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/cert:opacity-100"
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
                Noch keine Zertifikate eingetragen.
              </p>
            )}

            <button
              onClick={() => router.push('/profile/edit?tab=certificates')}
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Zertifikat hinzufügen
            </button>
          </CollapsibleCard>
        </div>

        {/* ════════ Right sidebar (1/3) ════════ */}
        <div className="space-y-5">
          {/* Transparent profile check — hidden once the profile is complete */}
          {!isComplete && (
          <div className="rounded-[4px] border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <h2 className="font-semibold text-foreground">Profil-Check</h2>
              </div>
              <span className={cn('font-mono text-xl font-bold tabular-nums', isComplete ? 'text-success' : 'text-brand')}>
                {profileStrength}%
              </span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden bg-primary-soft dark:bg-slate-700">
              <div
                className={cn('h-full transition-all duration-500', isComplete ? 'bg-success' : 'bg-brand')}
                style={{ width: `${profileStrength}%` }}
              />
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Noch {openItems.length} {openItems.length === 1 ? 'Schritt' : 'Schritte'} bis zum
              vollständigen Profil.
            </p>
            <div className="mb-4 flex flex-col gap-0.5">
              {criteria.map((c, i) => (
                <button
                  key={i}
                  onClick={() => focusSection(c.id)}
                  className="flex items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center',
                      c.done ? 'bg-[#ECFAF0] text-success dark:bg-green-400/10' : '',
                    )}
                  >
                    {c.done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="box-border h-3.5 w-3.5 border-[1.5px] border-muted-foreground/50" />
                    )}
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-foreground">{c.label}</span>
                  <span className={cn('font-mono text-[11px] font-bold tabular-nums', c.done ? 'text-muted-foreground/60' : 'text-brand')}>
                    +{c.weight}%
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2.5 border-l-[3px] border-brand bg-muted p-3 text-[11.5px] leading-relaxed text-foreground">
              <span className="grid h-5 w-5 shrink-0 place-items-center bg-card text-brand">
                <Zap className="h-3 w-3" />
              </span>
              <span>
                <b className="font-bold">Warum?</b> Jedes ausgefüllte Feld macht Applos KI-Bewerbungen
                genauer und schaltet mehr passende Stellen frei.
              </span>
            </div>
          </div>
          )}

          {/* Sprachen */}
          <CollapsibleCard
            icon={Languages}
            title="Sprachen"
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
                Noch keine Sprachen eingetragen.
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
              Deine Daten, deine Kontrolle
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Applo nutzt dein Profil ausschließlich, um deine Bewerbungen zu schreiben. Du
              entscheidest pro Bewerbung, welche Angaben mitgeschickt werden.
            </p>
          </div>
        </div>
      </div>

      {/* ── Floating "back to top" during tour ── */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[4px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90',
          scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
      >
        <ChevronDown className="h-4 w-4 rotate-180" />
        Nach oben
      </button>

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
            <DialogTitle>Lebenslauf hochladen</DialogTitle>
            <DialogDescription>
              Lade deinen Lebenslauf hoch — wir lesen ihn aus und füllen dein Profil
              automatisch aus.
            </DialogDescription>
          </DialogHeader>

          {cvUploading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                {parseResume.isPending
                  ? 'Lebenslauf wird analysiert…'
                  : 'Profil wird aktualisiert…'}
              </p>
              <p className="text-xs text-muted-foreground">
                Das kann einen Moment dauern.
              </p>
            </div>
          ) : (
            <FileUpload
              onFileSelect={handleCvUpload}
              onFileRemove={() => parseResume.reset()}
              hint="PDF oder DOCX, max. 10 MB"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
