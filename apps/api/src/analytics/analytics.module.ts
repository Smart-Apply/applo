import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics module. Read-only aggregations over Application + Template tables.
 *
 * No PrismaModule import — PrismaService is exported globally. SubscriptionService
 * (used by FeatureGuard) is also global. AuthModule provides JwtAuthGuard via
 * the global passport setup.
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
