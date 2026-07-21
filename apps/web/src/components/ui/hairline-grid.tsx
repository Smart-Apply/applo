import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Hairline grid per the sharp design system: 1px gaps on a border-color
 * background create hairlines between cells. Pass grid columns via
 * className (e.g. `sm:grid-cols-2 lg:grid-cols-4`); cells must set their
 * own opaque background (`bg-card` or `bg-background`).
 */
function HairlineGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="hairline-grid"
      className={cn(
        'grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-border bg-border',
        className
      )}
      {...props}
    />
  );
}

export { HairlineGrid };
