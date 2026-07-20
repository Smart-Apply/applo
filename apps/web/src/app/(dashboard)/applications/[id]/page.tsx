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
        <div className="bg-white rounded-lg p-8">
          <CenteredLoader message={LOADING_MESSAGES.PDF_PREVIEW} />
        </div>
      </div>
    ),
    ssr: false,
  },
);

type ApplicationStatus = ApplicationGenerationStatus;

/* Linear tracking path shown in the status tracker (REJECTED handled inline). */
const TRACK_STEPS: { key: ApplicationTrackingStatus; label: string }[] = [
  { key: 'CREATED', label: 'Erstellt' },
  { key: 'APPLIED', label: 'Beworben' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'ACCEPTED', label: 'Angenommen' },
];

export default function ApplicationDetailPage() {
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
      const jobTitle = application.jobPosting?.title || 'Bewerbung';
      if (currentStatus === 'READY') {
        toast.success('Bewerbung fertig! 🎉', {
          description: `${jobTitle} ist bereit zum Download.`,
          duration: 5000,
        });
      } else if (currentStatus === 'FAILED') {
        toast.error('Generierung fehlgeschlagen', {
          description: `${jobTitle} konnte nicht erstellt werden.`,
          duration: 6000,
        });
      } else if (currentStatus === 'GENERATING') {
        toast.info('Generierung gestartet', {
          description: `${jobTitle} wird jetzt erstellt...`,
          duration: 4000,
        });
      }
    }
    prevStatusRef.current = currentStatus;
  }, [application]);

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
      toast.success('Als „Beworben“ markiert', { description: 'Viel Erfolg! 🤞' });
    },
    onError: (err: Error) => toast.error(`Fehler beim Aktualisieren: ${err.message}`),
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
      toast.error('Fehler beim Laden der Vorschau');
    }
  };

  if (isLoading) {
    return <CenteredLoader message="Lädt Bewerbung..." />;
  }

  if (error || !application) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <BackLink onClick={() => router.push('/applications')} />
        <Card className="rounded-[18px]">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1B2A49] mb-2">Bewerbung nicht gefunden</h3>
              <p className="text-muted-foreground mb-6">
                Die angeforderte Bewerbung existiert nicht oder du hast keine Berechtigung.
              </p>
              <Button onClick={() => router.push('/applications')}>Zu Bewerbungen</Button>
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
              <span
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                title="Status wurde durch automatisches E-Mail-Tracking aktualisiert"
              >
                📧 Auto-Tracking
              </span>
            )}
          </div>
        ) : (
          <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-500">
            Kein Status (bitte Seite neu laden)
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
                        toast.error('Ungültige URL der Stellenanzeige');
                        return;
                      }
                      window.open(url.toString(), '_blank', 'noopener,noreferrer');
                    } catch {
                      toast.error('Ungültige URL der Stellenanzeige');
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
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-[#1B2A49]"
    >
      <ArrowLeft className="h-4 w-4" />
      Zurück zu Bewerbungen
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
  return (
    <div
      className="relative grid grid-cols-[auto_1fr] items-center gap-5 overflow-hidden rounded-[20px] border p-6 sm:gap-7 sm:p-8"
      style={{
        borderColor: '#CBEBD6',
        background:
          'radial-gradient(120% 140% at 12% -10%, rgba(85,129,199,.10), rgba(85,129,199,0) 55%), linear-gradient(180deg,#E7F6EC,#F3FBF6 70%)',
      }}
    >
      <div
        className="hidden self-end sm:block"
        style={{ filter: 'drop-shadow(0 12px 18px rgba(20,33,61,.10))', marginBottom: -6 }}
      >
        <ApploRig state="success" size={132} aria-hidden />
      </div>
      <div className="block sm:hidden" style={{ marginBottom: -4 }}>
        <ApploRig state="success" size={84} aria-hidden />
      </div>
      <div>
        <p
          className="mb-2 text-xs font-bold uppercase tracking-[0.1em]"
          style={{ color: '#15803D' }}
        >
          Bereit zum Absenden
        </p>
        <h2 className="font-poppins text-[24px] font-bold leading-tight tracking-tight text-[#1B2A49] sm:text-[26px]">
          {firstName ? `Geschafft, ${firstName}!` : 'Geschafft!'} 🎉
        </h2>
        <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
          Dein <b className="font-semibold text-[#1B2A49]">Anschreiben</b> und dein{' '}
          <b className="font-semibold text-[#1B2A49]">Lebenslauf</b> sind fertig — lade sie herunter
          und bewirb dich
          {company ? ` bei ${company}` : ''}.
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
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          Bewerbungsunterlagen
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
                Beide als ZIP
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              {files?.coverLetter ? 'Bearbeiten' : 'Lebenslauf bearbeiten'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {files?.coverLetter ? (
          <DocCard
            name="Anschreiben"
            onPreview={() => onPreview('cover-letter', 'Anschreiben')}
            onDownload={onDownloadCoverLetter}
            downloading={isDownloading.coverLetter}
          />
        ) : (
          <DocCardEmpty
            name="Anschreiben"
            note="Bei dieser Bewerbung wurde kein Anschreiben generiert"
          />
        )}

        {files?.resume && (
          <DocCard
            name="Lebenslauf"
            onPreview={() => onPreview('resume', 'Lebenslauf')}
            onDownload={onDownloadResume}
            downloading={isDownloading.resume}
          />
        )}
      </div>

      {(files?.coverLetter || files?.resume) && (
        <p className="mt-3.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Download-Links sind aus Sicherheitsgründen begrenzt gültig
          {files?.coverLetter
            ? ` (bis ${formatDate(files.coverLetter.expiresAt, 'HH:mm')} Uhr)`
            : files?.resume
              ? ` (bis ${formatDate(files.resume.expiresAt, 'HH:mm')} Uhr)`
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
  return (
    <div className="flex flex-col rounded-[16px] border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center gap-3.5">
        <div
          className="relative grid h-[60px] w-[50px] shrink-0 place-items-center rounded-[9px]"
          style={{ backgroundColor: '#EAF1FE', border: '1px solid #D2E2FC', color: '#5581C7' }}
        >
          <FileText className="h-6 w-6" />
          <span
            className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 rounded px-1.5 text-[8px] font-semibold tracking-wide text-white"
            style={{ backgroundColor: '#5581C7', fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            PDF
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[16.5px] font-bold tracking-tight text-[#1B2A49]">{name}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">PDF-Dokument</p>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-[auto_1fr] gap-2.5">
        <Button variant="outline" onClick={onPreview} className="h-11">
          <Eye className="h-4 w-4" />
          Vorschau
        </Button>
        <Button onClick={onDownload} loading={downloading} className="h-11">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
}

function DocCardEmpty({ name, note }: { name: string; note: string }) {
  return (
    <div className="flex items-start gap-3.5 rounded-[16px] border border-dashed bg-muted/40 p-5">
      <div className="grid h-[60px] w-[50px] shrink-0 place-items-center rounded-[9px] bg-muted text-muted-foreground">
        <FileText className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[16.5px] font-bold tracking-tight text-muted-foreground">{name}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground/80">Nicht vorhanden</p>
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
  if (applied) {
    return (
      <div
        className="relative grid grid-cols-[46px_1fr] gap-4 overflow-hidden rounded-[18px] border p-5 sm:p-6"
        style={{ backgroundColor: '#E7F6EC', borderColor: '#CBEBD6' }}
      >
        <span
          className="grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-white"
          style={{ color: '#16A34A' }}
        >
          <CheckCircle className="h-5 w-5" />
        </span>
        <div>
          <p
            className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em]"
            style={{ color: '#16A34A' }}
          >
            Beworben ✓
          </p>
          <h3
            className="font-poppins text-[19px] font-bold tracking-tight"
            style={{ color: '#15803D' }}
          >
            Stark — Bewerbung eingereicht!
          </h3>
          <p
            className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-pretty"
            style={{ color: '#3D7A55' }}
          >
            Viel Erfolg{company ? ` bei ${company}` : ''}. Bereite dich jetzt gezielt mit dem
            Interview-Coach auf das Gespräch vor.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button onClick={onInterviewCoach}>
              <MessagesSquare className="h-4 w-4" />
              Zum Interview-Coach
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative grid grid-cols-[46px_1fr] gap-4 overflow-hidden rounded-[18px] p-5 text-white sm:p-6"
      style={{ backgroundColor: '#1B2A49' }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
        style={{ background: 'rgba(85,129,199,.18)' }}
      />
      <span
        className="relative grid h-[46px] w-[46px] place-items-center rounded-[13px]"
        style={{ background: 'rgba(255,255,255,.12)' }}
      >
        <Send className="h-5 w-5" />
      </span>
      <div className="relative">
        <p
          className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em]"
          style={{ color: '#9DB6E8' }}
        >
          Nächster Schritt
        </p>
        <h3 className="font-poppins text-[19px] font-bold tracking-tight">
          {company ? `Bei ${company} bewerben` : 'Jetzt bewerben'}
        </h3>
        <p
          className="mt-1.5 max-w-[54ch] text-[14px] leading-relaxed text-pretty"
          style={{ color: '#C7D0E4' }}
        >
          Reiche deine Unterlagen auf der Karriereseite ein — und markiere die Bewerbung danach als
          &quot;Beworben&quot;, damit Applo den Status für dich verfolgt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            onClick={onMarkApplied}
            loading={applying}
            className="bg-white text-[#1B2A49] hover:bg-gray-100"
          >
            <Check className="h-4 w-4" />
            Als beworben markieren
          </Button>
          {onOpenJobUrl && (
            <Button
              variant="outline"
              onClick={onOpenJobUrl}
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Zur Stellenanzeige
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Status tracker ---- */
function StatusTracker({ status }: { status: ApplicationTrackingStatus }) {
  const rejected = status === 'REJECTED';
  let curIdx = TRACK_STEPS.findIndex((s) => s.key === status);
  if (curIdx < 0) curIdx = rejected ? 1 : 0;

  return (
    <div className="flex items-center rounded-[16px] border bg-card px-5 py-4 shadow-sm">
      {TRACK_STEPS.map((s, i) => {
        const done = i < curIdx;
        const current = i === curIdx && !rejected;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={cn(
                  'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-all',
                  done && 'border-transparent text-white',
                  current && 'text-white',
                  !done && !current && 'border-border bg-card text-muted-foreground',
                )}
                style={{
                  backgroundColor: done ? '#16A34A' : current ? '#5581C7' : undefined,
                  borderColor: done ? '#16A34A' : current ? '#5581C7' : undefined,
                  boxShadow: current ? '0 0 0 4px #EAF1FE' : undefined,
                }}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[13.5px] font-semibold',
                  done && 'text-[#1B2A49]',
                  !done && !current && 'text-muted-foreground',
                )}
                style={{ color: current ? '#5581C7' : undefined }}
              >
                {s.label}
              </span>
            </div>
            {i < TRACK_STEPS.length - 1 && (
              <span className="mx-3 h-0.5 min-w-[18px] flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{ width: done ? '100%' : '0%', backgroundColor: '#16A34A' }}
                />
              </span>
            )}
          </div>
        );
      })}
      {rejected && (
        <span
          className="ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold"
          style={{ backgroundColor: '#FCEBEB', color: '#B42222' }}
        >
          Abgelehnt
        </span>
      )}
    </div>
  );
}

/* ---- ATS disclosure (collapsed by default) ---- */
function AtsDisclosure({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[16px] border bg-card shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
          style={{ backgroundColor: '#EAF1FE', color: '#5581C7' }}
        >
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#1B2A49]">ATS-Analyse</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Wie gut deine Unterlagen zur Stelle passen — Keywords &amp; Optimierungen.
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
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[16px] border bg-card shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
          style={{ backgroundColor: '#E5E9F2', color: '#1B2A49' }}
        >
          <Briefcase className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#1B2A49]">Stellenanzeige</p>
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
                <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
                  Beschreibung
                </h4>
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground text-pretty">
                  {jobPosting.description}
                </p>
              </div>
            )}
            {jobPosting.requirements && jobPosting.requirements.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
                  Anforderungen
                </h4>
                <ul className="space-y-2">
                  {jobPosting.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-[14px] leading-snug text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#5581C7' }} />
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
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1.5 pt-1.5 text-[12.5px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        Erstellt <b className="font-semibold text-[#5C6373]">{formatFullTimestamp(createdAt)}</b>
      </span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <span className="flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Aktualisiert{' '}
        <b className="font-semibold text-[#5C6373]">{formatFullTimestamp(updatedAt)}</b>
      </span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <span className="flex items-center gap-1.5">
        <Hash className="h-3.5 w-3.5" />
        <code
          className="rounded border bg-card px-1.5 py-0.5 text-[11.5px]"
          style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}
        >
          {id}
        </code>
      </span>
    </div>
  );
}

/* ---- GENERATING ---- */
function GeneratingView({ progress, message }: { progress: number; message: string }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border bg-card px-6 py-9 text-center shadow-sm">
      <ApploRig state="process" size={140} aria-hidden />
      <h2 className="mt-2 font-poppins text-[23px] font-bold tracking-tight text-[#1B2A49]">
        Deine Bewerbung wird erstellt …
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
        Die KI schreibt dein Anschreiben und deinen Lebenslauf und passt alles an die Stelle an. Das
        dauert meist unter einer Minute.
      </p>
      <div className="mt-6 w-full max-w-[440px]">
        <Progress value={progress} className="h-2.5" />
        <div className="mt-3 flex items-center justify-between text-[13.5px]">
          <span className="font-semibold text-[#1B2A49]">{message || 'Wird vorbereitet …'}</span>
          {progress > 0 && (
            <span className="font-semibold tabular-nums text-muted-foreground">{progress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- PENDING ---- */
function PendingView({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border bg-card px-6 py-9 text-center shadow-sm">
      <ApploRig state="wave" size={140} aria-hidden />
      <h2 className="mt-2 font-poppins text-[23px] font-bold tracking-tight text-[#1B2A49]">
        Deine Bewerbung ist angelegt
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
        Wirf einen Blick auf Lebenslauf und Anschreiben, passe sie bei Bedarf an — und starte dann
        den Export.
      </p>
      <Button size="lg" className="mt-6" onClick={onStart}>
        Unterlagen anpassen &amp; Export starten
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
  return (
    <div className="flex flex-col items-center rounded-[20px] border bg-card px-6 py-9 text-center shadow-sm">
      <span
        className="mb-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold"
        style={{ backgroundColor: '#FCEBEB', color: '#B42222' }}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Fehlgeschlagen
      </span>
      <ApploRig state="idle" size={128} aria-hidden />
      <h2 className="mt-2 font-poppins text-[23px] font-bold tracking-tight text-[#1B2A49]">
        Da ist leider etwas schiefgelaufen
      </h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground text-pretty">
        Bei der Erstellung deiner Unterlagen ist ein Fehler aufgetreten. Versuch es noch einmal —
        meist klappt es beim zweiten Anlauf.
      </p>
      {errorMessage && (
        <p
          className="mx-auto mt-4 max-w-[480px] rounded-[11px] px-4 py-3 text-left text-[12.5px] leading-relaxed"
          style={{
            backgroundColor: '#FCEBEB',
            border: '1px solid #F3CFCF',
            color: '#B42222',
            fontFamily: 'var(--font-geist-mono, monospace)',
          }}
        >
          {errorMessage}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Button onClick={onRetry} loading={retrying}>
          <RefreshCw className={cn('h-4 w-4', retrying && 'animate-spin')} />
          Erneut versuchen
        </Button>
      </div>
    </div>
  );
}

/* ---- Feature-gated ATS section (unchanged behaviour) ---- */
function AtsAnalysisSection({ applicationId }: { applicationId: string }) {
  const { hasAccess, isLoading } = useFeatureGate('atsOptimization');
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!hasAccess) {
    return (
      <UpgradePrompt
        feature="ATS-Analyse"
        requiredTier="PREMIUM"
        description="Upgrade jetzt zu Premium um dieses Feature zu benutzen."
      />
    );
  }
  return <ATSAnalysisPanel applicationId={applicationId} />;
}
