import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type Stripe from 'stripe';

import { ConfigService } from '../config/config.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionStatus, SubscriptionTier } from '../generated/prisma/client';
import { StripeService } from './stripe.service';
import {
  ADDON_PACK_IDS,
  CHECKOUT_METADATA,
  SMALL_BUSINESS_INVOICE_FOOTER,
  type AddonPackId,
  type CheckoutKind,
  type PurchasableTier,
  creditsForPack,
  isAddonPackId,
  isPurchasableTier,
  tierForPriceId,
} from './payments.catalog';

/** Prisma unique-constraint violation. */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * Dashboard label for every Checkout Session we open. Stable on purpose —
 * changing it splits this flow's history into two series in the Dashboard's
 * checkout comparison.
 */
const CHECKOUT_INTEGRATION_ID = 'applo_hosted_checkout_qwtdnvzr';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stripeService: StripeService,
    private readonly subscriptions: SubscriptionService,
    private readonly email: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

  /**
   * Starts a Stripe Checkout session and returns the URL to redirect to.
   *
   * We never take card details ourselves — the redirect is what keeps this
   * app out of PCI scope entirely.
   */
  async createCheckoutSession(
    userId: string,
    input: {
      kind: CheckoutKind;
      tier?: string;
      pack?: string;
      locale?: string;
      withdrawalWaiver?: boolean;
    },
  ): Promise<{ url: string }> {
    const stripe = this.stripeService.stripe;

    // § 356 Abs. 4 BGB: a consumer keeps the 14-day right of withdrawal on a
    // digital service unless they expressly consent to performance starting
    // immediately AND acknowledge losing that right. We start generating the
    // moment the tier lands, so without this the customer could use the whole
    // allowance and still demand a full refund on day 13.
    //
    // Refused server-side rather than only in the UI: the consent is the thing
    // that makes the purchase final, so it cannot depend on a checkbox the
    // client could omit.
    if (input.withdrawalWaiver !== true) {
      throw new BadRequestException({
        message:
          'Für den Kauf ist die Zustimmung zum sofortigen Leistungsbeginn und der Verzicht auf das Widerrufsrecht erforderlich.',
        code: 'WITHDRAWAL_WAIVER_REQUIRED',
      });
    }

    const customerId = await this.getOrCreateCustomer(userId);

    const priceId =
      input.kind === 'subscription'
        ? this.resolveTierPrice(input.tier)
        : this.resolveAddonPrice(input.pack);

    const smallBusiness = this.config.paymentsSmallBusiness;
    const appUrl = this.config.appUrl;
    const metadata: Record<string, string> = {
      [CHECKOUT_METADATA.userId]: userId,
      [CHECKOUT_METADATA.kind]: input.kind,
      // Evidence for a later dispute: Stripe stores session metadata
      // immutably, so this is a durable record of when consent was given
      // without us owning another table.
      [CHECKOUT_METADATA.withdrawalWaiverAt]: new Date().toISOString(),
    };
    if (input.kind === 'subscription' && input.tier) {
      metadata[CHECKOUT_METADATA.tier] = input.tier;
    }
    if (input.kind === 'addon' && input.pack) {
      metadata[CHECKOUT_METADATA.pack] = input.pack;
    }

    const session = await stripe.checkout.sessions.create({
      mode: input.kind === 'subscription' ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      locale: this.stripeLocale(input.locale),

      // Stripe Tax: calculates German VAT and applies EU reverse charge when a
      // B2B customer supplies a valid USt-IdNr below.
      //
      // OFF under the Kleinunternehmerregelung (§ 19 UStG): a small business
      // charges no VAT at all, so having Stripe compute and display a tax line
      // would put a tax on the invoice that is never owed or remitted.
      //
      // IMPORTANT when enabled: this collects NOTHING until an active tax
      // registration exists for the customer's jurisdiction (Dashboard -> Tax
      // -> Locations). Stripe does not error on a missing registration — it
      // silently returns zero tax — so a deploy with no registration looks
      // healthy while under-collecting, and past transactions cannot be
      // corrected after the fact. Verify registrations show "Collecting".
      //
      // Prices are stored tax-INCLUSIVE: German B2C prices must be advertised
      // gross (§ 1 PAngV), so €9,95 is what the customer pays, and the VAT is
      // broken out of it rather than added on top.
      automatic_tax: { enabled: !smallBusiness },

      // Required to determine the customer's VAT country. Also what makes the
      // Stripe-issued invoice usable as a Rechnung. Kept even though Checkout
      // could collect it on its own: we always pass an existing `customer`, so
      // without a freshly collected address Stripe would tax against the
      // address already saved on that customer.
      billing_address_collection: 'required',

      // Lets B2B customers supply a USt-IdNr so reverse charge applies.
      // Pointless under § 19 — there is no VAT to reverse-charge — and asking
      // for it would imply we issue VAT invoices.
      ...(smallBusiness ? {} : { tax_id_collection: { enabled: true } }),

      // Passing an existing customer + automatic tax requires explicitly
      // allowing Stripe to write the collected address back onto them.
      customer_update: { address: 'auto', name: 'auto' },

      // Restates the waiver on Stripe's own page, so the last screen before
      // payment carries it too rather than only our pricing page.
      custom_text: {
        submit: {
          message: smallBusiness
            ? 'Mit dem Kauf stimmst du dem sofortigen Leistungsbeginn zu und verlierst dein Widerrufsrecht (§ 356 Abs. 4 BGB). Kein Ausweis von Umsatzsteuer gemäß § 19 UStG.'
            : 'Mit dem Kauf stimmst du dem sofortigen Leistungsbeginn zu und verlierst dein Widerrufsrecht (§ 356 Abs. 4 BGB).',
        },
      },

      // Metadata on BOTH the session and the subscription: the session carries
      // it for the one-off add-on path, and `subscription_data.metadata`
      // survives onto every future `customer.subscription.*` event, which is
      // where renewals and cancellations are handled.
      metadata,
      ...(input.kind === 'subscription' ? { subscription_data: { metadata } } : {}),

      // Subscriptions invoice themselves — every renewal produces one. A
      // one-off `payment` session produces NO invoice unless asked, which
      // would leave credit-pack buyers without the Rechnung a German customer
      // is entitled to ask for.
      ...(input.kind === 'addon'
        ? {
            invoice_creation: {
              enabled: true,
              invoice_data: {
                description: 'Applo — einmaliges Credit-Paket',
                // § 19 UStG requires the exemption to be stated ON the
                // invoice; without it the document reads as a normal net
                // invoice with the VAT line accidentally missing.
                ...(smallBusiness ? { footer: SMALL_BUSINESS_INVOICE_FOOTER } : {}),
                metadata,
              },
            },
          }
        : {}),

      // Labels the session in the Dashboard so checkout flows can be compared.
      // Requires API version 2026-03-25.dahlia or later; the pinned SDK
      // (stripe@22.5.0) sends 2026-07-29.dahlia.
      integration_identifier: CHECKOUT_INTEGRATION_ID,
    });

    if (!session.url) {
      // Stripe only omits `url` for sessions in `ui_mode: 'embedded'`, which we
      // don't use — treat it as a hard failure rather than redirecting to ''.
      throw new BadRequestException('Stripe hat keine Checkout-URL zurückgegeben.');
    }

    this.logger.log(
      `Checkout session ${session.id} created for user ${userId} (${input.kind})`,
    );
    return { url: session.url };
  }

  /**
   * Opens the Stripe Customer Portal — payment method updates, invoice history,
   * plan changes and cancellation.
   *
   * Deliberately not reimplemented in-app: these screens carry SCA, proration
   * and dunning rules that change without notice, and a wrong implementation
   * fails as "the customer was charged incorrectly".
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const stripe = this.stripeService.stripe;
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException({
        message: 'Für dieses Konto gibt es noch keine Zahlungsdaten.',
        code: 'NO_STRIPE_CUSTOMER',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.config.appUrl}/settings`,
    });

    return { url: session.url };
  }

  // ---------------------------------------------------------------------------
  // Cancellation (§ 312k BGB)
  // ---------------------------------------------------------------------------

  /**
   * Cancels the running subscription at the end of the paid period.
   *
   * Exists alongside the Stripe Customer Portal because § 312k BGB requires a
   * cancellation route we control: a directly reachable button, a confirmation
   * step, and an immediate confirmation in text form stating the content, date
   * and time of the cancellation. A third-party portal behind a login does not
   * satisfy that, and getting it wrong gives the consumer an open-ended right
   * to terminate.
   *
   * Cancels at period end rather than immediately — the user paid for the
   * period, so revoking access on the spot would be a partial refund we never
   * issued.
   */
  async cancelSubscription(userId: string): Promise<{
    cancelAtPeriodEnd: true;
    effectiveAt: Date | null;
    confirmationSentTo: string | null;
  }> {
    const local = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { id: true, tier: true, stripeSubscriptionId: true, currentPeriodEnd: true },
    });

    if (!local?.stripeSubscriptionId) {
      throw new NotFoundException({
        message: 'Es besteht kein laufendes kostenpflichtiges Abonnement.',
        code: 'NO_ACTIVE_SUBSCRIPTION',
      });
    }

    const updated = await this.stripeService.stripe.subscriptions.update(
      local.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    const effectiveAt =
      toDate(updated.items.data[0]?.current_period_end) ?? local.currentPeriodEnd ?? null;

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: { cancelAtPeriodEnd: true, currentPeriodEnd: effectiveAt ?? undefined },
    });

    const confirmationSentTo = await this.sendCancellationConfirmation(
      userId,
      local.tier,
      effectiveAt,
    );

    this.logger.log(
      `User ${userId} cancelled ${local.stripeSubscriptionId}; access ends ${effectiveAt?.toISOString() ?? 'unknown'}`,
    );

    return { cancelAtPeriodEnd: true, effectiveAt, confirmationSentTo };
  }

  /**
   * § 312k(2) requires confirming receipt "in text form" immediately, stating
   * the content, the date and the time of the cancellation. Sent best-effort:
   * a mail outage must not roll back a cancellation the user already made.
   */
  private async sendCancellationConfirmation(
    userId: string,
    tier: SubscriptionTier,
    effectiveAt: Date | null,
  ): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!user?.email) return null;

    const received = new Date();
    const dateTime = (value: Date) =>
      new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Europe/Berlin',
      }).format(value);

    const endsOn = effectiveAt
      ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeZone: 'Europe/Berlin' }).format(
          effectiveAt,
        )
      : 'zum Ende der laufenden Abrechnungsperiode';

    try {
      await this.email.sendRawHtml({
        to: user.email,
        subject: 'Kündigungsbestätigung — Applo',
        html: `
          <p>Hallo${user.firstName ? ` ${user.firstName}` : ''},</p>
          <p>wir bestätigen den Eingang Ihrer Kündigung.</p>
          <ul>
            <li><strong>Gekündigter Vertrag:</strong> Applo ${tier}</li>
            <li><strong>Eingang der Kündigung:</strong> ${dateTime(received)} (Uhrzeit in Europe/Berlin)</li>
            <li><strong>Vertragsende:</strong> ${endsOn}</li>
          </ul>
          <p>Bis zu diesem Datum können Sie Ihren Tarif unverändert weiternutzen.
             Danach wechselt Ihr Konto automatisch auf den kostenlosen Free-Tarif;
             bereits gekaufte Extra-Credits bleiben erhalten.</p>
          <p>Diese E-Mail ist Ihre Bestätigung nach § 312k Abs. 2 BGB.</p>
        `,
      });
      return user.email;
    } catch (err) {
      this.logger.error(
        `Cancellation confirmation email failed for user ${userId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook
  // ---------------------------------------------------------------------------

  /**
   * Applies a verified Stripe event exactly once.
   *
   * Returns false when the event was already applied, so the controller can
   * still answer 200 — a non-2xx makes Stripe retry, and retrying a duplicate
   * forever is worse than acknowledging it.
   */
  async handleEvent(event: Stripe.Event): Promise<boolean> {
    // Claim the event BEFORE doing any work. If this insert wins, we own the
    // event; if it violates the unique constraint, another delivery already
    // did. Doing it the other way round (check, then work, then record) leaves
    // a window where two concurrent deliveries both pass the check.
    try {
      await this.prisma.stripeEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === PRISMA_UNIQUE_VIOLATION
      ) {
        this.logger.debug(`Stripe event ${event.id} already processed — skipping`);
        return false;
      }
      throw err;
    }

    try {
      switch (event.type) {
        // A delayed-notification method (SEPA Direct Debit, Sofort, Klarna —
        // all common in DE) completes checkout while the money is still in
        // flight, so `completed` arrives unpaid and the real fulfilment signal
        // is `async_payment_succeeded` hours or days later. Both route to the
        // same handler, which gates on `payment_status`.
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await this.onCheckoutCompleted(event.data.object);
          break;

        case 'checkout.session.async_payment_failed':
          await this.onCheckoutAsyncFailed(event.data.object);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.onSubscriptionChanged(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.onSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.onPaymentFailed(event.data.object);
          break;

        default:
          this.logger.debug(`Ignoring unhandled Stripe event type ${event.type}`);
      }
    } catch (err) {
      // Release the claim before rethrowing. The claim row is committed on its
      // own transaction, so without this delete a failed handler leaves the id
      // recorded as processed: Stripe's retry hits the unique violation above,
      // returns false, answers 200, and the purchase is silently lost — the
      // exact outcome claiming early was meant to prevent.
      await this.prisma.stripeEvent.delete({ where: { id: event.id } }).catch((cleanupErr: unknown) =>
        this.logger.error(
          `Could not release claim on Stripe event ${event.id} after a failed handler; ` +
            `Stripe's retry will be skipped as a duplicate: ${(cleanupErr as Error).message}`,
        ),
      );
      throw err;
    }

    return true;
  }

  /**
   * One-off add-on credit purchases.
   *
   * Subscriptions are deliberately NOT granted here: the tier is derived from
   * `customer.subscription.*` instead, which also covers renewals, upgrades
   * and cancellations. Handling both here would grant the tier twice on the
   * first purchase and never on renewal.
   */
  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode !== 'payment') return;

    // An `unpaid` session is the NORMAL first event for a delayed-notification
    // method: Stripe sends `completed` when checkout is submitted and
    // `async_payment_succeeded` once the funds actually clear. Returning here
    // is correct — the later event re-enters this handler and grants then.
    if (session.payment_status !== 'paid') {
      this.logger.log(
        `Checkout ${session.id} is ${session.payment_status} (delayed payment method) — ` +
          `credits pending checkout.session.async_payment_succeeded`,
      );
      return;
    }

    const userId = session.metadata?.[CHECKOUT_METADATA.userId];
    const pack = session.metadata?.[CHECKOUT_METADATA.pack];

    if (!userId || !pack || !isAddonPackId(pack)) {
      this.logger.error(
        `Checkout ${session.id} is missing usable metadata (user=${userId}, pack=${pack}) — cannot fulfil`,
      );
      return;
    }

    await this.grantAddonCredits(userId, pack);
  }

  /**
   * A delayed payment (SEPA/Sofort/Klarna) that ultimately failed or was
   * charged back before clearing. No credits were ever granted — `completed`
   * returned early on `payment_status !== 'paid'` — so there is nothing to
   * claw back. Logged so a support question has a trail.
   */
  private async onCheckoutAsyncFailed(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.[CHECKOUT_METADATA.userId];
    this.logger.warn(
      `Delayed payment failed for checkout ${session.id} (user=${userId ?? 'unknown'}) — no credits granted`,
    );
  }

  private async grantAddonCredits(userId: string, pack: AddonPackId): Promise<void> {
    const credits = creditsForPack(pack);
    const subscription = await this.subscriptions.getOrCreateSubscription(userId);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { addonCreditsRemaining: { increment: credits } },
    });

    this.logger.log(`Granted ${credits} add-on credits (${pack}) to user ${userId}`);
  }

  /**
   * Applies the tier a live Stripe subscription entitles the user to.
   *
   * Reads the tier from the price id rather than the checkout metadata,
   * because an upgrade made inside the Customer Portal changes the price but
   * leaves the original metadata untouched.
   */
  private async onSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
    const local = await this.findLocalSubscription(subscription);
    if (!local) return;

    const priceId = subscription.items.data[0]?.price?.id;
    const tier = priceId ? tierForPriceId(priceId, this.config.stripePrices) : null;

    if (!tier) {
      this.logger.error(
        `Stripe subscription ${subscription.id} uses unknown price ${priceId} — tier left unchanged`,
      );
      return;
    }

    const status = this.mapStatus(subscription.status);

    // A subscription that is past due or unpaid keeps its tier for now —
    // Stripe's dunning gets a chance to recover the payment first, and the
    // `deleted` event downgrades if it never does. Yanking access on the first
    // failed charge punishes an expired card.
    const shouldGrantTier =
      status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;

    const item = subscription.items.data[0];
    await this.prisma.subscription.update({
      where: { id: local.id },
      data: {
        ...(shouldGrantTier ? { tier } : {}),
        status,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: toDate(item?.current_period_start),
        currentPeriodEnd: toDate(item?.current_period_end),
      },
    });

    this.logger.log(
      `Subscription ${subscription.id} → tier=${shouldGrantTier ? tier : local.tier} status=${status} for user ${local.userId}`,
    );
  }

  /** Subscription ended for good (cancelled and the paid period ran out). */
  private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const local = await this.findLocalSubscription(subscription);
    if (!local) return;

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: {
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.CANCELED,
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
      },
    });

    // Add-on credits deliberately survive the downgrade — they were bought
    // outright, not rented with the tier.
    this.logger.log(`Subscription ${subscription.id} deleted → user ${local.userId} back on FREE`);
  }

  private async onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const local = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true, userId: true },
    });
    if (!local) return;

    await this.prisma.subscription.update({
      where: { id: local.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    this.logger.warn(`Payment failed for user ${local.userId} — subscription marked PAST_DUE`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolves our subscription row from a Stripe subscription.
   *
   * Prefers the customer id over the metadata user id: the customer link is
   * what the Portal and Stripe dashboard also mutate, so it stays correct even
   * for a subscription created outside our checkout flow.
   */
  private async findLocalSubscription(subscription: Stripe.Subscription) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (customerId) {
      const byCustomer = await this.prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true, userId: true, tier: true },
      });
      if (byCustomer) return byCustomer;
    }

    const userId = subscription.metadata?.[CHECKOUT_METADATA.userId];
    if (userId) {
      const byUser = await this.prisma.subscription.findUnique({
        where: { userId },
        select: { id: true, userId: true, tier: true },
      });
      if (byUser) return byUser;
    }

    this.logger.error(
      `No local subscription for Stripe subscription ${subscription.id} (customer=${customerId}) — event dropped`,
    );
    return null;
  }

  /**
   * Returns the user's Stripe customer id, creating one on first purchase.
   *
   * The conditional `updateMany` is the concurrency guard: two checkouts
   * started in two tabs both create a Stripe customer, but only the one that
   * finds `stripeCustomerId` still null wins the write. The loser re-reads and
   * uses the winner's id, so a user can never end up with their subscription
   * split across two Stripe customers.
   */
  private async getOrCreateCustomer(userId: string): Promise<string> {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden.');

    // Make sure a subscription row exists to write the customer id onto.
    await this.subscriptions.getOrCreateSubscription(userId);

    const customer = await this.stripeService.stripe.customers.create({
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      metadata: { [CHECKOUT_METADATA.userId]: userId },
    });

    const claimed = await this.prisma.subscription.updateMany({
      where: { userId, stripeCustomerId: null },
      data: { stripeCustomerId: customer.id },
    });

    if (claimed.count === 0) {
      const winner = await this.prisma.subscription.findUnique({
        where: { userId },
        select: { stripeCustomerId: true },
      });
      if (winner?.stripeCustomerId) {
        this.logger.warn(
          `Concurrent customer creation for user ${userId}; keeping ${winner.stripeCustomerId}, orphaning ${customer.id}`,
        );
        return winner.stripeCustomerId;
      }
    }

    return customer.id;
  }

  private resolveTierPrice(tier: string | undefined): string {
    if (!tier || !isPurchasableTier(tier)) {
      throw new BadRequestException(`Unbekannter Tarif: ${tier ?? '(leer)'}`);
    }
    const priceId = this.config.stripePrices[tier as PurchasableTier];
    if (!priceId) {
      // The env schema blocks this at boot; reaching it means the schema and
      // this catalog have drifted apart.
      throw new BadRequestException(`Für den Tarif ${tier} ist kein Preis konfiguriert.`);
    }
    return priceId;
  }

  private resolveAddonPrice(pack: string | undefined): string {
    if (!pack || !isAddonPackId(pack)) {
      throw new BadRequestException(
        `Unbekanntes Credit-Paket: ${pack ?? '(leer)'}. Erlaubt: ${ADDON_PACK_IDS.join(', ')}`,
      );
    }
    const priceId = this.config.stripePrices[`ADDON_${pack}` as const];
    if (!priceId) {
      throw new BadRequestException(`Für das Paket ${pack} ist kein Preis konfiguriert.`);
    }
    return priceId;
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'paused':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  /** Stripe locales are a fixed list; anything unexpected falls back to German. */
  private stripeLocale(locale: string | undefined): Stripe.Checkout.SessionCreateParams.Locale {
    const supported = ['de', 'en', 'fr', 'es', 'pt', 'it'] as const;
    return (supported as readonly string[]).includes(locale ?? '')
      ? (locale as Stripe.Checkout.SessionCreateParams.Locale)
      : 'de';
  }
}

/** Stripe sends unix seconds; Prisma wants a Date (or null to leave it alone). */
function toDate(seconds: number | null | undefined): Date | undefined {
  return typeof seconds === 'number' ? new Date(seconds * 1000) : undefined;
}
