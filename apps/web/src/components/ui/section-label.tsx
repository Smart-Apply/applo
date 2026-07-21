import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Mono uppercase micro-label per the sharp design system — used for
 * section eyebrows, table headers, and metadata labels. Size/tracking
 * can be tuned via className (e.g. `text-[11px] tracking-[.14em]`).
 */
function SectionLabel({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="section-label"
      className={cn(
        'font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export { SectionLabel };
