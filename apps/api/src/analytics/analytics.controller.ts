import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequiresFeature } from '../common/decorators/tier.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsOverviewDto } from './analytics.dto';

/**
 * Aggregate analytics over the calling user's application history.
 *
 * Gated by the `advancedAnalytics` feature flag (PREMIUM only). All
 * computations are scoped to the JWT subject — no cross-user leakage
 * possible because the service treats userId as the sole filter.
 */
@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequiresFeature('advancedAnalytics')
  @ApiOperation({
    summary: 'Get full analytics dashboard payload (Premium)',
    description:
      'Returns the aggregate dashboard payload — totals, conversion funnel, ' +
      '30-day timeseries, ATS-score buckets and top-templates breakdown. ' +
      'One round-trip serves the entire /analytics page.',
  })
  @ApiResponse({ status: 200, description: 'Aggregate analytics payload.' })
  @ApiResponse({ status: 403, description: 'Premium feature — upgrade required.' })
  async getOverview(@CurrentUser('id') userId: string): Promise<AnalyticsOverviewDto> {
    return this.analyticsService.getOverview(userId);
  }
}
