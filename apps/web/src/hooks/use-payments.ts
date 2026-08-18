'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { api } from '@/lib/api-client';
import { toastError } from '@/lib/toast';
import type { CreateCheckoutSessionInput, PaymentsConfig } from '@/types';

/**
 * Whether this deployment can take money.
 *
 * Public and cheap, so it is fetched without auth — the pricing page has to
 * render the right CTA for logged-out visitors too. Cached aggressively
 * because it only changes on redeploy.
 */
export function usePaymentsConfig() {
  return useQuery<PaymentsConfig>({
    queryKey: ['payments', 'config'],
    queryFn: () => api.payments.getConfig(),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    // A failed probe must not render a buy button that 503s.
    retry: 1,
  });
}

/**
 * Starts a checkout and hands the browser to Stripe.
 *
 * `window.location.assign` rather than the Next router: the target is a
 * third-party origin, so a client-side navigation is not an option.
 *
 * `withdrawalWaiver` is required by the caller rather than defaulted here —
 * the § 356 Abs. 4 BGB consent has to come from something the user actually
 * ticked, and a default would quietly assert it on their behalf.
 */
export function useStartCheckout() {
  const t = useTranslations('subscription');
  const locale = useLocale();

  return useMutation({
    mutationFn: (input: Omit<CreateCheckoutSessionInput, 'locale'>) =>
      api.payments.createCheckoutSession({ ...input, locale }),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error) => {
      // Error first: a 503 PAYMENTS_DISABLED carries a better message than
      // anything generic we could write here. toastError only falls back to
      // the second argument when the error yields nothing usable.
      toastError(error, undefined, { description: t('checkout.startFailed') });
    },
  });
}

/** Opens the Stripe Customer Portal (payment method, invoices, plan change). */
export function useOpenBillingPortal() {
  const t = useTranslations('subscription');

  return useMutation({
    mutationFn: () => api.payments.createPortalSession(),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error) => {
      toastError(error, undefined, { description: t('portal.openFailed') });
    },
  });
}

/**
 * § 312k BGB cancellation.
 *
 * Deliberately has no optimistic update and no auto-redirect: the statute
 * requires the user to be shown a confirmation of what was cancelled and
 * when it takes effect, so the caller renders the result.
 */
export function useCancelSubscription() {
  return useMutation({
    mutationFn: () => api.payments.cancelSubscription(),
  });
}
