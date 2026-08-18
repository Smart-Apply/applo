import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import type Stripe from 'stripe';

import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

/**
 * Public Stripe webhook. This is the ONLY place a paid tier or a credit pack is
 * granted — the browser returning to `/pricing?checkout=success` proves
 * nothing, since the user controls that URL and may never visit it at all.
 *
 * Trust boundary: the `Stripe-Signature` header, verified against the raw
 * request bytes with `STRIPE_WEBHOOK_SECRET`. No auth, and it must be on the
 * CSRF skip-list in main.ts — Stripe cannot carry our CSRF token, and without
 * the exemption every delivery 403s and paid users silently never get upgraded.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('webhook')
  @Public()
  // Unthrottled for the same reason as the Graph webhook: delivery must not
  // depend on prod rate-limit values. Signature verification rejects anything
  // that isn't Stripe before any work happens.
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook' })
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    if (!req.rawBody) {
      // Should never happen: main.ts sets rawBody: true on NestFactory.create.
      this.logger.error('Stripe webhook hit without rawBody — Nest rawBody option not enabled?');
      throw new BadRequestException('Raw body unavailable');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructEvent(req.rawBody, signature);
    } catch (err) {
      // Covers a forged signature, a stale timestamp, and a mismatched
      // endpoint secret alike. 400 tells Stripe not to retry — a signature
      // that failed once will fail identically forever.
      this.logger.warn(`Rejected Stripe webhook: ${(err as Error).message}`);
      throw new BadRequestException('Invalid signature');
    }

    try {
      await this.paymentsService.handleEvent(event);
    } catch (err) {
      // Rethrow so Stripe retries with backoff: a DB blip here means someone
      // paid and didn't get their tier, which must not be swallowed.
      this.logger.error(
        `Failed to process Stripe event ${event.id} (${event.type}): ${(err as Error).message}`,
      );
      throw err;
    }

    return { received: true };
  }
}
