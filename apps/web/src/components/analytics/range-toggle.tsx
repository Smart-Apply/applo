/**
 * range-toggle.tsx
 * Segmented 7 / 30 / 90-day control (mirrors the Seg component from the prototype).
 * Place at: apps/web/src/components/analytics/range-toggle.tsx
 */
'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { AnalyticsRange } from '@/lib/analytics-utils';

const OPTIONS: { value: AnalyticsRange; labelKey: string }[] = [
  { value: 7,  labelKey: 'range.days7'  },
  { value: 30, labelKey: 'range.days30' },
  { value: 90, labelKey: 'range.days90' },
];

interface Props {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}

export function RangeToggle({ value, onChange }: Props) {
  const t = useTranslations('analytics');
  return (
    <div
      role="tablist"
      aria-label={t('range.ariaLabel')}
      className="inline-flex items-center gap-px overflow-hidden rounded-[4px] border border-border bg-border"
    >
      {OPTIONS.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap',
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {t(o.labelKey)}
        </button>
      ))}
    </div>
  );
}
