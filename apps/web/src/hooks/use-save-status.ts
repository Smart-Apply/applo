'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/errors';
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
}

/**
 * Save-state machine shared by every surface that persists edits: the
 * application editor, `/settings` and `/profile`. Keeping the transitions in
 * one place is what makes the feedback identical across them.
 */
export function useSaveStatus(): SaveStatusController {
  const [state, setState] = useState<SaveState>('idle');
  // One toast id per controller: a surface whose endpoint is down would
  // otherwise stack a new toast per attempt instead of updating one.
  const toastId = `save-error-${useId()}`;
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
      // Keep the underlying reason next to the surface's generic message.
      const detail = getErrorMessage(error);
      toastErrorWithRetry(error, () => retryRef.current?.(), errorMessage, undefined, {
        id: toastId,
        description: errorMessage && detail !== errorMessage ? detail : undefined,
      });
      return undefined;
    }
  }, [toastId]);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  const retry = useCallback(() => {
    retryRef.current?.();
  }, []);

  // The actions are stable, so a caller may safely put `track` (not the whole
  // controller) into a `useCallback`/`useEffect` dependency list — a save loop
  // that re-schedules itself on every render would hammer a failing endpoint.
  return useMemo(() => ({ state, track, retry }), [state, track, retry]);
}
