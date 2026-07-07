import { ApiProperty } from '@nestjs/swagger';
import type { RealtimeVoice } from '@applo/shared';

/**
 * Ephemeral voice session handed to the browser. Contains only a short-lived
 * realtime token — never the standing Azure API key.
 */
export class VoiceSessionResponseDto {
  @ApiProperty({ description: 'Short-lived realtime client secret (ek_...).' })
  token: string;

  @ApiProperty({ description: 'ISO timestamp after which the token is rejected.' })
  expiresAt: string;

  @ApiProperty({ description: 'GA realtime calls endpoint (includes ?webrtcfilter=on).' })
  webrtcUrl: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  voice: RealtimeVoice;

  @ApiProperty({ description: 'Maximum allowed call length for this session (seconds).' })
  maxSessionSeconds: number;

  @ApiProperty({ description: 'Minutes left in the current billing period (-1 = unlimited).' })
  remainingMinutes: number;
}

/** Runtime availability + limits for the voice interview mode. */
export class VoiceConfigResponseDto {
  @ApiProperty({ description: 'True when a real voice provider is configured.' })
  available: boolean;

  @ApiProperty()
  defaultVoice: RealtimeVoice;

  @ApiProperty({ type: [String] })
  voices: RealtimeVoice[];

  @ApiProperty()
  maxSessionMinutes: number;

  @ApiProperty({ description: 'Monthly voice budget for the tier (-1 = unlimited).' })
  minutesPerMonth: number;

  @ApiProperty()
  remainingMinutes: number;
}
