import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../admin.guard';
import { AdminLlmUsageService } from './admin-llm-usage.service';
import {
  LlmUsageBreakdownQueryDto,
  LlmUsageFilterQueryDto,
  LlmUsageTimeseriesQueryDto,
} from './dto/llm-usage-query.dto';
import type {
  LlmUsageBreakdown,
  LlmUsageSummary,
  LlmUsageTimeseries,
} from './admin-llm-usage.types';

/**
 * Read-only LLM token-usage analytics (issue #525), gated by the same
 * `ADMIN_EMAILS` allow-list as the rest of `/admin/*`.
 *
 * Aggregates only. There is no per-actor drill-down and no `actorHash` in any
 * request or response, so nothing here can be resolved back to a user — the
 * dataset is pseudonymous personal data (audit 2026-08-13, F11), not
 * anonymous.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/llm-usage')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminLlmUsageController {
  constructor(private readonly llmUsageAnalytics: AdminLlmUsageService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Aggregate LLM token usage and cost for a time window (admin only)',
    description:
      'Totals over `llm_usage_events`: calls, success rate, prompt/completion/cached/total ' +
      'tokens, estimated USD cost and average latency. Defaults to the last 30 days.',
  })
  @ApiResponse({ status: 200, description: 'Aggregated totals for the window' })
  @ApiResponse({ status: 403, description: 'Not an allow-listed admin' })
  async summary(@Query() query: LlmUsageFilterQueryDto): Promise<LlmUsageSummary> {
    return this.llmUsageAnalytics.summary(query);
  }

  @Get('breakdown')
  @ApiOperation({
    summary: 'LLM usage grouped by feature/tier/language/model/provider/lane (admin only)',
    description:
      'Same metrics as `/summary`, grouped by one dimension and ordered busiest-first ' +
      '(cost, then tokens, then calls).',
  })
  @ApiResponse({ status: 200, description: 'Aggregated totals per group' })
  @ApiResponse({ status: 400, description: 'Invalid groupBy, range or filter' })
  @ApiResponse({ status: 403, description: 'Not an allow-listed admin' })
  async breakdown(@Query() query: LlmUsageBreakdownQueryDto): Promise<LlmUsageBreakdown> {
    return this.llmUsageAnalytics.breakdown(query);
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'LLM usage per day/week/month, optionally split by a dimension (admin only)',
    description:
      'Cost and token trend over time. Buckets are UTC. Pass `groupBy` for e.g. tokens and ' +
      'cost per feature per day.',
  })
  @ApiResponse({ status: 200, description: 'Aggregated totals per time bucket' })
  @ApiResponse({ status: 400, description: 'Invalid interval, groupBy or range' })
  @ApiResponse({ status: 403, description: 'Not an allow-listed admin' })
  async timeseries(@Query() query: LlmUsageTimeseriesQueryDto): Promise<LlmUsageTimeseries> {
    return this.llmUsageAnalytics.timeseries(query);
  }
}
