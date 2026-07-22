'use client';

/* =============================================================================
 *  Application detail / download page — redesign (UI only)
 *
 *  Changes vs. the old page:
 *   • READY: celebration hero + document cards + guided next-step CTA.
 *   • Compact status tracker (Erstellt → Beworben → Interview → Angenommen).
 *   • ATS analysis + job posting collapsed into click-to-open cards.
 *   • PENDING / GENERATING / FAILED are centered states (with Applo).
 *
 *  Preserved unchanged: queries (application + files), SSE progress stream,
 *  status-change toasts, download/preview/ZIP handlers, retry mutation,
 *  feature-gated ATS panel, EditableTitle, StatusDropdown, PDFPreviewModal.
 * ========================================================================== */

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { api, authenticatedFetch } from '@/lib/api-client';
import { useRetryApplication } from '@/hooks/use-applications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CenteredLoader } from '@/components/shared/loading';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Briefcase,
  MapPin,
  RefreshCw,
  Eye,
  Package,
  Pencil,
  Send,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Check,
  Hash,
  Calendar,
  MessagesSquare,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ApplicationGenerationStatus, ApplicationTrackingStatus } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { handleDownload, handleZipDownload, generateFilename } from '@/lib/pdf-utils';
import { EditableTitle } from '@/components/applications/editable-title';
import { StatusDropdown } from '@/components/applications/status-dropdown';
import { ATSAnalysisPanel } from '@/components/applications/ats-analysis-panel';
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt';
import { StatusChip } from '@/components/ui/status-chip';
import { useFeatureGate } from '@/hooks/use-tier-gate';
import { formatFullTimestamp, formatDate } from '@/lib/format-date';
import { LOADING_MESSAGES } from '@/lib/constants';
import { ApploRig } from '@/components/ui/applo-rig';
import { cn } from '@/lib/utils';

// Dynamic import for PDF preview modal (saves ~300KB) — loaded on demand.
const PDFPreviewModal = dynamic(
  () =>
    import('@/components/pdf/pdf-preview-modal').then((mod) => ({ default: mod.PDFPreviewModal })),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-[4px] p-8">
          <CenteredLoader message={LOADING_MESSAGES.PDF_PREVIEW} />
        </div>
      </div>
    ),
    ssr: false,
  },
);

type ApplicationStatus = ApplicationGenerationStatus;

/* Linear tracking path shown in the status tracker (REJECTED handled inline). */
const TRACK_STEPS: { key: ApplicationTrackingStatus; labelKey: string }[] = [
  { key: 'CREATED', labelKey: 'status.created' },
  { key: 'APPLIED', labelKey: 'status.applied' },
  { key: 'INTERVIEW', labelKey: 'status.interview' },
  { key: 'ACCEPTED', labelKey: 'status.accepted' },
];

export default function ApplicationDetailPage() {
  const t = useTranslations('applications');
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const applicationId = params.id as string;
  const retryMutation = useRetryApplication();

  const [previewFile, setPreviewFile] = useState<{
    url: string;
    blob?: Blob;
    filename: string;
    title: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState<{
    coverLetter?: boolean;
    resume?: boolean;
    both?: boolean;
  }>({});

  // GENERATING progress (driven by SSE).
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const prevStatusRef = useRef<ApplicationStatus | null>(null);

  // Main query — full application details (no polling; SSE handles live status).
  const {
    data: application,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['applications', applicationId],
    queryFn: () => api.applications.getById(applicationId),
    enabled: isAuthenticated && !!applicationId,
  });

  // SSE: real-time status + progress updates.
  useEffect(() => {
    if (!isAuthenticated || !applicationId || !application) return;
    if (application.status !== 'PENDING' && application.status !== 'GENERATING') return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/applications/${applicationId}/stream`,
      { withCredentials: true },
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.message) setProgressMessage(data.message);

        queryClient.setQueryData(['applications', applicationId], (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...(old as Record<string, unknown>), status: data.status };
        });

        if (data.status === 'READY' || data.status === 'FAILED') {
          refetch();
          eventSource.close();
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, applicationId, application?.status, queryClient, refetch]);

  // Status-change toasts.
  useEffect(() => {
    if (!application) return;
    const prevStatus = prevStatusRef.current;
    const currentStatus = application.status;

    if (prevStatus && prevStatus !== currentStatus) {
      const jobTitle = application.jobPosting?.title || t('detail.fallbackTitle');
      if (currentStatus === 'READY') {
        toast.success(t('detail.toasts.readyTitle'), {
          description: t('detail.toasts.readyDescription', { title: jobTitle }),
          duration: 5000,
        });
        // Cross-language export whose translation failed: the PDFs were
        // rendered konsistent in der Originalsprache — tell the user.
        if (application.exportWarning === 'TRANSLATION_FALLBACK') {
          toast.warning(t('detail.toasts.translationFallbackTitle'), {
            description:
              t('detail.toasts.translationFallbackDescription'),
            duration: 8000,
          });
        }
      } else if (currentStatus === 'FAILED') {
        toast.error(t('detail.toasts.failedTitle'), {
          description: t('detail.toasts.failedDescription', { title: jobTitle }),
          duration: 6000,
        });
      } else if (currentStatus === 'GENERATING') {
        toast.info(t('detail.toasts.generatingTitle'), {
          description: t('detail.toasts.generatingDescription', { title: jobTitle }),
          duration: 4000,
        });
      }
    }
    prevStatusRef.current = currentStatus;
  }, [application, t]);

  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ['applications', applicationId, 'files'],
    queryFn: () => api.applications.getFiles(applicationId),
    enabled: isAuthenticated && !!applicationId && application?.status === 'READY',
  });

  // "Als beworben markieren" — same endpoint the StatusDropdown uses.
  const markAppliedMutation = useMutation({
    mutationFn: () => api.applications.updateStatus(applicationId, 'APPLIED'),
    onSuccess: (updatedApp) => {
      queryClient.setQueryData(['applications', applicationId], updatedApp);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(t('detail.toasts.markedAppliedTitle'), { description: t('detail.toasts.markedAppliedDescription') });
    },
    onError: (err: Error) => toast.error(t('detail.toasts.updateError', { message: err.message })),
  });

  const handleExpiredUrl = () => {
    queryClient.invalidateQueries({ queryKey: ['applications', applicationId, 'files'] });
    refetchFiles();
  };

  const handleDownloadCoverLetter = async () => {
    if (!application || !isAuthenticated) return;
    setIsDownloading((prev) => ({ ...prev, coverLetter: true }));
    try {
      const filename = generateFilename(
        'cover-letter',
        application?.jobPosting?.company,
        application?.jobPosting?.title,
        user?.lastName,
        user?.firstName,
      );
      const url = `${process.env.NEXT_PUBLIC_API_URL}/applications/${application.id}/download/cover-letter`;
      await handleDownload(url, filename, handleExpiredUrl);
    } finally {
      setIsDownloading((prev) => ({ ...prev, coverLetter: false }));
    }
  };

  const handleDownloadResume = async () => {
    if (!application || !isAuthenticated) return;
    setIsDownloading((prev) => ({ ...prev, resume: true }));
    try {
      const filename = generateFilename(
        'resume',
        application?.jobPosting?.company,
        application?.jobPosting?.title,
        user?.lastName,
        user?.firstName,
      );
      const url = `${process.env.NEXT_PUBLIC_API_URL}/applications/${application.id}/download/resume`;
      await handleDownload(url, filename, handleExpiredUrl);
    } finally {
      setIsDownloading((prev) => ({ ...prev, resume: false }));
    }
  };

  const handleDownloadBoth = async () => {
    if (!application?.id || !isAuthenticated || application?.status !== 'READY') return;
    setIsDownloading((prev) => ({ ...prev, both: true }));
    try {
      const lastName = user?.lastName;
      const firstName = user?.firstName;
      const coverLetterFilename = generateFilename(
        'cover-letter',
        application?.jobPosting?.company,
        application?.jobPosting?.title,
        lastName,
        firstName,
      );
      const resumeFilename = generateFilename(
        'resume',
        application?.jobPosting?.company,
        application?.jobPosting?.title,
        lastName,
        firstName,
      );
      const company = application?.jobPosting?.company || 'company';
      const normalizedCompany = company.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const zipFilename = lastName
        ? `${lastName.toLowerCase()}-${normalizedCompany}-bewerbung.zip`
        : `${normalizedCompany}-bewerbung.zip`;
      const coverLetterUrl = `${process.env.NEXT_PUBLIC_API_URL}/applications/${application.id}/download/cover-letter`;
      const resumeUrl = `${process.env.NEXT_PUBLIC_API_URL}/applications/${application.id}/download/resume`;
      await handleZipDownload(
        [
          { url: coverLetterUrl, filename: coverLetterFilename },
          { url: resumeUrl, filename: resumeFilename },
        ],
        zipFilename,
        handleExpiredUrl,
      );
    } finally {
      setIsDownloading((prev) => ({ ...prev, both: false }));
    }
  };

  const handlePreview = async (type: 'cover-letter' | 'resume', title: string) => {
    if (!application?.id || !isAuthenticated) return;
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/applications/${application.id}/download/${type}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewFile({
        url: blobUrl,
        blob,
        filename: generateFilename(
          type,
          application?.jobPosting?.company,
          application?.jobPosting?.title,
          user?.lastName,
          user?.firstName,
        ),
        title,
      });
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(t('detail.toasts.previewError'));
    }
  };

  if (isLoading) {
    return <CenteredLoader message={t('detail.loading')} />;
  }

  if (error || !application) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <BackLink onClick={() => router.push('/applications')} />
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('detail.notFoundTitle')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('detail.notFoundDescription')}
              </p>
              <Button onClick={() => router.push('/applications')}>{t('detail.toApplications')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trackingStatus: ApplicationTrackingStatus =
    application.applicationStatus === 'CREATED' ||
    application.applicationStatus === 'APPLIED' ||
    application.applicationStatus === 'INTERVIEW' ||
    application.applicationStatus === 'ACCEPTED' ||
    application.applicationStatus === 'REJECTED'
      ? application.applicationStatus
      : 'CREATED';
  const isApplied =
    trackingStatus === 'APPLIED' || trackingStatus === 'INTERVIEW' || trackingStatus === 'ACCEPTED';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink onClick={() => router.push('/applications')} />

      {/* Header: editable title + company, tracking-status dropdown */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableTitle
            applicationId={applicationId}
            initialTitle={application.title}
            fallbackId={applicationId}
          />
          {application.jobPosting?.company && (
            <p className="mt-1.5 flex items-center gap-2 text-[15px] text-muted-foreground">
              <Briefcase className="h-4 w-4 shrink-0" />
              {application.jobPosting.company}
              {application.jobPosting.location && (
                <>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {application.jobPosting.location}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
        {application.applicationStatus ? (
          <div className="flex items-center gap-2">
            <StatusDropdown
              applicationId={applicationId}
              currentStatus={application.applicationStatus}
              variant="dropdown"
            />
            {application.statusSource === 'EMAIL_TRACKING' && (
              <StatusChip
                tone="info"
                withDot={false}
                title={t('detail.autoTrackingTitle')}
              >
                Auto-Tracking
              </StatusChip>
            )}
          </div>
        ) : (
          <div className="rounded-[3px] bg-destructive-soft px-2 py-1 text-xs text-destructive">
            {t('detail.noStatus')}
          </div>
        )}
      </div>

      {/* ---------- READY ---------- */}
      {application.status === 'READY' && (
        <>
          <CelebrationHero firstName={user?.firstName} company={application.jobPosting?.company} />

          <DocumentsCard
            files={files}
            isDownloading={isDownloading}
            onPreview={handlePreview}
            onDownloadCoverLetter={handleDownloadCoverLetter}
            onDownloadResume={handleDownloadResume}
            onDownloadBoth={handleDownloadBoth}
            onEdit={() => router.push(`/applications/${application.id}/edit`)}
          />

          <NextStepCard
            company={application.jobPosting?.company}
            applied={isApplied}
            applying={markAppliedMutation.isPending}
            onMarkApplied={() => markAppliedMutation.mutate()}
            onOpenJobUrl={
              application.jobPosting?.sourceUrl
                ? () => {
                    const sourceUrl = application.jobPosting?.sourceUrl;
                    if (!sourceUrl) return;
                    try {
                      const url = new URL(sourceUrl);
                      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                        toast.error(t('detail.toasts.invalidJobUrl'));
                        return;
                      }
                      window.open(url.toString(), '_blank', 'noopener,noreferrer');
                    } catch {
                      toast.error(t('detail.toasts.invalidJobUrl'));
                    }
                  }
                : undefined
            }
            onInterviewCoach={() => router.push('/interviews')}
          />

          <StatusTracker status={trackingStatus} />

          <AtsDisclosure applicationId={applicationId} />

          {application.jobPosting && <JobPostingDisclosure jobPosting={application.jobPosting} />}

          <MetaFooter
            createdAt={application.createdAt}
            updatedAt={application.updatedAt}
            id={application.id}
          />
        </>
      )}

      {/* ---------- GENERATING ---------- */}
      {application.status === 'GENERATING' && (
        <GeneratingView progress={progress} message={progressMessage} />
      )}

      {/* ---------- PENDING ---------- */}
      {application.status === 'PENDING' && (
        <PendingView onStart={() => router.push(`/applications/${applicationId}/edit`)} />
      )}

      {/* ---------- FAILED ---------- */}
      {application.status === 'FAILED' && (
        <FailedView
          errorMessage={application.errorMessage}
          retrying={retryMutation.isPending}
          onRetry={() => retryMutation.mutate(application.id)}
        />
      )}

      {/* PDF preview modal */}
      {previewFile && (
        <PDFPreviewModal
          isOpen={!!previewFile}
          onClose={() => {
            if (previewFile.url.startsWith('blob:')) URL.revokeObjectURL(previewFile.url);
            setPreviewFile(null);
          }}
          file={previewFile.blob || previewFile.url}
          filename={previewFile.filename}
          title={previewFile.title}
          onExpired={handleExpiredUrl}
        />
      )}
    </div>
  );
}

/* ============================== sub-components ============================== */

function BackLink({ onClick }: { onClick: () => void }) {
  const t = useTranslations('applications');

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('detail.backToApplications')}
    </button>
  );
}

/* ---- Celebration hero (READY) ---- */
function CelebrationHero({
  firstName,
  company,
}: {
  firstName?: string | null;
  company?: string | null;
}) {
  const t = useTranslations('applications');

  return (
    <div className="relative grid grid-cols-[auto_1fr] items-center gap-5 overflow-hidden rounded-[4px] border border-[#BFE9CC] bg-[#ECFAF0] p-6 dark:border-green-400/30 dark:bg-green-400/10 sm:gap-7 sm:p-8">
      <div className="hidden self-end sm:block" style={{ marginBottom: -6 }}>
        <ApploRig state="success" size={132} aria-hidden />
      </div>
      <div className="block sm:hidden" style={{ marginBottom: -4 }}>
        <ApploRig state="success" size={84} aria-hidden />
      </div>
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-[#15803D] dark:text-green-300">
          {t('detail.celebration.readyToSend')}
        </p>
        <h2 className="font-heading text-[24px] font-bold leading-tight tracking-[-.02em] text-foreground sm:text-[26px]">
          {firstName ? t('detail.celebration.titleWithName', { firstName }) : t('detail.celebration.title')} 🎉
        </h2>
        <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
          {t.rich(company ? 'detail.celebration.descriptionWithCompany' : 'detail.celebration.description', {
            company: company ?? '',
            coverLetter: (chunks) => <b className="font-semibold text-foreground">{chunks}</b>,
            resume: (chunks) => <b className="font-semibold text-foreground">{chunks}</b>,
          })}
        </p>
      </div>
    </div>
  );
}

/* ---- Documents (READY hero) ---- */
type FilesData =
  | {
      coverLetter?: { expiresAt: string } | null;
      resume?: { expiresAt: string } | null;
    }
  | undefined;

function DocumentsCard({
  files,
  isDownloading,
  onPreview,
  onDownloadCoverLetter,
  onDownloadResume,
  onDownloadBoth,
  onEdit,
}: {
  files: FilesData;
  isDownloading: { coverLetter?: boolean; resume?: boolean; both?: boolean };
  onPreview: (type: 'cover-letter' | 'resume', title: string) => void;
  onDownloadCoverLetter: () => void;
  onDownloadResume: () => void;
  onDownloadBoth: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations('applications');

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[.12em] text-muted-foreground">
          {t('detail.documents.title')}
        </h3>
        {files?.resume && (
          <div className="flex flex-wrap gap-2">
            {files?.coverLetter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadBoth}
                loading={isDownloading.both}
              >
                <Package className="h-4 w-4" />
                {t('detail.documents.bothAsZip')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              {files?.coverLetter ? t('detail.documents.edit') : t('detail.documents.editResume')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {files?.coverLetter ? (
          <DocCard
            name={t('detail.documents.coverLetter')}
            onPreview={() => onPreview('cover-letter', t('detail.documents.coverLetter'))}
            onDownload={onDownloadCoverLetter}
            downloading={isDownloading.coverLetter}
          />
        ) : (
          <DocCardEmpty
            name={t('detail.documents.coverLetter')}
            note={t('detail.documents.noCoverLetter')}
          />
        )}

        {files?.resume && (
          <DocCard
            name={t('detail.documents.resume')}
            onPreview={() => onPreview('resume', t('detail.documents.resume'))}
            onDownload={onDownloadResume}
            downloading={isDownloading.resume}
          />
        )}
      </div>

      {(files?.coverLetter || files?.resume) && (
        <p className="mt-3.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {t('detail.documents.downloadLinksLimited')}
          {files?.coverLetter
            ? t('detail.documents.expiresAt', { time: formatDate(files.coverLetter.expiresAt, 'HH:mm') })
            : files?.resume
              ? t('detail.documents.expiresAt', { time: formatDate(files.resume.expiresAt, 'HH:mm') })
              : ''}
          .
        </p>
      )}
    </div>
  );
}

function DocCard({
  name,
  onPreview,
  onDownload,
  downloading,
}: {
  name: string;
  onPreview: () => void;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const t = useTranslations('applications');

  return (
    <div className="flex flex-col rounded-[4px] border bg-card p-5 transition-colors hover:bg-muted/40">
      <div className="mb-4 flex items-center gap-3.5">
        <div className="relative grid h-[60px] w-[50px] shrink-0 place-items-center border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
          <FileText className="h-6 w-6" />
          <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-brand px-1.5 font-mono text-[8px] font-semibold tracking-wide text-white">
            PDF
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[16.5px] font-bold tracking-tight text-foreground">{name}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t('detail.documents.pdfDocument')}</p>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-[auto_1fr] gap-2.5">
        <Button variant="outline" onClick={onPreview} className="h-11">
          <Eye className="h-4 w-4" />
          {t('detail.documents.preview')}
        </Button>
        <Button onClick={onDownload} loading={downloading} className="h-11">
          <Download className="h-4 w-4" />
          {t('detail.documents.download')}
        </Button>
      </div>
    </div>
  );
}

function DocCardEmpty({ name, note }: { name: string; note: string }) {
  const t = useTranslations('applications');

  return (
    <div className="flex items-start gap-3.5 rounded-[4px] border border-dashed bg-muted/40 p-5">
      <div className="grid h-[60px] w-[50px] shrink-0 place-items-center border border-border bg-muted text-muted-foreground">
        <FileText className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-[16.5px] font-bold tracking-tight text-muted-foreground">{name}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground/80">{t('detail.documents.missing')}</p>
        <p className="mt-1 text-[12px] text-muted-foreground/70">{note}</p>
      </div>
    </div>
  );
}

/* ---- Next step CTA ---- */
function NextStepCard({
  company,
  applied,
  applying,
  onMarkApplied,
  onOpenJobUrl,
  onInterviewCoach,
}: {
  company?: string | null;
  applied: boolean;
  applying: boolean;
  onMarkApplied: () => void;
  onOpenJobUrl?: () => void;
  onInterviewCoach: () => void;
}) {
  const t = useTranslations('applications');

  if (applied) {
    return (
      <div className="relative grid grid-cols-[46px_1fr] gap-4 overflow-hidden rounded-[4px] border border-[#BFE9CC] bg-[#ECFAF0] p-5 dark:border-green-400/30 dark:bg-green-400/10 sm:p-6">
        <span className="grid h-[46px] w-[46px] place-items-center border border-[#BFE9CC] bg-background text-success dark:border-green-400/30">
          <CheckCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-success">
            {t('detail.nextStep.appliedBadge')}
          </p>
          <h3 className="font-heading text-[19px] font-bold tracking-tight text-[#15803D] dark:text-green-300">
            {t('detail.nextStep.appliedTitle')}
          </h3>
          <p className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-pretty text-[#3D7A55] dark:text-green-200/80">
            {company
              ? t('detail.nextStep.appliedDescriptionWithCompany', { company })
              : t('detail.nextStep.appliedDescription')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button onClick={onInterviewCoach}>
              <MessagesSquare className="h-4 w-4" />
              {t('detail.nextStep.toInterviewCoach')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-glow relative grid grid-cols-[46px_1fr] gap-4 overflow-hidden rounded-[4px] p-5 text-white sm:p-6">
      <span className="relative grid h-[46px] w-[46px] place-items-center bg-white/10">
        <Send className="h-5 w-5" />
      </span>
      <div className="relative">
        <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-brand">
          {t('detail.nextStep.title')}
        </p>
        <h3 className="font-heading text-[19px] font-bold tracking-tight">
          {company ? t('detail.nextStep.applyAtCompany', { company }) : t('detail.nextStep.applyNow')}
        </h3>
        <p className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-pretty text-[rgba(229,233,242,.75)]">
          {t('detail.nextStep.description')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            onClick={onMarkApplied}
            loading={applying}
            className="rounded-[3px] bg-white text-[#1B2A49] hover:bg-[#E5E9F2]"
          >
            <Check className="h-4 w-4" />
            {t('detail.nextStep.markApplied')}
          </Button>
          {onOpenJobUrl && (
            <Button
              variant="outline"
              onClick={onOpenJobUrl}
              className="rounded-[3px] border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              {t('detail.nextStep.toJobPosting')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Status tracker ---- */
function StatusTracker({ status }: { status: ApplicationTrackingStatus }) {
  const t = useTranslations('applications');
  const rejected = status === 'REJECTED';
  let curIdx = TRACK_STEPS.findIndex((s) => s.key === status);
  if (curIdx < 0) curIdx = rejected ? 1 : 0;

  return (
    <div className="flex items-center rounded-[4px] border bg-card px-5 py-4">
      {TRACK_STEPS.map((s, i) => {
        const done = i < curIdx;
        const current = i === curIdx && !rejected;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={cn(
                  'grid h-[30px] w-[30px] shrink-0 place-items-center border-2 font-mono text-xs font-bold transition-all',
                  done && 'border-success bg-success text-white',
                  current && 'border-brand bg-brand text-white ring-4 ring-primary-soft dark:ring-brand/20',
                  !done && !current && 'border-border bg-card text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[13.5px] font-semibold',
                  done && 'text-foreground',
                  current && 'text-brand',
                  !done && !current && 'text-muted-foreground',
                )}
              >
                {t(s.labelKey)}
              </span>
            </div>
            {i < TRACK_STEPS.length - 1 && (
              <span className="mx-3 h-0.5 min-w-[18px] flex-1 overflow-hidden bg-border">
                <span
                  className="block h-full bg-success transition-all"
                  style={{ width: done ? '100%' : '0%' }}
                />
              </span>
            )}
          </div>
        );
      })}
      {rejected && (
        <StatusChip tone="destructive" withDot={false} className="ml-3">
          {t('status.rejected')}
        </StatusChip>
      )}
    </div>
  );
}

/* ---- ATS disclosure (collapsed by default) ---- */
function AtsDisclosure({ applicationId }: { applicationId: string }) {
  const t = useTranslations('applications');
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[4px] border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{t('detail.ats.title')}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {t('detail.ats.description')}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t px-5 pb-5 pt-4">
            {open && <AtsAnalysisSection applicationId={applicationId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Job posting disclosure ---- */
type JobPostingData = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  sourceUrl?: string;
};

function JobPostingDisclosure({ jobPosting }: { jobPosting: JobPostingData }) {
  const t = useTranslations('applications');
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[4px] border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-muted text-primary">
          <Briefcase className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{t('detail.jobPosting.title')}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
            {jobPosting.company}
            {jobPosting.location ? ` · ${jobPosting.location}` : ''}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 px-5 pb-5 pt-1">
            {jobPosting.description && (
              <div className="border-t pt-4">
                <h4 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                  {t('detail.jobPosting.description')}
                </h4>
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground text-pretty">
                  {jobPosting.description}
                </p>
              </div>
            )}
            {jobPosting.requirements && jobPosting.requirements.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                  {t('detail.jobPosting.requirements')}
                </h4>
                <ul className="space-y-2">
                  {jobPosting.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-[14px] leading-snug text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Meta footer ---- */
function MetaFooter({
  createdAt,
  updatedAt,
  id,
}: {
  createdAt: string;
  updatedAt: string;
  id: string;
}) {
  const t = useTranslations('applications');

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1.5 pt-1.5 text-[12.5px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        {t.rich('detail.meta.created', {
          date: formatFullTimestamp(createdAt),
          b: (chunks) => <b className="font-semibold text-foreground/70">{chunks}</b>,
        })}
      </span>
      <span className="h-1 w-1 bg-border" />
      <span className="flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        {t.rich('detail.meta.updated', {
          date: formatFullTimestamp(updatedAt),
          b: (chunks) => <b className="font-semibold text-foreground/70">{chunks}</b>,
        })}
      </span>
      <span className="h-1 w-1 bg-border" />
      <span className="flex items-center gap-1.5">
        <Hash className="h-3.5 w-3.5" />
        <code className="rounded-[3px] border bg-card px-1.5 py-0.5 font-mono text-[11.5px]">
          {id}
        </code>
      </span>
    </div>
  );
}

/* ---- GENERATING ---- */
function GeneratingView({ progress, message }: { progress: number; message: string }) {
  const t = useTranslations('applications');

  return (
    <div className="flex flex-col items-center rounded-[4px] border bg-card px-6 py-9 text-center">
      <ApploRig state="process" size={140} aria-hidden />
      <h2 className="font-heading mt-2 text-[23px] font-bold tracking-[-.02em] text-foreground">
        {t('detail.generating.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
        {t('detail.generating.description')}
      </p>
      <div className="mt-6 w-full max-w-[440px]">
        <Progress value={progress} className="h-2.5" />
        <div className="mt-3 flex items-center justify-between text-[13.5px]">
          <span className="font-semibold text-foreground">{message || t('detail.generating.preparing')}</span>
          {progress > 0 && (
            <span className="font-mono font-semibold tabular-nums text-muted-foreground">{progress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- PENDING ---- */
function PendingView({ onStart }: { onStart: () => void }) {
  const t = useTranslations('applications');

  return (
    <div className="flex flex-col items-center rounded-[4px] border bg-card px-6 py-9 text-center">
      <ApploRig state="wave" size={140} aria-hidden />
      <h2 className="font-heading mt-2 text-[23px] font-bold tracking-[-.02em] text-foreground">
        {t('detail.pending.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
        {t('detail.pending.description')}
      </p>
      <Button size="lg" className="mt-6" onClick={onStart}>
        {t('detail.pending.startExport')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---- FAILED ---- */
function FailedView({
  errorMessage,
  retrying,
  onRetry,
}: {
  errorMessage?: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations('applications');

  return (
    <div className="flex flex-col items-center rounded-[4px] border bg-card px-6 py-9 text-center">
      <StatusChip tone="destructive" withDot={false} className="mb-3.5">
        <AlertCircle className="h-3.5 w-3.5" />
        {t('detail.failed.status')}
      </StatusChip>
      <ApploRig state="idle" size={128} aria-hidden />
      <h2 className="font-heading mt-2 text-[23px] font-bold tracking-[-.02em] text-foreground">
        {t('detail.failed.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
        {t('detail.failed.description')}
      </p>
      {errorMessage && (
        <p className="mx-auto mt-4 max-w-[480px] rounded-[4px] border border-[#F3C9C9] bg-[#FDEEEE] px-4 py-3 text-left font-mono text-[12.5px] leading-relaxed text-destructive dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Button onClick={onRetry} loading={retrying}>
          <RefreshCw className={cn('h-4 w-4', retrying && 'animate-spin')} />
          {t('detail.failed.retry')}
        </Button>
      </div>
    </div>
  );
}

/* ---- Feature-gated ATS section (unchanged behaviour) ---- */
function AtsAnalysisSection({ applicationId }: { applicationId: string }) {
  const t = useTranslations('applications');
  const { hasAccess, isLoading } = useFeatureGate('atsOptimization');
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!hasAccess) {
    return (
      <UpgradePrompt
        feature={t('detail.ats.title')}
        requiredTier="PREMIUM"
        description={t('detail.ats.upgradeDescription')}
      />
    );
  }
  return <ATSAnalysisPanel applicationId={applicationId} />;
}
