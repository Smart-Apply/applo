'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link as LinkIcon, FileText, Check, Loader2 } from 'lucide-react';
import { useParseJobPosting, useCreateJobPosting } from '@/hooks/use-job-postings';
import { cn } from '@/lib/utils';
import type { JobPosting } from '@/types';
import {
  jobPostingUrlSchema,
  jobPostingSchema,
  type JobPostingUrlFormValues,
  type JobPostingFormValues,
} from '@/lib/validation/schemas';

interface JobStepProps {
  onJobCreated: (jobPosting: JobPosting) => void;
}

export function JobStep({ onJobCreated }: JobStepProps) {
  const [parsedData, setParsedData] = useState<JobPosting | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('url');
  const [urlParseFailed, setUrlParseFailed] = useState(false);

  const parseJobPosting = useParseJobPosting();
  const createJobPosting = useCreateJobPosting();

  // URL form
  const urlForm = useForm<JobPostingUrlFormValues>({
    resolver: zodResolver(jobPostingUrlSchema),
    mode: 'onBlur',
    defaultValues: { url: '' },
  });

  // Manual form
  const manualForm = useForm<JobPostingFormValues>({
    resolver: zodResolver(jobPostingSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      company: '',
      location: '',
      url: '',
      fullText: '',
      salary: '',
      employmentType: '',
    },
  });

  const handleUrlParse = async (data: JobPostingUrlFormValues) => {
    setUrlParseFailed(false);
    try {
      const result = await parseJobPosting.mutateAsync({ url: data.url });
      setParsedData(result);
      // The parse endpoint already saves the job posting
      onJobCreated(result);
    } catch {
      // The hook already shows a toast; surface a persistent inline
      // fallback so the user knows they can switch to the text tab.
      setUrlParseFailed(true);
    }
  };

  const handleManualSubmit = async (data: JobPostingFormValues) => {
    try {
      const payload = {
        title: data.title,
        company: data.company,
        location: data.location || undefined,
        url: data.url || undefined,
        description: data.fullText,
        fullText: data.fullText,
        salary: data.salary || undefined,
        employmentType: data.employmentType || undefined,
      };
      const result = await createJobPosting.mutateAsync(payload);
      setParsedData(result);
      onJobCreated(result);
    } catch {
      // Error handled by hook
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setIsEditing(false);
    urlForm.reset();
    manualForm.reset();
  };

  // If we have parsed/created data, show success state
  if (parsedData && !isEditing) {
    return (
      <Card className="gap-0 rounded-[4px] border-[#E0E0E0] bg-white py-0 shadow-none">
        <CardHeader className="border-b border-[#E0E0E0] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-10 w-10 flex-none place-items-center bg-[#ECFAF0]">
                <Check className="h-5 w-5 text-[#16A34A]" strokeWidth={3} />
              </div>
              <div>
                <CardTitle className="font-heading text-lg font-bold tracking-[-.01em]">Stelle erfasst</CardTitle>
                <CardDescription className="mt-0.5 text-[13.5px]">Die Stellenanzeige wurde erfolgreich gespeichert.</CardDescription>
              </div>
            </div>
            <Badge className="gap-1.5 rounded-none bg-[#16A34A] px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-white hover:bg-[#16A34A]">
              <Check className="h-3 w-3" strokeWidth={3.4} />
              Gespeichert
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="border border-[#E0E0E0] bg-[#FAFAFA]">
            <div className="grid grid-cols-[auto_1fr]">
              <div className="border-b border-r border-[#E5E9F2] bg-white px-4.5 py-3.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-[#A0A0A0]">Titel</div>
              <div className="border-b border-[#E5E9F2] px-4.5 py-3.5 text-[15px] font-semibold text-foreground">{parsedData.title}</div>
              <div className={cn('border-r border-[#E5E9F2] bg-white px-4.5 py-3.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-[#A0A0A0]', (parsedData.location || parsedData.description) && 'border-b')}>Firma</div>
              <div className={cn('px-4.5 py-3.5 text-[15px] text-foreground', (parsedData.location || parsedData.description) && 'border-b border-[#E5E9F2]')}>{parsedData.company}</div>
              {parsedData.location && (
                <>
                  <div className={cn('border-r border-[#E5E9F2] bg-white px-4.5 py-3.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-[#A0A0A0]', parsedData.description && 'border-b')}>Standort</div>
                  <div className={cn('px-4.5 py-3.5 text-[15px] text-foreground', parsedData.description && 'border-b border-[#E5E9F2]')}>{parsedData.location}</div>
                </>
              )}
              {parsedData.description && (
                <>
                  <div className="border-r border-[#E5E9F2] bg-white px-4.5 py-3.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-[#A0A0A0]">Info</div>
                  <div className="line-clamp-3 px-4.5 py-3.5 text-sm text-muted-foreground">{parsedData.description}</div>
                </>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleReset} className="rounded-[3px] border-[#1B2A49] font-semibold hover:bg-[#E5E9F2]">
            Andere Stelle verwenden
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 rounded-[4px] border-[#E0E0E0] bg-white py-0 shadow-none">
      <CardHeader className="px-6 pb-0 pt-6">
        <CardTitle className="font-heading text-[19px] font-bold tracking-[-.01em]">Stelle hinzufügen</CardTitle>
        <CardDescription className="text-[13.5px]">
          Füge die Stellenanzeige per Link oder durch Einfügen des Textes hinzu.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-px rounded-none border border-[#E0E0E0] bg-[#E0E0E0] p-0">
            <TabsTrigger
              value="url"
              className="gap-2 rounded-none border-0 bg-white py-3 text-[13.5px] font-semibold text-[#6B6969] shadow-none data-[state=active]:bg-[#1B2A49] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <LinkIcon className="h-4 w-4" />
              Link einfügen
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="gap-2 rounded-none border-0 bg-white py-3 text-[13.5px] font-semibold text-[#6B6969] shadow-none data-[state=active]:bg-[#1B2A49] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <FileText className="h-4 w-4" />
              Text einfügen
            </TabsTrigger>
          </TabsList>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4">
            {urlParseFailed && (
              <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <p className="font-medium">Diese Stellenanzeige konnten wir nicht automatisch lesen.</p>
                <p className="mt-1">
                  Manche Jobportale blockieren das Auslesen. Bitte kopiere den Text
                  der Anzeige und füge ihn im Tab &bdquo;Text einfügen&ldquo; ein.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('text');
                    setUrlParseFailed(false);
                  }}
                  className="mt-2 inline-flex font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
                >
                  Zum Text-Tab wechseln →
                </button>
              </div>
            )}
            <form onSubmit={urlForm.handleSubmit(handleUrlParse)} className="space-y-4">
              <div>
                <Label htmlFor="url" className="text-[13.5px] font-semibold">Link zur Stellenanzeige</Label>
                <p className="mb-2.5 mt-1 text-[13px] text-muted-foreground">
                  Unterstützt LinkedIn, Indeed und weitere Jobportale.
                </p>
                <Input
                  id="url"
                  type="text"
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  {...urlForm.register('url')}
                  className={cn(
                    'rounded-[3px] border-[#B0B0B0] font-mono text-[13px] focus-visible:border-[#5581C7] focus-visible:ring-[#5581C7]/30',
                    urlForm.formState.errors.url && 'border-red-500',
                  )}
                />
                {urlForm.formState.errors.url && (
                  <p className="text-sm text-red-500 mt-1">{urlForm.formState.errors.url.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={parseJobPosting.isPending}
                className="w-full rounded-[3px] font-semibold"
                size="lg"
              >
                {parseJobPosting.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird analysiert...
                  </>
                ) : (
                  'Stellenanzeige analysieren'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Manual Text Tab */}
          <TabsContent value="text" className="space-y-4">
            <form onSubmit={manualForm.handleSubmit(handleManualSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manual-title">
                    Stellentitel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="manual-title"
                    placeholder="z.B. Marketing Manager, Pflegefachkraft"
                    {...manualForm.register('title')}
                    className={manualForm.formState.errors.title ? 'border-red-500' : ''}
                  />
                  {manualForm.formState.errors.title && (
                    <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="manual-company">
                    Unternehmen <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="manual-company"
                    placeholder="z.B. Unternehmen GmbH"
                    {...manualForm.register('company')}
                    className={manualForm.formState.errors.company ? 'border-red-500' : ''}
                  />
                  {manualForm.formState.errors.company && (
                    <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.company.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="manual-location">Standort</Label>
                <Input
                  id="manual-location"
                  placeholder="z.B. Berlin, Deutschland"
                  {...manualForm.register('location')}
                />
              </div>

              <div>
                <Label htmlFor="manual-fullText">
                  Stellenbeschreibung <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Kopiere den gesamten Text der Stellenanzeige und füge ihn hier ein.
                </p>
                <Textarea
                  id="manual-fullText"
                  placeholder="Füge hier den vollständigen Text der Stellenanzeige ein..."
                  rows={8}
                  {...manualForm.register('fullText')}
                  className={manualForm.formState.errors.fullText ? 'border-red-500' : ''}
                />
                {manualForm.formState.errors.fullText && (
                  <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.fullText.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={createJobPosting.isPending}
                className="w-full rounded-[3px] font-semibold"
                size="lg"
              >
                {createJobPosting.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Stelle speichern'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
