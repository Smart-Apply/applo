import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SubscriptionTier, SubscriptionStatus } from '../generated/prisma/client';
import type { SubscriptionUsage } from '../generated/prisma/client';

/**
 * Tier limits configuration
 * Defines the resource limits for each subscription tier
 *
 * Pricing Model:
 * - FREE (€0):            3 applications/month to try Applo.
 * - PRO (€9.95/month):    Hard limit: 50 applications/month.
 * - PREMIUM (€19.95/month): Hard limit: 100 applications/month.
 *
 * The monthly application allowance resets with the usage period. Purchased
 * add-on credits (`Subscription.addonCreditsRemaining`) persist until used and
 * are consumed only after the monthly allowance is exhausted.
 */
export interface TierLimits {
  // Generation limits
  // Monthly hard limit for full application generations (cover letter + resume).
  // Consumed first; add-on credits are the overflow. -1 = unlimited.
  applicationsPerMonth: number;
  coverLettersPerMonth: number; // -1 = unlimited
  resumesPerMonth: number; // -1 = unlimited
  jobParsingPerMonth: number; // URL parsing limit
  interviewSessionsPerMonth: number;

  // Voice-interview minutes per month (spoken realtime sessions). Replaces the
  // old global VOICE_INTERVIEW_MINUTES_PER_MONTH env parity between tiers; the
  // env var remains only as an emergency global clamp. -1 = unlimited.
  voiceMinutesPerMonth: number;

  // Application validation (KI quality + ATS check of an existing application).
  // Every tier has a monthly hard limit. -1 = unlimited.
  validationsPerMonth: number;

  // Cost-protection cap (rolling 24h window): one "application" =
  // create-with-generation call. -1 = unlimited.
  applicationsPerDay: number;

  // Queue priority
  priority: 'low' | 'normal' | 'high';

  // Features available
  features: {
    // Templates
    pdfExport: boolean; // Can download PDFs
    multipleTemplates: boolean; // Access to multiple templates
    premiumTemplates: boolean; // Access to premium/custom templates
    customBranding: boolean; // Own colors, logo, layout

    // ATS & Keywords
    atsOptimization: boolean; // ATS score & optimization
    keywordMatching: 'none' | 'basic' | 'semantic'; // Keyword matching level

    // Tracking & Analytics
    applicationTracking: 'manual' | 'semi-auto' | 'auto'; // Tracking level
    basicAnalytics: boolean; // Basic stats
    advancedAnalytics: boolean; // Trends, company comparison, success rates

    // Profile & Import
    extendedProfile: boolean; // More projects, experiences, etc.
    linkedinImport: boolean; // Import from LinkedIn

    // Languages
    multiLanguage: 'none' | 'de-en' | 'all'; // Cover letter languages

    // Premium features
    interviewCoach: boolean; // KI Interview Coach
    emailParsing: boolean; // Gmail/Outlook tracking
    prioritySupport: boolean; // Premium support
    noAds: boolean; // Ad-free experience
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    applicationsPerMonth: 3, // Hard limit
    coverLettersPerMonth: 3,
    resumesPerMonth: 3,
    jobParsingPerMonth: 10,
    interviewSessionsPerMonth: 0,
    voiceMinutesPerMonth: 0,
    validationsPerMonth: 3,
    applicationsPerDay: 5,
    priority: 'low',
    features: {
      pdfExport: true,
      multipleTemplates: false,
      premiumTemplates: false,
      customBranding: false,
      atsOptimization: false,
      keywordMatching: 'none',
      applicationTracking: 'manual',
      basicAnalytics: false,
      advancedAnalytics: false,
      extendedProfile: false,
      linkedinImport: false,
      multiLanguage: 'none',
      interviewCoach: false,
      emailParsing: false,
      prioritySupport: false,
      noAds: false,
    },
  },
  PRO: {
    applicationsPerMonth: 50, // Hard limit
    coverLettersPerMonth: 50,
    resumesPerMonth: 50,
    jobParsingPerMonth: -1, // Unlimited
    interviewSessionsPerMonth: 5,
    voiceMinutesPerMonth: 60,
    validationsPerMonth: 15,
    applicationsPerDay: -1,
    priority: 'normal',
    features: {
      pdfExport: true,
      multipleTemplates: true,
      premiumTemplates: false,
      customBranding: false,
      atsOptimization: true,
      keywordMatching: 'basic',
      applicationTracking: 'semi-auto',
      basicAnalytics: true,
      advancedAnalytics: false,
      extendedProfile: true,
      linkedinImport: false, // Premium-only feature
      multiLanguage: 'de-en',
      interviewCoach: true,
      emailParsing: false,
      prioritySupport: false,
      noAds: true,
    },
  },
  PREMIUM: {
    applicationsPerMonth: 100, // Hard limit
    coverLettersPerMonth: -1, // Unlimited
    resumesPerMonth: -1, // Unlimited
    jobParsingPerMonth: -1, // Unlimited
    interviewSessionsPerMonth: 20,
    voiceMinutesPerMonth: 120,
    validationsPerMonth: 35,
    applicationsPerDay: -1,
    priority: 'high',
    features: {
      pdfExport: true,
      multipleTemplates: true,
      premiumTemplates: true,
      customBranding: true,
      atsOptimization: true,
      keywordMatching: 'semantic',
      applicationTracking: 'auto',
      basicAnalytics: true,
      advancedAnalytics: true,
      extendedProfile: true,
      linkedinImport: true,
      multiLanguage: 'all',
      interviewCoach: true,
      emailParsing: true,
      prioritySupport: true,
      noAds: true,
    },
  },
};

/**
 * Consumable add-on packages for extra application credits.
 * Credits do NOT expire monthly — they persist until used.
 */
export const ADDON_PACKAGES = {
  SMALL: { credits: 10, priceEur: 2.99 },
  MEDIUM: { credits: 30, priceEur: 6.99 },
  LARGE: { credits: 75, priceEur: 14.99 },
} as const;

export const AD_SUPPORTED_DOWNLOAD_WAIT_MS = 15_000;

type MeteredUsageField =
  | 'coverLettersGenerated'
  | 'resumesGenerated'
  | 'jobParsingUsed'
  | 'interviewSessionsUsed'
  | 'validationsUsed';

type ReservedUsageAction =
  | 'application'
  | 'coverLetter'
  | 'resume'
  | 'jobParsing'
  | 'interview'
  | 'validation';

export interface UsageReservation {
  action: ReservedUsageAction;
  subscriptionId: string;
  usageId: string;
  source: 'counter' | 'monthly' | 'addon';
  periodEnd: Date;
  dailyWindowStart: Date;
}

/**
 * Tier hierarchy for comparison
 * Higher number = higher tier
 */
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  FREE: 0,
  PRO: 1,
  PREMIUM: 2,
};

export interface CanPerformActionResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  limit: number;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private resolveEffectiveTier(subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
  }): SubscriptionTier {
    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIALING
    ) {
      return SubscriptionTier.FREE;
    }

    const now = Date.now();
    if (subscription.status === SubscriptionStatus.TRIALING) {
      if (!subscription.trialEnd || subscription.trialEnd.getTime() <= now) {
        return SubscriptionTier.FREE;
      }
    }

    if (
      subscription.tier !== SubscriptionTier.FREE &&
      (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() <= now)
    ) {
      return SubscriptionTier.FREE;
    }

    return subscription.tier;
  }

  /**
   * Get or create subscription for a user. New signups start on FREE.
   */
  async getOrCreateSubscription(userId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { usage: true },
    });

    if (!subscription) {
      const now = new Date();
      const periodEnd = this.getNextPeriodEnd(now);

      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          usage: {
            create: {
              periodStart: now,
              periodEnd,
              applicationsUsed: 0,
              interviewSessionsUsed: 0,
            },
          },
        },
        include: { usage: true },
      });

      this.logger.log(`Created FREE subscription for user ${userId}`);
    }

    return subscription;
  }

  /**
   * Admin: set a user's subscription tier and (re)start a billing period.
   *
   * Idempotent — safe to call repeatedly. Used by `/admin/users/:email/tier`
   * and the seed/dev tooling. For paid downgrades the caller is responsible
   * for any Stripe-side cleanup; this method only mutates the local row.
   */
  async setUserTier(
    userId: string,
    tier: SubscriptionTier,
    options?: { periodMonths?: number },
  ) {
    const now = new Date();
    const periodEnd = new Date(now);
    if (options?.periodMonths && options.periodMonths > 0) {
      periodEnd.setMonth(periodEnd.getMonth() + options.periodMonths);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const updated = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        usage: { create: { periodStart: now, periodEnd } },
      },
      include: { usage: true },
    });

    this.logger.log(`Admin: set tier=${tier} for user ${userId} (period ends ${periodEnd.toISOString()})`);
    return updated;
  }

  /**
   * Get user's current subscription tier
   */
  async getUserTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getOrCreateSubscription(userId);
    return this.resolveEffectiveTier(subscription);
  }

  /**
   * Check if user has at least the required tier
    * Respects tier hierarchy: FREE < PRO < PREMIUM
   */
  async hasTier(userId: string, requiredTier: SubscriptionTier): Promise<boolean> {
    const userTier = await this.getUserTier(userId);
    return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
  }

  /**
   * Get limits for a specific tier
   */
  getTierLimits(tier: SubscriptionTier): TierLimits {
    return TIER_LIMITS[tier];
  }

  /**
   * Check if user can perform an action based on their usage limits
   */
  async canPerformAction(
    userId: string,
    action: 'application' | 'coverLetter' | 'resume' | 'jobParsing' | 'interview' | 'validation',
  ): Promise<CanPerformActionResult> {
    const subscription = await this.getOrCreateSubscription(userId);
    const effectiveTier = this.resolveEffectiveTier(subscription);
    const limits = this.getTierLimits(effectiveTier);

    // Ensure usage period is current (monthly window)
    let usage = await this.ensureCurrentUsagePeriod(subscription.id);
    // Roll the rolling 24h daily window if needed
    usage = await this.ensureCurrentDailyWindow(usage);

    // Full application generation: hard monthly tier limit + persistent
    // add-on credits. Total balance = (tier limit − usage this month) +
    // add-on credits remaining. The daily cost-protection cap below still
    // applies on top.
    if (action === 'application') {
      const monthlyLimit = limits.applicationsPerMonth;
      if (monthlyLimit !== -1) {
        const monthlyRemaining = Math.max(0, monthlyLimit - usage.applicationsUsed);
        const totalBalance = monthlyRemaining + subscription.addonCreditsRemaining;
        if (totalBalance <= 0) {
          return {
            allowed: false,
            reason: 'LIMIT_REACHED: Please upgrade your tier or purchase an add-on package.',
            remaining: 0,
            limit: monthlyLimit,
          };
        }
        // Balance available — if no daily cap applies, report the balance.
        if (limits.applicationsPerDay === -1) {
          return {
            allowed: true,
            remaining: totalBalance,
            limit: monthlyLimit,
          };
        }
      }
    }

    let used: number;
    let limit: number;
    let actionName: string;
    let isDaily = false;

    switch (action) {
      case 'application':
        used = usage.dailyApplicationsUsed;
        limit = limits.applicationsPerDay;
        actionName = 'Bewerbungen';
        isDaily = true;
        break;
      case 'coverLetter':
        used = usage.coverLettersGenerated;
        limit = limits.coverLettersPerMonth;
        actionName = 'KI-Anschreiben';
        break;
      case 'resume':
        used = usage.resumesGenerated;
        limit = limits.resumesPerMonth;
        actionName = 'KI-Lebensläufe';
        break;
      case 'jobParsing':
        used = usage.jobParsingUsed;
        limit = limits.jobParsingPerMonth;
        actionName = 'Job-Parses';
        break;
      case 'interview':
        used = usage.interviewSessionsUsed;
        limit = limits.interviewSessionsPerMonth;
        actionName = 'Interview-Sessions';
        break;
      case 'validation':
        used = usage.validationsUsed;
        limit = limits.validationsPerMonth;
        actionName = 'Bewerbungs-Validierungen';
        break;
    }

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1, // Unlimited
        limit: -1,
      };
    }

    const remaining = Math.max(0, limit - used);

    if (remaining <= 0) {
      const window = isDaily ? 'tägliches' : 'monatliches';
      return {
        allowed: false,
        reason: `Du hast dein ${window} Limit von ${limit} ${actionName} erreicht. Bitte versuche es später erneut.`,
        remaining: 0,
        limit,
      };
    }

    return {
      allowed: true,
      remaining,
      limit,
    };
  }

  /**
   * Record usage for an action
   * Call this after successfully completing the action
   */
  async reserveUsage(
    userId: string,
    action: ReservedUsageAction,
  ): Promise<UsageReservation> {
    const subscription = await this.getOrCreateSubscription(userId);
    const effectiveTier = this.resolveEffectiveTier(subscription);
    let usage = await this.ensureCurrentUsagePeriod(subscription.id);
    usage = await this.ensureCurrentDailyWindow(usage);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let source: UsageReservation['source'] | null = 'counter';

      switch (action) {
        case 'application':
          // One full "application generated" event — consumes the monthly
          // tier allowance first, then persistent add-on credits, plus the
          // daily cost-protection counter. Handled transactionally.
          source = await this.consumeApplicationAllowance(
            subscription.id,
            effectiveTier,
            usage,
          );
          break;
        case 'coverLetter':
          source = (await this.incrementUsageWithinLimit(
            usage,
            'coverLettersGenerated',
            this.getTierLimits(effectiveTier).coverLettersPerMonth,
            { applicationsUsed: { increment: 1 } },
          ))
            ? 'counter'
            : null;
          break;
        case 'resume':
          source = (await this.incrementUsageWithinLimit(
            usage,
            'resumesGenerated',
            this.getTierLimits(effectiveTier).resumesPerMonth,
            { applicationsUsed: { increment: 1 } },
          ))
            ? 'counter'
            : null;
          break;
        case 'jobParsing':
          source = (await this.incrementUsageWithinLimit(
            usage,
            'jobParsingUsed',
            this.getTierLimits(effectiveTier).jobParsingPerMonth,
          ))
            ? 'counter'
            : null;
          break;
        case 'interview':
          source = (await this.incrementUsageWithinLimit(
            usage,
            'interviewSessionsUsed',
            this.getTierLimits(effectiveTier).interviewSessionsPerMonth,
          ))
            ? 'counter'
            : null;
          break;
        case 'validation':
          source = (await this.incrementUsageWithinLimit(
            usage,
            'validationsUsed',
            this.getTierLimits(effectiveTier).validationsPerMonth,
          ))
            ? 'counter'
            : null;
          break;
      }

      if (source) {
        this.logger.debug(`Reserved ${action} usage for user ${userId}`);
        return {
          action,
          subscriptionId: subscription.id,
          usageId: usage.id,
          source,
          periodEnd: usage.periodEnd,
          dailyWindowStart: usage.dailyWindowStart,
        };
      }

      usage = await this.ensureCurrentUsagePeriod(subscription.id);
      usage = await this.ensureCurrentDailyWindow(usage);
    }

    throw new ConflictException('Nutzungszeitraum wurde aktualisiert. Bitte erneut versuchen.');
  }

  async releaseUsage(reservation: UsageReservation): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (reservation.action === 'application') {
          await tx.subscriptionUsage.updateMany({
            where: {
              id: reservation.usageId,
              dailyWindowStart: reservation.dailyWindowStart,
              dailyApplicationsUsed: { gt: 0 },
            },
            data: { dailyApplicationsUsed: { decrement: 1 } },
          });

          if (reservation.source === 'addon') {
            await tx.subscription.update({
              where: { id: reservation.subscriptionId },
              data: { addonCreditsRemaining: { increment: 1 } },
            });
          } else {
            await tx.subscriptionUsage.updateMany({
              where: {
                id: reservation.usageId,
                periodEnd: reservation.periodEnd,
                applicationsUsed: { gt: 0 },
              },
              data: { applicationsUsed: { decrement: 1 } },
            });
          }
          return;
        }

        const field = this.getUsageField(reservation.action);
        const data: Prisma.SubscriptionUsageUpdateManyMutationInput = {
          [field]: { decrement: 1 },
          ...(reservation.action === 'coverLetter' || reservation.action === 'resume'
            ? { applicationsUsed: { decrement: 1 } }
            : {}),
        };
        await tx.subscriptionUsage.updateMany({
          where: {
            id: reservation.usageId,
            periodEnd: reservation.periodEnd,
            [field]: { gt: 0 },
          },
          data,
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to release ${reservation.action} reservation ${reservation.usageId}`,
        error,
      );
    }
  }

  private getUsageField(action: Exclude<ReservedUsageAction, 'application'>): MeteredUsageField {
    const fields: Record<Exclude<ReservedUsageAction, 'application'>, MeteredUsageField> = {
      coverLetter: 'coverLettersGenerated',
      resume: 'resumesGenerated',
      jobParsing: 'jobParsingUsed',
      interview: 'interviewSessionsUsed',
      validation: 'validationsUsed',
    };
    return fields[action];
  }

  private async incrementUsageWithinLimit(
    usage: SubscriptionUsage,
    field: MeteredUsageField,
    limit: number,
    additionalData: Prisma.SubscriptionUsageUpdateManyMutationInput = {},
  ): Promise<boolean> {
    const where = {
      id: usage.id,
      periodEnd: usage.periodEnd,
      ...(limit === -1 ? {} : { [field]: { lt: limit } }),
    } as Prisma.SubscriptionUsageWhereInput;
    const data = {
      ...additionalData,
      [field]: { increment: 1 },
    } as Prisma.SubscriptionUsageUpdateManyMutationInput;

    const updated = await this.prisma.subscriptionUsage.updateMany({ where, data });
    if (updated.count > 0) {
      return true;
    }

    const current = await this.prisma.subscriptionUsage.findUniqueOrThrow({
      where: { id: usage.id },
    });
    if (current.periodEnd.getTime() !== usage.periodEnd.getTime()) {
      return false;
    }

    throw new ForbiddenException({
      message: 'Monatliches Nutzungslimit erreicht.',
      error: 'USAGE_LIMIT_EXCEEDED',
      limit,
    });
  }

  /**
   * Transactionally consume one application generation:
   * - always bumps the rolling 24h daily counter,
   * - uses the monthly tier allowance while it lasts,
   * - once the tier limit is exhausted, decrements one persistent add-on
   *   credit instead (guarded so credits can never go negative).
   */
  private async consumeApplicationAllowance(
    subscriptionId: string,
    tier: SubscriptionTier,
    usage: SubscriptionUsage,
  ): Promise<'monthly' | 'addon' | null> {
    const limits = this.getTierLimits(tier);
    const monthlyLimit = limits.applicationsPerMonth;
    const dailyLimit = limits.applicationsPerDay;

    return this.prisma.$transaction(async (tx) => {
      const monthlyAllowance = await tx.subscriptionUsage.updateMany({
        where: {
          id: usage.id,
          periodEnd: usage.periodEnd,
          dailyWindowStart: usage.dailyWindowStart,
          ...(monthlyLimit === -1 ? {} : { applicationsUsed: { lt: monthlyLimit } }),
          ...(dailyLimit === -1 ? {} : { dailyApplicationsUsed: { lt: dailyLimit } }),
        },
        data: {
          applicationsUsed: { increment: 1 },
          dailyApplicationsUsed: { increment: 1 },
        },
      });
      if (monthlyAllowance.count > 0) {
        return 'monthly';
      }

      const currentUsage = await tx.subscriptionUsage.findUniqueOrThrow({
        where: { id: usage.id },
      });
      if (
        currentUsage.periodEnd.getTime() !== usage.periodEnd.getTime() ||
        currentUsage.dailyWindowStart.getTime() !== usage.dailyWindowStart.getTime()
      ) {
        return null;
      }

      const dailyAllowance = await tx.subscriptionUsage.updateMany({
        where: {
          id: usage.id,
          periodEnd: usage.periodEnd,
          dailyWindowStart: usage.dailyWindowStart,
          ...(dailyLimit === -1 ? {} : { dailyApplicationsUsed: { lt: dailyLimit } }),
        },
        data: { dailyApplicationsUsed: { increment: 1 } },
      });
      if (dailyAllowance.count === 0) {
        throw new ForbiddenException({
          message: 'Tägliches Nutzungslimit erreicht.',
          error: 'USAGE_LIMIT_EXCEEDED',
          limit: dailyLimit,
        });
      }

      const addonAllowance = await tx.subscription.updateMany({
        where: { id: subscriptionId, addonCreditsRemaining: { gt: 0 } },
        data: { addonCreditsRemaining: { decrement: 1 } },
      });
      if (addonAllowance.count === 0) {
        throw new ForbiddenException({
          message: 'Monatliches Nutzungslimit erreicht.',
          error: 'USAGE_LIMIT_EXCEEDED',
          limit: monthlyLimit,
        });
      }
      return 'addon';
    });
  }

  /**
   * Get current usage statistics for a user
   */
  async getUsageStats(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    const effectiveTier = this.resolveEffectiveTier(subscription);
    let usage = await this.ensureCurrentUsagePeriod(subscription.id);
    usage = await this.ensureCurrentDailyWindow(usage);
    const limits = this.getTierLimits(effectiveTier);

    return {
      tier: effectiveTier,
      status: subscription.status,
      coverLetters: {
        used: usage.coverLettersGenerated,
        limit: limits.coverLettersPerMonth,
        remaining:
          limits.coverLettersPerMonth === -1
            ? -1
            : Math.max(0, limits.coverLettersPerMonth - usage.coverLettersGenerated),
      },
      resumes: {
        used: usage.resumesGenerated,
        limit: limits.resumesPerMonth,
        remaining:
          limits.resumesPerMonth === -1
            ? -1
            : Math.max(0, limits.resumesPerMonth - usage.resumesGenerated),
      },
      jobParsing: {
        used: usage.jobParsingUsed,
        limit: limits.jobParsingPerMonth,
        remaining:
          limits.jobParsingPerMonth === -1
            ? -1
            : Math.max(0, limits.jobParsingPerMonth - usage.jobParsingUsed),
      },
      interviewSessions: {
        used: usage.interviewSessionsUsed,
        limit: limits.interviewSessionsPerMonth,
        remaining:
          limits.interviewSessionsPerMonth === -1
            ? -1
            : Math.max(0, limits.interviewSessionsPerMonth - usage.interviewSessionsUsed),
      },
      validations: {
        used: usage.validationsUsed,
        limit: limits.validationsPerMonth,
        remaining:
          limits.validationsPerMonth === -1
            ? -1
            : Math.max(0, limits.validationsPerMonth - usage.validationsUsed),
      },
      // Daily application cap (rolling 24h window, cost protection)
      applicationsToday: {
        used: usage.dailyApplicationsUsed,
        limit: limits.applicationsPerDay,
        remaining:
          limits.applicationsPerDay === -1
            ? -1
            : Math.max(0, limits.applicationsPerDay - usage.dailyApplicationsUsed),
        windowStart: usage.dailyWindowStart,
      },
      // Full application generations (monthly hard limit + add-on credits)
      applications: {
        used: usage.applicationsUsed,
        limit: limits.applicationsPerMonth,
        remaining:
          limits.applicationsPerMonth === -1
            ? -1
            : Math.max(0, limits.applicationsPerMonth - usage.applicationsUsed) +
              subscription.addonCreditsRemaining,
      },
      // Persistent purchased credits (never reset monthly)
      addonCredits: {
        remaining: subscription.addonCreditsRemaining,
      },
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      // Billing period (Stripe), distinct from the usage period above: quotas
      // reset monthly regardless of tier, but a paid plan runs to the date the
      // customer actually paid through. The cancellation page must quote THIS
      // one — telling someone their Pro access ends on the quota-reset date
      // would be wrong.
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      features: limits.features,
    };
  }

  /**
   * Check if a specific feature is available for the user's tier
   */
  async hasFeature(userId: string, feature: keyof TierLimits['features']): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    const limits = this.getTierLimits(tier);
    return !!limits.features[feature];
  }

  async waitForDownloadAccess(userId: string): Promise<void> {
    const tier = await this.getUserTier(userId);
    if (this.getTierLimits(tier).features.noAds) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, AD_SUPPORTED_DOWNLOAD_WAIT_MS);
    });
  }

  /**
   * Get queue priority for user based on their tier
   */
  async getQueuePriority(userId: string): Promise<'low' | 'normal' | 'high'> {
    const tier = await this.getUserTier(userId);
    return this.getTierLimits(tier).priority;
  }

  /**
   * Ensure usage tracking is for current period
   * Resets counters if period has ended
   */
  private async ensureCurrentUsagePeriod(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { usage: true },
    });

    if (!subscription?.usage) {
      // Create usage tracking if missing
      const now = new Date();
      return await this.prisma.subscriptionUsage.create({
        data: {
          subscriptionId,
          periodStart: now,
          periodEnd: this.getNextPeriodEnd(now),
          applicationsUsed: 0,
          coverLettersGenerated: 0,
          resumesGenerated: 0,
          jobParsingUsed: 0,
          interviewSessionsUsed: 0,
          validationsUsed: 0,
        },
      });
    }

    // Check if period has ended
    if (new Date() > subscription.usage.periodEnd) {
      const now = new Date();
      await this.prisma.subscriptionUsage.updateMany({
        where: {
          id: subscription.usage.id,
          periodEnd: subscription.usage.periodEnd,
        },
        data: {
          periodStart: now,
          periodEnd: this.getNextPeriodEnd(now),
          applicationsUsed: 0,
          coverLettersGenerated: 0,
          resumesGenerated: 0,
          jobParsingUsed: 0,
          interviewSessionsUsed: 0,
          validationsUsed: 0,
        },
      });

      return this.prisma.subscriptionUsage.findUniqueOrThrow({
        where: { id: subscription.usage.id },
      });
    }

    return subscription.usage;
  }

  /**
   * Calculate next period end date (1 month from now)
   */
  private getNextPeriodEnd(from: Date): Date {
    const periodEnd = new Date(from);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return periodEnd;
  }

  /**
   * Roll the rolling 24-hour daily window. If the existing window is older
   * than 24 hours, reset the daily counter and stamp a fresh window start.
   * Returns the (possibly updated) usage row.
   */
  private async ensureCurrentDailyWindow(usage: SubscriptionUsage): Promise<SubscriptionUsage> {
    const ageMs = Date.now() - new Date(usage.dailyWindowStart).getTime();
    if (ageMs < 24 * 60 * 60 * 1000) {
      return usage;
    }
    await this.prisma.subscriptionUsage.updateMany({
      where: { id: usage.id, dailyWindowStart: usage.dailyWindowStart },
      data: {
        dailyApplicationsUsed: 0,
        dailyWindowStart: new Date(),
      },
    });
    return this.prisma.subscriptionUsage.findUniqueOrThrow({ where: { id: usage.id } });
  }
}
