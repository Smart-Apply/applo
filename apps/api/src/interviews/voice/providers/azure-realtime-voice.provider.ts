import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../../config/config.service';
import {
  MintedVoiceSession,
  VoiceProvider,
  VoiceSessionContext,
} from '../voice-provider.interface';

/**
 * Mints ephemeral realtime sessions against the Azure OpenAI Realtime API (GA).
 *
 * Flow: server POSTs the standing api-key to `/openai/v1/realtime/client_secrets`
 * with the interview instructions + voice, and receives a short-lived `ek_...`
 * token. Only that token (never the api-key) is handed to the browser, which
 * uses it to negotiate WebRTC against `/openai/v1/realtime/calls?webrtcfilter=on`.
 * The `webrtcfilter` keeps the instructions out of the browser's data channel.
 */
@Injectable()
export class AzureRealtimeVoiceProvider implements VoiceProvider {
  private readonly logger = new Logger(AzureRealtimeVoiceProvider.name);
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.endpoint = (this.config.azureOpenAIRealtimeEndpoint ?? '').replace(/\/$/, '');
    this.apiKey = this.config.azureOpenAIRealtimeApiKey ?? '';
  }

  isAvailable(): boolean {
    return Boolean(this.endpoint && this.apiKey);
  }

  async createSession(ctx: VoiceSessionContext): Promise<MintedVoiceSession> {
    if (!this.isAvailable()) {
      throw new ServiceUnavailableException('Sprach-Interview ist derzeit nicht verfügbar.');
    }

    const url = `${this.endpoint}/openai/v1/realtime/client_secrets`;
    const body = {
      session: {
        type: 'realtime',
        model: ctx.model,
        instructions: ctx.instructions,
        audio: {
          // Transcribe the candidate's speech so we can pair Q&A and score it.
          input: {
            transcription: { model: 'whisper-1' },
            // Server-side VAD = natural turn-taking (model replies when the
            // candidate stops speaking) without manual buffer commits.
            turn_detection: { type: 'server_vad' },
          },
          output: { voice: ctx.voice },
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, body, {
          headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json' },
          timeout: 15000,
        }),
      );

      const token: string | undefined = response.data?.value;
      if (!token) {
        throw new Error('No ephemeral token in realtime response');
      }

      // `expires_at` is unix seconds when present; default to a conservative +60s.
      const expiresAtSeconds =
        typeof response.data?.expires_at === 'number'
          ? response.data.expires_at
          : Math.floor(Date.now() / 1000) + 60;

      this.logger.log(`Minted realtime voice session for interview ${ctx.sessionId}`);

      return {
        token,
        expiresAt: new Date(expiresAtSeconds * 1000),
        webrtcUrl: `${this.endpoint}/openai/v1/realtime/calls?webrtcfilter=on`,
        model: ctx.model,
        voice: ctx.voice,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Realtime session mint failed: ${message}`);
      throw new ServiceUnavailableException('Sprach-Interview konnte nicht gestartet werden.');
    }
  }
}
