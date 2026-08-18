import { Module } from '@nestjs/common';

import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

/**
 * Stripe billing: Checkout for buying, Customer Portal for managing, webhook
 * for granting.
 *
 * Registered unconditionally even when `PAYMENTS_ENABLED=false` so
 * `GET /payments/config` can tell the frontend that billing is off. Every
 * money-moving path goes through `StripeService.stripe`, which 503s when the
 * deployment has no keys.
 *
 * EmailModule is @Global(). SubscriptionService is registered globally by
 * SubscriptionModule, so neither is imported here.
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [StripeService, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
