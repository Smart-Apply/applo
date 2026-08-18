import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';

import { ConfigService } from '../config/config.service';

/**
 * Owns the single Stripe client instance and the "is billing live?" question.
 *
 * The client is built lazily rather than in the constructor so the module can
 * be registered unconditionally — `GET /payments/config` has to be able to
 * answer "billing is off" on a deploy that has no Stripe secrets at all,
 * which it cannot do if constructing the module throws.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.paymentsEnabled;
  }

  get testMode(): boolean {
    return this.config.stripeTestMode;
  }

  /**
   * The Stripe client, or a 503 when billing isn't configured.
   *
   * Throwing here rather than returning null means a caller cannot forget the
   * check and end up dereferencing undefined halfway through a checkout.
   */
  get stripe(): Stripe {
    if (!this.enabled) {
      throw new ServiceUnavailableException({
        message: 'Zahlungen sind derzeit nicht verfügbar.',
        code: 'PAYMENTS_DISABLED',
      });
    }

    if (!this.client) {
      const secretKey = this.config.stripeSecretKey;
      if (!secretKey) {
        // Unreachable while `paymentsEnabled` requires the key, but the type
        // narrowing is real and the invariant is worth stating.
        throw new ServiceUnavailableException({
          message: 'Zahlungen sind derzeit nicht verfügbar.',
          code: 'PAYMENTS_DISABLED',
        });
      }

      this.client = new Stripe(secretKey, {
        // Stripe bills network failures to the customer's patience, not ours:
        // 2 retries with their built-in backoff covers a transient blip
        // without letting a checkout request hang the request thread.
        maxNetworkRetries: 2,
        timeout: 15_000,
        appInfo: { name: 'Applo', url: 'https://applo.ai' },
      });

      this.logger.log(
        `Stripe client initialised in ${this.testMode ? 'TEST' : 'LIVE'} mode`,
      );
    }

    return this.client;
  }

  /**
   * Verifies a webhook signature against the RAW request body.
   *
   * Must be the unparsed bytes — `JSON.parse` + re-stringify reorders keys and
   * drops whitespace, which changes the signed payload and fails verification
   * for reasons that look like a wrong secret.
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.stripeWebhookSecret;
    if (!webhookSecret) {
      throw new ServiceUnavailableException({
        message: 'Zahlungen sind derzeit nicht verfügbar.',
        code: 'PAYMENTS_DISABLED',
      });
    }

    // Stripe's own implementation is constant-time and enforces the 5-minute
    // timestamp tolerance, which is what stops a captured payload being
    // replayed later. Never hand-roll this comparison.
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
