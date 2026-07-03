import { IsIn, IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { RealtimeVoice } from '@smart-apply/shared';

const REALTIME_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
] as const;

const DURATION_OPTIONS = [5, 10, 15] as const;

/**
 * Body for minting a voice (realtime) interview session. The session id comes
 * from the route param; client-controllable options are an optional voice
 * override and the desired call length in minutes.
 */
export class StartVoiceSessionDto {
  @ApiPropertyOptional({
    enum: REALTIME_VOICES,
    description: 'TTS voice override; falls back to the server default when omitted.',
    example: 'alloy',
  })
  @IsOptional()
  @IsIn(REALTIME_VOICES)
  voice?: RealtimeVoice;

  @ApiPropertyOptional({
    enum: DURATION_OPTIONS,
    description:
      'Desired call length in minutes; clamped by the per-session hard cap and the remaining monthly voice budget.',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @IsIn(DURATION_OPTIONS)
  durationMinutes?: (typeof DURATION_OPTIONS)[number];
}
