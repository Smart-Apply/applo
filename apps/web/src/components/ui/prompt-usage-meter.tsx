'use client';

import { cn } from '@/lib/utils';
import type { PromptUsage } from '@/types';
import { useTranslations } from 'next-intl';

interface PromptUsageMeterProps {
  usage: PromptUsage;
  className?: string;
}

function formatOverage(usage: PromptUsage, t: ReturnType<typeof useTranslations>): string {
  const parts: string[] = [];
  if (usage.overChars > 0) parts.push(t('promptUsage.charsOver', { count: usage.overChars }));
  if (usage.overTokens > 0) parts.push(t('promptUsage.tokensOver', { count: usage.overTokens }));
  return parts.join(t('promptUsage.joiner'));
}

/**
 * Live character + token counter for AI prompt inputs (issue #520).
 *
 * Renders `Zeichen: X / Max` and `Tokens: Y / Max`, turns amber once usage
 * crosses the warn threshold (~80%) and red when over the limit, where it also
 * shows concise guidance on how much to trim. Drive submit-disable from the
 * `usage.isOverLimit` flag on the caller side.
 */
export function PromptUsageMeter({ usage, className }: PromptUsageMeterProps) {
  const t = useTranslations('dashboard');
  const toneClass = usage.isOverLimit
    ? 'text-destructive'
    : usage.isWarning
      ? 'text-amber-600 dark:text-amber-500'
      : 'text-muted-foreground';

  return (
    <div className={cn('space-y-1 text-xs', className)} aria-live="polite">
      <div className={cn('flex items-center justify-between gap-3 tabular-nums', toneClass)}>
        <span aria-invalid={usage.overChars > 0}>
          {t('promptUsage.chars', { count: usage.chars, max: usage.maxChars })}
        </span>
        <span aria-invalid={usage.overTokens > 0}>
          {t('promptUsage.tokens', { count: usage.tokens, max: usage.maxTokens })}
        </span>
      </div>
      {usage.isOverLimit && (
        <p className="text-destructive">{t('promptUsage.tooLong', { overage: formatOverage(usage, t) })}</p>
      )}
    </div>
  );
}
