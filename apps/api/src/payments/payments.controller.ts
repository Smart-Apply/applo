import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UseThrottler } from '../common/decorators/throttle.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '../config/config.service';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Whether billing is live. Public so the pricing page can render the right
   * CTA before the user logs in — a "Jetzt upgraden" button that 503s is worse
   * than one that says the tier isn't purchasable yet.
   */
  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Payment availability for the current deployment' })
  @ApiResponse({ status: 200, description: 'Returns whether checkout is available' })
  getConfig() {
    return {
      enabled: this.stripeService.enabled,
      testMode: this.stripeService.enabled ? this.stripeService.testMode : null,
      // Drives what the pricing page may say about VAT. A Kleinunternehmer
      // (§ 19 UStG) charges none, so claiming "inkl. 19 % MwSt." would
      // advertise a tax that is never collected or remitted.
      smallBusiness: this.config.paymentsSmallBusiness,
    };
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @UseThrottler('payments')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  @ApiResponse({ status: 200, description: 'Returns the URL to redirect the browser to' })
  @ApiResponse({ status: 503, description: 'Billing is not configured on this deployment' })
  async createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentsService.createCheckoutSession(userId, dto);
  }

  /**
   * Stripe Customer Portal — payment method, invoices, plan change, cancel.
   *
   * German consumers additionally get the § 312k BGB cancellation route at
   * `POST /payments/cancel-subscription`, which does not require finding this
   * button inside a third-party UI.
   */
  @Post('portal-session')
  @UseGuards(JwtAuthGuard)
  @UseThrottler('payments')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session' })
  @ApiResponse({ status: 200, description: 'Returns the portal URL' })
  @ApiResponse({ status: 404, description: 'User has no Stripe customer yet' })
  async createPortalSession(@CurrentUser('id') userId: string) {
    return this.paymentsService.createPortalSession(userId);
  }

  /**
   * § 312k BGB cancellation. Deliberately a first-party endpoint rather than a
   * link into the Stripe portal: the statute requires the cancellation route
   * and its confirmation to be ours, directly reachable, and acknowledged in
   * text form immediately.
   */
  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @UseThrottler('payments')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the running subscription at period end (§ 312k BGB)' })
  @ApiResponse({
    status: 200,
    description: 'Cancellation accepted; returns when access ends and where the confirmation went',
  })
  @ApiResponse({ status: 404, description: 'No paid subscription to cancel' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.paymentsService.cancelSubscription(userId);
  }
}
