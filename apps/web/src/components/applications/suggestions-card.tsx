'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  ArrowRight,
  Plus,
  Pencil,
  GraduationCap,
  Briefcase,
  Award,
  Code2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeywordMatch, KeywordCategory } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SuggestionsCardProps {
  suggestions: string[];
  missingKeywords: KeywordMatch[];
  className?: string;
  onNavigateToProfile?: () => void;
}

// Map keyword categories to profile sections
const categoryToSection: Record<KeywordCategory, { section: string; labelKey: string; icon: React.ElementType }> = {
  core: { section: 'skills', labelKey: 'suggestions.actions.addCore', icon: Code2 },
  methodology: { section: 'skills', labelKey: 'suggestions.actions.addMethodology', icon: Code2 },
  soft: { section: 'skills', labelKey: 'suggestions.actions.addSoft', icon: Code2 },
  responsibility: { section: 'experiences', labelKey: 'suggestions.actions.addResponsibility', icon: Briefcase },
  seniority: { section: 'experiences', labelKey: 'suggestions.actions.updateExperience', icon: Briefcase },
  industry: { section: 'experiences', labelKey: 'suggestions.actions.industryExperience', icon: Briefcase },
  requirement: { section: 'education', labelKey: 'suggestions.actions.addRequirement', icon: GraduationCap },
  misc: { section: 'skills', labelKey: 'suggestions.actions.addProfile', icon: Award },
};

interface SuggestionItemProps {
  suggestion: string;
  type: 'general' | 'keyword';
  category?: KeywordCategory;
  keywords?: string[];
}

function SuggestionItem({ suggestion, category, keywords }: SuggestionItemProps) {
  const t = useTranslations('applications');
  const config = category ? categoryToSection[category] : null;
  const Icon = config?.icon || Lightbulb;

  return (
    <div className="flex items-start gap-3 p-3 rounded-[3px] border bg-card hover:bg-muted/60 transition-colors">
      <div className="mt-0.5 grid h-7 w-7 place-items-center border border-primary-soft bg-primary-soft/60 dark:border-slate-600 dark:bg-slate-800">
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{suggestion}</p>
        {keywords && keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.slice(0, 5).map((kw, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
            {keywords.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{keywords.length - 5}
              </Badge>
            )}
          </div>
        )}
      </div>
      {config && (
        <Link href={`/profile?section=${config.section}`}>
          <Button variant="ghost" size="sm" className="shrink-0">
            <Pencil className="h-3 w-3 mr-1" />
            {t(config.labelKey)}
          </Button>
        </Link>
      )}
    </div>
  );
}

export function SuggestionsCard({
  suggestions,
  missingKeywords,
  className,
}: SuggestionsCardProps) {
  const t = useTranslations('applications');
  // Group missing keywords by category for actionable suggestions
  const groupedMissing = missingKeywords.reduce<Record<string, string[]>>((acc, kw) => {
    if (!acc[kw.category]) acc[kw.category] = [];
    acc[kw.category].push(kw.keyword);
    return acc;
  }, {});

  // Create category-based suggestions
  const categoryActions = Object.entries(groupedMissing).map(([category, keywords]) => {
    const config = categoryToSection[category as KeywordCategory];
    let suggestion = '';
    
    switch (category) {
      case 'technical':
      case 'tool':
        suggestion = t('suggestions.generated.addTechnical');
        break;
      case 'experience':
      case 'responsibility':
        suggestion = t('suggestions.generated.describeResponsibilities');
        break;
      case 'seniority':
        suggestion = t('suggestions.generated.showSeniority');
        break;
      case 'industry':
        suggestion = t('suggestions.generated.highlightIndustry');
        break;
      case 'requirement':
        suggestion = t('suggestions.generated.checkRequirements');
        break;
      default:
        suggestion = t('suggestions.generated.considerKeywords');
    }

    return {
      category: category as KeywordCategory,
      suggestion,
      keywords,
      section: config?.section || 'skills',
    };
  });

  // Get top priority categories (core competencies first)
  const priorityOrder: KeywordCategory[] = ['core', 'methodology', 'responsibility', 'requirement', 'industry', 'seniority', 'soft', 'misc'];
  const sortedActions = [...categoryActions].sort(
    (a, b) => priorityOrder.indexOf(a.category) - priorityOrder.indexOf(b.category)
  );

  const hasNoSuggestions = suggestions.length === 0 && sortedActions.length === 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-warning" />
          {t('suggestions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNoSuggestions ? (
          <div className="text-center py-6">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center border border-[#BFE9CC] bg-[#ECFAF0] dark:border-green-400/30 dark:bg-green-400/10">
              <Award className="h-6 w-6 text-success" />
            </div>
            <h4 className="font-medium text-success">{t('suggestions.perfectTitle')}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t('suggestions.perfectDescription')}
            </p>
          </div>
        ) : (
          <>
            {/* AI-generated suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                  {t('suggestions.aiRecommendations')}
                </h4>
                {suggestions.map((suggestion, idx) => (
                  <SuggestionItem
                    key={idx}
                    suggestion={suggestion}
                    type="general"
                  />
                ))}
              </div>
            )}

            {/* Category-based actions */}
            {sortedActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                  {t('suggestions.addMissingKeywords')}
                </h4>
                {sortedActions.slice(0, 4).map((action, idx) => (
                  <SuggestionItem
                    key={idx}
                    suggestion={action.suggestion}
                    type="keyword"
                    category={action.category}
                    keywords={action.keywords}
                  />
                ))}
              </div>
            )}

            {/* Quick action button */}
            <div className="pt-2 border-t">
              <Link href="/profile">
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('suggestions.editProfile')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
