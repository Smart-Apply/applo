'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  label: string;
  icon: typeof Briefcase;
}[] = [
    { value: 'all', label: 'Alle', icon: Briefcase },
    { value: 'CREATED', label: 'Entwurf', icon: FileText },
    { value: 'APPLIED', label: 'Beworben', icon: Send },
    { value: 'INTERVIEW', label: 'Interview', icon: Users },
    { value: 'ACCEPTED', label: 'Angenommen', icon: ThumbsUp },
    { value: 'REJECTED', label: 'Abgelehnt', icon: ThumbsDown },
  ];

// Per-status accent colors for tabs, summary cards and indicators.
const TRACKING_STATUS_STYLE: Record<
  ApplicationTrackingStatus | 'all',
  { text: string; bg: string; ring: string; dot: string }
> = {
  all: { text: 'text-foreground', bg: 'bg-muted', ring: 'ring-border', dot: 'bg-foreground/60' },
  CREATED: { text: 'text-slate-600', bg: 'bg-slate-100', ring: 'ring-slate-200', dot: 'bg-slate-500' },
  APPLIED: { text: 'text-blue-600', bg: 'bg-blue-100', ring: 'ring-blue-200', dot: 'bg-blue-500' },
  INTERVIEW: { text: 'text-amber-600', bg: 'bg-amber-100', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  ACCEPTED: { text: 'text-green-600', bg: 'bg-green-100', ring: 'ring-green-200', dot: 'bg-green-500' },
  REJECTED: { text: 'text-red-600', bg: 'bg-red-100', ring: 'ring-red-200', dot: 'bg-red-500' },
};

// Sort options for the applications list.
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'oldest', label: 'Älteste zuerst' },
  { value: 'title-asc', label: 'Jobtitel A–Z' },
  { value: 'company-asc', label: 'Unternehmen A–Z' },
];

// Status options offered in the bulk action bar.
const BULK_STATUS_OPTIONS: { value: ApplicationTrackingStatus; label: string }[] = [
  { value: 'CREATED', label: '📋 Entwurf' },
  { value: 'APPLIED', label: '📝 Beworben' },
  { value: 'INTERVIEW', label: '🗓️ Interview' },
  { value: 'ACCEPTED', label: '✅ Angenommen' },
  { value: 'REJECTED', label: '❌ Abgelehnt' },
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
    toast.success('Bewerbung gelöscht');
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
      toast.success(`${succeeded} ${succeeded === 1 ? 'Bewerbung' : 'Bewerbungen'} gelöscht`);
    } else {
      toast.error(`${succeeded} gelöscht, ${failed} fehlgeschlagen`);
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
      toast.success(`Status für ${succeeded} ${succeeded === 1 ? 'Bewerbung' : 'Bewerbungen'} aktualisiert`);
    } else {
      toast.error(`${succeeded} aktualisiert, ${failed} fehlgeschlagen`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Bewerbungen
          </h1>
          <p className="mt-2 text-muted-foreground">
            Verwalte und verfolge den Status deiner Bewerbungen.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button
            onClick={() => router.push('/applications/new')}
            className="h-10 rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Neue Bewerbung
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
              placeholder="Bewerbungen durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Suche löschen"
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
          
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
            {TRACKING_STATUS_TABS.map((tab) => {
              const style = TRACKING_STATUS_STYLE[tab.value];
              const isActive = selectedTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-muted-foreground border border-border/60 hover:bg-muted/60 hover:text-foreground'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Controls: Sort & view toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                Sortieren nach:
              </span>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background">
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

            {/* View toggle (table | cards) — desktop only */}
            <div className="hidden md:inline-flex items-center rounded-lg border border-border/60 bg-card p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={viewMode === 'table'}
                aria-label="Tabellenansicht"
              >
                <List className="h-4 w-4" />
                Tabelle
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={viewMode === 'cards'}
                aria-label="Kartenansicht"
              >
                <LayoutGrid className="h-4 w-4" />
                Karten
              </button>
            </div>
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
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

          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 shadow-medium backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {selectedCount} ausgewählt
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Auswahl aufheben
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) => handleBulkStatusChange(value as ApplicationTrackingStatus)}
                  disabled={isBulkProcessing}
                >
                  <SelectTrigger className="h-9 w-[190px] bg-background">
                    <SelectValue placeholder="Status setzen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BULK_STATUS_OPTIONS.map((opt) => (
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
                  Löschen
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
                  `Bewerbung #${application.id.substring(0, APPLICATION_ID_DISPLAY_LENGTH)}`;
                const company = application.jobPosting?.company;
                const location = application.jobPosting?.location;
                const timeAgo = formatDateSmart(application.createdAt);
                const isSelected = selectedIds.has(application.id);
                const cardTrackStyle = TRACKING_STATUS_STYLE[application.applicationStatus] || TRACKING_STATUS_STYLE.CREATED;
                const cardTrackLabel = TRACKING_STATUS_TABS.find(t => t.value === application.applicationStatus)?.label || 'Entwurf';

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
                    className={`w-full text-left rounded-xl border bg-card p-4 shadow-sm transition-colors active:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                      isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(application.id)}
                            aria-label="Bewerbung auswählen"
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
                              aria-label="Aktionen"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/applications/${application.id}`)}>
                              Details anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/applications/${application.id}/edit`)}>
                              Bearbeiten
                            </DropdownMenuItem>
                            {application.status === 'READY' && application.coverLetterUrl && (
                              <DropdownMenuItem onClick={() => window.open(application.coverLetterUrl, '_blank')}>
                                Anschreiben öffnen
                              </DropdownMenuItem>
                            )}
                            {application.status === 'READY' && application.resumeUrl && (
                              <DropdownMenuItem onClick={() => window.open(application.resumeUrl, '_blank')}>
                                Lebenslauf öffnen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(application.id, jobTitle)}
                            >
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cardTrackStyle.bg} ${cardTrackStyle.text}`}>
                        <span className={`w-[7px] h-[7px] rounded-full ${cardTrackStyle.dot}`} />
                        {cardTrackLabel}
                      </span>
                      {application.status === 'GENERATING' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                      )}
                      {application.status === 'FAILED' && (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {timeAgo}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-border/40 pt-3" onClick={(e) => e.stopPropagation()}>
                      <ATSScoreCell applicationId={application.id} status={application.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Application List — desktop table (md+, viewMode=table) */}
          {paginatedApplications.length > 0 && viewMode === 'table' && (
            <div className="hidden md:block rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="[&_th]:text-[12.5px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.04em] [&_th]:text-muted-foreground">
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAllOnPage}
                        aria-label="Alle auf dieser Seite auswählen"
                      />
                    </TableHead>
                    <TableHead className="w-[32%]">Job & Unternehmen</TableHead>
                    <TableHead className="w-[14%]">Status</TableHead>
                    <TableHead className="w-[11%] text-center">ATS Score</TableHead>
                    <TableHead className="w-[14%]">Erstellt</TableHead>
                    <TableHead className="w-[16%] text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApplications.map((application) => {
                    const jobTitle = application.title || application.jobPosting?.title || `Bewerbung #${application.id.substring(0, APPLICATION_ID_DISPLAY_LENGTH)}`;
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
                            aria-label="Bewerbung auswählen"
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
                            const tStyle = TRACKING_STATUS_STYLE[application.applicationStatus] || TRACKING_STATUS_STYLE.CREATED;
                            const tLabel = TRACKING_STATUS_TABS.find(t => t.value === application.applicationStatus)?.label || 'Entwurf';
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${tStyle.bg} ${tStyle.text}`}>
                                  <span className={`w-[7px] h-[7px] rounded-full ${tStyle.dot}`} />
                                  {tLabel}
                                </span>
                                {application.status === 'GENERATING' && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
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
                              Öffnen
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/applications/${application.id}/edit`)}>
                                  Bearbeiten
                                </DropdownMenuItem>
                                {application.status === 'READY' && application.coverLetterUrl && (
                                  <DropdownMenuItem onClick={() => window.open(application.coverLetterUrl, '_blank')}>
                                    Anschreiben öffnen
                                  </DropdownMenuItem>
                                )}
                                {application.status === 'READY' && application.resumeUrl && (
                                  <DropdownMenuItem onClick={() => window.open(application.resumeUrl, '_blank')}>
                                    Lebenslauf öffnen
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(application.id, jobTitle)}
                                >
                                  Löschen
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
            <div className="rounded-2xl border border-dashed border-border bg-muted/10 animate-in fade-in zoom-in-95 duration-500">
              <EmptyState
                icon={FileText}
                title="Keine Bewerbungen gefunden"
                description={`Es gibt keine Bewerbungen mit dem Status "${TRACKING_STATUS_TABS.find((t) => t.value === selectedTab)?.label}".`}
                action={
                  selectedTab !== 'all'
                    ? {
                        label: 'Alle anzeigen',
                        onClick: () => setSelectedTab('all'),
                      }
                    : {
                        label: 'Erste Bewerbung erstellen',
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
                von {sortedApplications.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  aria-label="Erste Seite"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  aria-label="Vorherige Seite"
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
                  aria-label="Nächste Seite"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  aria-label="Letzte Seite"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-muted/10 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative h-20 w-20 rounded-full bg-background shadow-soft flex items-center justify-center border border-border/50">
              <FileText className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Noch keine Bewerbungen</h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            Erstelle deine erste Bewerbung mit KI-Unterstützung und behalte den Überblick über deinen Bewerbungsprozess.
          </p>
          <Button size="lg" onClick={() => router.push('/applications/new')} className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="mr-2 h-5 w-5" />
            Erste Bewerbung erstellen
          </Button>
        </div>
      )
      }

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bewerbung löschen?</DialogTitle>
            <DialogDescription>
              Möchtest du die Bewerbung für <span className="font-medium text-foreground">&quot;{applicationToDelete?.title}&quot;</span> wirklich löschen?
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
            <SubmitButton
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={deleteApplication.isPending}
              loadingText="Wird gelöscht..."
            >
              Löschen
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCount} Bewerbungen löschen?</DialogTitle>
            <DialogDescription>
              Möchtest du wirklich{' '}
              <span className="font-medium text-foreground">
                {selectedCount} {selectedCount === 1 ? 'Bewerbung' : 'Bewerbungen'}
              </span>{' '}
              löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={isBulkProcessing}
            >
              Abbrechen
            </Button>
            <SubmitButton
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              isLoading={isBulkProcessing}
              loadingText="Wird gelöscht..."
            >
              Löschen
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
