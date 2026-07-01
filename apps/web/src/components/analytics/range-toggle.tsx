/**
 * range-toggle.tsx
 * Segmented 7 / 30 / 90-day control (mirrors the Seg component from the prototype).
 * Place at: apps/web/src/components/analytics/range-toggle.tsx
 */
'use client';

import { cn } from '@/lib/utils';
import type { AnalyticsRange } from '@/lib/analytics-utils';

const OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 7,  label: '7 T.'  },
  { value: 30, label: '30 T.' },
  { value: 90, label: '90 T.' },
];

interface Props {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}

export function RangeToggle({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Zeitraum auswählen"
      className="inline-flex items-center gap-0.5 p-1 bg-card border border-border rounded-lg shadow-sm"
    >
      {OPTIONS.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap',
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
