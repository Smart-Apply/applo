import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Upper bound on notification entries per webhook delivery. Microsoft batches
 * aggressively but nowhere near this; the cap exists because the endpoint is
 * public and unauthenticated by design, so without it one 100 kb request could
 * carry ~1-2k entries, each costing a DB read before any secret is checked
 * (security audit 2026-08-13, F19).
 */
export const GRAPH_WEBHOOK_MAX_NOTIFICATIONS = 100;

/**
 * One Microsoft Graph change-notification entry — a CLASS, not an interface.
 * The previous `interface` typing erased at compile time, so Nest's global
 * ValidationPipe saw metatype `Object` and skipped validation (and the
 * whitelist) entirely. Only the fields the orchestrator reads are declared;
 * `whitelist: true` strips the rest (changeType, resourceData, tenantId, …).
 */
export class GraphChangeNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64) // Graph subscription ids are 36-char GUIDs
  subscriptionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256) // we mint it (hex secret) — real values are far shorter
  clientState?: string;

  /**
   * Graph resource path, e.g. "Users/…/Messages/AAMkAGZ…". Optional so an
   * entry without one (e.g. a future lifecycle-style notification) skips
   * gracefully instead of 400ing the whole batch; the controller drops
   * resource-less entries with a warning.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  resource?: string;
}

export class GraphWebhookBodyDto {
  /** Optional: the subscription-validation handshake arrives with no body. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GRAPH_WEBHOOK_MAX_NOTIFICATIONS)
  @ValidateNested({ each: true })
  @Type(() => GraphChangeNotificationDto)
  value?: GraphChangeNotificationDto[];
}
