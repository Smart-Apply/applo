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
}
