import { Module } from '@nestjs/common';

import { AutoApplyController } from './auto-apply.controller';
import { AutoApplyService } from './auto-apply.service';
import { AutoApplyCron } from './auto-apply.cron';
import { AutoApplyDigestCron } from './auto-apply-digest.cron';
import { ApplicationsModule } from '../applications/applications.module';
import { LinkedInJobsModule } from '../linkedin-jobs/linkedin-jobs.module';
import { ConfigModule } from '../config/config.module';

/**
 * Auto-Apply Agent module (Premium feature).
 *
 * - PrismaService is global.
 * - SubscriptionService is global.
 * - EmailService is global.
 * - We import ApplicationsModule (for ApplicationsService) and
 *   LinkedInJobsModule (for LinkedInJobsService) explicitly because both
 *   are scoped, not global.
 */
@Module({
  imports: [ConfigModule, ApplicationsModule, LinkedInJobsModule],
  controllers: [AutoApplyController],
  providers: [AutoApplyService, AutoApplyCron, AutoApplyDigestCron],
})
export class AutoApplyModule {}
