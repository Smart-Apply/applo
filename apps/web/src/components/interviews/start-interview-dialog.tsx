'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useApplications } from '@/hooks/use-applications';
import { Loader2, Plus } from 'lucide-react';
import type { StartInterviewDto, InterviewType, InterviewDifficulty, Application } from '@/types';

interface StartInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (data: StartInterviewDto) => void;
  isLoading?: boolean;
}

export function StartInterviewDialog({
  open,
  onOpenChange,
  onStart,
  isLoading,
}: StartInterviewDialogProps) {
  const t = useTranslations('interviews');
  const [mode, setMode] = useState<'application' | 'custom'>('custom');
  const [formData, setFormData] = useState<StartInterviewDto>({
    type: 'MIXED',
    difficulty: 'MEDIUM',
    language: 'de',
    maxQuestions: 10,
  });

  const { data: applications = [] } = useApplications({ includeJobPosting: true });
  const readyApplications = applications.filter((app: Application) => app.status === 'READY');
  const interviewTypes: { value: InterviewType; label: string; description: string }[] = [
    { value: 'MIXED', label: t('startDialog.types.mixed.label'), description: t('startDialog.types.mixed.description') },
    { value: 'BEHAVIORAL', label: t('startDialog.types.behavioral.label'), description: t('startDialog.types.behavioral.description') },
    { value: 'TECHNICAL', label: t('startDialog.types.technical.label'), description: t('startDialog.types.technical.description') },
    { value: 'CASE_STUDY', label: t('startDialog.types.caseStudy.label'), description: t('startDialog.types.caseStudy.description') },
  ];
  const difficultyLevels: { value: InterviewDifficulty; label: string; description: string }[] = [
    { value: 'EASY', label: t('startDialog.difficulty.easy.label'), description: t('startDialog.difficulty.easy.description') },
    { value: 'MEDIUM', label: t('startDialog.difficulty.medium.label'), description: t('startDialog.difficulty.medium.description') },
    { value: 'HARD', label: t('startDialog.difficulty.hard.label'), description: t('startDialog.difficulty.hard.description') },
  ];
  const industries = [
    t('startDialog.industries.it'),
    t('startDialog.industries.finance'),
    t('startDialog.industries.healthcare'),
    t('startDialog.industries.sales'),
    t('startDialog.industries.marketing'),
    t('startDialog.industries.consulting'),
    t('startDialog.industries.manufacturing'),
    t('startDialog.industries.logistics'),
    t('startDialog.industries.hr'),
    t('startDialog.industries.other'),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up the data: remove empty strings and undefined values
    // Backend expects UUID or undefined, not empty string
    const cleanedData: StartInterviewDto = {
      ...formData,
    };
    
    // Remove applicationId if not in application mode or if empty
    if (mode !== 'application' || !formData.applicationId) {
      delete cleanedData.applicationId;
    }
    
    // Remove empty string fields (jobTitle, company, industry)
    if (!cleanedData.jobTitle) delete cleanedData.jobTitle;
    if (!cleanedData.company) delete cleanedData.company;
    if (!cleanedData.industry) delete cleanedData.industry;
    
    onStart(cleanedData);
  };

  const updateField = <K extends keyof StartInterviewDto>(
    key: K,
    value: StartInterviewDto[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('startDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('startDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'application' | 'custom')} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="custom">{t('startDialog.tabs.custom')}</TabsTrigger>
              <TabsTrigger value="application">
                {t('startDialog.tabs.application')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="application" className="space-y-4 mt-4">
              {readyApplications.length > 0 ? (
                <div className="space-y-2">
                  <Label>{t('startDialog.application.selectLabel')}</Label>
                  <Select
                    value={formData.applicationId || ''}
                    onValueChange={(v) => updateField('applicationId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('startDialog.application.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {readyApplications.map((app: Application) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.title || app.jobPosting?.title || t('startDialog.application.unnamed')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('startDialog.application.helper')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-[3px] border border-dashed py-8 text-center">
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {t('startDialog.application.empty')}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    <Link href="/applications/new">
                      <Plus className="mr-1 h-4 w-4" />
                      {t('startDialog.application.createApplication')}
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">{t('startDialog.custom.position')}</Label>
                  <Input
                    id="jobTitle"
                    placeholder={t('startDialog.custom.positionPlaceholder')}
                    value={formData.jobTitle || ''}
                    onChange={(e) => updateField('jobTitle', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">{t('startDialog.custom.company')}</Label>
                  <Input
                    id="company"
                    placeholder={t('startDialog.custom.companyPlaceholder')}
                    value={formData.company || ''}
                    onChange={(e) => updateField('company', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">{t('startDialog.custom.industry')}</Label>
                <Select
                  value={formData.industry || ''}
                  onValueChange={(v) => updateField('industry', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('startDialog.custom.industryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">{t('startDialog.custom.jobDescription')}</Label>
                <Textarea
                  id="jobDescription"
                  placeholder={t('startDialog.custom.jobDescriptionPlaceholder')}
                  value={formData.jobDescription || ''}
                  onChange={(e) => updateField('jobDescription', e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Common Settings */}
          <div className="space-y-4 mt-6 pt-4 border-t">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('startDialog.typeLabel')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => updateField('type', v as InterviewType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <span>{t.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {t.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('startDialog.difficultyLabel')}</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) => updateField('difficulty', v as InterviewDifficulty)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('startDialog.questionCountLabel')}</Label>
                <Select
                  value={String(formData.maxQuestions || 10)}
                  onValueChange={(v) => updateField('maxQuestions', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t('startDialog.questionCount', { count: 5 })}</SelectItem>
                    <SelectItem value="10">{t('startDialog.questionCount', { count: 10 })}</SelectItem>
                    <SelectItem value="15">{t('startDialog.questionCount', { count: 15 })}</SelectItem>
                    <SelectItem value="20">{t('startDialog.questionCount', { count: 20 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('startDialog.languageLabel')}</Label>
                <Select
                  value={formData.language || 'de'}
                  onValueChange={(v) => updateField('language', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">{t('startDialog.languageGerman')}</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('startDialog.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (mode === 'application' && !formData.applicationId)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('startDialog.start')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
