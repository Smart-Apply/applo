'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CenteredLoader } from '@/components/shared/loading';
import { 
  ArrowLeft, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Calendar,
  FileText,
  CheckCircle2,
  Target,
  Star,
  ExternalLink
} from 'lucide-react';
import { formatDate } from '@/lib/format-date';

export default function JobPostingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('jobs');
  const jobPostingId = params.id as string;

  const { data: jobPosting, isLoading, error } = useQuery({
    queryKey: ['job-posting', jobPostingId],
    queryFn: () => api.jobPostings.getById(jobPostingId),
    enabled: !!jobPostingId,
  });

  if (isLoading) {
    return <CenteredLoader message={t('detail.loading')} />;
  }

  if (error || !jobPosting) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/applications')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('detail.back')}
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('detail.notFound.title')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('detail.notFound.description')}
              </p>
              <Button onClick={() => router.push('/applications')}>
                {t('detail.notFound.toApplications')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('detail.back')}
        </Button>
      </div>

      {/* Job Title & Company */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <CardTitle className="font-heading text-2xl sm:text-3xl break-words tracking-[-.02em]">{jobPosting.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{jobPosting.company}</span>
                </div>
                {jobPosting.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{jobPosting.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(jobPosting.createdAt, 'dd. MMMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
            {jobPosting.sourceUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(jobPosting.sourceUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('detail.source')}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Description */}
      {jobPosting.description && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              <CardTitle>{t('detail.sections.description')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {jobPosting.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {jobPosting.requirements && jobPosting.requirements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand" />
              <CardTitle>{t('detail.sections.requirements')}</CardTitle>
              <Badge variant="secondary" className="ml-2 font-mono">
                {jobPosting.requirements.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {jobPosting.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 bg-brand flex-shrink-0" />
                  <span className="text-foreground/80 leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Responsibilities */}
      {jobPosting.responsibilities && jobPosting.responsibilities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand" />
              <CardTitle>{t('detail.sections.responsibilities')}</CardTitle>
              <Badge variant="secondary" className="ml-2 font-mono">
                {jobPosting.responsibilities.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {jobPosting.responsibilities.map((resp, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 bg-brand flex-shrink-0" />
                  <span className="text-foreground/80 leading-relaxed">{resp}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Nice to Have */}
      {jobPosting.niceToHave && jobPosting.niceToHave.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-brand" />
              <CardTitle>{t('detail.sections.niceToHave')}</CardTitle>
              <Badge variant="secondary" className="ml-2 font-mono">
                {jobPosting.niceToHave.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {jobPosting.niceToHave.map((nice, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 bg-muted-foreground flex-shrink-0" />
                  <span className="text-foreground/80 leading-relaxed">{nice}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Raw Text (Collapsible) */}
      {jobPosting.rawText && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-muted-foreground">
              {t('detail.sections.rawText')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <details className="group">
              <summary className="cursor-pointer text-sm text-brand hover:underline">
                {t('detail.showFullText')}
              </summary>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {jobPosting.rawText}
              </p>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
