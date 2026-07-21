/**
 * metric-tip.tsx
 * Info icon + plain-language tooltip for metric labels.
 * Supports learnability by explaining what each metric means.
 * Place at: apps/web/src/components/analytics/metric-tip.tsx
 */
'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** HTML string shown inside the tooltip (bold with <b>, muted with inline style). */
  content: string;
  /** 'left' (default) or 'right' — which side the bubble opens toward. */
  align?: 'left' | 'right' | 'center';
}

export function MetricTip({ content, align = 'center' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Was bedeutet das?"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <Info size={13} strokeWidth={2.2} />
      </button>

      {open && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 bottom-[calc(100%+8px)] w-56 rounded-[4px] px-3 py-2.5',
            'bg-foreground text-xs leading-relaxed shadow-[0_12px_28px_-8px_rgba(16,24,40,.22)]',
            'pointer-events-none',
            align === 'right'  && 'right-0',
            align === 'left'   && 'left-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
          )}
          style={{ color: '#C8D0E0' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </span>
  );
}
