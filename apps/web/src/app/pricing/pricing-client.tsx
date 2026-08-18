'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, CreditCard, Info, PackagePlus, Sparkles } from 'lucide-react';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth-store';
import { useSubscription } from '@/hooks/use-subscription';
import {
  useOpenBillingPortal,
  usePaymentsConfig,
  useStartCheckout,
} from '@/hooks/use-payments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonScreen } from '@/components/shared/skeletons';
import type { TiersResponse } from '@/types';

const PURCHASABLE = ['PRO', 'PREMIUM'] as const;

export function PricingClient() {
  const t = useTranslations('subscription');
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: payments, isLoading: paymentsLoading } = usePaymentsConfig();
  const { data: tiers, isLoading: tiersLoading } = useQuery<TiersResponse>({
    queryKey: ['subscription', 'tiers'],
    queryFn: () => api.subscription.getTiers(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { tier: currentTier, subscription } = useSubscription();

  const checkout = useStartCheckout();
  const portal = useOpenBillingPortal();

  // § 356 Abs. 4 BGB. Generation starts the moment the tier lands, so the
  // customer only loses the 14-day withdrawal right if they actively consent
  // to immediate performance. The API rejects a checkout without it; this is
  // the UI half, and it must stay unticked by default.
  const [waiver, setWaiver] = useState(false);

  // Stripe redirects back here after checkout. This is a courtesy message
  // only — the tier is granted by the webhook, never by this callback, so a
  // user who closes the tab before returning still gets what they paid for.
  const checkoutResult = searchParams.get('checkout');
  useEffect(() => {
    if (checkoutResult === 'success') {
      toastSuccess(t('checkout.successTitle'), { description: t('checkout.successBody') });
    }
  }, [checkoutResult, t]);

  const billingLive = payments?.enabled === true;
  const hasStripeSubscription = Boolean(subscription && currentTier !== 'FREE');

  if (paymentsLoading || tiersLoading) {
    return (
      <SkeletonScreen label={t('pricing.loading')}>
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </SkeletonScreen>
    );
  }

  return (
    <div className="motion-page-enter mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="mb-10 text-center">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">{t('pricing.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t('pricing.lead')}</p>
      </header>

      {checkoutResult === 'cancelled' && (
        <p
          role="status"
          className="mb-8 rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-sm"
        >
          {t('checkout.cancelled')}
        </p>
      )}

      {!billingLive && (
        <div
          role="status"
          className="mb-8 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/40"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            <p className="font-medium">{t('pricing.billingOffTitle')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('pricing.billingOffBody')}{' '}
              <Link href="/#contact" className="font-medium underline">
                {t('pricing.billingOffCta')}
              </Link>
            </p>
          </div>
        </div>
      )}

      {billingLive && payments?.testMode && (
        <p
          role="status"
          className="mb-8 rounded-lg border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground"
        >
          {t('pricing.testMode')}
        </p>
      )}

      {billingLive && isAuthenticated && (
        <div className="mx-auto mb-8 max-w-3xl rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="withdrawal-waiver"
              checked={waiver}
              onCheckedChange={(checked) => setWaiver(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="withdrawal-waiver"
              className="text-sm font-normal leading-relaxed text-muted-foreground"
            >
              {t('pricing.waiverLabel')}{' '}
              <Link href="/agb" className="font-medium underline">
                {t('pricing.waiverTermsLink')}
              </Link>
            </Label>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {tiers?.tiers.map((plan) => {
          const isCurrent = isAuthenticated && currentTier === plan.id;
          const isPurchasable = (PURCHASABLE as readonly string[]).includes(plan.id);

          return (
            <Card
              key={plan.id}
              className={cn(
                'flex flex-col',
                plan.recommended && 'border-primary shadow-lg ring-1 ring-primary/20',
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.badge && <Badge>{plan.badge}</Badge>}
                  {isCurrent && <Badge variant="secondary">{t('pricing.currentPlan')}</Badge>}
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="pt-2">
                  <span className="text-3xl font-bold">{plan.priceDisplay}</span>
                  <span className="text-sm text-muted-foreground"> / {plan.priceInterval}</span>
                </p>
                {plan.price > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {/* Unknown config falls back to the § 19 notice, not to a
                        VAT claim: asserting a tax we don't collect is the
                        harmful direction of this guess. */}
                    {payments?.smallBusiness !== false
                      ? t('pricing.vatSmallBusiness')
                      : t('pricing.vatIncluded')}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isPurchasable ? (
                  <Button variant="outline" disabled className="w-full">
                    {t('pricing.freeCta')}
                  </Button>
                ) : isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending || !billingLive}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('pricing.managePlan')}
                  </Button>
                ) : !isAuthenticated ? (
                  <Button asChild className="w-full">
                    <Link href={`/register?plan=${plan.id.toLowerCase()}`}>
                      {t('pricing.signUpToBuy')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!billingLive || !waiver || checkout.isPending}
                    onClick={() =>
                      checkout.mutate({
                        kind: 'subscription',
                        tier: plan.id as (typeof PURCHASABLE)[number],
                        withdrawalWaiver: waiver,
                      })
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('pricing.choosePlan', { plan: plan.name })}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="mt-16" aria-labelledby="addons-title">
        <div className="mb-6 text-center">
          <h2 id="addons-title" className="font-heading text-2xl font-bold">
            {t('pricing.addonsTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {t('pricing.addonsLead')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {tiers?.addonPackages.map((pack) => (
            <Card key={pack.id}>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <PackagePlus className="h-6 w-6 text-primary" />
                <p className="text-lg font-semibold">
                  {t('pricing.addonCredits', { count: pack.credits })}
                </p>
                <p className="text-2xl font-bold">{pack.priceDisplay}</p>
                <p className="text-xs text-muted-foreground">{t('pricing.addonPersists')}</p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!billingLive || !isAuthenticated || !waiver || checkout.isPending}
                  onClick={() =>
                    checkout.mutate({ kind: 'addon', pack: pack.id, withdrawalWaiver: waiver })
                  }
                >
                  {isAuthenticated ? t('pricing.buyAddon') : t('pricing.signUpToBuy')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {isAuthenticated && hasStripeSubscription && (
        <section className="mt-16 rounded-lg border border-border p-6" aria-labelledby="manage-title">
          <h2 id="manage-title" className="font-heading text-lg font-semibold">
            {t('pricing.manageTitle')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('pricing.manageBody')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => portal.mutate()} disabled={portal.isPending}>
              <CreditCard className="mr-2 h-4 w-4" />
              {t('pricing.openPortal')}
            </Button>
            {/* Separate from the portal on purpose — § 312k BGB requires a
                cancellation route that is ours and directly reachable. */}
            <Button variant="ghost" asChild>
              <Link href="/kuendigung">{t('pricing.cancelLink')}</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
