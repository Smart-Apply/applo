import { IsIn, IsOptional } from 'class-validator';
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

/**
 * Body for minting a voice (realtime) interview session. The session id comes
 * from the route param; the only client-controllable option is an optional
 * voice override.
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
}
