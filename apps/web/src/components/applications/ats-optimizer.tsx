'use client';

/**
 * ats-optimizer.tsx — the "Optimieren" tab: a guided keyword editor.
 *
 * Ports the docs/design prototype's `AtsOptimizer` + `ScoreRing` + `CvOptiView`,
 * wired to REAL data from `useKeywordsAnalysis`. Left: a compact live CV with
 * matched keywords highlighted. Right: score ring + Applo coach + missing-keyword
 * "Hinzufügen" cards + already-covered list.
 *
 * Honest scoring (no fake bump): "Hinzufügen" calls `onAddKeyword`, which the page
 * inserts into the résumé (a "Weitere Kenntnisse" skill category) and auto-saves —
 * the term then shows up in the live CV. The score only moves on "Neu analysieren",
 * which re-runs the real analysis via `useAnalyzeKeywords`.
 */

import { useState } from 'react';
import {
  Target,
  FileText,
  Eye,
  Check,
  Plus,
  RefreshCw,
  Lightbulb,
  Download,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApploRig } from '@/components/ui/applo-rig';
import { useKeywordsAnalysis, useAnalyzeKeywords } from '@/hooks/use-applications';
import { cn } from '@/lib/utils';
import type { ResumeData, KeywordMatch, KeywordCategory } from '@/types';

const CATEGORY_LABEL: Record<KeywordCategory, string> = {
  core: 'Kernkompetenz',
  soft: 'Soft Skill',
  responsibility: 'Aufgabe',
  requirement: 'Anforderung',
  methodology: 'Methodik / Tool',
  industry: 'Branche',
  seniority: 'Level',
  misc: 'Sonstiges',
};

type Tone = 'green' | 'amber' | 'red';
function tone(score: number): Tone {
  return score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';
}
const TONE_COLOR: Record<Tone, string> = { green: '#16a34a', amber: '#e0951a', red: '#dc2626' };

function htmlToText(html?: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').trim();
}
function descToLines(html?: string): string[] {
  if (!html) return [];
  const li = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (li.length) return li.map((m) => htmlToText(m[1])).filter(Boolean);
  const text = htmlToText(html);
  return text ? [text] : [];
}

/** Highlight known terms inside plain text. */
function hl(text: string, terms: string[]): React.ReactNode {
  if (!terms.length || !text) return text;
  const esc = terms
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!esc.length) return text;
  const re = new RegExp('(' + esc.join('|') + ')', 'gi');
  return text.split(re).map((p, i) =>
    terms.some((t) => t.toLowerCase() === p.toLowerCase()) ? (
      <mark key={i} className="kw-hl">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function ScoreRing({ value, size = 124 }: { value: number; size?: number }) {
  const sw = 11;
  const R = (size - sw) / 2;
  const C = 2 * Math.PI * R;
  const off = C * (1 - value / 100);
  const col = TONE_COLOR[tone(value)];
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#eef1f6" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke={col}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.34,1.2,.5,1), stroke .4s' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: size * 0.3, fontWeight: 850, lineHeight: 1, letterSpacing: '-.03em', color: col }}>
            {Math.round(value)}%
          </div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--muted-2)',
              marginTop: 3,
            }}
          >
            Match
          </div>
        </div>
      </div>
    </div>
  );
}

/** Readable, highlightable CV working copy (left pane). */
function CvOptiView({
  resume,
  accent,
  foundTerms,
  addedTerms,
}: {
  resume: ResumeData;
  accent: string;
  foundTerms: string[];
  addedTerms: string[];
}) {
  const isHl = (s: string) =>
    foundTerms.some((f) => f.toLowerCase() === s.toLowerCase()) ||
    addedTerms.some((f) => f.toLowerCase() === s.toLowerCase());
  const isNew = (s: string) => addedTerms.some((f) => f.toLowerCase() === s.toLowerCase());
  const allSkills = (resume.skillCategories || []).flatMap((c) => c.skills);

  return (
    <div className="cv-doc">
      <div className="cv-band" style={{ background: accent }}>
        <div className="nm">{resume.candidateName}</div>
        {resume.targetJobTitle && <div className="rl">{resume.targetJobTitle}</div>}
      </div>
      <div className="cv-contact">
        {[resume.fullAddress, resume.email, resume.phone].filter(Boolean).join(' · ')}
      </div>
      <div className="cv-body">
        {resume.summary && (
          <div className="cv-sec">
            <div className="h">
              <span className="ln" style={{ background: accent }} />
              Profil
            </div>
            <p className="cv-p">{hl(htmlToText(resume.summary), foundTerms)}</p>
          </div>
        )}

        {(resume.experiences || []).length > 0 && (
          <div className="cv-sec">
            <div className="h">
              <span className="ln" style={{ background: accent }} />
              Berufserfahrung
            </div>
            {(resume.experiences || []).slice(0, 2).map((x, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="cv-exp-role" style={{ color: accent }}>
                  {x.title}
                </div>
                <div className="cv-exp-org">
                  {[x.company, x.dateRange].filter(Boolean).join(' · ')}
                </div>
                <ul className="cv-ul">
                  {descToLines(x.description).map((b, j) => (
                    <li key={j}>{hl(b, foundTerms)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {allSkills.length > 0 && (
          <div className="cv-sec">
            <div className="h">
              <span className="ln" style={{ background: accent }} />
              Fähigkeiten
            </div>
            <div className="cv-chips">
              {allSkills.map((s, i) => (
                <span key={i} className={cn('cv-chip', isHl(s) && 'hl', isNew(s) && 'new')}>
                  {s}
                  {isNew(s) && <span className="neu">NEU</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AtsOptimizerProps {
  applicationId: string;
  resume: ResumeData;
  accent: string;
  /** Insert a keyword into the résumé (page adds it to skills + auto-saves). */
  onAddKeyword: (term: string) => void;
  /** Export trigger from the page (footer CTA). */
  onExport?: () => void;
  exportDisabled?: boolean;
}

export function AtsOptimizer({
  applicationId,
  resume,
  accent,
  onAddKeyword,
  onExport,
  exportDisabled,
}: AtsOptimizerProps) {
  const { data: analysis, isLoading, error, refetch } = useKeywordsAnalysis(applicationId);
  const analyzeKeywords = useAnalyzeKeywords(applicationId);

  // Keywords the user added this session but hasn't re-analysed yet.
  const [added, setAdded] = useState<string[]>([]);

  const reanalyze = async () => {
    await analyzeKeywords.mutateAsync();
    await refetch();
    setAdded([]); // fresh analysis reflects them as matched now
  };

  if (isLoading) {
    return (
      <div className="opti-split">
        <Skeleton className="h-[420px] w-full rounded-2xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 text-sm font-semibold">ATS-Analyse starten</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Finde heraus, welche Begriffe aus der Stelle in deinem Lebenslauf fehlen.
        </p>
        <Button size="sm" onClick={reanalyze} disabled={analyzeKeywords.isPending}>
          {analyzeKeywords.isPending ? (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analysiere…
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Analysieren
            </>
          )}
        </Button>
      </div>
    );
  }

  const matched = analysis.matchedKeywords;
  const missing = analysis.missingKeywords;
  const total = matched.length + missing.length || 1;
  const score = analysis.matchAnalysis.overallScore;

  const addedSet = new Set(added.map((a) => a.toLowerCase()));
  const remaining = missing.filter((m) => !addedSet.has(m.keyword.toLowerCase()));
  const pendingAdded = missing.filter((m) => addedSet.has(m.keyword.toLowerCase()));

  const coveredCount = matched.length + added.length;
  const coverage = Math.round((coveredCount / total) * 100);
  const done = missing.length === 0;
  const allAddedPending = remaining.length === 0 && pendingAdded.length > 0;

  const foundTerms = matched.map((m) => m.keyword);
  const addedTerms = added;

  const add = (term: string) => {
    if (addedSet.has(term.toLowerCase())) return;
    setAdded((a) => [...a, term]);
    onAddKeyword(term);
  };
  const addAll = () => {
    remaining.forEach((m) => add(m.keyword));
  };

  const reAnalyzing = analyzeKeywords.isPending;

  return (
    <div className="opti-split h-full">
      {/* LEFT — live CV working copy */}
      <div className="opti-pane">
        <div className="opti-pane-head">
          <div>
            <div className="t">
              <FileText className="h-[18px] w-[18px]" /> Dein Lebenslauf
            </div>
            <div className="sub">
              <span className="hl-legend" /> grün = von der Stelle erkannte Begriffe
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Live-Vorschau
          </span>
        </div>
        <div className="opti-body" style={{ background: 'var(--surface-2)' }}>
          <CvOptiView resume={resume} accent={accent} foundTerms={foundTerms} addedTerms={addedTerms} />
        </div>
      </div>

      {/* RIGHT — ATS coach + keyword actions */}
      <div className="opti-pane">
        <div className="opti-pane-head">
          <div>
            <div className="t">
              <Target className="h-[18px] w-[18px]" /> ATS-Optimierung
            </div>
            <div className="sub">So kommt dein Lebenslauf durch die Bewerber-Filter</div>
          </div>
          <Button variant="ghost" size="sm" onClick={reanalyze} disabled={reAnalyzing} className="h-8 px-2 text-xs">
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', reAnalyzing && 'animate-spin')} />
            Neu analysieren
          </Button>
        </div>

        <div className="opti-body">
          {/* hero: ring + Applo coach */}
          <div className="opti-hero">
            <div className="ringwrap">
              <ScoreRing value={score} />
            </div>
            <div className="coach">
              <div className="av">
                <ApploRig state={done ? 'success' : 'idle'} size={52} />
              </div>
              <div className="msg">
                {done ? (
                  <>
                    Perfekt! Dein Lebenslauf enthält jetzt <b>alle wichtigen Begriffe</b> – du bist
                    ATS-bereit. 🎉
                  </>
                ) : allAddedPending ? (
                  <>
                    Stark! Du hast alle Begriffe ergänzt. Klicke <b>Neu analysieren</b>, um deinen
                    Score zu aktualisieren.
                  </>
                ) : added.length > 0 ? (
                  <>
                    Weiter so! Noch <b>{remaining.length} Begriff{remaining.length > 1 ? 'e' : ''}</b>,
                    dann hast du alle übernommen.
                  </>
                ) : (
                  <>
                    Dein Lebenslauf passt zu <b>{Math.round(score)}%</b> auf diese Stelle. Übernimm die{' '}
                    <b>{remaining.length} fehlenden Begriffe</b>, um besser durch die Filter zu kommen.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* learnability note */}
          <div className="ats-explain">
            <Lightbulb className="h-4 w-4" />
            <span>
              <b>Was ist das?</b> Firmen filtern Bewerbungen mit einer Software (ATS) nach Begriffen
              aus der Stelle. Je mehr passende Begriffe dein Lebenslauf enthält, desto eher landest
              du im Interview.
            </span>
          </div>

          {/* coverage bar */}
          <div className="cov">
            <div className="barlbl">
              <span>Schlüsselbegriffe abgedeckt</span>
              <span style={{ color: TONE_COLOR[tone(coverage)] }}>
                {coveredCount} / {total}
              </span>
            </div>
            <div className="bar">
              <span style={{ width: coverage + '%', background: TONE_COLOR[tone(coverage)] }} />
            </div>
          </div>

          {/* missing keywords — the hero action */}
          {remaining.length > 0 && (
            <>
              <div className="miss-head">
                <div className="h">
                  <span className="dotbadge" style={{ background: 'var(--red)' }} /> Fehlende Begriffe (
                  {remaining.length})
                </div>
                <Button variant="ghost" size="sm" onClick={addAll} className="h-8 px-2 text-xs">
                  <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={2.6} /> Alle übernehmen
                </Button>
              </div>
              {remaining.map((m) => (
                <div className="miss-card" key={m.keyword}>
                  <div className="info">
                    <div className="kwl">
                      {m.keyword} <span className="impact">{CATEGORY_LABEL[m.category]}</span>
                    </div>
                    <div className="meta hint">wird zu deinen Fähigkeiten hinzugefügt</div>
                  </div>
                  <Button size="sm" onClick={() => add(m.keyword)} className="add-btn h-8 px-3 text-xs">
                    <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={2.8} /> Hinzufügen
                  </Button>
                </div>
              ))}
            </>
          )}

          {allAddedPending && (
            <div className="opti-done" style={{ background: 'var(--blue-bg)', borderColor: '#c2d2ee' }}>
              <span className="ok" style={{ background: 'var(--blue)' }}>
                <Check className="h-[22px] w-[22px]" strokeWidth={3} />
              </span>
              <div>
                <div className="t" style={{ color: 'var(--ink)' }}>
                  Alle Begriffe ergänzt
                </div>
                <div className="d">
                  Sie stehen jetzt in deinem Lebenslauf. Klicke „Neu analysieren“, um den
                  aktualisierten Score zu sehen.
                </div>
              </div>
            </div>
          )}

          {done && (
            <div className="opti-done">
              <span className="ok">
                <Check className="h-[22px] w-[22px]" strokeWidth={3} />
              </span>
              <div>
                <div className="t">Alle Begriffe übernommen</div>
                <div className="d">
                  Dein Lebenslauf ist optimal auf diese Stelle abgestimmt. Du kannst ihn jetzt
                  exportieren.
                </div>
              </div>
            </div>
          )}

          {/* already-covered keywords */}
          <div className="found-block">
            <div className="h">
              <Check className="h-4 w-4" strokeWidth={2.6} style={{ color: 'var(--green)' }} /> Bereits
              enthalten ({matched.length + pendingAdded.length})
            </div>
            <div className="kw-wrap">
              {matched.map((k: KeywordMatch) => (
                <span key={k.keyword} className="kw found">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  {k.keyword}
                </span>
              ))}
              {pendingAdded.map((m) => (
                <span key={m.keyword} className="kw found new">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  {m.keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* sticky footer action */}
        <div className="opti-foot">
          <div className="foot-meta">
            {done ? (
              <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: 'var(--green-ink)' }}>
                <Check className="h-4 w-4" strokeWidth={3} /> ATS-bereit
              </span>
            ) : (
              <span className="text-muted-foreground">
                <b className="text-foreground">{remaining.length}</b> Begriffe offen
              </span>
            )}
          </div>
          {allAddedPending || done ? (
            done ? (
              <Button onClick={onExport} disabled={exportDisabled}>
                <Download className="mr-2 h-4 w-4" /> Lebenslauf exportieren
              </Button>
            ) : (
              <Button onClick={reanalyze} disabled={reAnalyzing}>
                <RefreshCw className={cn('mr-2 h-4 w-4', reAnalyzing && 'animate-spin')} /> Neu analysieren
              </Button>
            )
          ) : (
            <Button onClick={addAll}>
              <Sparkles className="mr-2 h-4 w-4" /> Alle übernehmen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
