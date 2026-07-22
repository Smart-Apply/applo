'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  XCircle,
  Code2,
  Heart,
  Target,
  Wrench,
  Building2,
  Award,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ATSKeywords, KeywordMatch, KeywordCategory } from '@/types';
import { cn } from '@/lib/utils';

interface KeywordsOverviewProps {
  keywords: ATSKeywords;
  matchedKeywords: KeywordMatch[];
  missingKeywords: KeywordMatch[];
  className?: string;
}

const categoryConfig: Record<
  KeywordCategory,
  { labelKey: string; icon: React.ElementType; color: string }
> = {
  core: { labelKey: 'keywords.categories.core', icon: Code2, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  soft: { labelKey: 'keywords.categories.soft', icon: Heart, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  responsibility: { labelKey: 'keywords.categories.responsibility', icon: Target, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  requirement: { labelKey: 'keywords.categories.requirement', icon: Award, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  methodology: { labelKey: 'keywords.categories.methodology', icon: Wrench, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  industry: { labelKey: 'keywords.categories.industry', icon: Building2, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  seniority: { labelKey: 'keywords.categories.seniority', icon: Award, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  misc: { labelKey: 'keywords.categories.misc', icon: Tag, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
};

interface KeywordBadgeProps {
  keyword: KeywordMatch;
  showUsedIn?: boolean;
}

function KeywordBadge({ keyword, showUsedIn = false }: KeywordBadgeProps) {
  const t = useTranslations('applications');
  const config = categoryConfig[keyword.category] ?? categoryConfig.misc;
  const Icon = config.icon;

  return (
    <div className="group relative">
      <Badge
        variant="outline"
        className={cn(
          'flex items-center gap-1 py-1 px-2 transition-all',
          keyword.found
            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
            : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
        )}
      >
        {keyword.found ? (
          <CheckCircle2 className="h-3 w-3 text-success dark:text-green-400" />
        ) : (
          <XCircle className="h-3 w-3 text-destructive dark:text-red-400" />
        )}
        <span className="text-xs">{keyword.keyword}</span>
        <Icon className="h-3 w-3 ml-1 opacity-50" />
      </Badge>
      
      {showUsedIn && keyword.usedIn && keyword.usedIn.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
          <div className="bg-popover text-popover-foreground text-xs rounded-md shadow-lg p-2 border">
            <p className="font-medium mb-1">{t('keywords.foundIn')}</p>
            <ul className="space-y-0.5">
              {keyword.usedIn.map((location, idx) => (
                <li key={idx} className="text-muted-foreground">{location}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function KeywordsOverview({
  matchedKeywords,
  missingKeywords,
  className,
}: KeywordsOverviewProps) {
  const t = useTranslations('applications');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAllMissing, setShowAllMissing] = useState(false);

  const allKeywords = [...matchedKeywords, ...missingKeywords];
  const matchRate = allKeywords.length > 0
    ? Math.round((matchedKeywords.length / allKeywords.length) * 100)
    : 0;

  // Group keywords by category
  const groupedKeywords = allKeywords.reduce<Record<string, KeywordMatch[]>>((acc, kw) => {
    if (!acc[kw.category]) acc[kw.category] = [];
    acc[kw.category].push(kw);
    return acc;
  }, {});

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5" />
            {t('keywords.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {matchedKeywords.length}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              {missingKeywords.length}
            </Badge>
            <Badge variant="outline">{matchRate}% Match</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">{t('keywords.tabs.all', { count: allKeywords.length })}</TabsTrigger>
            <TabsTrigger value="matched" className="text-success">
              {t('keywords.tabs.matched', { count: matchedKeywords.length })}
            </TabsTrigger>
            <TabsTrigger value="missing" className="text-destructive">
              {t('keywords.tabs.missing', { count: missingKeywords.length })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {Object.entries(groupedKeywords).map(([category, keywords]) => {
              const config = categoryConfig[category as KeywordCategory];
              if (!config) return null;
              const Icon = config.icon;
              const isExpanded = expandedCategory === category;
              const displayKeywords = isExpanded ? keywords : keywords.slice(0, 6);

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {t(config.labelKey)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {keywords.filter((k) => k.found).length}/{keywords.length}
                      </span>
                    </div>
                    {keywords.length > 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      >
                        {isExpanded ? (
                          <>
                            {t('keywords.showLess')} <ChevronUp className="h-3 w-3 ml-1" />
                          </>
                        ) : (
                          <>
                            {t('keywords.more', { count: keywords.length - 6 })} <ChevronDown className="h-3 w-3 ml-1" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {displayKeywords.map((kw, idx) => (
                      <KeywordBadge key={`${kw.keyword}-${idx}`} keyword={kw} showUsedIn />
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="matched" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {matchedKeywords.map((kw, idx) => (
                <KeywordBadge key={`${kw.keyword}-${idx}`} keyword={kw} showUsedIn />
              ))}
              {matchedKeywords.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('keywords.noMatched')}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="missing" className="mt-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(showAllMissing ? missingKeywords : missingKeywords.slice(0, 12)).map((kw, idx) => (
                  <KeywordBadge key={`${kw.keyword}-${idx}`} keyword={kw} />
                ))}
              </div>
              {missingKeywords.length > 12 && !showAllMissing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllMissing(true)}
                  className="w-full"
                >
                  {t('keywords.showAllMissing', { count: missingKeywords.length })}
                </Button>
              )}
              {missingKeywords.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('keywords.noMissing')}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
