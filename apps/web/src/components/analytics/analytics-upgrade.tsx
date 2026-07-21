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
      <Card className="border-[#F3E3B3] dark:border-amber-400/30">
        <CardHeader className="text-center pt-12">
          <div className="mx-auto mb-4 grid place-items-center w-16 h-16 rounded-[4px] border border-[#F3E3B3] bg-[#FDF6E7] dark:border-amber-400/30 dark:bg-amber-400/10">
            <Crown size={30} className="text-[#A16207] dark:text-amber-300" strokeWidth={1.8} />
          </div>
          <CardTitle className="font-heading text-2xl">
            Advanced Analytics &amp; Trends
          </CardTitle>
          <CardDescription className="max-w-sm mx-auto">
            Erfolgsquoten, Konversions-Funnel, ATS-Score-Trends und
            Template-Performance — exklusiv für Premium-Mitglieder.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pb-12">
          <Button asChild>
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
