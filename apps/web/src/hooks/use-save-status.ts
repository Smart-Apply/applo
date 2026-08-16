'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toastErrorWithRetry } from '@/lib/toast';

/**
 * The product-wide save states. Applo saves automatically wherever an edit is
 * a low-risk field change, so the save state — not a toast — is the visible
 * confirmation that the data is safe. `idle` renders nothing: the indicator
 * only appears once there is something to report.
 */
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type TrackFn = <T>(run: () => Promise<T>, errorMessage?: string) => Promise<T | undefined>;

export interface SaveStatusController {
  state: SaveState;
  /**
   * Runs a save and reports it through {@link state}. Resolves with the value
   * on success and `undefined` on failure — the failure is surfaced (error
   * state + a retry toast), never swallowed.
   */
  track: TrackFn;
  /** Re-runs the last failed save. Wired to the indicator's retry button. */
  retry: () => void;
  /** Flags local edits that have not been persisted yet. */
  markDirty: () => void;
  reset: () => void;
}

/**
 * Save-state machine shared by every surface that persists edits: the
 * application editor, `/settings` and `/profile`. Keeping the transitions in
 * one place is what makes the feedback identical across them.
 */
export function useSaveStatus(): SaveStatusController {
  const [state, setState] = useState<SaveState>('idle');
  // `track` re-runs itself on retry; a ref breaks the self-reference without
  // making the callback unstable.
  const trackRef = useRef<TrackFn | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  const track = useCallback<TrackFn>(async (run, errorMessage) => {
    setState('saving');
    try {
      const value = await run();
      setState('saved');
      return value;
    } catch (error) {
      setState('error');
      retryRef.current = () => {
        void trackRef.current?.(run, errorMessage);
      };
      toastErrorWithRetry(error, () => retryRef.current?.(), errorMessage);
      return undefined;
    }
  }, []);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  const retry = useCallback(() => {
    retryRef.current?.();
  }, []);

  const markDirty = useCallback(() => {
    setState((current) => (current === 'saving' ? current : 'dirty'));
  }, []);

  const reset = useCallback(() => {
    retryRef.current = null;
    setState('idle');
  }, []);

  // The actions are stable, so a caller may safely put `track` (not the whole
  // controller) into a `useCallback`/`useEffect` dependency list — a save loop
  // that re-schedules itself on every render would hammer a failing endpoint.
  return useMemo(
    () => ({ state, track, retry, markDirty, reset }),
    [state, track, retry, markDirty, reset],
  );
}
