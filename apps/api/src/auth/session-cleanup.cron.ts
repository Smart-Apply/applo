import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class SessionCleanupCron {
  private readonly logger = new Logger(SessionCleanupCron.name);

  constructor(
    private sessionService: SessionService,
    private configService: ConfigService,
  ) {}

  /**
   * Clean up expired and revoked refresh tokens daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredRefreshTokens() {
    // Skip if cron jobs are disabled (e.g., in local development)
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Refresh token cleanup skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    this.logger.log('Starting refresh token cleanup...');
    const startTime = Date.now();

    try {
      const count = await this.sessionService.cleanupExpiredRefreshTokens();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Refresh token cleanup completed. Deleted ${count} expired/revoked tokens in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Refresh token cleanup failed', error);
    }
  }

  /**
   * Clean up expired sessions daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredSessions() {
    // Skip if cron jobs are disabled (e.g., in local development)
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Session cleanup skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    this.logger.log('Starting session cleanup...');
    const startTime = Date.now();

    try {
      const count = await this.sessionService.cleanupExpiredSessions();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Session cleanup completed. Deleted ${count} expired/revoked/old sessions in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Session cleanup failed', error);
    }
  }
}
