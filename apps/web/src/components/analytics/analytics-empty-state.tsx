/**
 * analytics-empty-state.tsx
 * Full-page empty state shown when the user has 0 applications.
 * Place at: apps/web/src/components/analytics/analytics-empty-state.tsx
 */
import Link from 'next/link';
import { Inbox, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AnalyticsEmptyState() {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center text-center gap-3">
        <span className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/8 text-primary/60 mb-1">
          <Inbox size={26} strokeWidth={1.8} />
        </span>

        <h2 className="text-lg font-semibold tracking-tight">
          Hier wird&apos;s bald spannend
        </h2>
        <p className="text-sm text-muted-foreground max-w-[360px] text-balance leading-relaxed">
          Sobald du deine erste Bewerbung erstellt hast, erscheinen hier deine
          Erfolgsquoten, dein Konversions-Funnel und welche Vorlagen am besten
          funktionieren.
        </p>

        <Button asChild className="mt-2">
          <Link href="/applications/new">
            Erste Bewerbung erstellen
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
