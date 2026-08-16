import { IsIn, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_EXPORT_LIMIT,
  DEFAULT_K_ANONYMITY,
  MAX_EXPORT_LIMIT,
  type LlmUsageExportActorMode,
  type LlmUsageExportBucket,
  type LlmUsageExportFormat,
} from '../llm-usage-export.service';

/**
 * Query parameters for the admin-only `llm_usage_events` export (issue #523).
 *
 * Every field is an enum, an integer or an ISO 8601 timestamp — there is no
 * free-text input here, so no `@Sanitize()` is needed. The defaults are the
 * configuration the export is documented and defended with; see
 * docs/security/LLM_USAGE_DATASET.md.
 */
export class LlmUsageExportQueryDto {
  @ApiPropertyOptional({
    description: 'Serialisation format',
    enum: ['jsonl', 'csv'],
    default: 'jsonl',
  })
  @IsOptional()
  @IsIn(['jsonl', 'csv'])
  format?: LlmUsageExportFormat = 'jsonl';

  @ApiPropertyOptional({
    description: 'Inclusive lower bound on the source createdAt (ISO 8601)',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Exclusive upper bound on the source createdAt (ISO 8601)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    description: 'UTC bucket the timestamp is truncated to. There is no raw-timestamp option.',
    enum: ['hour', 'day', 'month'],
    default: 'hour',
  })
  @IsOptional()
  @IsIn(['hour', 'day', 'month'])
  bucket?: LlmUsageExportBucket = 'hour';

  @ApiPropertyOptional({
    description:
      'pseudonym = actor re-keyed with a random per-export salt; none = no actor column value at all',
    enum: ['pseudonym', 'none'],
    default: 'pseudonym',
  })
  @IsOptional()
  @IsIn(['pseudonym', 'none'])
  actor?: LlmUsageExportActorMode = 'pseudonym';

  @ApiPropertyOptional({
    description:
      'Minimum number of distinct actors a quasi-identifier group must hold before its rows are released. 1 disables suppression.',
    minimum: 1,
    maximum: 1000,
    default: DEFAULT_K_ANONYMITY,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  k?: number = DEFAULT_K_ANONYMITY;

  @ApiPropertyOptional({
    description: 'Maximum number of source rows to read (rows are buffered to compute k-anonymity)',
    minimum: 1,
    maximum: MAX_EXPORT_LIMIT,
    default: DEFAULT_EXPORT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EXPORT_LIMIT)
  limit?: number = DEFAULT_EXPORT_LIMIT;
}
