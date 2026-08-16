import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';

/**
 * Retention sweep for `application_email_events`.
 *
 * The rows are metadata about mail in the user's private inbox — sender
 * address, sender name, subject, receipt time. They exist to explain an
 * automatic status change and to dedupe Graph replays; neither purpose
 * survives the notification window, so they must not accumulate for the life
 * of the account (Art. 5(1)(e) DSGVO). Modelled on `LlmUsageRetentionCron`.
 *
 * 04:30 keeps clear of the 00:00 / 00:05 / 03:30 cleanup crons and the 04:00
 * LLM usage sweep.
 */
@Injectable()
export class MailboxEventRetentionCron {
  private readonly logger = new Logger(MailboxEventRetentionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('30 4 * * *') // 04:30 every day
  async sweepExpiredEmailEvents(): Promise<void> {
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Mailbox event retention sweep skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    const retentionDays = this.configService.mailboxEventRetentionDays;
    if (retentionDays <= 0) {
      this.logger.warn(
        'Mailbox event retention sweep disabled (MAILBOX_EVENT_RETENTION_DAYS=0) — application_email_events will grow unbounded',
      );
      return;
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    try {
      const { count } = await this.prisma.applicationEmailEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(
          `Mailbox event retention sweep deleted ${count} event(s) older than ${retentionDays} days`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mailbox event retention sweep failed: ${message}`);
    }
  }
}
