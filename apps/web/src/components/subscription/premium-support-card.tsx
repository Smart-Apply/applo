'use client';

import Link from 'next/link';
import { LifeBuoy, Mail, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFeatureGate } from '@/hooks/use-tier-gate';

/**
 * Premium Support card shown on the Settings page.
 *
 * Premium users see a confirmation that they have priority routing with a
 * 24h response SLA. Free / Pro users see an upgrade nudge — clicking it
 * takes them to the pricing section. The actual prioritisation happens
 * server-side in `ContactController` based on the user's subscription
 * tier (best-effort detection from the access_token cookie).
 */
export function PremiumSupportCard() {
  const { hasAccess, isLoading } = useFeatureGate('prioritySupport');

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="mt-2 h-4 w-72 rounded bg-muted" />
        </CardHeader>
      </Card>
    );
  }

  if (hasAccess) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Crown className="h-5 w-5" />
            Premium Support aktiv
          </CardTitle>
          <CardDescription className="text-amber-800/80 dark:text-amber-300/80">
            Deine Anfragen werden priorisiert bearbeitet — Antwort innerhalb 24h zugesagt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
            <Mail className="h-4 w-4" />
            <span>support@smart-apply.io</span>
          </div>
          <Button asChild variant="default" className="bg-amber-600 hover:bg-amber-700">
            <Link href="/#contact">
              <LifeBuoy className="mr-2 h-4 w-4" />
              Support kontaktieren
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-muted-foreground" />
          Premium Support
        </CardTitle>
        <CardDescription>
          Mit Premium erhältst du priorisierten Support mit garantierter Antwort innerhalb von 24h.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/#pricing">
            <Lock className="h-4 w-4" />
            Mit Premium freischalten
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
