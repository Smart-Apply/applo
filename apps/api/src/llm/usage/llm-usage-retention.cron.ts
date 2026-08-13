import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';

/**
 * Retention sweep for `llm_usage_events` (audit 2026-08-13, F11).
 *
 * The table is pseudonymous personal data under GDPR (see the model comment
 * in schema.prisma), so it must not accumulate forever. This also mops up
 * rows the erasure hook cannot match — events written under a rotated salt,
 * or with a null actorHash from before the salt was configured.
 *
 * 04:00 keeps clear of the existing 00:00 / 02:00 / 03:00 cleanup crons.
 */
@Injectable()
export class LlmUsageRetentionCron {
  private readonly logger = new Logger(LlmUsageRetentionCron.name);

  constructor(
    // Optional for the same reason as in LlmUsageService: the headless
    // generation seam (#797) resolves LLMModule without a database.
    @Optional() private readonly prisma: PrismaService | null,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async sweepExpiredUsageEvents(): Promise<void> {
    if (!this.prisma) return;

    // Skip if cron jobs are disabled (e.g., in local development)
    if (!this.configService.enableCronJobs) {
      this.logger.debug('LLM usage retention sweep skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    const retentionDays = this.configService.llmUsageRetentionDays;
    if (retentionDays <= 0) {
      this.logger.warn(
        'LLM usage retention sweep disabled (LLM_USAGE_RETENTION_DAYS=0) — llm_usage_events will grow unbounded',
      );
      return;
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    try {
      const { count } = await this.prisma.llmUsageEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(
          `LLM usage retention sweep deleted ${count} events older than ${retentionDays} days`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM usage retention sweep failed: ${message}`);
    }
  }
}
