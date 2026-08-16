import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { ApplicationsService } from '../../applications/applications.service';
import { JobPostingsService } from '../../job-postings/job-postings.service';

/**
 * Cleanup cron job for soft-deleted items
 * Hard deletes items that have been soft-deleted for more than 30 days
 *
 * The cron deliberately goes through `ApplicationsService.hardDelete()` /
 * `JobPostingsService.hardDeleteJobPosting()` instead of issuing its own
 * `deleteMany`. Those methods own the storage cleanup; the bulk delete that
 * used to live here removed the database row and left the generated PDFs
 * (full résumés) in R2 forever — an unbounded retention of personal data
 * (Art. 17 / Art. 5(1)(e) DSGVO). Deletion has to hang off the one path that
 * knows about the files, never beside it.
 */
@Injectable()
export class CleanupCron {
  private readonly logger = new Logger(CleanupCron.name);

  /**
   * Safety cap per run. Deleting row-by-row costs storage round-trips, so a
   * backlog is drained across runs instead of in one unbounded job.
   */
  private static readonly BATCH_SIZE = 500;

  /** Items stay restorable for this long after a soft delete. */
  private static readonly RETENTION_DAYS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly applicationsService: ApplicationsService,
    private readonly jobPostingsService: JobPostingsService,
  ) {}

  /**
   * Clean up soft-deleted applications older than 30 days
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupDeletedApplications() {
    // Skip if cron jobs are disabled (e.g., in local development)
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Application cleanup skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    this.logger.log('Starting soft-deleted applications cleanup...');
    const startTime = Date.now();

    try {
      const expired = await this.prisma.application.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: CleanupCron.cutoff(),
          },
        },
        select: { id: true, userId: true },
        take: CleanupCron.BATCH_SIZE,
      });

      let deleted = 0;
      let failed = 0;
      for (const application of expired) {
        try {
          await this.applicationsService.hardDelete(application.userId, application.id);
          deleted++;
        } catch (error) {
          // One bad row must not stall the sweep — the next run retries it.
          failed++;
          this.logger.warn(
            `Failed to hard-delete application ${application.id}: ${errorMessage(error)}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Application cleanup completed. Deleted ${deleted} applications (${failed} failed) older than ${CleanupCron.RETENTION_DAYS} days in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Application cleanup failed', error);
    }
  }

  /**
   * Clean up soft-deleted job postings older than 30 days
   * Runs daily at 12:05 AM (5 minutes after applications cleanup to avoid DB contention)
   */
  @Cron('5 0 * * *') // 00:05 every day
  async cleanupDeletedJobPostings() {
    // Skip if cron jobs are disabled (e.g., in local development)
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Job postings cleanup skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    this.logger.log('Starting soft-deleted job postings cleanup...');
    const startTime = Date.now();

    try {
      const expired = await this.prisma.jobPosting.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: CleanupCron.cutoff(),
          },
        },
        select: { id: true, userId: true },
        take: CleanupCron.BATCH_SIZE,
      });

      let deleted = 0;
      let failed = 0;
      for (const jobPosting of expired) {
        try {
          await this.jobPostingsService.hardDeleteJobPosting(jobPosting.userId, jobPosting.id);
          deleted++;
        } catch (error) {
          failed++;
          this.logger.warn(
            `Failed to hard-delete job posting ${jobPosting.id}: ${errorMessage(error)}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Job postings cleanup completed. Deleted ${deleted} job postings (${failed} failed) older than ${CleanupCron.RETENTION_DAYS} days in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Job postings cleanup failed', error);
    }
  }

  /**
   * Refresh materialized views for dashboard statistics
   * Runs every 5 minutes to keep stats relatively fresh
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async refreshMaterializedViews() {
    // Skip if cron jobs are disabled (e.g., in local development)
    if (!this.configService.enableCronJobs) {
      this.logger.debug('Materialized views refresh skipped (ENABLE_CRON_JOBS=false)');
      return;
    }

    this.logger.debug('Refreshing materialized views...');
    const startTime = Date.now();

    try {
      await this.prisma.refreshMaterializedViews();
      const duration = Date.now() - startTime;
      this.logger.debug(`Materialized views refreshed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Materialized views refresh failed', error);
    }
  }

  private static cutoff(): Date {
    return new Date(Date.now() - CleanupCron.RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
