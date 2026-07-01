/**
 * analytics-upgrade.tsx
 * Premium upgrade prompt shown to free-tier users.
 * Preserves original logic; only markup updated to match new aesthetic.
 * Place at: apps/web/src/components/analytics/analytics-upgrade.tsx
 */
import Link from 'next/link';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AnalyticsUpgrade() {
  return (
    <div className="container max-w-2xl py-16">
      <Card className="border-amber-200 dark:border-amber-900/40">
        <CardHeader className="text-center pt-12">
          <div className="mx-auto mb-4 grid place-items-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Crown size={30} className="text-amber-600 dark:text-amber-400" strokeWidth={1.8} />
          </div>
          <CardTitle className="text-2xl text-amber-900 dark:text-amber-200">
            Advanced Analytics &amp; Trends
          </CardTitle>
          <CardDescription className="text-amber-800/75 dark:text-amber-300/75 max-w-sm mx-auto">
            Erfolgsquoten, Konversions-Funnel, ATS-Score-Trends und
            Template-Performance — exklusiv für Premium-Mitglieder.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pb-12">
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
            <Link href="/#pricing">
              <Lock className="mr-2 h-4 w-4" />
              Mit Premium freischalten
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              Zurück zum Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
