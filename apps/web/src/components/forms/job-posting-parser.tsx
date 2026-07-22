'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link as LinkIcon, Check, AlertCircle } from 'lucide-react';
import { useParseJobPosting } from '@/hooks/use-job-postings';
import { toast } from 'sonner';
import type { JobPosting } from '@/types';
import {
  jobPostingUrlSchema,
  jobPostingEditSchema,
  type JobPostingUrlFormValues,
  type JobPostingEditFormValues,
} from '@/lib/validation/schemas';

type UrlFormData = JobPostingUrlFormValues;
type EditFormData = JobPostingEditFormValues;

interface JobPostingParserProps {
  onSave?: (jobPosting: JobPosting) => void;
}

/**
 * JobPostingParser Component
 * 
 * Allows users to parse job postings from URLs.
 * - URL input with validation
 * - Display parsed job data
 * - Edit capability before saving
 * - Error handling and user feedback
 */
export function JobPostingParser({ onSave }: JobPostingParserProps) {
  const t = useTranslations('wizard');
  const [parsedData, setParsedData] = useState<JobPosting | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [urlParseFailed, setUrlParseFailed] = useState(false);

  const parseJobPosting = useParseJobPosting();

  // Form for URL input
  const urlForm = useForm<UrlFormData>({
    resolver: zodResolver(jobPostingUrlSchema),
    mode: 'onBlur', // Validate on blur
    defaultValues: {
      url: '',
    },
  });

  // Form for editing parsed data
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(jobPostingEditSchema),
    mode: 'onBlur', // Validate on blur
  });

  // Handle URL parsing
  const handleUrlParse = async (data: UrlFormData) => {
    setUrlParseFailed(false);
    try {
      const result = await parseJobPosting.mutateAsync({ url: data.url });
      setParsedData(result);
      setIsEditing(false);
      
      // Populate edit form with parsed data
      editForm.reset({
        title: result.title,
        company: result.company,
        location: result.location || '',
        description: result.description || '',
        requirements: Array.isArray(result.requirements) ? result.requirements.join('\n') : (result.requirements || ''),
      });
    } catch {
      // Toast handled by the mutation hook; surface a persistent inline
      // fallback so the user knows the manual tab is available.
      setUrlParseFailed(true);
    }
  };

  // Handle saving edited data
  const handleSave = (data: EditFormData) => {
    if (!parsedData) return;

    const updatedJobPosting: JobPosting = {
      ...parsedData,
      title: data.title,
      company: data.company,
      location: data.location,
      description: data.description,
      requirements: data.requirements ? [data.requirements] : undefined,
    };

    setParsedData(updatedJobPosting);
    setIsEditing(false);
    toast.success(t('jobPostingParser.toasts.changesSaved'));
    
    if (onSave) {
      onSave(updatedJobPosting);
    }
  };

  // Handle reset
  const handleReset = () => {
    setParsedData(null);
    setIsEditing(false);
    urlForm.reset();
    editForm.reset();
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!parsedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>{t('jobPostingParser.input.title')}</CardTitle>
                <CardDescription>
                  {t('jobPostingParser.input.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={urlForm.handleSubmit(handleUrlParse)} className="space-y-4">
              {urlParseFailed && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">{t('jobPostingParser.urlFallback.title')}</p>
                      <p className="mt-1">
                        {t('jobPostingParser.urlFallback.descriptionManualTab')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="url">{t('jobPostingParser.input.urlLabel')}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('jobPostingParser.input.urlHelp')}
                </p>
                <Input
                  id="url"
                  type="text"
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  {...urlForm.register('url')}
                  className={urlForm.formState.errors.url ? 'border-destructive' : ''}
                />
                {urlForm.formState.errors.url && (
                  <p className="text-sm text-destructive mt-1">
                    {urlForm.formState.errors.url.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                loading={parseJobPosting.isPending}
                className="w-full"
              >
                {t('jobPostingParser.input.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Parsed Data Display */}
      {parsedData && !isEditing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('jobPostingParser.result.title')}</CardTitle>
                <CardDescription>
                  {t('jobPostingParser.result.description')}
                </CardDescription>
              </div>
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                {t('jobPostingParser.result.badge')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('jobPostingParser.fields.title')}</Label>
                <p className="text-lg font-semibold">{parsedData.title}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{t('jobPostingParser.fields.company')}</Label>
                <p className="text-base">{parsedData.company}</p>
              </div>

              {parsedData.location && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t('jobPostingParser.fields.location')}</Label>
                  <p className="text-base">{parsedData.location}</p>
                </div>
              )}

              {parsedData.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t('jobPostingParser.fields.description')}</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {parsedData.description.length > 300
                      ? `${parsedData.description.substring(0, 300)}...`
                      : parsedData.description}
                  </p>
                </div>
              )}

              {parsedData.requirements && parsedData.requirements.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t('jobPostingParser.fields.requirements')}</Label>
                  <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                    {parsedData.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedData.sourceUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t('jobPostingParser.fields.originalUrl')}</Label>
                  <a
                    href={parsedData.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand hover:underline break-all"
                  >
                    {parsedData.sourceUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
                {t('jobPostingParser.actions.edit')}
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                {t('jobPostingParser.actions.analyzeAgain')}
              </Button>
              {onSave && (
                <Button onClick={() => onSave(parsedData)} className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  {t('jobPostingParser.actions.save')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {parsedData && isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{t('jobPostingParser.edit.title')}</CardTitle>
            <CardDescription>
              {t('jobPostingParser.edit.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editForm.handleSubmit(handleSave)} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">{t('jobPostingParser.edit.titleLabel')}</Label>
                <Input
                  id="edit-title"
                  type="text"
                  {...editForm.register('title')}
                  className={editForm.formState.errors.title ? 'border-destructive' : ''}
                />
                {editForm.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {editForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-company">{t('jobPostingParser.edit.companyLabel')}</Label>
                <Input
                  id="edit-company"
                  type="text"
                  {...editForm.register('company')}
                  className={editForm.formState.errors.company ? 'border-destructive' : ''}
                />
                {editForm.formState.errors.company && (
                  <p className="text-sm text-destructive mt-1">
                    {editForm.formState.errors.company.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-location">{t('jobPostingParser.fields.location')}</Label>
                <Input
                  id="edit-location"
                  type="text"
                  {...editForm.register('location')}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">{t('jobPostingParser.fields.description')}</Label>
                <Textarea
                  id="edit-description"
                  rows={6}
                  {...editForm.register('description')}
                />
              </div>

              <div>
                <Label htmlFor="edit-requirements">{t('jobPostingParser.fields.requirements')}</Label>
                <Textarea
                  id="edit-requirements"
                  rows={6}
                  {...editForm.register('requirements')}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1"
                >
                  {t('jobPostingParser.actions.cancel')}
                </Button>
                <Button type="submit" className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  {t('jobPostingParser.actions.saveChanges')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      {!parsedData && (
        <Card className="border-primary-soft bg-primary-soft/40 dark:border-slate-600 dark:bg-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-brand flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('jobPostingParser.help.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('jobPostingParser.help.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
