import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '../config/config.service';

/**
 * Daily digest emailer for the Auto-Apply Agent.
 *
 * Runs once a day at 18:00 server time. For each user with `digestEnabled = true`,
 * sends an email summarising their PENDING suggestions created in the last 24h.
 *
 * Skips users who already received a digest in the last 23h (idempotency
 * guard against accidental double-runs after a restart).
 */
@Injectable()
export class AutoApplyDigestCron {
  private readonly logger = new Logger(AutoApplyDigestCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM, { name: 'auto-apply-digest' })
  async sendDailyDigests(): Promise<void> {
    const since = new Date(Date.now() - 23 * 60 * 60 * 1000);

    const configs = await this.prisma.autoApplyConfig.findMany({
      where: {
        isActive: true,
        digestEnabled: true,
        OR: [{ lastDigestSentAt: null }, { lastDigestSentAt: { lt: since } }],
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
      },
    });

    if (configs.length === 0) return;
    this.logger.log(`auto-apply-digest: evaluating ${configs.length} user(s)`);

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const config of configs) {
      try {
        const suggestions = await this.prisma.autoApplySuggestion.findMany({
          where: {
            userId: config.userId,
            status: 'PENDING',
            createdAt: { gte: dayAgo },
          },
          orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        });

        if (suggestions.length === 0) continue; // nothing to tell them about

        const sent = await this.email.sendEmail({
          to: config.user.email,
          subject: `🚀 ${suggestions.length} neue Job-Vorschläge für dich`,
          template: 'auto-apply-digest',
          context: {
            firstName: config.user.firstName ?? 'da',
            count: suggestions.length,
            suggestions: suggestions.map((s) => ({
              jobTitle: s.jobTitle,
              company: s.company,
              location: s.location ?? '',
              matchScore: s.matchScore !== null ? Math.round(s.matchScore) : null,
            })),
            inboxUrl: `${this.config.appUrl}/auto-apply`,
            settingsUrl: `${this.config.appUrl}/auto-apply/settings`,
          },
        });

        if (sent) {
          await this.prisma.autoApplyConfig.update({
            where: { id: config.id },
            data: { lastDigestSentAt: new Date() },
          });
          this.logger.log(
            `auto-apply-digest: sent to ${config.user.email} (${suggestions.length} suggestions)`,
          );
        }
      } catch (err) {
        // Per-user failure must never abort the batch
        this.logger.error(
          `auto-apply-digest failed for user ${config.userId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
