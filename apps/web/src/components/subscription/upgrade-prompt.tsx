'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SubscriptionTier } from '@/types';

interface UpgradePromptProps {
  /** Name of the feature being restricted */
  feature: string;
  /** Tier required to access this feature */
  requiredTier: SubscriptionTier;
  /** Optional description explaining what the feature does */
  description?: string;
  /** Optional custom CTA text */
  ctaText?: string;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'compact' | 'inline';
}

/**
 * UpgradePrompt - Shows when a user tries to access a premium feature
 * 
 * @example
 * ```tsx
 * // Default full-size prompt
 * <UpgradePrompt
 *   feature="Interview Coach"
 *   requiredTier="PREMIUM"
 *   description="Übe mit unserem KI-gestützten Interview Coach"
 * />
 * 
 * // Compact inline version
 * <UpgradePrompt
 *   feature="Unbegrenzte Bewerbungen"
 *   requiredTier="PREMIUM_PLUS"
 *   variant="compact"
 * />
 * ```
 */
export function UpgradePrompt({
  feature,
  requiredTier,
  description,
  ctaText,
  className,
  variant = 'default',
}: UpgradePromptProps) {
  const router = useRouter();
  const t = useTranslations('subscription');

  const tierLabel = requiredTier === 'PREMIUM' ? 'Premium' : 'Premium+';
  const defaultCta = t('upgradePrompt.defaultCta', { tier: tierLabel });

  const handleUpgrade = () => {
    router.push('/#pricing');
  };

  // Inline variant - minimal styling
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          className
        )}
      >
        <Lock className="h-4 w-4 text-[#A16207] dark:text-amber-400" />
        <span>
          {t('upgradePrompt.inlineNeeds', { feature, tier: tierLabel })}{' '}
          <button
            onClick={handleUpgrade}
            className="text-primary hover:underline font-medium"
          >
            {t('upgradePrompt.upgradeNow')}
          </button>
        </span>
      </div>
    );
  }

  // Compact variant - smaller card
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 rounded-[4px] border border-[#F3E3B3] bg-[#FDF6E7] p-4 dark:border-amber-400/30 dark:bg-amber-400/10',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#F3E3B3] bg-background dark:border-amber-400/30 dark:bg-transparent">
            <Lock className="h-4 w-4 text-[#A16207] dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">{feature}</p>
            <p className="text-sm text-muted-foreground">
              {t('upgradePrompt.onlyWithTier', { tier: tierLabel })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleUpgrade}>
          {ctaText || defaultCta}
        </Button>
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card
      className={cn(
        'overflow-hidden border-[#F3E3B3] dark:border-amber-400/30',
        className
      )}
    >
      <CardContent className="p-0">
        {/* Tinted header */}
        <div className="border-b border-[#F3E3B3] bg-[#FDF6E7] px-6 py-8 dark:border-amber-400/30 dark:bg-amber-400/10">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[4px] border border-[#F3E3B3] bg-background text-[#A16207] dark:border-amber-400/30 dark:bg-transparent dark:text-amber-400">
              <Sparkles className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6 text-center">
          <div className="space-y-2">
            <h3 className="font-heading text-xl font-bold text-foreground">
              {feature}
            </h3>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('upgradePrompt.onlyWithTierPrefix')}{' '}
              <span className="font-medium text-[#A16207] dark:text-amber-400">
                {tierLabel}
              </span>{' '}
              {t('upgradePrompt.onlyWithTierSuffix')}
            </p>
          </div>

          <Button onClick={handleUpgrade} className="w-full" size="lg">
            <Sparkles className="mr-2 h-4 w-4" />
            {ctaText || defaultCta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * LimitReachedPrompt - Shows when user has exhausted their monthly quota
 */
interface LimitReachedPromptProps {
  /** Type of action that is limited */
  action: 'application' | 'interview';
  /** Number of items used */
  used: number;
  /** Maximum limit */
  limit: number;
  /** Custom class name */
  className?: string;
}

export function LimitReachedPrompt({
  action,
  used,
  limit,
  className,
}: LimitReachedPromptProps) {
  const router = useRouter();
  const t = useTranslations('subscription');

  const actionLabel = action === 'application' ? t('limit.actions.applications') : t('limit.actions.interviews');

  return (
    <Card
      className={cn(
        'border-[#F3C9C9] bg-[#FDEEEE] dark:border-red-400/30 dark:bg-red-400/10',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-[#F3C9C9] bg-background dark:border-red-400/30 dark:bg-transparent">
            <Lock className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {t('limit.title')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('limit.description', { used, limit, action: actionLabel })}
              </p>
            </div>
            <Button onClick={() => router.push('/#pricing')} size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              {t('upgradePrompt.upgradeNow')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
