'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useApplications, useDeleteApplication } from '@/hooks/use-applications';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ATSScoreCell } from '@/components/applications/ats-score-cell';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusChip, TRACKING_STATUS_CHIP } from '@/components/ui/status-chip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  FileText,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  Send,
  Users,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Calendar,
  MapPin,
  Building2,
  Search,
  Loader2,
  LayoutGrid,
  List,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Application, ApplicationGenerationStatus, ApplicationTrackingStatus } from '@/types';
import { APPLICATION_ID_DISPLAY_LENGTH } from '@/lib/constants';
import { formatDateSmart, formatTooltipTimestamp } from '@/lib/format-date';
import { getIntlLocale } from '@/lib/i18n-runtime';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Constants & Types
// ============================================================================

const ITEMS_PER_PAGE = 10;

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'company-asc';
type ViewMode = 'table' | 'cards';

// Tab configuration for application tracking status
const TRACKING_STATUS_TABS: {
  value: ApplicationTrackingStatus | 'all';
  labelKey: string;
  icon: typeof Briefcase;
}[] = [
    { value: 'all', labelKey: 'status.all', icon: Briefcase },
    { value: 'CREATED', labelKey: 'status.draft', icon: FileText },
    { value: 'APPLIED', labelKey: 'status.applied', icon: Send },
    { value: 'INTERVIEW', labelKey: 'status.interview', icon: Users },
    { value: 'ACCEPTED', labelKey: 'status.accepted', icon: ThumbsUp },
    { value: 'REJECTED', labelKey: 'status.rejected', icon: ThumbsDown },
  ];

// Sort options for the applications list.
const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'newest', labelKey: 'list.sort.newest' },
  { value: 'oldest', labelKey: 'list.sort.oldest' },
  { value: 'title-asc', labelKey: 'list.sort.titleAsc' },
  { value: 'company-asc', labelKey: 'list.sort.companyAsc' },
];

// Status options offered in the bulk action bar.
const BULK_STATUS_OPTIONS: { value: ApplicationTrackingStatus; labelKey: string }[] = [
  { value: 'CREATED', labelKey: 'status.draft' },
  { value: 'APPLIED', labelKey: 'status.applied' },
  { value: 'INTERVIEW', labelKey: 'status.interview' },
  { value: 'ACCEPTED', labelKey: 'status.accepted' },
  { value: 'REJECTED', labelKey: 'status.rejected' },
];

// ============================================================================
// Helper Functions
// ============================================================================


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
        return titleA.localeCompare(titleB, getIntlLocale());
      case 'company-asc':
        const companyA = (a.jobPosting?.company || '').toLowerCase();
        const companyB = (b.jobPosting?.company || '').toLowerCase();
        return companyA.localeCompare(companyB, getIntlLocale());
      default:
        return 0;
    }
  });
}

// Build a compact page list with ellipsis, e.g. [1, '…', 4, 5, 6, '…', 12].
function getPageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}

// ============================================================================
// Component
// ============================================================================

export default function ApplicationsPage() {
  const t = useTranslations('applications');
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

  // View mode (table | cards) — persisted in URL.
  const initialView = (searchParams.get('view') as ViewMode) === 'cards' ? 'cards' : 'table';
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // Bulk selection state.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Search state with debouncing
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay for search
  
  // Debounced filter states (150ms for discrete changes)
  const debouncedTab = useDebounce(selectedTab, 150);
  const debouncedSort = useDebounce(sortBy, 150);

  // Track previous application statuses to detect changes
  const prevStatusesRef = useRef<Map<string, ApplicationGenerationStatus>>(new Map());

  // Delete application mutation
  const deleteApplication = useDeleteApplication();
  const queryClient = useQueryClient();

  const trackingStatusTabs = useMemo(
    () => TRACKING_STATUS_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) })),
    [t],
  );
  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) })),
    [t],
  );
  const bulkStatusOptions = useMemo(
    () => BULK_STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) })),
    [t],
  );

  // Fetch applications
  const { data: applications, isLoading, refetch } = useApplications();

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTab !== 'all') params.set('status', selectedTab);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (viewMode !== 'table') params.set('view', viewMode);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Use replaceState to avoid adding to history on every filter change
    window.history.replaceState(null, '', newUrl);
  }, [selectedTab, sortBy, viewMode, currentPage, pathname]);

  // Detect status changes and show toast notifications
  useEffect(() => {
    if (!applications) return;

    applications.forEach((app) => {
      const prevStatus = prevStatusesRef.current.get(app.id);

      // Only show toast if status actually changed
      if (prevStatus && prevStatus !== app.status) {
        const jobTitle = app.jobPosting?.title || t('list.fallbackTitle');

        if (app.status === 'READY') {
          toast.success(t('list.toasts.readyTitle'), {
            description: t('list.toasts.readyDescription', { title: jobTitle }),
            duration: 5000,
          });
        } else if (app.status === 'FAILED') {
          toast.error(t('list.toasts.failedTitle'), {
            description: t('list.toasts.failedDescription', { title: jobTitle }),
            duration: 6000,
          });
        } else if (app.status === 'GENERATING') {
          toast.info(t('list.toasts.generatingTitle'), {
            description: t('list.toasts.generatingDescription', { title: jobTitle }),
            duration: 4000,
          });
        }
      }

      // Update tracking
      prevStatusesRef.current.set(app.id, app.status);
    });
  }, [applications, t]);

  // Filter applications by tracking status and search term
  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    
    let filtered = applications;
    
    // Filter by status tab using debounced value
    if (debouncedTab !== 'all') {
      filtered = filtered.filter((app) => app.applicationStatus === debouncedTab);
    }
    
    // Filter by search term using debounced value
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((app) => {
        const title = (app.title || app.jobPosting?.title || '').toLowerCase();
        const company = (app.jobPosting?.company || '').toLowerCase();
        const location = (app.jobPosting?.location || '').toLowerCase();
        const notes = (app.notes || '').toLowerCase();
        
        return (
          title.includes(searchLower) ||
          company.includes(searchLower) ||
          location.includes(searchLower) ||
          notes.includes(searchLower)
        );
      });
    }
    
    return filtered;
  }, [applications, debouncedTab, debouncedSearchTerm]);

  // Sort filtered applications using debounced sort value
  const sortedApplications = useMemo(() => {
    return sortApplications(filteredApplications, debouncedSort);
  }, [filteredApplications, debouncedSort]);

  // Pagination
  const totalPages = Math.ceil(sortedApplications.length / ITEMS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedApplications, currentPage]);

  // Reset to page 1 when filter, sort, or search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [debouncedTab, debouncedSort, debouncedSearchTerm]);

  // IDs visible on the current page (used for select-all logic).
  const pageIds = useMemo(
    () => paginatedApplications.map((app) => app.id),
    [paginatedApplications]
  );
  const selectedCount = selectedIds.size;
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  // Count applications by tracking status
  const statusCounts = useMemo(() => ({
    all: applications?.length || 0,
    CREATED: applications?.filter((app) => app.applicationStatus === 'CREATED').length || 0,
    APPLIED: applications?.filter((app) => app.applicationStatus === 'APPLIED').length || 0,
    INTERVIEW: applications?.filter((app) => app.applicationStatus === 'INTERVIEW').length || 0,
    ACCEPTED: applications?.filter((app) => app.applicationStatus === 'ACCEPTED').length || 0,
    REJECTED: applications?.filter((app) => app.applicationStatus === 'REJECTED').length || 0,
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
    toast.success(t('list.toasts.deleted'));
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setApplicationToDelete(null);
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const everySelected = pageIds.every((id) => next.has(id));
      if (everySelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk delete the currently selected applications.
  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkProcessing(true);
    const results = await Promise.allSettled(
      ids.map((id) => deleteApplication.mutateAsync(id))
    );
    setIsBulkProcessing(false);

    const failed = results.filter((r) => r.status === 'rejected').length;
    const succeeded = ids.length - failed;

    setBulkDeleteOpen(false);
    clearSelection();

    if (failed === 0) {
      toast.success(t('list.toasts.bulkDeleteSuccess', { count: succeeded }));
    } else {
      toast.error(t('list.toasts.bulkDeletePartial', { succeeded, failed }));
    }
  };

  // Bulk update the tracking status of the selected applications.
  const handleBulkStatusChange = async (newStatus: ApplicationTrackingStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkProcessing(true);
    const results = await Promise.allSettled(
      ids.map((id) => api.applications.updateStatus(id, newStatus))
    );
    setIsBulkProcessing(false);

    await queryClient.invalidateQueries({ queryKey: ['applications'] });

    const failed = results.filter((r) => r.status === 'rejected').length;
    const succeeded = ids.length - failed;
    clearSelection();

    if (failed === 0) {
      toast.success(t('list.toasts.bulkStatusSuccess', { count: succeeded }));
    } else {
      toast.error(t('list.toasts.bulkStatusPartial', { succeeded, failed }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-[26px] font-extrabold tracking-[-.025em] text-foreground md:text-[30px]">
            {t('list.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('list.description')}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 rounded-[3px]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('list.refresh')}
          </Button>
          <Button
            onClick={() => router.push('/applications/new')}
            className="h-10 rounded-[3px]"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('list.newApplication')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
          <ApplicationCardSkeleton />
        </div>
      ) : applications && applications.length > 0 ? (
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('list.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('list.clearSearch')}
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
            {/* Show loading indicator while debouncing */}
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Status filter — boxed segmented control with mono counts */}
          <div className="inline-flex flex-wrap items-center gap-px overflow-hidden rounded-[4px] border border-border bg-border">
            {trackingStatusTabs.map((tab) => {
              const isActive = selectedTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[11px] font-medium ${
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
                    }`}
                  >
                    {statusCounts[tab.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controls: Sort & view toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="hidden whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-muted-foreground sm:inline-block">
                {t('list.sort.label')}
              </span>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background">
                  <SelectValue placeholder={t('list.sort.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View toggle (table | cards) — desktop only */}
            <div className="hidden items-center gap-px overflow-hidden rounded-[4px] border border-border bg-border md:inline-flex">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-pressed={viewMode === 'table'}
                aria-label={t('list.tableView')}
              >
                <List className="h-4 w-4" />
                {t('list.tableViewShort')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-pressed={viewMode === 'cards'}
                aria-label={t('list.cardView')}
              >
                <LayoutGrid className="h-4 w-4" />
                {t('list.cardViewShort')}
              </button>
            </div>
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              {selectedTab !== 'all'
                ? t('list.resultsWithStatus', {
                    count: filteredApplications.length,
                    status: trackingStatusTabs.find((tab) => tab.value === selectedTab)?.label ?? t('status.draft'),
                  })
                : t('list.results', { count: filteredApplications.length })}
            </span>
            {totalPages > 1 && (
              <span>
                {t('list.pageInfo', { current: currentPage, total: totalPages })}
              </span>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-[4px] border border-primary/40 bg-primary-soft/80 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {t('list.selectedCount', { count: selectedCount })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  {t('list.clearSelection')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) => handleBulkStatusChange(value as ApplicationTrackingStatus)}
                  disabled={isBulkProcessing}
                >
                  <SelectTrigger className="h-9 w-[190px] bg-background">
                    <SelectValue placeholder={t('list.setStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {bulkStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={isBulkProcessing}
                  className="h-9"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t('list.delete')}
                </Button>
              </div>
            </div>
          )}

          {/* Application List — card view (mobile always; desktop when viewMode=cards) */}
          {paginatedApplications.length > 0 && (
            <div
              className={
                viewMode === 'cards'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'space-y-3 md:hidden'
              }
            >
              {paginatedApplications.map((application) => {
                const jobTitle =
                  application.title ||
                  application.jobPosting?.title ||
                  t('list.numberedFallbackTitle', { id: application.id.substring(0, APPLICATION_ID_DISPLAY_LENGTH) });
                const company = application.jobPosting?.company;
                const location = application.jobPosting?.location;
                const timeAgo = formatDateSmart(application.createdAt);
                const isSelected = selectedIds.has(application.id);
                const cardChip = TRACKING_STATUS_CHIP[application.applicationStatus] ?? TRACKING_STATUS_CHIP.CREATED;
                const cardTrackLabel = trackingStatusTabs.find((tab) => tab.value === application.applicationStatus)?.label || t('status.draft');

                return (
                  <div
                    key={application.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/applications/${application.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/applications/${application.id}`);
                      }
                    }}
                    className={`w-full text-left rounded-[4px] border bg-card p-4 transition-colors active:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                      isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(application.id)}
                            aria-label={t('list.selectApplication')}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground line-clamp-2 break-words">
                            {jobTitle}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {company && (
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{company}</span>
                              </span>
                            )}
                            {location && (
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('list.actions')}
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/applications/${application.id}`)}>
                              {t('list.showDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/applications/${application.id}/edit`)}>
                              {t('list.edit')}
                            </DropdownMenuItem>
                            {application.status === 'READY' && application.coverLetterUrl && (
                              <DropdownMenuItem onClick={() => window.open(application.coverLetterUrl, '_blank')}>
                                {t('list.openCoverLetter')}
                              </DropdownMenuItem>
                            )}
                            {application.status === 'READY' && application.resumeUrl && (
                              <DropdownMenuItem onClick={() => window.open(application.resumeUrl, '_blank')}>
                                {t('list.openResume')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(application.id, jobTitle)}
                            >
                              {t('list.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusChip tone={cardChip.tone}>{cardTrackLabel}</StatusChip>
                      {application.status === 'GENERATING' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                      )}
                      {application.status === 'FAILED' && (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {timeAgo}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-border/60 pt-3" onClick={(e) => e.stopPropagation()}>
                      <ATSScoreCell applicationId={application.id} status={application.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Application List — desktop table (md+, viewMode=table) */}
          {paginatedApplications.length > 0 && viewMode === 'table' && (
            <div className="hidden md:block overflow-hidden rounded-[4px] border bg-card">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="[&_th]:font-mono [&_th]:text-[10.5px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[.12em] [&_th]:text-muted-foreground/70">
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAllOnPage}
                        aria-label={t('list.selectAllPage')}
                      />
                    </TableHead>
                    <TableHead className="w-[32%]">{t('list.table.jobAndCompany')}</TableHead>
                    <TableHead className="w-[14%]">{t('list.table.status')}</TableHead>
                    <TableHead className="w-[11%] text-center">ATS Score</TableHead>
                    <TableHead className="w-[14%]">{t('list.table.created')}</TableHead>
                    <TableHead className="w-[16%] text-right">{t('list.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApplications.map((application) => {
                    const jobTitle = application.title || application.jobPosting?.title || t('list.numberedFallbackTitle', { id: application.id.substring(0, APPLICATION_ID_DISPLAY_LENGTH) });
                    const company = application.jobPosting?.company;
                    const location = application.jobPosting?.location;
                    const timeAgo = formatDateSmart(application.createdAt);
                    const fullTimestamp = formatTooltipTimestamp(application.createdAt);
                    const isSelected = selectedIds.has(application.id);

                    return (
                      <TableRow
                        key={application.id}
                        data-state={isSelected ? 'selected' : undefined}
                        className="group hover:bg-muted/30 data-[state=selected]:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => router.push(`/applications/${application.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(application.id)}
                            aria-label={t('list.selectApplication')}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground line-clamp-1" title={jobTitle}>
                              {jobTitle}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {company && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[150px]">{company}</span>
                                </div>
                              )}
                              {location && (
                                <div className="flex items-center gap-1 hidden sm:flex">
                                  <span className="text-border">•</span>
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[150px]">{location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const tChip = TRACKING_STATUS_CHIP[application.applicationStatus] ?? TRACKING_STATUS_CHIP.CREATED;
                            const tLabel = trackingStatusTabs.find((tab) => tab.value === application.applicationStatus)?.label || t('status.draft');
                            return (
                              <div className="flex items-center gap-2">
                                <StatusChip tone={tChip.tone}>{tLabel}</StatusChip>
                                {application.status === 'GENERATING' && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                                )}
                                {application.status === 'FAILED' && (
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <ATSScoreCell applicationId={application.id} status={application.status} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-[13.5px] font-semibold text-foreground/80">{timeAgo}</div>
                            <div className="text-xs text-muted-foreground/60 mt-0.5">{fullTimestamp}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-3"
                              onClick={() => router.push(`/applications/${application.id}`)}
                            >
                              <ExternalLink className="mr-1 h-3 w-3" />
                              {t('list.open')}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/applications/${application.id}/edit`)}>
                                  {t('list.edit')}
                                </DropdownMenuItem>
                                {application.status === 'READY' && application.coverLetterUrl && (
                                  <DropdownMenuItem onClick={() => window.open(application.coverLetterUrl, '_blank')}>
                                    {t('list.openCoverLetter')}
                                  </DropdownMenuItem>
                                )}
                                {application.status === 'READY' && application.resumeUrl && (
                                  <DropdownMenuItem onClick={() => window.open(application.resumeUrl, '_blank')}>
                                    {t('list.openResume')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(application.id, jobTitle)}
                                >
                                  {t('list.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty state */}
          {paginatedApplications.length === 0 && (
            <div className="rounded-[4px] border border-dashed border-border bg-muted/10 animate-in fade-in duration-500">
              <EmptyState
                icon={FileText}
                title={t('list.emptyFilteredTitle')}
                description={t('list.emptyFilteredDescription', {
                  status: trackingStatusTabs.find((tab) => tab.value === selectedTab)?.label ?? t('status.draft'),
                })}
                action={
                  selectedTab !== 'all'
                    ? {
                        label: t('list.showAll'),
                        onClick: () => setSelectedTab('all'),
                      }
                    : {
                        label: t('list.createFirst'),
                        onClick: () => router.push('/applications/new'),
                      }
                }
              />
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 pt-8 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, sortedApplications.length)}
                </span>{' '}
                {t('list.paginationOf', { total: sortedApplications.length })}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  aria-label={t('list.firstPage')}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  aria-label={t('list.previousPage')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageItems(currentPage, totalPages).map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1.5 text-sm text-muted-foreground select-none"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === currentPage ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-8 w-8 p-0 ${item === currentPage ? 'pointer-events-none' : ''}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  aria-label={t('list.nextPage')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  aria-label={t('list.lastPage')}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-[4px] border border-dashed border-border bg-muted/10 animate-in fade-in duration-500">
          <div className="mb-6 grid h-20 w-20 place-items-center rounded-[4px] border border-border bg-muted">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">{t('list.emptyTitle')}</h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            {t('list.emptyDescription')}
          </p>
          <Button size="lg" onClick={() => router.push('/applications/new')}>
            <Plus className="mr-2 h-5 w-5" />
            {t('list.createFirst')}
          </Button>
        </div>
      )
      }

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('list.deleteDialog.description', {
                title: applicationToDelete?.title ?? '',
                titleText: (chunks) => <span className="font-medium text-foreground">&quot;{chunks}&quot;</span>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleteApplication.isPending}
            >
              {t('list.cancel')}
            </Button>
            <SubmitButton
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={deleteApplication.isPending}
              loadingText={t('list.deleting')}
            >
              {t('list.delete')}
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.bulkDeleteDialog.title', { count: selectedCount })}</DialogTitle>
            <DialogDescription>
              {t.rich('list.bulkDeleteDialog.description', {
                count: selectedCount,
                countText: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={isBulkProcessing}
            >
              {t('list.cancel')}
            </Button>
            <SubmitButton
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              isLoading={isBulkProcessing}
              loadingText={t('list.deleting')}
            >
              {t('list.delete')}
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
