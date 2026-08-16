'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { StatusChip, type StatusChipTone } from '@/components/ui/status-chip';
import type { SaveState } from '@/hooks/use-save-status';

const TONE: Record<Exclude<SaveState, 'idle'>, StatusChipTone> = {
  saving: 'neutral',
  dirty: 'warning',
  saved: 'success',
  error: 'destructive',
};

interface SaveStatusProps {
  state: SaveState;
  /** Shown as a button in the error state so a failed save is recoverable. */
  onRetry?: () => void;
  /**
   * `floating` pins the indicator to the viewport for long pages whose inline
   * slot scrolls out of view (profile, settings); `inline` sits in the layout.
   */
  variant?: 'inline' | 'floating';
  className?: string;
}

/**
 * The single save-state indicator of the product. Autosave is invisible by
 * nature, so it needs a visible confirmation — this chip is it, and it reports
 * the same four states with the same words on every surface.
 *
 * The live region stays mounted even while idle, otherwise assistive tech
 * would not announce the first transition into it.
 */
export function SaveStatus({ state, onRetry, variant = 'inline', className }: SaveStatusProps) {
  const t = useTranslations('common.saveStatus');

  const chip =
    state === 'idle' ? null : (
      <StatusChip
        tone={TONE[state]}
        withDot={state === 'dirty' || state === 'saved'}
        className={className}
      >
        {state === 'saving' && (
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
        )}
        {state === 'error' && <AlertTriangle className="h-3 w-3" aria-hidden />}
        {t(state)}
        {state === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 underline underline-offset-2 hover:no-underline"
          >
            {t('retry')}
          </button>
        )}
      </StatusChip>
    );

  if (variant === 'floating') {
    return (
      <div
        role="status"
        aria-live="polite"
        // Clears the desktop sidebar; the wrapper never swallows clicks on the
        // page underneath while the indicator is idle.
        className="pointer-events-none fixed bottom-6 left-4 z-40 md:left-[21rem]"
      >
        {/* Opaque backdrop so the tinted chip stays legible over page content
            (the dark-mode tones are translucent by design). */}
        {chip && (
          <span className="pointer-events-auto inline-flex bg-background shadow-lg">{chip}</span>
        )}
      </div>
    );
  }

  return (
    <span role="status" aria-live="polite" className="inline-flex">
      {chip}
    </span>
  );
}
