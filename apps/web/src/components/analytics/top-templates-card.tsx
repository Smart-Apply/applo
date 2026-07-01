/**
 * top-templates-card.tsx
 * Ranked list of resume templates: usage count + interview-rate mini bar.
 * Lead template is highlighted with a filled rank badge.
 * Place at: apps/web/src/components/analytics/top-templates-card.tsx
 */
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AnalyticsOverview } from '@/types';

interface Props {
  templates: AnalyticsOverview['topTemplates'];
}

export function TopTemplatesCard({ templates }: Props) {
  const isEmpty  = !templates || templates.length === 0;
  const maxRate  = isEmpty ? 1 : Math.max(...templates.map(t => t.interviewRate), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText size={17} strokeWidth={2} />
          Top-Templates
        </CardTitle>
        <CardDescription>
          Welche Lebenslauf-Vorlagen du am häufigsten nutzt — und wie sie performen.
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-3">
            Noch keine Template-Daten verfügbar. Erstelle Bewerbungen mit
            verschiedenen Vorlagen, um ihre Performance zu vergleichen.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {templates.map((t, i) => (
              <div key={t.templateId} className="flex items-center gap-4 py-3 rounded-xl px-1 hover:bg-muted/40 transition-colors">
                {/* Rank badge */}
                <span className={cn(
                  'grid place-items-center w-7 h-7 rounded-lg text-[12.5px] font-bold flex-none tabular-nums',
                  i === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}>
                  {i + 1}
                </span>

                {/* Name + usage */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.templateName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {t.usageCount} {t.usageCount === 1 ? 'Bewerbung' : 'Bewerbungen'}
                  </p>
                </div>

                {/* Interview rate bar */}
                <div className="w-28 flex-none">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[13px] font-bold tabular-nums">{t.interviewRate}%</span>
                    <span className="text-[10.5px] text-muted-foreground font-semibold">Interview</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max((t.interviewRate / maxRate) * 100, 3)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
