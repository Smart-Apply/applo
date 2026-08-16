'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface UnsavedChangesGuard {
  /** Reported by the form so the guard knows whether anything would be lost. */
  setDirty: (dirty: boolean) => void;
  /** Close request that may be intercepted (Escape, outside click, Abbrechen). */
  requestClose: () => void;
  confirmOpen: boolean;
  keepEditing: () => void;
  discard: () => void;
}

/**
 * Explicit saving only survives inside the profile's add/edit dialogs, where
 * the user composes a whole record and "Abbrechen" has to keep meaning
 * "discard". That makes an accidental close the one remaining way to lose
 * work, so every such dialog guards it with this hook.
 *
 * Saving closes the dialog directly (never through `requestClose`), so a
 * successful save is never questioned. The form re-reports its dirty state
 * whenever it mounts, which is what resets the guard after a close.
 */
export function useUnsavedChangesGuard(open: boolean, close: () => void): UnsavedChangesGuard {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    close();
  }, [dirty, close]);

  const keepEditing = useCallback(() => setConfirmOpen(false), []);

  const discard = useCallback(() => {
    setDirty(false);
    setConfirmOpen(false);
    close();
  }, [close]);

  // The guard outlives the form it protects, so the prompt is scoped to the
  // open dialog. `dirty` is re-reported by the form when it mounts again.
  return { setDirty, requestClose, confirmOpen: open && confirmOpen, keepEditing, discard };
}

interface UnsavedChangesDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function UnsavedChangesDialog({
  open,
  onKeepEditing,
  onDiscard,
}: UnsavedChangesDialogProps) {
  const t = useTranslations('common.unsavedChanges');

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onKeepEditing()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepEditing}>{t('keepEditing')}</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>{t('discard')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
