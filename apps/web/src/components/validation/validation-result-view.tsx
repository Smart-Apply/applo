'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ApplicationValidationResult,
  ApplicationValidationStatus,
  ApplicationValidationVerdict,
} from '@/types';

// ─── Design tokens ────────────────────────────────────────────────────────────
function scoreHex(score: number): string {
  if (score >= 80) return '#16A34A';
  if (score >= 60) return '#D9920A';
  return '#DC2626';
}

function scoreBg(score: number): string {
  if (score >= 80) return '#E7F6EC';
  if (score >= 60) return '#FBF1D9';
  return '#FCEBEB';
}

// ─── Score ring SVG ──────────────────────────────────────────────────────────
const RING_SIZE = 124;
const STROKE = 11;
const RADIUS = (RING_SIZE - STROKE) / 2; // 56.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 354.9

function ScoreRing({ score, label }: { score: number; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      startTransition(() => setDisplayed(score));
      return;
    }

    const start = performance.now();
    const duration = 1100;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // cubic-bezier(.4,0,.2,1) approximation via ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const offset = CIRCUMFERENCE * (1 - score / 100);
  const color = scoreHex(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          {/* Track */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#EDEFF4"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="text-3xl font-bold" style={{ color, lineHeight: 1 }}>
            {displayed}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color: '#6B6969' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Verdict ─────────────────────────────────────────────────────────────────
const VERDICT_MAP: Record<
  ApplicationValidationVerdict,
  { label: string; bg: string; color: string }
> = {
  strong: { label: 'Bereit zum Absenden', bg: '#16A34A', color: '#fff' },
  good: { label: 'Solide, kleine Verbesserungen', bg: '#D9920A', color: '#fff' },
  needs_work: { label: 'Überarbeitung empfohlen', bg: '#DC2626', color: '#fff' },
};

// ─── Category status icon ─────────────────────────────────────────────────────
function CategoryStatusIcon({ status }: { status: ApplicationValidationStatus }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />;
  if (status === 'warn')
    return <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />;
  return <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />;
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function ScoreBar({ score, delay = 0 }: { score: number; delay?: number }) {
  const color = scoreHex(score);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      startTransition(() => setWidth(score));
      return;
    }
    timerRef.current = setTimeout(() => startTransition(() => setWidth(score)), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [score, delay]);

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: '#EDEFF4' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Recommendation item with checkbox ───────────────────────────────────────
function RecommendationItem({
  title,
  detail,
  index,
}: {
  title: string;
  detail: string;
  index: number;
}) {
  const [done, setDone] = useState(false);

  return (
    <li
      className="flex items-start gap-3 rounded-xl border p-4 transition-colors duration-200"
      style={{
        borderColor: done ? '#E6E8EE' : '#E6E8EE',
        backgroundColor: done ? '#F5F6F8' : '#fff',
        opacity: done ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
        onClick={() => setDone((d) => !d)}
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200"
        style={
          done
            ? { backgroundColor: '#16A34A', borderColor: '#16A34A' }
            : { backgroundColor: '#fff', borderColor: '#C7D0E4' }
        }
      >
        {done && <CheckCircle2 className="h-3 w-3 text-white" />}
      </button>
      <div className="min-w-0">
        <p
          className="text-sm font-medium"
          style={{
            color: '#1B2A49',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {index + 1}. {title}
        </p>
        <p
          className="mt-0.5 text-sm"
          style={{ color: '#6B6969', textDecoration: done ? 'line-through' : 'none' }}
        >
          {detail}
        </p>
      </div>
    </li>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: '#fff',
        border: '1px solid #E6E8EE',
        borderRadius: 18,
        padding: '24px 28px',
        boxShadow: '0 1px 2px rgba(27,42,73,.04), 0 6px 16px -8px rgba(27,42,73,.10)',
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-xs font-bold uppercase tracking-[0.06em]"
      style={{ color: '#6B6969' }}
    >
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ValidationResultViewProps {
  result: ApplicationValidationResult;
  onNewCheck?: () => void;
}

/**
 * Polished result view for the Bewerbungs-Check. Domain-agnostic; no data
 * fetching. Used for both a fresh run and a stored history item.
 */
export function ValidationResultView({ result, onNewCheck }: ValidationResultViewProps) {
  const sortedCategories = useMemo(
    () => [...result.categories].sort((a, b) => b.score - a.score),
    [result.categories],
  );

  const verdict = VERDICT_MAP[result.verdict];
  const allItems = [...(result.blockers ?? []), ...(result.recommendations ?? [])];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-base font-semibold text-[#1B2A49]">Dein Ergebnis</span>
        </div>
        {onNewCheck && (
          <Button variant="ghost" size="sm" onClick={onNewCheck} className="gap-1.5 text-sm">
            <RotateCcw className="h-3.5 w-3.5" />
            Neuer Check
          </Button>
        )}
      </div>

      {/* Hero card */}
      <SectionCard>
        <div className="grid grid-cols-[auto_1px_1fr] items-center gap-6">
          {/* Scores */}
          <div className="flex flex-col items-center gap-4">
            <ScoreRing score={result.overallScore} label="Gesamt-Score" />
            <div className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color: scoreHex(result.atsScore) }}
              >
                {result.atsScore}
              </div>
              <div className="text-xs" style={{ color: '#6B6969' }}>
                ATS-Score*
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-full w-px self-stretch" style={{ backgroundColor: '#E6E8EE' }} />

          {/* Verdict + summary */}
          <div className="space-y-3">
            <span
              className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
              style={{ backgroundColor: verdict.bg, color: verdict.color }}
            >
              {verdict.label}
            </span>
            <p className="text-sm leading-relaxed" style={{ color: '#1B2A49' }}>
              {result.summary}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Categories */}
      {sortedCategories.length > 0 && (
        <SectionCard>
          <SectionHeading>Bewertung nach Kategorie</SectionHeading>
          <div className="space-y-4">
            {sortedCategories.map((cat, i) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-[#1B2A49]">
                    <CategoryStatusIcon status={cat.status} />
                    {cat.label}
                  </span>
                  <span className="font-semibold" style={{ color: scoreHex(cat.score) }}>
                    {cat.score}
                  </span>
                </div>
                <ScoreBar score={cat.score} delay={i * 90} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Recommendations (blockers + recommendations merged into checklist) */}
      {allItems.length > 0 && (
        <SectionCard>
          <SectionHeading>Empfehlungen · zum Abhaken</SectionHeading>
          <ul className="space-y-2.5">
            {allItems.map((item, i) => (
              <RecommendationItem
                key={i}
                index={i}
                title={item.title}
                detail={item.detail}
              />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <SectionCard>
          <SectionHeading
            // green tint for strengths heading
          >
            <span style={{ color: '#16A34A' }}>✓ Stärken</span>
          </SectionHeading>
          <ul className="space-y-2">
            {result.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: scoreBg(80) }}
                >
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-sm" style={{ color: '#1B2A49' }}>
                  {strength}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <p className="px-1 text-xs italic" style={{ color: '#6B6969' }}>
        *Der ATS-Score ist eine KI-Einschätzung, kein echter ATS-Parser-Durchlauf.
      </p>
    </div>
  );
}
