import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LlmFeature,
  LlmProviderKind,
  LlmRoutingLane,
  SubscriptionTier,
} from '../../../generated/prisma/client';
import { TRACKED_LANGUAGES } from '../../../llm/usage/llm-usage.service';
import {
  LLM_USAGE_DIMENSIONS,
  LLM_USAGE_INTERVALS,
  type LlmUsageDimension,
  type LlmUsageInterval,
} from '../admin-llm-usage.types';

/**
 * Shared filters for every `/admin/llm-usage/*` endpoint.
 *
 * Every field is an enum, an allow-listed literal or an ISO-8601 timestamp —
 * there is deliberately no free-text field here (hence no `@Sanitize()`), and
 * no `actorHash` filter, which would let an admin narrow an aggregate down to
 * a single pseudonymous user (issue #525 acceptance criteria).
 */
export class LlmUsageFilterQueryDto {
  @ApiPropertyOptional({
    description: 'Start of the window (inclusive, ISO-8601). Defaults to 30 days before `to`.',
    example: '2026-07-17T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'End of the window (exclusive, ISO-8601). Defaults to now.',
    example: '2026-08-16T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: LlmFeature, description: 'Only count calls for this feature' })
  @IsOptional()
  @IsEnum(LlmFeature)
  feature?: LlmFeature;

  @ApiPropertyOptional({
    enum: SubscriptionTier,
    description: 'Only count calls made on this tier',
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @ApiPropertyOptional({
    enum: LlmProviderKind,
    description: 'Only count calls served by this provider',
  })
  @IsOptional()
  @IsEnum(LlmProviderKind)
  provider?: LlmProviderKind;

  @ApiPropertyOptional({
    enum: LlmRoutingLane,
    description: 'Only count calls served by this lane',
  })
  @IsOptional()
  @IsEnum(LlmRoutingLane)
  lane?: LlmRoutingLane;

  @ApiPropertyOptional({
    enum: TRACKED_LANGUAGES,
    description: 'Only count calls recorded for this document language',
  })
  @IsOptional()
  @IsIn(TRACKED_LANGUAGES)
  language?: string;
}

export class LlmUsageBreakdownQueryDto extends LlmUsageFilterQueryDto {
  @ApiProperty({
    enum: LLM_USAGE_DIMENSIONS,
    description: 'Column to group the aggregate by',
    example: 'feature',
  })
  @IsIn(LLM_USAGE_DIMENSIONS)
  groupBy: LlmUsageDimension;

  @ApiPropertyOptional({
    description: 'Maximum number of groups to return (ordered by cost, then tokens, then calls)',
    minimum: 1,
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class LlmUsageTimeseriesQueryDto extends LlmUsageFilterQueryDto {
  @ApiPropertyOptional({
    enum: LLM_USAGE_INTERVALS,
    description: 'Bucket size (UTC). Defaults to `day`.',
    default: 'day',
  })
  @IsOptional()
  @IsIn(LLM_USAGE_INTERVALS)
  interval?: LlmUsageInterval;

  @ApiPropertyOptional({
    enum: LLM_USAGE_DIMENSIONS,
    description: 'Optional second dimension, e.g. `feature` for tokens/cost per feature per day',
  })
  @IsOptional()
  @IsIn(LLM_USAGE_DIMENSIONS)
  groupBy?: LlmUsageDimension;
}
