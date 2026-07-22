'use client';

import { useMemo, useEffect, useRef, useState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
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
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ─── Category status icon ─────────────────────────────────────────────────────
function CategoryStatusIcon({ status }: { status: ApplicationValidationStatus }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />;
  if (status === 'warn')
    return <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#A16207] dark:text-amber-300" />;
  return <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />;
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
    <div className="h-1.5 w-full overflow-hidden bg-primary-soft dark:bg-slate-700">
      <div
        className="h-full transition-all duration-700"
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
  markOpenLabel,
  markDoneLabel,
}: {
  title: string;
  detail: string;
  index: number;
  markOpenLabel: string;
  markDoneLabel: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <li
      className={`flex items-start gap-3 rounded-[3px] border p-4 transition-colors duration-200 ${
        done ? 'bg-muted opacity-60' : 'bg-card'
      }`}
    >
      <button
        type="button"
        aria-label={done ? markOpenLabel : markDoneLabel}
        onClick={() => setDone((d) => !d)}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 transition-colors duration-200 ${
          done ? 'border-success bg-success' : 'border-muted-foreground/40 bg-background'
        }`}
      >
        {done && <CheckCircle2 className="h-3 w-3 text-white" />}
      </button>
      <div className="min-w-0">
        <p className={`text-sm font-medium text-foreground ${done ? 'line-through' : ''}`}>
          {index + 1}. {title}
        </p>
        <p className={`mt-0.5 text-sm text-muted-foreground ${done ? 'line-through' : ''}`}>
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
    <div className={`rounded-[4px] border bg-card px-7 py-6 ${className ?? ''}`}>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground">
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
  const t = useTranslations('validation');
  const sortedCategories = useMemo(
    () => [...result.categories].sort((a, b) => b.score - a.score),
    [result.categories],
  );

  const verdictMap: Record<
    ApplicationValidationVerdict,
    { label: string; bg: string; color: string }
  > = {
    strong: { label: t('result.verdict.strong'), bg: '#16A34A', color: '#fff' },
    good: { label: t('result.verdict.good'), bg: '#D9920A', color: '#fff' },
    needs_work: { label: t('result.verdict.needsWork'), bg: '#DC2626', color: '#fff' },
  };
  const verdict = verdictMap[result.verdict];
  const allItems = [...(result.blockers ?? []), ...(result.recommendations ?? [])];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="text-base font-semibold text-foreground">{t('result.yourResult')}</span>
        </div>
        {onNewCheck && (
          <Button variant="ghost" size="sm" onClick={onNewCheck} className="gap-1.5 text-sm">
            <RotateCcw className="h-3.5 w-3.5" />
            {t('page.newCheck')}
          </Button>
        )}
      </div>

      {/* Hero card */}
      <SectionCard>
        <div className="grid grid-cols-[auto_1px_1fr] items-center gap-6">
          {/* Scores */}
          <div className="flex flex-col items-center gap-4">
            <ScoreRing score={result.overallScore} label={t('result.overallScore')} />
            <div className="text-center">
              <div
                className="font-mono text-2xl font-bold tabular-nums"
                style={{ color: scoreHex(result.atsScore) }}
              >
                {result.atsScore}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('result.atsScore')}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-full w-px self-stretch bg-border" />

          {/* Verdict + summary */}
          <div className="space-y-3">
            <span
              className="inline-block px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[.05em]"
              style={{ backgroundColor: verdict.bg, color: verdict.color }}
            >
              {verdict.label}
            </span>
            <p className="text-sm leading-relaxed text-foreground">
              {result.summary}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Categories */}
      {sortedCategories.length > 0 && (
        <SectionCard>
          <SectionHeading>{t('result.categoryScores')}</SectionHeading>
          <div className="space-y-4">
            {sortedCategories.map((cat, i) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <CategoryStatusIcon status={cat.status} />
                    {cat.label}
                  </span>
                  <span className="font-mono font-semibold tabular-nums" style={{ color: scoreHex(cat.score) }}>
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
          <SectionHeading>{t('result.recommendationsChecklist')}</SectionHeading>
          <ul className="space-y-2.5">
            {allItems.map((item, i) => (
              <RecommendationItem
                key={i}
                index={i}
                title={item.title}
                detail={item.detail}
                markOpenLabel={t('result.markOpen')}
                markDoneLabel={t('result.markDone')}
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
            <span className="text-success">{t('result.strengthsHeading')}</span>
          </SectionHeading>
          <ul className="space-y-2">
            {result.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center"
                  style={{ backgroundColor: scoreBg(80) }}
                >
                  <CheckCircle2 className="h-3 w-3 text-success" />
                </div>
                <span className="text-sm text-foreground">
                  {strength}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <p className="px-1 text-xs italic text-muted-foreground">
        {t('result.atsDisclaimer')}
      </p>
    </div>
  );
}
