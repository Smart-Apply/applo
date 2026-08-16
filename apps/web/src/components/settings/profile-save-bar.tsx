/* =============================================================================
 *  profile-save-bar.tsx
 *  TARGET PATH: apps/web/src/components/settings/profile-save-bar.tsx
 *
 *  Sticky bottom bar that appears only when the profile form has unsaved
 *  edits. Prevents the "did my change save?" ambiguity of the old inline
 *  button. Positioned to clear the w-80 desktop sidebar.
 *
 *  While hidden the bar stays in the DOM (it animates in), so its buttons are
 *  pulled out of the tab order with tabIndex={-1}: `pointer-events-none` and
 *  `opacity-0` do not remove focusability, and focusing something inside an
 *  `aria-hidden` subtree is an axe `aria-hidden-focus` violation.
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
      // On a phone the bar has to clear the fixed bottom nav (~56px) plus the
      // iOS home indicator, otherwise it lands on top of the nav and both
      // become hard to hit. Desktop keeps the original bottom-6 offset.
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-[4px] bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all duration-300 sm:px-5 md:bottom-6 md:left-[21rem] md:right-8 md:flex-nowrap ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[150%] opacity-0'
      }`}
      role="status"
      aria-hidden={!visible}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-400/25" />
      <span className="flex-1 text-sm font-semibold">{t('saveBar.unsavedChanges')}</span>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={saving}
          tabIndex={visible ? undefined : -1}
          className="flex-1 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground sm:flex-none"
        >
          {t('saveBar.discard')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          disabled={saving}
          tabIndex={visible ? undefined : -1}
          className="flex-1 gap-2 sm:flex-none"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t('saveBar.save')}
        </Button>
      </div>
    </div>
  );
}
