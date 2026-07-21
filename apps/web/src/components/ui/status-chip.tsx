import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import type { ApplicationTrackingStatus } from '@/types';

/**
 * Square status chip per the sharp design system: mono uppercase label,
 * tinted background + hairline border + square dot. Tones are dark-mode
 * aware — never hand-roll status colors with hex values in pages.
 */
const statusChipVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[.05em]',
  {
    variants: {
      tone: {
        neutral:
          'border-[#D8DEE7] bg-[#F5F6F8] text-[#475569] dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300',
        info:
          'border-[#BFD3F5] bg-[#EFF4FE] text-[#40639C] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300',
        violet:
          'border-[#DCC9F0] bg-[#F5EEFB] text-[#7C3AED] dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300',
        success:
          'border-[#BFE9CC] bg-[#ECFAF0] text-[#16A34A] dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-300',
        warning:
          'border-[#F3E3B3] bg-[#FDF6E7] text-[#A16207] dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300',
        destructive:
          'border-[#F3C9C9] bg-[#FDEEEE] text-[#DC2626] dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
);

export type StatusChipTone = NonNullable<
  VariantProps<typeof statusChipVariants>['tone']
>;

interface StatusChipProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof statusChipVariants> {
  /** Square dot in the current tone color. Defaults to true. */
  withDot?: boolean;
}

function StatusChip({
  className,
  tone,
  withDot = true,
  children,
  ...props
}: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      className={cn(statusChipVariants({ tone }), className)}
      {...props}
    >
      {withDot && <span className="h-1.5 w-1.5 flex-none bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Canonical tone + German label per application tracking status. */
const TRACKING_STATUS_CHIP: Record<
  ApplicationTrackingStatus,
  { label: string; tone: StatusChipTone }
> = {
  CREATED: { label: 'Erstellt', tone: 'neutral' },
  APPLIED: { label: 'Beworben', tone: 'info' },
  INTERVIEW: { label: 'Interview', tone: 'violet' },
  ACCEPTED: { label: 'Angenommen', tone: 'success' },
  REJECTED: { label: 'Abgelehnt', tone: 'destructive' },

export { StatusChip, statusChipVariants, TRACKING_STATUS_CHIP };
