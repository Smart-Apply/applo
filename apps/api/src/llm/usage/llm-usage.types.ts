import type {
  LlmFeature,
  LlmProviderKind,
  LlmRoutingLane,
  LlmCircuitState,
  SubscriptionTier,
} from '../../generated/prisma/client';
import type { LlmCallUsage } from '../llm.interface';

/** Seeded per HTTP request (interceptor) or per queue job. Never persisted raw. */
export interface LlmActorContext {
  userId: string;
  language?: string;
}

/** Everything LLMService knows about one completed (or failed) logical call. */
export interface LlmUsageRecordInput {
  feature: LlmFeature;
  provider: LlmProviderKind;
  model: string;
  lane: LlmRoutingLane;
  usage?: LlmCallUsage;
  language?: string;
  latencyMs: number;
  success: boolean;
  circuitState: LlmCircuitState;
  errorKind?: string;
}

export type { LlmFeature, LlmProviderKind, LlmRoutingLane, LlmCircuitState, SubscriptionTier };
