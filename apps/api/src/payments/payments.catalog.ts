import { SubscriptionTier } from '../generated/prisma/client';
import { ADDON_PACKAGES } from '../subscription/subscription.service';

/**
 * What a customer can actually buy.
 *
 * Two separate shapes on purpose: a tier is a Stripe *subscription* (recurring,
 * lifecycle events, cancellable), an add-on pack is a Stripe *one-off payment*
 * (no lifecycle, credits land once and persist until used). They ride different
 * Checkout modes and different webhook events, so keeping them in one union
 * would only hide the difference.
 */

/** Recurring tiers that can be purchased. FREE is the absence of a purchase. */
export const PURCHASABLE_TIERS = ['PRO', 'PREMIUM'] as const;
export type PurchasableTier = (typeof PURCHASABLE_TIERS)[number];

export const ADDON_PACK_IDS = ['SMALL', 'MEDIUM', 'LARGE'] as const;
export type AddonPackId = (typeof ADDON_PACK_IDS)[number];

export function isPurchasableTier(value: string): value is PurchasableTier {
  return (PURCHASABLE_TIERS as readonly string[]).includes(value);
}

export function isAddonPackId(value: string): value is AddonPackId {
  return (ADDON_PACK_IDS as readonly string[]).includes(value);
}

/**
 * How many credits each pack grants. Read from ADDON_PACKAGES rather than
 * duplicated, so the number the user is charged for and the number they
 * receive cannot drift apart.
 */
export function creditsForPack(pack: AddonPackId): number {
  return ADDON_PACKAGES[pack].credits;
}

/**
 * Checkout `metadata` we attach to every session, and read back in the webhook.
 *
 * The webhook is the ONLY place a tier is granted, and it must work even if the
 * browser never returns from Stripe (closed tab, dead battery). So everything
 * needed to fulfil the purchase travels with the session rather than being held
 * in server memory or a redirect param.
 */
export const CHECKOUT_METADATA = {
  userId: 'applo_user_id',
  kind: 'applo_kind',
  tier: 'applo_tier',
  pack: 'applo_pack',
  /** ISO timestamp of the § 356 Abs. 4 BGB consent — dispute evidence. */
  withdrawalWaiverAt: 'applo_withdrawal_waiver_at',
} as const;

/**
 * Footer Stripe prints on invoices while the seller is a Kleinunternehmer.
 *
 * § 19 UStG requires the exemption to be stated on the invoice itself — an
 * invoice that simply omits the VAT line reads as an ordinary net invoice with
 * a mistake in it.
 */
export const SMALL_BUSINESS_INVOICE_FOOTER =
  'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';

export type CheckoutKind = 'subscription' | 'addon';

/** Maps a Stripe price id back to the tier it represents. */
export function tierForPriceId(
  priceId: string,
  prices: { PRO?: string; PREMIUM?: string },
): SubscriptionTier | null {
  if (prices.PRO && priceId === prices.PRO) return SubscriptionTier.PRO;
  if (prices.PREMIUM && priceId === prices.PREMIUM) return SubscriptionTier.PREMIUM;
  return null;
}
