import { cn } from '@/lib/utils';
import type { PromptUsage } from '@/types';

interface PromptUsageMeterProps {
  usage: PromptUsage;
  className?: string;
}

/** Format the over-limit overage as "N Zeichen bzw. M Tokens" (only the parts over). */
function formatOverage(usage: PromptUsage): string {
  const parts: string[] = [];
  if (usage.overChars > 0) parts.push(`${usage.overChars} Zeichen`);
  if (usage.overTokens > 0) parts.push(`${usage.overTokens} Tokens`);
  return parts.join(' bzw. ');
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
  const toneClass = usage.isOverLimit
    ? 'text-destructive'
    : usage.isWarning
      ? 'text-amber-600 dark:text-amber-500'
      : 'text-muted-foreground';

  return (
    <div className={cn('space-y-1 text-xs', className)} aria-live="polite">
      <div className={cn('flex items-center justify-between gap-3 tabular-nums', toneClass)}>
        <span aria-invalid={usage.overChars > 0}>
          Zeichen: {usage.chars} / {usage.maxChars}
        </span>
        <span aria-invalid={usage.overTokens > 0}>
          Tokens: {usage.tokens} / {usage.maxTokens}
        </span>
      </div>
      {usage.isOverLimit && (
        <p className="text-destructive">Eingabe zu lang. Bitte kürze um {formatOverage(usage)}.</p>
      )}
    </div>
  );
}
