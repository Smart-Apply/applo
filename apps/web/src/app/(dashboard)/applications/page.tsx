'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useApplications, useDeleteApplication } from '@/hooks/use-applications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApplicationCardSkeleton } from '@/components/shared/skeletons';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Briefcase,
  Send,
  Users,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Application, ApplicationGenerationStatus, ApplicationTrackingStatus } from '@/types';
import { StatusDropdown } from '@/components/applications/status-dropdown';
import { APPLICATION_ID_DISPLAY_LENGTH } from '@/lib/constants';

// ============================================================================
// Constants & Types
// ============================================================================

const ITEMS_PER_PAGE = 10;

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'company-asc';

// Tab configuration for application tracking status
const TRACKING_STATUS_TABS: {
  value: ApplicationTrackingStatus | 'all';
  label: string;
  icon: typeof Briefcase;
}[] = [
    { value: 'all', label: 'Alle', icon: Briefcase },
    { value: 'CREATED', label: 'Erstellt', icon: FileText },
    { value: 'APPLIED', label: 'Beworben', icon: Send },
    { value: 'INTERVIEW', label: 'Interview', icon: Users },
    { value: 'OFFER', label: 'Angebot', icon: CheckCircle },
    { value: 'ACCEPTED', label: 'Angenommen', icon: ThumbsUp },
    { value: 'REJECTED', label: 'Abgelehnt', icon: ThumbsDown },
    { value: 'WITHDRAWN', label: 'Zurückgezogen', icon: XCircle },
  ];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'oldest', label: 'Älteste zuerst' },
  { value: 'title-asc', label: 'Jobtitel A–Z' },
  { value: 'company-asc', label: 'Unternehmen A–Z' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getGenerationStatusInfo(status: ApplicationGenerationStatus) {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Ausstehend',
        icon: Clock,
        variant: 'secondary' as const,
        color: 'text-gray-600',
      };
    case 'GENERATING':
      return {
        label: 'Wird erstellt',
        icon: AlertCircle,
        variant: 'default' as const,
        color: 'text-blue-600',
      };
    case 'READY':
      return {
        label: 'PDF Fertig',
        icon: CheckCircle,
        variant: 'default' as const,
        color: 'text-green-600',
      };
    case 'FAILED':
      return {
        label: 'Fehlgeschlagen',
        icon: XCircle,
        variant: 'destructive' as const,
        color: 'text-red-600',
      };
    default:
      return {
        label: status,
        icon: AlertCircle,
        variant: 'secondary' as const,
        color: 'text-gray-600',
      };
  }
}

function sortApplications(applications: Application[], sortBy: SortOption): Application[] {
  return [...applications].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'title-asc':
        const titleA = (a.jobPosting?.title || a.title || '').toLowerCase();
        const titleB = (b.jobPosting?.title || b.title || '').toLowerCase();
        return titleA.localeCompare(titleB, 'de');
      case 'company-asc':
        const companyA = (a.jobPosting?.company || '').toLowerCase();
        const companyB = (b.jobPosting?.company || '').toLowerCase();
        return companyA.localeCompare(companyB, 'de');
      default:
        return 0;
    }
  });
}

// ============================================================================
// Component
// ============================================================================

export default function ApplicationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial values from URL query params
  const initialTab = (searchParams.get('status') as ApplicationTrackingStatus | 'all') || 'all';
  const initialSort = (searchParams.get('sort') as SortOption) || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [selectedTab, setSelectedTab] = useState<ApplicationTrackingStatus | 'all'>(initialTab);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<{ id: string; title: string } | null>(null);

  // Track previous application statuses to detect changes
  const prevStatusesRef = useRef<Map<string, ApplicationGenerationStatus>>(new Map());

  // Delete application mutation
  const deleteApplication = useDeleteApplication();

  // Fetch applications
  const { data: applications, isLoading, refetch } = useApplications();

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTab !== 'all') params.set('status', selectedTab);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Use replaceState to avoid adding to history on every filter change
    window.history.replaceState(null, '', newUrl);
  }, [selectedTab, sortBy, currentPage, pathname]);

  // Detect status changes and show toast notifications
  useEffect(() => {
    if (!applications) return;

    applications.forEach((app) => {
      const prevStatus = prevStatusesRef.current.get(app.id);

      // Only show toast if status actually changed
      if (prevStatus && prevStatus !== app.status) {
        const jobTitle = app.jobPosting?.title || 'Bewerbung';

        if (app.status === 'READY') {
          toast.success('Bewerbung fertig! 🎉', {
            description: `${jobTitle} ist bereit zum Download.`,
            duration: 5000,
          });
        } else if (app.status === 'FAILED') {
          toast.error('Generierung fehlgeschlagen', {
            description: `${jobTitle} konnte nicht erstellt werden.`,
            duration: 6000,
          });
        } else if (app.status === 'GENERATING') {
          toast.info('Generierung gestartet', {
            description: `${jobTitle} wird jetzt erstellt...`,
            duration: 4000,
          });
        }
      }

      // Update tracking
      prevStatusesRef.current.set(app.id, app.status);
    });
  }, [applications]);

  // Filter applications by tracking status
  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    if (selectedTab === 'all') return applications;
    return applications.filter((app) => app.applicationStatus === selectedTab);
  }, [applications, selectedTab]);

  // Sort filtered applications
  const sortedApplications = useMemo(() => {
    return sortApplications(filteredApplications, sortBy);
  }, [filteredApplications, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedApplications.length / ITEMS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedApplications, currentPage]);

  // Reset to page 1 when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, sortBy]);

  // Count applications by tracking status
  const statusCounts = useMemo(() => ({
    all: applications?.length || 0,
    CREATED: applications?.filter((app) => app.applicationStatus === 'CREATED').length || 0,
    APPLIED: applications?.filter((app) => app.applicationStatus === 'APPLIED').length || 0,
    INTERVIEW: applications?.filter((app) => app.applicationStatus === 'INTERVIEW').length || 0,
    OFFER: applications?.filter((app) => app.applicationStatus === 'OFFER').length || 0,
    ACCEPTED: applications?.filter((app) => app.applicationStatus === 'ACCEPTED').length || 0,
    REJECTED: applications?.filter((app) => app.applicationStatus === 'REJECTED').length || 0,
    WITHDRAWN: applications?.filter((app) => app.applicationStatus === 'WITHDRAWN').length || 0,
  }), [applications]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Tab change handler
  const handleTabChange = (value: string) => {
    setSelectedTab(value as ApplicationTrackingStatus | 'all');
  };

  // Sort change handler
  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption);
  };

  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Delete handlers
  const handleDeleteClick = (id: string, title: string) => {
    setApplicationToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!applicationToDelete) return;

    await deleteApplication.mutateAsync(applicationToDelete.id);
    setDeleteDialogOpen(false);
    setApplicationToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setApplicationToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bewerbungen</h1>
          <p className="mt-1 text-gray-500">
            Verwalte alle deine Bewerbungen an einem Ort
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={() => router.push('/applications/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Bewerbung
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
        </div>
      ) : applications && applications.length > 0 ? (
        <>
          {/* Tabs for Application Tracking Status */}
          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="h-auto flex-wrap">
                {TRACKING_STATUS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const count = statusCounts[tab.value];
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 px-3 py-1.5"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <Badge
                        variant={selectedTab === tab.value ? 'default' : 'secondary'}
                        className="ml-1 min-w-[1.5rem] justify-center"
                      >
                        {count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sortieren" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Tabs>

          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {filteredApplications.length} {filteredApplications.length === 1 ? 'Bewerbung' : 'Bewerbungen'}
              {selectedTab !== 'all' && ` mit Status "${TRACKING_STATUS_TABS.find(t => t.value === selectedTab)?.label}"`}
            </span>
            {totalPages > 1 && (
              <span>
                Seite {currentPage} von {totalPages}
              </span>
            )}
          </div>

          {/* Application Cards */}
          {paginatedApplications.length > 0 ? (
            <div className="grid gap-4">
              {paginatedApplications.map((application) => {
                const statusInfo = getGenerationStatusInfo(application.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            {application.title ||
                              application.jobPosting?.title ||
                              `Bewerbung #${application.id.substring(0, APPLICATION_ID_DISPLAY_LENGTH)}`}
                          </CardTitle>
                          <CardDescription className="mt-1 space-y-1">
                            <div>
                              {application.jobPosting?.company && (
                                <span className="font-medium">{application.jobPosting.company}</span>
                              )}
                              {application.jobPosting?.location && (
                                <span className="text-gray-500">
                                  {' • '}
                                  {application.jobPosting.location}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <StatusDropdown
                                applicationId={application.id}
                                currentStatus={application.applicationStatus}
                                variant="dropdown"
                              />
                            </div>
                          </CardDescription>
                        </div>
                        <Badge variant={statusInfo.variant} className="ml-4 shrink-0">
                          <StatusIcon
                            className={`mr-1 h-3 w-3 ${application.status === 'GENERATING' ? 'animate-spin' : ''}`}
                          />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Erstellt am{' '}
                          {new Date(application.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="flex gap-2">
                          {application.status === 'READY' && (
                            <>
                              {application.coverLetterUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(application.coverLetterUrl, '_blank')}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Anschreiben
                                </Button>
                              )}
                              {application.resumeUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(application.resumeUrl, '_blank')}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Lebenslauf
                                </Button>
                              )}
                            </>
                          )}
                          <Button size="sm" onClick={() => router.push(`/applications/${application.id}`)}>
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeleteClick(
                                application.id,
                                application.jobPosting?.title || `Bewerbung #${application.id}`
                              )
                            }
                            disabled={deleteApplication.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Bewerbungen gefunden
                  </h3>
                  <p className="text-gray-500">
                    Es gibt keine Bewerbungen mit dem Status &quot;
                    {TRACKING_STATUS_TABS.find((t) => t.value === selectedTab)?.label}&quot;
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Bewerbungen</h3>
              <p className="text-gray-500 mb-6">
                Erstelle deine erste Bewerbung mit KI-Unterstützung
              </p>
              <Button onClick={() => router.push('/applications/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Erste Bewerbung erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bewerbung löschen?</DialogTitle>
            <DialogDescription>
              Möchtest du die Bewerbung für &quot;{applicationToDelete?.title}&quot; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleteApplication.isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteApplication.isPending}
            >
              {deleteApplication.isPending ? 'Wird gelöscht...' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
