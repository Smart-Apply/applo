import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AI_PROMPT_HARD_CEILING_CHARS } from '@applo/shared';
import type { VoiceTranscriptRole } from '@applo/shared';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

/** Upper sanity bound per token counter — far above any real session. */
const MAX_TOKENS_PER_COUNTER = 10_000_000;

/**
 * Client-summed token usage from the realtime `response.done` events.
 * Telemetry only: never used for quota enforcement (the clamped duration
 * against the tier minute cap stays authoritative).
 */
export class VoiceUsageDto {
  @ApiProperty({ description: 'Text input tokens across the session.' })
  @IsInt()
  @Min(0)
  @Max(MAX_TOKENS_PER_COUNTER)
  textInputTokens: number;

  @ApiProperty({ description: 'Audio input tokens across the session.' })
  @IsInt()
  @Min(0)
  @Max(MAX_TOKENS_PER_COUNTER)
  audioInputTokens: number;

  @ApiProperty({ description: 'Cached input tokens across the session.' })
  @IsInt()
  @Min(0)
  @Max(MAX_TOKENS_PER_COUNTER)
  cachedInputTokens: number;

  @ApiProperty({ description: 'Text output tokens across the session.' })
  @IsInt()
  @Min(0)
  @Max(MAX_TOKENS_PER_COUNTER)
  textOutputTokens: number;

  @ApiProperty({ description: 'Audio output tokens across the session.' })
  @IsInt()
  @Min(0)
  @Max(MAX_TOKENS_PER_COUNTER)
  audioOutputTokens: number;
}

/** A single turn of the spoken interview transcript. */
export class VoiceTranscriptTurnDto {
  @ApiProperty({ enum: ['interviewer', 'candidate'] })
  @IsIn(['interviewer', 'candidate'])
  role: VoiceTranscriptRole;

  @ApiProperty({ description: 'Transcribed text for this turn.' })
  @IsString()
  @MaxLength(AI_PROMPT_HARD_CEILING_CHARS, { message: 'Ein Transkript-Beitrag ist zu lang.' })
  @Sanitize()
  text: string;

  @ApiPropertyOptional({ description: 'Offset from call start in seconds.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  atSeconds?: number;
}

/**
 * Body for finalizing a voice interview: the client-collected transcript plus
 * the measured call duration. The server pairs the turns into Q&A, scores them
 * with the existing feedback generator, and completes the session.
 */
export class SubmitVoiceTranscriptDto {
  @ApiProperty({ description: 'Recorded call length in seconds.', example: 420 })
  @IsInt()
  @Min(0)
  @Max(7200)
  durationSeconds: number;

  @ApiProperty({ type: [VoiceTranscriptTurnDto] })
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => VoiceTranscriptTurnDto)
  turns: VoiceTranscriptTurnDto[];

  @ApiPropertyOptional({
    type: VoiceUsageDto,
    description:
      'Token usage summed client-side from the realtime response.done events (telemetry only).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VoiceUsageDto)
  usage?: VoiceUsageDto;
}
