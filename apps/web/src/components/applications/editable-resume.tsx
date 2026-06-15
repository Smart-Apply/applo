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

import { useEffect, useRef, useState } from 'react';
import { X, Plus, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ResumeData,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
  ResumeCertification,
  ResumeSkillCategory,
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
}: {
  initial: string;
  onCommit: (v: string) => void;
  tag?: 'div' | 'span';
  className?: string;
  placeholder?: string;
  oneline?: boolean;
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

function SecHead({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="ed-sec-h">
      <span className="ln" style={{ background: accent }} />
      {children}
    </div>
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
}

interface EditableResumeProps {
  value: ResumeData;
  onChange: (next: ResumeData) => void;
  accent: string;
}

export function EditableResume({ value, onChange, accent }: EditableResumeProps) {
  // Frozen snapshot for passthrough of untouched top-level fields + the address.
  const [original] = useState(() => value);
  const address = original.fullAddress || '';

  const [meta, setMeta] = useState<Meta>(() => ({
    name: value.candidateName || '',
    role: value.targetJobTitle || '',
    summary: value.summary ? htmlToText(value.summary) : '',
    email: value.email || '',
    phone: value.phone || '',
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

  const buildResume = (l: Lists, m: Meta): ResumeData => ({
    ...original,
    candidateName: m.name,
    targetJobTitle: m.role || original.targetJobTitle,
    email: m.email,
    phone: m.phone,
    summary: m.summary || undefined,
    experiences: l.exp.map((x) => ({
      ...x.src,
      title: x.title,
      company: x.company,
      dateRange: x.dateRange,
      description: bulletsToDesc(x.bullets),
      achievements: [],
    })),
    education: l.edu.map((e) => ({ ...e.src, degree: e.degree, institution: e.institution, year: e.year })),
    projects: l.projects.map((p) => ({
      ...p.src,
      name: p.name,
      date: p.date || undefined,
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

  const multiCat = lists.skillCats.length > 1;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="ed-doc">
        <div className="ed-band" style={{ background: accent }}>
          <Editable className="ed-name" oneline initial={meta.name} placeholder="Dein Name" onCommit={(v) => commitMeta({ name: v })} />
          <Editable className="ed-role" oneline initial={meta.role} placeholder="Angestrebte Position" onCommit={(v) => commitMeta({ role: v })} />
        </div>

        <div className="ed-contact">
          {address && <span>{address} · </span>}
          <Editable tag="span" oneline initial={meta.email} placeholder="E-Mail" onCommit={(v) => commitMeta({ email: v })} />
          {' · '}
          <Editable tag="span" oneline initial={meta.phone} placeholder="Telefon" onCommit={(v) => commitMeta({ phone: v })} />
        </div>

        <div className="ed-body">
          {/* Profil */}
          <div className="ed-sec">
            <SecHead accent={accent}>Profil</SecHead>
            <Editable className="ed-p" initial={meta.summary} placeholder="Kurzes Profil über dich …" onCommit={(v) => commitMeta({ summary: v })} />
          </div>

          {/* Berufserfahrung */}
          <div className="ed-sec">
            <SecHead accent={accent}>Berufserfahrung</SecHead>
            {lists.exp.map((x) => (
              <div className="ed-xp" key={x.id}>
                <button className="ed-rm-sec" title="Station entfernen" onClick={() => rmStation(x.id)}>
                  <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
                <div className="ed-xp-top">
                  <Editable className="ed-xp-role" oneline initial={x.title} placeholder="Position" onCommit={(v) => setX(x.id, { title: v })} />
                  <Editable className="ed-xp-date" oneline initial={x.dateRange} placeholder="Zeitraum" onCommit={(v) => setX(x.id, { dateRange: v })} />
                </div>
                <Editable className="ed-xp-org" oneline initial={x.company} placeholder="Unternehmen" onCommit={(v) => setX(x.id, { company: v })} />
                <ul className="ed-ul">
                  {x.bullets.map((b) => (
                    <li className="ed-li" key={b.id}>
                      <span className="bullet" style={{ color: accent }}>•</span>
                      <Editable className="ed-li-txt" oneline initial={b.text} placeholder="Was hast du erreicht?" onCommit={(v) => setBullet(x.id, b.id, v)} />
                      <button className="rm" title="Stichpunkt entfernen" onClick={() => rmBullet(x.id, b.id)}>
                        <X className="h-3 w-3" strokeWidth={2.4} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button className="ed-add" onClick={() => addBullet(x.id)}>
                  <Plus className="h-3 w-3" strokeWidth={2.6} /> Stichpunkt
                </button>
              </div>
            ))}
            <button className="ed-add big" onClick={addStation}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Station hinzufügen
            </button>
          </div>

          {/* Ausbildung */}
          <div className="ed-sec">
            <SecHead accent={accent}>Ausbildung</SecHead>
            {lists.edu.map((e) => (
              <div className="ed-edu" key={e.id}>
                <button className="ed-rm-sec" title="Eintrag entfernen" onClick={() => rmEdu(e.id)}>
                  <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
                <div className="ed-xp-top">
                  <Editable className="ed-xp-role" oneline initial={e.degree} placeholder="Abschluss" onCommit={(v) => setE(e.id, { degree: v })} />
                  <Editable className="ed-xp-date" oneline initial={e.year} placeholder="Jahr" onCommit={(v) => setE(e.id, { year: v })} />
                </div>
                <Editable className="ed-xp-org" oneline initial={e.institution} placeholder="Institution" onCommit={(v) => setE(e.id, { institution: v })} />
              </div>
            ))}
            <button className="ed-add big" onClick={addEdu}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> Eintrag hinzufügen
            </button>
          </div>

          {/* Projekte */}
          {lists.projects.length > 0 && (
            <div className="ed-sec">
              <SecHead accent={accent}>Projekte</SecHead>
              {lists.projects.map((x) => (
                <div className="ed-xp" key={x.id}>
                  <button className="ed-rm-sec" title="Projekt entfernen" onClick={() => rmProject(x.id)}>
                    <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <div className="ed-xp-top">
                    <Editable className="ed-xp-role" oneline initial={x.name} placeholder="Projektname" onCommit={(v) => setP(x.id, { name: v })} />
                    <Editable className="ed-xp-date" oneline initial={x.date} placeholder="Zeitraum" onCommit={(v) => setP(x.id, { date: v })} />
                  </div>
                  <ul className="ed-ul">
                    {x.bullets.map((b) => (
                      <li className="ed-li" key={b.id}>
                        <span className="bullet" style={{ color: accent }}>•</span>
                        <Editable className="ed-li-txt" oneline initial={b.text} placeholder="Was hast du gemacht?" onCommit={(v) => setProjBullet(x.id, b.id, v)} />
                        <button className="rm" title="Stichpunkt entfernen" onClick={() => rmProjBullet(x.id, b.id)}>
                          <X className="h-3 w-3" strokeWidth={2.4} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button className="ed-add" onClick={() => addProjBullet(x.id)}>
                    <Plus className="h-3 w-3" strokeWidth={2.6} /> Stichpunkt
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fähigkeiten */}
          <div className="ed-sec">
            <SecHead accent={accent}>Fähigkeiten</SecHead>
            {lists.skillCats.map((c) => (
              <div key={c.id}>
                {multiCat && (
                  <Editable className="ed-skill-cat" oneline initial={c.type} placeholder="Kategorie" onCommit={(v) => setCatType(c.id, v)} />
                )}
                <div className="ed-skills" style={{ marginBottom: 10 }}>
                  {c.skills.map((s) => (
                    <span className="ed-skill" key={s.id}>
                      <Editable tag="span" oneline initial={s.text} placeholder="Skill" onCommit={(v) => setSkillText(c.id, s.id, v)} />
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

          {/* Sprachen */}
          <div className="ed-sec">
            <SecHead accent={accent}>Sprachen</SecHead>
            <div className="ed-skills">
              {lists.langs.map((l) => (
                <span className="ed-skill" key={l.id}>
                  <Editable tag="span" oneline initial={l.name} placeholder="Sprache" onCommit={(v) => setLang(l.id, { name: v })} />
                  <Editable tag="span" oneline initial={l.level} placeholder="Niveau" onCommit={(v) => setLang(l.id, { level: v })} className="text-muted-foreground" />
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

          {/* Zertifikate */}
          {lists.certs.length > 0 && (
            <div className="ed-sec">
              <SecHead accent={accent}>Zertifikate</SecHead>
              {lists.certs.map((c) => (
                <div className="ed-edu" key={c.id}>
                  <button className="ed-rm-sec" title="Eintrag entfernen" onClick={() => rmCert(c.id)}>
                    <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <div className="ed-xp-top">
                    <Editable className="ed-xp-role" oneline initial={c.name} placeholder="Zertifikat" onCommit={(v) => setC(c.id, { name: v })} />
                    <Editable className="ed-xp-date" oneline initial={c.date} placeholder="Datum" onCommit={(v) => setC(c.id, { date: v })} />
                  </div>
                  <Editable className="ed-xp-org" oneline initial={c.issuer} placeholder="Aussteller" onCommit={(v) => setC(c.id, { issuer: v })} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* optional-section adders under the doc */}
      <div className="mx-auto mt-4 flex max-w-[820px] flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Edit3 className="h-3.5 w-3.5" /> Optionale Abschnitte:
        </span>
        {lists.projects.length === 0 && (
          <button className="ed-add" onClick={addProject}>
            <Plus className="h-3 w-3" strokeWidth={2.6} /> Projekte
          </button>
        )}
        {lists.certs.length === 0 && (
          <button className="ed-add" onClick={addCert}>
            <Plus className="h-3 w-3" strokeWidth={2.6} /> Zertifikate
          </button>
        )}
      </div>
    </div>
  );
}
