/* =============================================================================
 *  profile-save-bar.tsx
 *  TARGET PATH: apps/web/src/components/settings/profile-save-bar.tsx
 *
 *  Sticky bottom bar that appears only when the profile form has unsaved
 *  edits. Prevents the "did my change save?" ambiguity of the old inline
 *  button. Positioned to clear the w-80 desktop sidebar.
 * ========================================================================== */

'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface ProfileSaveBarProps {
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function ProfileSaveBar({ visible, saving, onSave, onDiscard }: ProfileSaveBarProps) {
  const t = useTranslations('settings');
  return (
    <div
      className={`fixed bottom-6 left-4 right-4 z-40 mx-auto flex max-w-3xl items-center gap-4 rounded-[4px] bg-primary px-5 py-3 text-primary-foreground shadow-lg transition-all duration-300 md:left-[21rem] md:right-8 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[150%] opacity-0'
      }`}
      role="status"
      aria-hidden={!visible}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-400/25" />
      <span className="flex-1 text-sm font-semibold">{t('saveBar.unsavedChanges')}</span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={saving}
          className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
        >
          {t('saveBar.discard')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t('saveBar.save')}
        </Button>
      </div>
    </div>
  );
}
