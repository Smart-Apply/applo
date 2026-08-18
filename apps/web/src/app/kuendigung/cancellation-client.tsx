'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { useSubscription } from '@/hooks/use-subscription';
import { useCancelSubscription } from '@/hooks/use-payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/errors';
import type { CancellationResult } from '@/types';

/**
 * § 312k BGB "Kündigungsbutton" flow.
 *
 * The statute prescribes the shape, not just the outcome:
 *  - a button labelled unambiguously ("Verträge hier kündigen"),
 *  - leading to a confirmation page that identifies the contract,
 *  - a confirm button labelled "jetzt kündigen",
 *  - and an immediate confirmation in text form stating date and time.
 *
 * That is why this exists next to the Stripe Customer Portal rather than
 * linking into it: the portal is a third-party UI behind a login whose labels
 * we do not control.
 */
export function CancellationClient() {
  const t = useTranslations('subscription.cancellation');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { tier, subscription } = useSubscription();
  const cancel = useCancelSubscription();
  const [result, setResult] = useState<CancellationResult | null>(null);

  const hasPaidPlan = isAuthenticated && tier !== 'FREE';
  const alreadyCancelled = subscription?.cancelAtPeriodEnd === true;

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeZone: 'Europe/Berlin' }).format(
          new Date(value),
        )
      : t('endOfPeriod');

  if (result) {
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {t('doneTitle')}
          </CardTitle>
          <CardDescription>{t('doneLead')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('doneEndsOn', { date: formatDate(result.effectiveAt) })}</p>
          {result.confirmationSentTo && (
            <p className="text-muted-foreground">
              {t('doneEmailSent', { email: result.confirmationSentTo })}
            </p>
          )}
          <p className="text-muted-foreground">{t('doneCreditsKept')}</p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('loginRequiredTitle')}</CardTitle>
          <CardDescription>{t('loginRequiredBody')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login?redirect=/kuendigung">{t('loginCta')}</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="mailto:support@applo.ai?subject=K%C3%BCndigung">{t('emailCta')}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasPaidPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('noPlanTitle')}</CardTitle>
          <CardDescription>{t('noPlanBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (alreadyCancelled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('alreadyTitle')}</CardTitle>
          <CardDescription>
            {t('alreadyBody', { date: formatDate(subscription?.currentPeriodEnd ?? null) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('confirmTitle')}</CardTitle>
        <CardDescription>{t('confirmLead')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* § 312k(2) requires the confirmation page to identify the contract
            being terminated, not just ask "are you sure?". */}
        <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t('fieldContract')}</dt>
            <dd className="font-medium">Applo {tier}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t('fieldEndsOn')}</dt>
            <dd className="font-medium">{formatDate(subscription?.currentPeriodEnd ?? null)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t('fieldType')}</dt>
            <dd className="font-medium">{t('fieldTypeValue')}</dd>
          </div>
        </dl>

        <p className="text-sm text-muted-foreground">{t('confirmNote')}</p>

        {cancel.isError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{getErrorMessage(cancel.error)}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Label is prescribed by § 312k(2) — do not soften it to
              "Bestätigen" or "Abo beenden". */}
          <Button
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(undefined, { onSuccess: setResult })}
          >
            {cancel.isPending ? t('submitting') : t('confirmButton')}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">{t('keepPlan')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
