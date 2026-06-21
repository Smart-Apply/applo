import type { RealtimeVoice } from '@smart-apply/shared';

/**
 * DI token for the pluggable voice provider (mirrors `LLM_PROVIDER`).
 * Bound in `InterviewsModule` to `AzureRealtimeVoiceProvider` or
 * `MockVoiceProvider` based on the `VOICE_PROVIDER` env var.
 */
export const VOICE_PROVIDER = 'VOICE_PROVIDER';

/** Voices the Azure OpenAI Realtime API can synthesize. */
export const REALTIME_VOICES: RealtimeVoice[] = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
];

/** Everything the provider needs to mint a realtime session. */
export interface VoiceSessionContext {
  sessionId: string;
  /** Interviewer system prompt — kept server-side (webrtcfilter hides it). */
  instructions: string;
  /** Realtime model deployment name. */
  model: string;
  voice: RealtimeVoice;
  /** Hard ceiling for this call (seconds). */
  maxSessionSeconds: number;
}

/** Ephemeral session minted by the provider for the browser to connect with. */
export interface MintedVoiceSession {
  /** Short-lived realtime client secret (never the standing API key). */
  token: string;
  expiresAt: Date;
  /** GA realtime calls endpoint, already including `?webrtcfilter=on`. */
  webrtcUrl: string;
  model: string;
  voice: RealtimeVoice;
}

/**
 * Pluggable voice provider. Concrete impls: `azure-realtime` (Azure OpenAI
 * Realtime API) and `mock` (offline/local — reports unavailable).
 */
export interface VoiceProvider {
  /** True when real sessions can be minted (credentials configured). */
  isAvailable(): boolean;
  createSession(ctx: VoiceSessionContext): Promise<MintedVoiceSession>;
}
