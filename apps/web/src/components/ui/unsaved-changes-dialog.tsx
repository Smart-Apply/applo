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
  /** Close after a successful save — never prompts. */
  closeSaved: () => void;
  confirmOpen: boolean;
  keepEditing: () => void;
  discard: () => void;
}

/**
 * Explicit saving only survives inside the profile's add/edit dialogs, where
 * the user composes a whole record and "Abbrechen" has to keep meaning
 * "discard". That makes an accidental close the one remaining way to lose
 * work, so every such dialog guards it with this hook.
 */
export function useUnsavedChangesGuard(close: () => void): UnsavedChangesGuard {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    close();
  }, [dirty, close]);

  const closeSaved = useCallback(() => {
    setDirty(false);
    setConfirmOpen(false);
    close();
  }, [close]);

  const keepEditing = useCallback(() => setConfirmOpen(false), []);

  const discard = useCallback(() => {
    setDirty(false);
    setConfirmOpen(false);
    close();
  }, [close]);

  return { setDirty, requestClose, closeSaved, confirmOpen, keepEditing, discard };
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
