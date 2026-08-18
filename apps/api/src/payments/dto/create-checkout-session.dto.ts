import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import { ADDON_PACK_IDS, PURCHASABLE_TIERS } from '../payments.catalog';

/**
 * Everything here is an allow-listed enum rather than a free string — the
 * values select a Stripe price id, so accepting arbitrary input would let a
 * caller pick what they get charged.
 */
export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Whether this buys a recurring tier or a one-off credit pack',
    enum: ['subscription', 'addon'],
  })
  @IsIn(['subscription', 'addon'])
  kind: 'subscription' | 'addon';

  @ApiPropertyOptional({
    description: 'Tier to subscribe to. Required when kind=subscription.',
    enum: PURCHASABLE_TIERS,
  })
  @IsOptional()
  @IsIn(PURCHASABLE_TIERS as unknown as string[])
  tier?: string;

  @ApiPropertyOptional({
    description: 'Credit pack to buy. Required when kind=addon.',
    enum: ADDON_PACK_IDS,
  })
  @IsOptional()
  @IsIn(ADDON_PACK_IDS as unknown as string[])
  pack?: string;

  @ApiPropertyOptional({
    description: 'UI locale, so the Stripe-hosted page matches the app language',
    enum: ['de', 'en', 'fr', 'es', 'pt', 'it'],
  })
  @IsOptional()
  @IsIn(['de', 'en', 'fr', 'es', 'pt', 'it'])
  locale?: string;

  @ApiProperty({
    description:
      'Consent to immediate performance and waiver of the 14-day right of withdrawal (§ 356 Abs. 4 BGB). Must be true — the service starts as soon as the tier is granted, so without it the purchase stays refundable for 14 days.',
    example: true,
  })
  @IsBoolean()
  withdrawalWaiver: boolean;
}
