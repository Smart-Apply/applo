import { SubscriptionTier } from '../../../generated/prisma/client';
import { SubscriptionStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ADDON_PACKAGES,
  SubscriptionService,
  TIER_LIMITS,
} from '../../subscription.service';

describe('final subscription contract', () => {
  it('enforces the advertised monthly hard limits', () => {
    expect(TIER_LIMITS[SubscriptionTier.FREE]).toMatchObject({
      applicationsPerMonth: 3,
      interviewSessionsPerMonth: 0,
      validationsPerMonth: 5,
    });
    expect(TIER_LIMITS[SubscriptionTier.PRO]).toMatchObject({
      applicationsPerMonth: 50,
      interviewSessionsPerMonth: 5,
      validationsPerMonth: 15,
    });
    expect(TIER_LIMITS[SubscriptionTier.PREMIUM]).toMatchObject({
      applicationsPerMonth: 100,
      interviewSessionsPerMonth: 45,
      validationsPerMonth: 35,
    });
  });

  it('matches the advertised paid feature gates', () => {
    expect(TIER_LIMITS[SubscriptionTier.FREE].features).toMatchObject({
      pdfExport: true,
      interviewCoach: false,
      noAds: false,
    });
    expect(TIER_LIMITS[SubscriptionTier.PRO].features).toMatchObject({
      interviewCoach: true,
      emailParsing: false,
      noAds: true,
    });
    expect(TIER_LIMITS[SubscriptionTier.PREMIUM].features).toMatchObject({
      interviewCoach: true,
      emailParsing: true,
      noAds: true,
    });
  });

  it('defines the persistent add-on catalog in euros', () => {
    expect(ADDON_PACKAGES).toEqual({
      SMALL: { credits: 10, priceEur: 2.99 },
      MEDIUM: { credits: 30, priceEur: 6.99 },
      LARGE: { credits: 75, priceEur: 14.99 },
    });
  });

  it('reserves interview quota with an atomic finite-limit filter', async () => {
    const now = new Date();
    const usage = {
      id: 'usage-1',
      subscriptionId: 'sub-1',
      applicationsUsed: 0,
      coverLettersGenerated: 0,
      resumesGenerated: 0,
      jobParsingUsed: 0,
      interviewSessionsUsed: 4,
      validationsUsed: 0,
      dailyApplicationsUsed: 0,
      dailyWindowStart: now,
      periodStart: now,
      periodEnd: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    };
    const subscription = {
      id: 'sub-1',
      tier: SubscriptionTier.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(now.getTime() + 86_400_000),
      trialEnd: null,
      addonCreditsRemaining: 0,
      usage,
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      subscription: { findUnique: vi.fn().mockResolvedValue(subscription) },
      subscriptionUsage: { updateMany },
    } as unknown as PrismaService;
    const service = new SubscriptionService(prisma);

    const reservation = await service.reserveUsage('user-1', 'interview');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: usage.id,
        periodEnd: usage.periodEnd,
        interviewSessionsUsed: { lt: 5 },
      },
      data: { interviewSessionsUsed: { increment: 1 } },
    });
    expect(reservation).toMatchObject({ action: 'interview', source: 'counter' });
  });

  it('consumes an add-on only after the monthly application allowance', async () => {
    const now = new Date();
    const usage = {
      id: 'usage-1',
      subscriptionId: 'sub-1',
      applicationsUsed: 0,
      coverLettersGenerated: 0,
      resumesGenerated: 0,
      jobParsingUsed: 0,
      interviewSessionsUsed: 0,
      validationsUsed: 0,
      dailyApplicationsUsed: 0,
      dailyWindowStart: now,
      periodStart: now,
      periodEnd: new Date(now.getTime() + 86_400_000),
      createdAt: now,
      updatedAt: now,
    };
    const subscription = {
      id: 'sub-1',
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      trialEnd: null,
      addonCreditsRemaining: 1,
      usage,
    };
    const usageUpdateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    const subscriptionUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transactionClient = {
      subscriptionUsage: {
        updateMany: usageUpdateMany,
        findUniqueOrThrow: vi.fn().mockResolvedValue(usage),
      },
      subscription: { updateMany: subscriptionUpdateMany },
    };
    const prisma = {
      subscription: { findUnique: vi.fn().mockResolvedValue(subscription) },
      $transaction: vi.fn((callback) => callback(transactionClient)),
    } as unknown as PrismaService;
    const service = new SubscriptionService(prisma);

    const reservation = await service.reserveUsage('user-1', 'application');

    expect(subscriptionUpdateMany).toHaveBeenCalledWith({
      where: { id: subscription.id, addonCreditsRemaining: { gt: 0 } },
      data: { addonCreditsRemaining: { decrement: 1 } },
    });
    expect(reservation.source).toBe('addon');
  });

  it('retries a reservation against a new period after a rollover race', async () => {
    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + 86_400_000);
    const rolledPeriodEnd = new Date(now.getTime() + 172_800_000);
    const baseUsage = {
      id: 'usage-1',
      subscriptionId: 'sub-1',
      applicationsUsed: 0,
      coverLettersGenerated: 0,
      resumesGenerated: 0,
      jobParsingUsed: 0,
      interviewSessionsUsed: 0,
      validationsUsed: 0,
      dailyApplicationsUsed: 0,
      dailyWindowStart: now,
      periodStart: now,
      periodEnd: nextPeriodEnd,
      createdAt: now,
      updatedAt: now,
    };
    const rolledUsage = { ...baseUsage, periodEnd: rolledPeriodEnd };
    const subscription = {
      id: 'sub-1',
      tier: SubscriptionTier.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: rolledPeriodEnd,
      trialEnd: null,
      addonCreditsRemaining: 0,
      usage: baseUsage,
    };
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue(rolledUsage);
    const findSubscription = vi
      .fn()
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({ ...subscription, usage: rolledUsage });
    const prisma = {
      subscription: { findUnique: findSubscription },
      subscriptionUsage: { updateMany, findUniqueOrThrow },
    } as unknown as PrismaService;
    const service = new SubscriptionService(prisma);

    const reservation = await service.reserveUsage('user-1', 'validation');

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: baseUsage.id, periodEnd: nextPeriodEnd, validationsUsed: { lt: 15 } },
      data: { validationsUsed: { increment: 1 } },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: rolledUsage.id, periodEnd: rolledPeriodEnd, validationsUsed: { lt: 15 } },
      data: { validationsUsed: { increment: 1 } },
    });
    expect(reservation.periodEnd).toEqual(rolledPeriodEnd);
  });

  it('treats an expired paid subscription as Free', async () => {
    const prisma = {
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'sub-1',
          tier: SubscriptionTier.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(Date.now() - 1),
          trialEnd: null,
          addonCreditsRemaining: 0,
          usage: {},
        }),
      },
    } as unknown as PrismaService;
    const service = new SubscriptionService(prisma);

    await expect(service.getUserTier('user-1')).resolves.toBe(SubscriptionTier.FREE);
  });
});