'use client';

import { Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/use-subscription';
import type { SubscriptionTier } from '@/types';

interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const tierConfig: Record<
  SubscriptionTier,
  {
    label: string;
    className: string;
    icon: typeof Crown | null;
  }
> = {
  FREE: {
    label: 'Free',
    className: 'border-border bg-muted text-muted-foreground',
    icon: null,
  },
  PREMIUM: {
    label: 'Premium',
    className: 'border-primary-soft bg-primary-soft/40 text-brand dark:border-slate-600 dark:bg-slate-800/60',
    icon: Crown,
  },
  PREMIUM_PLUS: {
    label: 'Premium+',
    className: 'border-primary bg-primary text-primary-foreground',
    icon: Sparkles,
  },
};

const sizeConfig = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[10.5px]',
  lg: 'px-2.5 py-1 text-xs',
};

const iconSizeConfig = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

/**
 * TierBadge - Displays the user's subscription tier with appropriate styling
 * 
 * @example
 * ```tsx
 * <TierBadge tier="PREMIUM" />
 * <TierBadge tier="PREMIUM_PLUS" size="lg" />
 * <TierBadge tier="FREE" showIcon={false} />
 * ```
 */
export function TierBadge({
  tier,
  size = 'md',
  showIcon = true,
  className,
}: TierBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[3px] border font-mono font-medium uppercase tracking-[.08em] transition-colors',
        config.className,
        sizeConfig[size],
        className
      )}
    >
      {showIcon && Icon && (
        <Icon className={cn(iconSizeConfig[size], 'shrink-0')} />
      )}
      {config.label}
    </span>
  );
}

/**
 * Hook-connected TierBadge that automatically displays the current user's tier
 */
export function CurrentTierBadge({
  size = 'md',
  showIcon = true,
  className,
}: Omit<TierBadgeProps, 'tier'>) {
  const { tier, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-[3px] bg-muted animate-pulse',
          sizeConfig[size],
          className
        )}
      >
        <span className="invisible">Loading</span>
      </span>
    );
  }

  return <TierBadge tier={tier} size={size} showIcon={showIcon} className={className} />;
}
