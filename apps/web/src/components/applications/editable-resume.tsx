'use client';

/**
 * editable-resume.tsx — WYSIWYG (click-to-edit) résumé document.
 *
 * Ports the docs/design prototype's `EditableResume` to the real app, typed for
 * `ResumeData`. The whole résumé is one editable document: click any text to edit
 * it, add/remove bullets, skills, stations, education, projects, certifications.
 *
 * Data contract: contentEditable fields are uncontrolled (set once on mount, so
 * the caret never jumps); the component emits the full, merged `ResumeData` via
 * `onChange` on every commit/remove, computed from the next state it just derived
 * (never from a stale ref). Untouched fields (location, startDate/endDate,
 * achievements, address components, …) pass straight through so
 * `ResumeTemplatePreview`/export stay valid. Experience/project bullets round-trip
 * to the `description` HTML (`<ul><li>…</li></ul>`) that `parseResumeDraft` /
 * `normalizeResumeForSave` already speak.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import { X, Plus, Edit3, Pencil, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiAssistantPopover } from '@/components/ui/ai-assistant-popover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  ResumeData,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
  ResumeCertification,
  ResumeSkillCategory,
  TemplateSettings,
} from '@/types';

let _uid = 0;
const uid = () => 'r' + ++_uid;

/* ---- bullet <-> description HTML helpers ---- */
function htmlToText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').trim();
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function descToBullets(desc?: string): { id: string; text: string }[] {
  const html = (desc || '').trim();
  if (!html) return [];
  const li = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (li.length) return li.map((m) => ({ id: uid(), text: htmlToText(m[1]) })).filter((b) => b.text);
  const text = htmlToText(html);
  return text ? [{ id: uid(), text }] : [];
}
function bulletsToDesc(bullets: { text: string }[]): string | undefined {
  const items = bullets.map((b) => b.text.trim()).filter(Boolean);
  if (!items.length) return undefined;
  return '<ul>' + items.map((t) => `<li>${escapeHtml(t)}</li>`).join('') + '</ul>';
}

/* ---- contentEditable primitive (uncontrolled, commit on blur) ---- */
function Editable({
  initial,
  onCommit,
  tag = 'div',
  className = '',
  placeholder = '',
  oneline = false,
  style,
}: {
  initial: string;
  onCommit: (v: string) => void;
  tag?: 'div' | 'span';
  className?: string;
  placeholder?: string;
  oneline?: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = initial || '';
    // initialise once — external value changes must not reset the caret
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const props = {
    className: cn('edt', className),
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    'data-ph': placeholder,
    style,
    onBlur: (e: React.FocusEvent<HTMLElement>) => onCommit(e.currentTarget.textContent?.replace(/\s+$/, '') ?? ''),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (oneline && e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
  };
  return tag === 'span' ? (
    <span ref={ref as React.RefObject<HTMLSpanElement>} {...props} />
  ) : (
    <div ref={ref as React.RefObject<HTMLDivElement>} {...props} />
  );
}

/* ---- internal working-state shapes (carry original entries for passthrough) ---- */
interface ExpItem {
  id: string;
  src: ResumeExperience;
  title: string;
  company: string;
  dateRange: string;
  bullets: { id: string; text: string }[];
}
interface EduItem {
  id: string;
  src: ResumeEducation;
  degree: string;
  institution: string;
  year: string;
}
interface ProjItem {
  id: string;
  src: ResumeProject;
  name: string;
  date: string;
  bullets: { id: string; text: string }[];
}
interface CertItem {
  id: string;
  src: ResumeCertification;
  name: string;
  issuer: string;
  date: string;
}
interface SkillCat {
  id: string;
  src?: ResumeSkillCategory;
  type: string;
  skills: { id: string; text: string }[];
}
interface LangItem {
  id: string;
  name: string;
  level: string;
}
interface Lists {
  exp: ExpItem[];
  edu: EduItem[];
  projects: ProjItem[];
  certs: CertItem[];
  skillCats: SkillCat[];
  langs: LangItem[];
}
interface Meta {
  name: string;
  role: string;
  summary: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export type ResumeDesign = 'classic-ats' | 'harvard-classic' | 'elegant-sidebar';

/** Map a DB template id (e.g. "elegant-sidebar-blue-resume") to a design skin. */
export function resolveResumeDesign(templateId?: string | null): ResumeDesign {
  const id = templateId || '';
  if (id.startsWith('harvard-classic')) return 'harvard-classic';
  if (id.startsWith('elegant-sidebar')) return 'elegant-sidebar';
  return 'classic-ats';
}

/** Document sections the user can remove / re-add in the editor (P3). */
type ResumeSection =
  | 'profile'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'certs';
const RESUME_SECTIONS: { key: ResumeSection; label: string }[] = [
  { key: 'profile', label: 'Profil' },
  { key: 'experience', label: 'Berufserfahrung' },
  { key: 'education', label: 'Ausbildung' },
  { key: 'projects', label: 'Projekte' },
  { key: 'skills', label: 'Fähigkeiten' },
  { key: 'languages', label: 'Sprachen' },
  { key: 'certs', label: 'Zertifikate' },
];
/** Default document order — matches the editor's original hardcoded layout. */
const DEFAULT_SECTION_ORDER: ResumeSection[] = [
  'profile',
  'education',
  'experience',
  'projects',
  'skills',
  'languages',
  'certs',
];
/** Sections the elegant-sidebar skin renders in the aside column. */
const SIDEBAR_ASIDE_SECTIONS: ResumeSection[] = ['education', 'skills', 'languages'];

/** Swap an item with its neighbor; null when the move is out of range. */
function moveById<T extends { id: string }>(arr: T[], id: string, dir: -1 | 1): T[] | null {
  const i = arr.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return null;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

interface GenerateSummaryArgs {
  instructions: string;
  currentSummary?: string;
  regenerate?: boolean;
}
interface GenerateExperienceArgs {
  experienceIndex: number;
  experienceTitle: string;
  experienceCompany: string;
  experienceDateRange?: string;
  currentDescription?: string;
  instructions: string;
  regenerate?: boolean;
}
interface GenerateProjectArgs {
  projectIndex: number;
  projectName: string;
  projectDate?: string;
  currentDescription?: string;
  instructions: string;
  regenerate?: boolean;
}

interface EditableResumeProps {
  value: ResumeData;
  onChange: (next: ResumeData) => void;
  accent: string;
  /** Which export template the edit surface should mimic (P1). */
  design?: ResumeDesign;
  /**
   * Approximate the per-application design settings on the edit surface
   * (font scale via zoom, family via a CSS stack, density via rhythm
   * overrides). The exported PDF stays the authoritative rendering.
   */
  designSettings?: TemplateSettings | null;
  /** AI assists (P5) — return the generated text, or null when the request failed. */
  onGenerateSummary?: (args: GenerateSummaryArgs) => Promise<string | null>;
  onGenerateExperience?: (args: GenerateExperienceArgs) => Promise<string | null>;
  onGenerateProject?: (args: GenerateProjectArgs) => Promise<string | null>;
}

/** CSS zoom factors mirroring `pdf-v2/design-tokens.ts` FONT_SCALE_FACTORS. */
const PREVIEW_FONT_SCALE: Record<string, number> = { sm: 0.92, md: 1, lg: 1.08 };

/**
 * Web-safe approximations of the bundled OFL families (the real fonts are
 * embedded in the PDF only): sans choices map to a neutral sans stack,
 * Merriweather to a serif stack.
 */
const PREVIEW_FONT_FAMILY: Record<string, string> = {
  lato: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  'source-sans': "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  merriweather: "Georgia, 'Times New Roman', serif",
};

export function EditableResume({
  value,
  onChange,
  accent,
  design = 'classic-ats',
  designSettings,
  onGenerateSummary,
  onGenerateExperience,
  onGenerateProject,
}: EditableResumeProps) {
  // Frozen snapshot for passthrough of untouched top-level fields.
  const [original] = useState(() => value);

  const [meta, setMeta] = useState<Meta>(() => ({
    name: value.candidateName || '',
    role: value.targetJobTitle || '',
    summary: value.summary ? htmlToText(value.summary) : '',
    email: value.email || '',
    phone: value.phone || '',
    linkedin: value.linkedin || '',
    github: value.github || '',
    street: value.street || '',
    postalCode: value.postalCode || '',
    city: value.city || '',
    country: value.country || '',
  }));

  const [lists, setLists] = useState<Lists>(() => ({
    exp: (value.experiences || []).map((x) => ({
      id: uid(),
      src: x,
      title: x.title || '',
      company: x.company || '',
      dateRange: x.dateRange || '',
      bullets: descToBullets(x.description),
    })),
    edu: (value.education || []).map((e) => ({
      id: uid(),
      src: e,
      degree: e.degree || '',
      institution: e.institution || '',
      year: e.year || '',
    })),
    projects: (value.projects || []).map((p) => ({
      id: uid(),
      src: p,
      name: p.name || '',
      date: p.date || '',
      bullets: descToBullets(p.description),
    })),
    certs: (value.certifications || []).map((c) => ({
      id: uid(),
      src: c,
      name: c.name || '',
      issuer: c.issuer || '',
      date: c.date || '',
    })),
    skillCats: (value.skillCategories || []).map((c) => ({
      id: uid(),
      src: c,
      type: c.type || '',
      skills: (c.skills || []).map((s) => ({ id: uid(), text: s })),
    })),
    langs: (value.languages || []).map((l) => ({ id: uid(), name: l.name || '', level: l.level || '' })),
  }));

  // ── section order (P4) ──
  // Seeded from the saved order (unknown keys dropped, missing sections
  // appended) or the default layout. Only emitted once the user actually
  // reorders (or the record already carried an order) so untouched
  // documents keep exporting with the template's default order.
  const [sectionOrder, setSectionOrder] = useState<ResumeSection[]>(() => {
    const saved = (value.sectionOrder || []).filter((k): k is ResumeSection =>
      DEFAULT_SECTION_ORDER.includes(k as ResumeSection),
    );
    return [...saved, ...DEFAULT_SECTION_ORDER.filter((k) => !saved.includes(k))];
  });
  const [orderTouched, setOrderTouched] = useState(() => Boolean(value.sectionOrder?.length));

  const buildResume = (l: Lists, m: Meta, order?: ResumeSection[]): ResumeData => ({
    ...original,
    sectionOrder: order ?? (orderTouched ? sectionOrder : original.sectionOrder),
    candidateName: m.name,
    targetJobTitle: m.role || original.targetJobTitle,
    email: m.email,
    phone: m.phone,
    linkedin: m.linkedin || undefined,
    github: m.github || undefined,
    street: m.street || undefined,
    postalCode: m.postalCode || undefined,
    city: m.city || undefined,
    country: m.country || undefined,
    fullAddress:
      [m.street, [m.postalCode, m.city].filter(Boolean).join(' '), m.country]
        .map((s) => (s || '').trim())
        .filter(Boolean)
        .join(', ') || original.fullAddress || undefined,
    summary: m.summary || undefined,
    experiences: l.exp.map((x) => ({
      ...x.src,
      title: x.title,
      company: x.company,
      dateRange: x.dateRange,
      // A manually edited date range wins over the raw dates — drop them so
      // the export can't re-derive (and overwrite) the user's text.
      ...(x.dateRange !== (x.src.dateRange || '')
        ? { startDate: undefined, endDate: undefined, isCurrent: undefined }
        : {}),
      description: bulletsToDesc(x.bullets),
      achievements: [],
    })),
    education: l.edu.map((e) => ({
      ...e.src,
      degree: e.degree,
      institution: e.institution,
      year: e.year,
      ...(e.year !== (e.src.year || '') ? { startDate: undefined, endDate: undefined } : {}),
    })),
    projects: l.projects.map((p) => ({
      ...p.src,
      name: p.name,
      date: p.date || undefined,
      ...(p.date !== (p.src.date || '') ? { startDate: undefined } : {}),
      description: bulletsToDesc(p.bullets),
      highlights: [],
    })),
    certifications: l.certs.map((c) => ({ ...c.src, name: c.name, issuer: c.issuer, date: c.date || undefined })),
    skillCategories: l.skillCats.map((c) => ({
      ...(c.src ?? {}),
      type: c.type,
      skills: c.skills.map((s) => s.text).filter(Boolean),
    })),
    languages: l.langs.map((ln) => ({ name: ln.name, level: ln.level || undefined })),
  });

  // Apply a change to one list: derive next, re-render, optionally emit from it.
  const apply = <K extends keyof Lists>(key: K, next: Lists[K], emit = true) => {
    const nextLists = { ...lists, [key]: next };
    setLists(nextLists);
    if (emit) onChange(buildResume(nextLists, meta));
  };
  const commitMeta = (patch: Partial<Meta>) => {
    const m = { ...meta, ...patch };
    setMeta(m);
    onChange(buildResume(lists, m));
  };

  /* ---- experience ---- */
  const mapExp = (fn: (x: ExpItem) => ExpItem) => lists.exp.map(fn);
  const setX = (id: string, patch: Partial<ExpItem>) => apply('exp', mapExp((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addBullet = (id: string) =>
    apply('exp', mapExp((x) => (x.id === id ? { ...x, bullets: [...x.bullets, { id: uid(), text: '' }] } : x)), false);
  const rmBullet = (id: string, bid: string) =>
    apply('exp', mapExp((x) => (x.id === id ? { ...x, bullets: x.bullets.filter((b) => b.id !== bid) } : x)));
  const setBullet = (id: string, bid: string, t: string) =>
    apply('exp', mapExp((x) => (x.id === id ? { ...x, bullets: x.bullets.map((b) => (b.id === bid ? { ...b, text: t } : b)) } : x)));
  const addStation = () =>
    apply('exp', [...lists.exp, { id: uid(), src: { title: '', company: '', dateRange: '' }, title: '', company: '', dateRange: '', bullets: [{ id: uid(), text: '' }] }], false);
  const rmStation = (id: string) => apply('exp', lists.exp.filter((x) => x.id !== id));

  /* ---- education ---- */
  const setE = (id: string, patch: Partial<EduItem>) => apply('edu', lists.edu.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const addEdu = () =>
    apply('edu', [...lists.edu, { id: uid(), src: { degree: '', institution: '', year: '' }, degree: '', institution: '', year: '' }], false);
  const rmEdu = (id: string) => apply('edu', lists.edu.filter((e) => e.id !== id));

  /* ---- projects ---- */
  const mapProj = (fn: (x: ProjItem) => ProjItem) => lists.projects.map(fn);
  const setP = (id: string, patch: Partial<ProjItem>) => apply('projects', mapProj((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addProjBullet = (id: string) =>
    apply('projects', mapProj((x) => (x.id === id ? { ...x, bullets: [...x.bullets, { id: uid(), text: '' }] } : x)), false);
  const rmProjBullet = (id: string, bid: string) =>
    apply('projects', mapProj((x) => (x.id === id ? { ...x, bullets: x.bullets.filter((b) => b.id !== bid) } : x)));
  const setProjBullet = (id: string, bid: string, t: string) =>
    apply('projects', mapProj((x) => (x.id === id ? { ...x, bullets: x.bullets.map((b) => (b.id === bid ? { ...b, text: t } : b)) } : x)));
  const addProject = () =>
    apply('projects', [...lists.projects, { id: uid(), src: { name: '' }, name: '', date: '', bullets: [{ id: uid(), text: '' }] }], false);
  const rmProject = (id: string) => apply('projects', lists.projects.filter((x) => x.id !== id));

  /* ---- certifications ---- */
  const setC = (id: string, patch: Partial<CertItem>) => apply('certs', lists.certs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addCert = () =>
    apply('certs', [...lists.certs, { id: uid(), src: { name: '', issuer: '' }, name: '', issuer: '', date: '' }], false);
  const rmCert = (id: string) => apply('certs', lists.certs.filter((c) => c.id !== id));

  /* ---- skills ---- */
  const [skillDraft, setSkillDraft] = useState<Record<string, string>>({});
  const mapCat = (fn: (c: SkillCat) => SkillCat) => lists.skillCats.map(fn);
  const addSkill = (catId: string) => {
    const t = (skillDraft[catId] || '').trim();
    if (!t) return;
    apply('skillCats', mapCat((c) => (c.id === catId ? { ...c, skills: [...c.skills, { id: uid(), text: t }] } : c)));
    setSkillDraft((d) => ({ ...d, [catId]: '' }));
  };
  const rmSkill = (catId: string, sid: string) =>
    apply('skillCats', mapCat((c) => (c.id === catId ? { ...c, skills: c.skills.filter((s) => s.id !== sid) } : c)));
  const setSkillText = (catId: string, sid: string, t: string) =>
    apply('skillCats', mapCat((c) => (c.id === catId ? { ...c, skills: c.skills.map((s) => (s.id === sid ? { ...s, text: t } : s)) } : c)));
  const setCatType = (catId: string, t: string) => apply('skillCats', mapCat((c) => (c.id === catId ? { ...c, type: t } : c)));
  const addCategory = () => apply('skillCats', [...lists.skillCats, { id: uid(), type: '', skills: [] }], false);

  /* ---- languages ---- */
  const setLang = (id: string, patch: Partial<LangItem>) => apply('langs', lists.langs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLang = () => apply('langs', [...lists.langs, { id: uid(), name: '', level: '' }], false);
  const rmLang = (id: string) => apply('langs', lists.langs.filter((l) => l.id !== id));

  /* ---- item reordering (P4): swap with the neighbor, keys stay stable ---- */
  const moveListItem = <K extends 'exp' | 'edu' | 'projects' | 'certs' | 'skillCats' | 'langs'>(
    key: K,
    id: string,
    dir: -1 | 1,
  ) => {
    // The union of list arrays defeats the generic; every element has an id.
    const next = moveById(lists[key] as Array<{ id: string }>, id, dir);
    if (next) apply(key, next as Lists[K]);
  };
  const moveSkill = (catId: string, sid: string, dir: -1 | 1) =>
    apply(
      'skillCats',
      mapCat((c) => {
        if (c.id !== catId) return c;
        const next = moveById(c.skills, sid, dir);
        return next ? { ...c, skills: next } : c;
      }),
    );
  /** Hover controls to move a list item up/down (absolute, next to the ✕). */
  const itemMovers = (
    key: 'exp' | 'edu' | 'projects' | 'certs',
    id: string,
    index: number,
    count: number,
  ) => (
    <>
      <button
        type="button"
        className="ed-mv-sec up"
        title="Nach oben verschieben"
        aria-label="Nach oben verschieben"
        disabled={index === 0}
        onClick={() => moveListItem(key, id, -1)}
      >
        <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        className="ed-mv-sec down"
        title="Nach unten verschieben"
        aria-label="Nach unten verschieben"
        disabled={index === count - 1}
        onClick={() => moveListItem(key, id, 1)}
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
    </>
  );
  /** Hover controls to move a chip (skill/language) left/right. */
  const chipMovers = (index: number, count: number, move: (dir: -1 | 1) => void) => (
    <>
      <button
        type="button"
        className="mv"
        title="Nach links verschieben"
        aria-label="Nach links verschieben"
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        <ChevronLeft className="h-3 w-3" strokeWidth={2.6} />
      </button>
      <button
        type="button"
        className="mv"
        title="Nach rechts verschieben"
        aria-label="Nach rechts verschieben"
        disabled={index === count - 1}
        onClick={() => move(1)}
      >
        <ChevronRight className="h-3 w-3" strokeWidth={2.6} />
      </button>
    </>
  );

  /* ---- section reordering (P4): within the visible column ---- */
  const sectionColumn = (key: ResumeSection): ResumeSection[] => {
    if (design !== 'elegant-sidebar') return sectionOrder;
    const inAside = SIDEBAR_ASIDE_SECTIONS.includes(key);
    return sectionOrder.filter((k) => SIDEBAR_ASIDE_SECTIONS.includes(k) === inAside);
  };
  const canMoveSection = (key: ResumeSection, dir: -1 | 1): boolean => {
    const visible = sectionColumn(key).filter((k) => !removed.has(k));
    const i = visible.indexOf(key);
    return i >= 0 && i + dir >= 0 && i + dir < visible.length;
  };
  const moveSection = (key: ResumeSection, dir: -1 | 1) => {
    const visible = sectionColumn(key).filter((k) => !removed.has(k));
    const i = visible.indexOf(key);
    const target = visible[i + dir];
    if (i < 0 || !target) return;
    const next = [...sectionOrder];
    const a = next.indexOf(key);
    const b = next.indexOf(target);
    next[a] = target;
    next[b] = key;
    setSectionOrder(next);
    setOrderTouched(true);
    onChange(buildResume(lists, meta, next));
  };

  const multiCat = lists.skillCats.length > 1;

  // ── removable sections (P3) ──
  // A section starts hidden when it has no content, mirroring the existing
  // projects/certs auto-hide. Removing a section clears its data (so it drops
  // from the saved résumé + export) and the re-add bar below restores it.
  const [removed, setRemoved] = useState<Set<ResumeSection>>(() => {
    const s = new Set<ResumeSection>();
    if (!value.summary || !htmlToText(value.summary).trim()) s.add('profile');
    if (!value.experiences?.length) s.add('experience');
    if (!value.education?.length) s.add('education');
    if (!value.projects?.length) s.add('projects');
    if (!value.skillCategories?.length) s.add('skills');
    if (!value.languages?.length) s.add('languages');
    if (!value.certifications?.length) s.add('certs');
    return s;
  });
  const removeSection = (key: ResumeSection) => {
    switch (key) {
      case 'profile':
        commitMeta({ summary: '' });
        break;
      case 'experience':
        apply('exp', []);
        break;
      case 'education':
        apply('edu', []);
        break;
      case 'projects':
        apply('projects', []);
        break;
      case 'skills':
        apply('skillCats', []);
        break;
      case 'languages':
        apply('langs', []);
        break;
      case 'certs':
        apply('certs', []);
        break;
    }
    setRemoved((prev) => new Set(prev).add(key));
  };
  const restoreSection = (key: ResumeSection) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    // Seed an empty entry so the restored section is immediately editable.
    if (key === 'experience' && !lists.exp.length) addStation();
    else if (key === 'education' && !lists.edu.length) addEdu();
    else if (key === 'projects' && !lists.projects.length) addProject();
    else if (key === 'skills' && !lists.skillCats.length) addCategory();
    else if (key === 'languages' && !lists.langs.length) addLang();
    else if (key === 'certs' && !lists.certs.length) addCert();
  };

  // ── contact details editor (P2) ──
  const [contactOpen, setContactOpen] = useState(false);
  const displayAddress =
    [meta.street, [meta.postalCode, meta.city].filter(Boolean).join(' '), meta.country]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join(', ') ||
    original.fullAddress ||
    '';

  // ── AI assistants (P5): summary / experience / project ──
  const [aiOpenId, setAiOpenId] = useState<string | null>(null);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  // Bumped when AI rewrites the summary so the uncontrolled <Editable> remounts
  // with the new text (it only seeds its DOM once on mount).
  const [summaryNonce, setSummaryNonce] = useState(0);
  const openAi = (id: string | null) => {
    setAiOpenId(id);
    if (id) setAiInstructions('');
  };
  const runSummaryAi = async () => {
    if (!onGenerateSummary || !aiInstructions.trim()) return;
    setAiBusy(true);
    try {
      const text = await onGenerateSummary({
        instructions: aiInstructions.trim(),
        currentSummary: meta.summary || undefined,
        regenerate: true,
      });
      if (text != null) {
        commitMeta({ summary: htmlToText(text) });
        setSummaryNonce((n) => n + 1);
      }
      openAi(null);
    } finally {
      setAiBusy(false);
    }
  };
  const runExperienceAi = async (item: ExpItem, index: number) => {
    if (!onGenerateExperience || !aiInstructions.trim()) return;
    setAiBusy(true);
    try {
      const html = await onGenerateExperience({
        experienceIndex: index,
        experienceTitle: item.title,
        experienceCompany: item.company,
        experienceDateRange: item.dateRange || undefined,
        currentDescription: bulletsToDesc(item.bullets),
        instructions: aiInstructions.trim(),
        regenerate: true,
      });
      if (html != null) setX(item.id, { bullets: descToBullets(html) });
      openAi(null);
    } finally {
      setAiBusy(false);
    }
  };
  const runProjectAi = async (item: ProjItem, index: number) => {
    if (!onGenerateProject || !aiInstructions.trim()) return;
    setAiBusy(true);
    try {
      const html = await onGenerateProject({
        projectIndex: index,
        projectName: item.name,
        projectDate: item.date || undefined,
        currentDescription: bulletsToDesc(item.bullets),
        instructions: aiInstructions.trim(),
        regenerate: true,
      });
      if (html != null) setP(item.id, { bullets: descToBullets(html) });
      openAi(null);
    } finally {
      setAiBusy(false);
    }
  };

  // ── contact-details popover (shared by all skins) ──
  const field = (label: string, val: string, on: (v: string) => void, ph?: string) => (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <Input value={val} placeholder={ph} onChange={(e) => on(e.target.value)} className="h-8 text-sm" />
    </div>
  );
  const contactPopover = (
    <Popover open={contactOpen} onOpenChange={setContactOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="rd-contact-edit" title="Kontaktdaten bearbeiten">
          <Pencil className="h-3 w-3" /> Kontaktdaten
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 space-y-2.5">
        <p className="text-sm font-semibold">Kontaktdaten bearbeiten</p>
        {field('E-Mail', meta.email, (v) => commitMeta({ email: v }), 'du@example.com')}
        {field('Telefon', meta.phone, (v) => commitMeta({ phone: v }), '+49 …')}
        {field('LinkedIn (URL)', meta.linkedin, (v) => commitMeta({ linkedin: v }), 'https://linkedin.com/in/…')}
        {field('GitHub (URL)', meta.github, (v) => commitMeta({ github: v }), 'https://github.com/…')}
        <div className="grid grid-cols-2 gap-2">
          {field('Straße', meta.street, (v) => commitMeta({ street: v }))}
          {field('PLZ', meta.postalCode, (v) => commitMeta({ postalCode: v }))}
          {field('Stadt', meta.city, (v) => commitMeta({ city: v }))}
          {field('Land', meta.country, (v) => commitMeta({ country: v }))}
        </div>
      </PopoverContent>
    </Popover>
  );

  // ── shared section header with move + remove buttons (P3/P4) ──
  const sectionTitle = (label: string, key: ResumeSection, extra?: React.ReactNode) => (
    <div className="rd-sec-title" style={{ color: accent }}>
      {label}
      <span className="rd-sec-actions">
        {extra}
        <button
          type="button"
          className="rd-sec-mv"
          title={`${label} nach oben verschieben`}
          aria-label={`${label} nach oben verschieben`}
          disabled={!canMoveSection(key, -1)}
          onClick={() => moveSection(key, -1)}
        >
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="rd-sec-mv"
          title={`${label} nach unten verschieben`}
          aria-label={`${label} nach unten verschieben`}
          disabled={!canMoveSection(key, 1)}
          onClick={() => moveSection(key, 1)}
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="rd-sec-rm"
          title={`${label} entfernen`}
          aria-label={`${label} entfernen`}
          onClick={() => removeSection(key)}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </span>
    </div>
  );

  // ── section renderers (shared across the three skins) ──
  const profileSection = removed.has('profile') ? null : (
    <div className="rd-sec">
      {sectionTitle(
        'Profil',
        'profile',
        onGenerateSummary ? (
          <AiAssistantPopover
            open={aiOpenId === 'summary'}
            onOpenChange={(o) => openAi(o ? 'summary' : null)}
            instructions={aiInstructions}
            onInstructionsChange={setAiInstructions}
            onApply={runSummaryAi}
            isLoading={aiBusy}
            title="KI: Profil"
            description="Beschreibe, wie dein Profil angepasst werden soll."
            placeholder="Z.B.: Betone meine Führungserfahrung stärker..."
            applyButtonText="Profil anpassen"
            buttonSize="sm"
            buttonVariant="ghost"
            buttonClassName="h-7 px-2 text-xs text-primary hover:bg-primary/10"
          />
        ) : null,
      )}
      <Editable key={`sum-${summaryNonce}`} className="rd-p" initial={meta.summary} placeholder="Kurzes Profil über dich …" onCommit={(v) => commitMeta({ summary: v })} />
    </div>
  );

  const experienceSection = removed.has('experience') ? null : (
    <div className="rd-sec">
      {sectionTitle('Berufserfahrung', 'experience')}
      {lists.exp.map((x, index) => (
        <div className="rd-item" key={x.id}>
          {itemMovers('exp', x.id, index, lists.exp.length)}
          <button className="ed-rm-sec" title="Station entfernen" onClick={() => rmStation(x.id)}>
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
          <div className="rd-item-top">
            <Editable className="rd-item-title" oneline initial={x.title} placeholder="Position" onCommit={(v) => setX(x.id, { title: v })} />
            <Editable className="rd-item-date" oneline initial={x.dateRange} placeholder="Zeitraum" onCommit={(v) => setX(x.id, { dateRange: v })} />
          </div>
          <Editable className="rd-item-org" oneline initial={x.company} placeholder="Unternehmen" onCommit={(v) => setX(x.id, { company: v })} />
          <ul className="rd-ul">
            {x.bullets.map((b) => (
              <li className="rd-li" key={b.id}>
                <span className="bullet" style={{ color: accent }}>•</span>
                <Editable className="rd-li-txt" oneline initial={b.text} placeholder="Was hast du erreicht?" onCommit={(v) => setBullet(x.id, b.id, v)} />
                <button className="rm" title="Stichpunkt entfernen" onClick={() => rmBullet(x.id, b.id)}>
                  <X className="h-3 w-3" strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
          <div className="rd-item-actions">
            <button className="ed-add" onClick={() => addBullet(x.id)}>
              <Plus className="h-3 w-3" strokeWidth={2.6} /> Stichpunkt
            </button>
            {onGenerateExperience && (
              <AiAssistantPopover
                open={aiOpenId === `exp:${x.id}`}
                onOpenChange={(o) => openAi(o ? `exp:${x.id}` : null)}
                instructions={aiInstructions}
                onInstructionsChange={setAiInstructions}
                onApply={() => runExperienceAi(x, index)}
                isLoading={aiBusy}
                title="KI: Beschreibung"
                description="Beschreibe, wie diese Station angepasst werden soll."
                placeholder="Z.B.: Mehr messbare Erfolge, kürzer..."
                applyButtonText="Beschreibung anpassen"
                buttonSize="sm"
                buttonVariant="ghost"
                buttonClassName="h-7 px-2 text-xs text-primary hover:bg-primary/10"
              />
            )}
          </div>
        </div>
      ))}
      <button className="ed-add big" onClick={addStation}>
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Station hinzufügen
      </button>
    </div>
  );

  const educationSection = removed.has('education') ? null : (
    <div className="rd-sec">
      {sectionTitle('Ausbildung', 'education')}
      {lists.edu.map((e, index) => (
        <div className="rd-item" key={e.id}>
          {itemMovers('edu', e.id, index, lists.edu.length)}
          <button className="ed-rm-sec" title="Eintrag entfernen" onClick={() => rmEdu(e.id)}>
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
          <div className="rd-item-top">
            <Editable className="rd-item-title" oneline initial={e.degree} placeholder="Abschluss" onCommit={(v) => setE(e.id, { degree: v })} />
            <Editable className="rd-item-date" oneline initial={e.year} placeholder="Jahr" onCommit={(v) => setE(e.id, { year: v })} />
          </div>
          <Editable className="rd-item-org" oneline initial={e.institution} placeholder="Institution" onCommit={(v) => setE(e.id, { institution: v })} />
        </div>
      ))}
      <button className="ed-add big" onClick={addEdu}>
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Eintrag hinzufügen
      </button>
    </div>
  );

  const projectsSection = removed.has('projects') ? null : (
      <div className="rd-sec">
        {sectionTitle('Projekte', 'projects')}
        {lists.projects.map((x, index) => (
          <div className="rd-item" key={x.id}>
            {itemMovers('projects', x.id, index, lists.projects.length)}
            <button className="ed-rm-sec" title="Projekt entfernen" onClick={() => rmProject(x.id)}>
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <div className="rd-item-top">
              <Editable className="rd-item-title" oneline initial={x.name} placeholder="Projektname" onCommit={(v) => setP(x.id, { name: v })} />
              <Editable className="rd-item-date" oneline initial={x.date} placeholder="Zeitraum" onCommit={(v) => setP(x.id, { date: v })} />
            </div>
            <ul className="rd-ul">
              {x.bullets.map((b) => (
                <li className="rd-li" key={b.id}>
                  <span className="bullet" style={{ color: accent }}>•</span>
                  <Editable className="rd-li-txt" oneline initial={b.text} placeholder="Was hast du gemacht?" onCommit={(v) => setProjBullet(x.id, b.id, v)} />
                  <button className="rm" title="Stichpunkt entfernen" onClick={() => rmProjBullet(x.id, b.id)}>
                    <X className="h-3 w-3" strokeWidth={2.4} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="rd-item-actions">
              <button className="ed-add" onClick={() => addProjBullet(x.id)}>
                <Plus className="h-3 w-3" strokeWidth={2.6} /> Stichpunkt
              </button>
              {onGenerateProject && (
                <AiAssistantPopover
                  open={aiOpenId === `proj:${x.id}`}
                  onOpenChange={(o) => openAi(o ? `proj:${x.id}` : null)}
                  instructions={aiInstructions}
                  onInstructionsChange={setAiInstructions}
                  onApply={() => runProjectAi(x, index)}
                  isLoading={aiBusy}
                  title="KI: Projekt"
                  description="Beschreibe, wie dieses Projekt angepasst werden soll."
                  placeholder="Z.B.: Betone den Impact..."
                  applyButtonText="Projekt anpassen"
                  buttonSize="sm"
                  buttonVariant="ghost"
                  buttonClassName="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                />
              )}
            </div>
          </div>
        ))}
        <button className="ed-add big" onClick={addProject}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Projekt hinzufügen
        </button>
      </div>
    );

  const skillsSection = removed.has('skills') ? null : (
    <div className="rd-sec">
      {sectionTitle('Fähigkeiten', 'skills')}
      {lists.skillCats.map((c, catIndex) => (
        <div key={c.id}>
          {multiCat && (
            <div className="rd-cat-row">
              <Editable className="rd-skill-cat" oneline initial={c.type} placeholder="Kategorie" onCommit={(v) => setCatType(c.id, v)} />
              <span className="rd-cat-tools">
                <button
                  type="button"
                  className="mv"
                  title="Kategorie nach oben verschieben"
                  aria-label="Kategorie nach oben verschieben"
                  disabled={catIndex === 0}
                  onClick={() => moveListItem('skillCats', c.id, -1)}
                >
                  <ChevronUp className="h-3 w-3" strokeWidth={2.6} />
                </button>
                <button
                  type="button"
                  className="mv"
                  title="Kategorie nach unten verschieben"
                  aria-label="Kategorie nach unten verschieben"
                  disabled={catIndex === lists.skillCats.length - 1}
                  onClick={() => moveListItem('skillCats', c.id, 1)}
                >
                  <ChevronDown className="h-3 w-3" strokeWidth={2.6} />
                </button>
              </span>
            </div>
          )}
          <div className="rd-skills" style={{ marginBottom: 8 }}>
            {c.skills.map((s, sIndex) => (
              <span className="rd-skill" key={s.id}>
                <Editable tag="span" oneline initial={s.text} placeholder="Skill" onCommit={(v) => setSkillText(c.id, s.id, v)} />
                {chipMovers(sIndex, c.skills.length, (dir) => moveSkill(c.id, s.id, dir))}
                <button className="rm" title="Entfernen" onClick={() => rmSkill(c.id, s.id)}>
                  <X className="h-3 w-3" strokeWidth={2.6} />
                </button>
              </span>
            ))}
            <span className="ed-skill-add">
              <input
                value={skillDraft[c.id] || ''}
                onChange={(e) => setSkillDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                placeholder="Skill hinzufügen…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addSkill(c.id);
                }}
              />
              <button onClick={() => addSkill(c.id)} title="Hinzufügen">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              </button>
            </span>
          </div>
        </div>
      ))}
      <button className="ed-add" onClick={addCategory}>
        <Plus className="h-3 w-3" strokeWidth={2.6} /> Kategorie
      </button>
    </div>
  );

  const languagesSection = removed.has('languages') ? null : (
    <div className="rd-sec">
      {sectionTitle('Sprachen', 'languages')}
      <div className="rd-skills">
        {lists.langs.map((l, index) => (
          <span className="rd-skill" key={l.id}>
            <Editable tag="span" oneline initial={l.name} placeholder="Sprache" onCommit={(v) => setLang(l.id, { name: v })} />
            <Editable tag="span" oneline initial={l.level} placeholder="Niveau" onCommit={(v) => setLang(l.id, { level: v })} className="text-muted-foreground" />
            {chipMovers(index, lists.langs.length, (dir) => moveListItem('langs', l.id, dir))}
            <button className="rm" title="Entfernen" onClick={() => rmLang(l.id)}>
              <X className="h-3 w-3" strokeWidth={2.6} />
            </button>
          </span>
        ))}
        <button className="ed-add" onClick={addLang}>
          <Plus className="h-3 w-3" strokeWidth={2.6} /> Sprache
        </button>
      </div>
    </div>
  );

  const certsSection = removed.has('certs') ? null : (
      <div className="rd-sec">
        {sectionTitle('Zertifikate', 'certs')}
        {lists.certs.map((c, index) => (
          <div className="rd-item" key={c.id}>
            {itemMovers('certs', c.id, index, lists.certs.length)}
            <button className="ed-rm-sec" title="Eintrag entfernen" onClick={() => rmCert(c.id)}>
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <div className="rd-item-top">
              <Editable className="rd-item-title" oneline initial={c.name} placeholder="Zertifikat" onCommit={(v) => setC(c.id, { name: v })} />
              <Editable className="rd-item-date" oneline initial={c.date} placeholder="Datum" onCommit={(v) => setC(c.id, { date: v })} />
            </div>
            <Editable className="rd-item-org" oneline initial={c.issuer} placeholder="Aussteller" onCommit={(v) => setC(c.id, { issuer: v })} />
          </div>
        ))}
        <button className="ed-add big" onClick={addCert}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Zertifikat hinzufügen
        </button>
      </div>
    );

  const contactLine = [displayAddress, meta.phone, meta.email, meta.linkedin && 'LinkedIn', meta.github && 'GitHub']
    .filter(Boolean)
    .join('  ·  ');

  // Sections rendered in the user-chosen order (P4).
  const sectionNodes: Record<ResumeSection, React.ReactNode> = {
    profile: profileSection,
    experience: experienceSection,
    education: educationSection,
    projects: projectsSection,
    skills: skillsSection,
    languages: languagesSection,
    certs: certsSection,
  };
  const orderedSections = (keys: ResumeSection[]) =>
    sectionOrder
      .filter((k) => keys.includes(k))
      .map((k) => <Fragment key={k}>{sectionNodes[k]}</Fragment>);

  const isSidebar = design === 'elegant-sidebar';
  const rootClass = isSidebar ? 'rd--sidebar' : design === 'harvard-classic' ? 'rd--harvard' : 'rd--classic';
  const sidebarTint = `color-mix(in srgb, ${accent} 10%, #ffffff)`;

  // Approximate the export design settings on the mimic: font scale as CSS
  // zoom (the rd skins are px-based), family as a web-safe stack, density
  // via the rd--density-* rhythm overrides in globals.css.
  const previewZoom = PREVIEW_FONT_SCALE[designSettings?.fontScale ?? 'md'] ?? 1;
  const previewFamily = designSettings?.fontFamily
    ? PREVIEW_FONT_FAMILY[designSettings.fontFamily]
    : undefined;
  const densityClass =
    designSettings?.density === 'compact'
      ? 'rd--density-compact'
      : designSettings?.density === 'relaxed'
        ? 'rd--density-relaxed'
        : undefined;
  const docStyle: React.CSSProperties = {
    ...(previewZoom !== 1 ? { zoom: previewZoom } : {}),
    ...(previewFamily ? { fontFamily: previewFamily } : {}),
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className={cn('rd', rootClass, densityClass)} style={docStyle}>
        {isSidebar ? (
          <>
            <div className="rd-topbar" style={{ background: accent }}>
              <Editable className="rd-name" oneline initial={meta.name} placeholder="Dein Name" onCommit={(v) => commitMeta({ name: v })} />
              <Editable className="rd-role" oneline initial={meta.role} placeholder="Angestrebte Position" onCommit={(v) => commitMeta({ role: v })} />
            </div>
            <div className="rd-row">
              <aside className="rd-aside" style={{ background: sidebarTint }}>
                <div className="rd-sec">
                  <div className="rd-sec-title" style={{ color: accent }}>
                    Kontakt
                    <span className="rd-sec-ai">{contactPopover}</span>
                  </div>
                  {displayAddress && <div className="rd-contact-item">{displayAddress}</div>}
                  {meta.phone && <div className="rd-contact-item">{meta.phone}</div>}
                  {meta.email && <div className="rd-contact-item">{meta.email}</div>}
                  {meta.linkedin && <div className="rd-contact-item">LinkedIn</div>}
                  {meta.github && <div className="rd-contact-item">GitHub</div>}
                </div>
                {orderedSections(SIDEBAR_ASIDE_SECTIONS)}
              </aside>
              <div className="rd-main">
                {orderedSections(
                  DEFAULT_SECTION_ORDER.filter((k) => !SIDEBAR_ASIDE_SECTIONS.includes(k)),
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rd-head">
              <Editable className="rd-name" oneline initial={meta.name} placeholder="Dein Name" onCommit={(v) => commitMeta({ name: v })} style={{ color: accent }} />
              {design === 'harvard-classic' && <div className="rd-divider" style={{ borderColor: accent }} />}
              <Editable className="rd-role" oneline initial={meta.role} placeholder="Angestrebte Position" onCommit={(v) => commitMeta({ role: v })} />
              <div className="rd-contact">
                {contactLine && <span>{contactLine}</span>}
                {contactPopover}
              </div>
            </div>
            <div className="rd-body">{orderedSections(DEFAULT_SECTION_ORDER)}</div>
          </>
        )}
      </div>

      {/* section re-add bar — lists every removed section so the user can
          bring any of them back (P3) */}
      {removed.size > 0 && (
        <div className="mx-auto mt-4 flex max-w-[820px] flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Edit3 className="h-3.5 w-3.5" /> Abschnitt hinzufügen:
          </span>
          {RESUME_SECTIONS.filter((s) => removed.has(s.key)).map((s) => (
            <button key={s.key} className="ed-add" onClick={() => restoreSection(s.key)}>
              <Plus className="h-3 w-3" strokeWidth={2.6} /> {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
