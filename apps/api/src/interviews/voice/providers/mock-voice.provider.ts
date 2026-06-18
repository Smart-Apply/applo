import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MintedVoiceSession, VoiceProvider } from '../voice-provider.interface';

/**
 * Offline/local voice provider. Reports unavailable so the frontend hides the
 * "Sprach-Interview" option, and refuses to mint a session if called directly.
 * Used when `VOICE_PROVIDER=mock` (the default for local dev / tests).
 */
@Injectable()
export class MockVoiceProvider implements VoiceProvider {
  isAvailable(): boolean {
    return false;
  }

  async createSession(): Promise<MintedVoiceSession> {
    throw new ServiceUnavailableException(
      'Sprach-Interview ist in dieser Umgebung nicht verfügbar.',
    );
  }
}
