'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobPostingParser } from '@/components/forms/job-posting-parser';
import { JobPostingForm } from '@/components/forms/job-posting-form';
import { EmptyState } from '@/components/ui/empty-state';
import { useJobPostings, useDeleteJobPosting } from '@/hooks/use-job-postings';
import {
  Plus,
  Briefcase,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Edit,
  X,
  MapPin,
  Building2,
  Calendar,
  Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toastSuccess } from '@/lib/toast';
import { formatShortDate } from '@/lib/format-date';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function JobsPage() {
  const router = useRouter();
  const t = useTranslations('jobs');
  const [showInput, setShowInput] = useState(false);
  const [inputTab, setInputTab] = useState<'parser' | 'manual'>('parser');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);

  const { data: jobPostings, isLoading } = useJobPostings();
  const deleteJobPosting = useDeleteJobPosting();

  const handleSave = async () => {
    // Close the input section after saving
    setShowInput(false);
    toastSuccess(t('list.toasts.saved'));
  };

  const handleManualSave = () => {
    // Close the input section after manual creation
    setShowInput(false);
    toastSuccess(t('list.toasts.created'));
  };

  const handleDeleteClick = (id: string, title: string) => {
    setJobToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    await deleteJobPosting.mutateAsync(jobToDelete.id);
    setDeleteDialogOpen(false);
    setJobToDelete(null);
    toastSuccess(t('list.toasts.deleted'));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-extrabold tracking-[-.025em] text-foreground md:text-[30px]">{t('list.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('list.description')}
          </p>
        </div>
        <Button
          onClick={() => setShowInput(!showInput)}
          variant={showInput ? "secondary" : "default"}
        >
          {showInput ? (
            <>
              <X className="mr-2 h-4 w-4" />
              {t('list.actions.close')}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {t('list.actions.add')}
            </>
          )}
        </Button>
      </div>

      {/* Input Component with Tabs - Collapsible */}
      {showInput && (
        <div className="animate-in fade-in slide-in-from-top-5 duration-300 border rounded-[4px] bg-card overflow-hidden">
          <div className="p-6 border-b bg-muted/30">
            <h2 className="font-heading text-lg font-semibold mb-1">{t('list.input.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('list.input.description')}
            </p>
          </div>
          <div className="p-6">
            <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as 'parser' | 'manual')} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="parser">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('list.input.tabs.link')}
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Edit className="mr-2 h-4 w-4" />
                  {t('list.input.tabs.manual')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="parser" className="mt-0">
                <JobPostingParser onSave={handleSave} />
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                <JobPostingForm
                  onSave={handleManualSave}
                  onCancel={() => setShowInput(false)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Job Postings List */}
      <div>
        {isLoading ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse bg-muted/50" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : jobPostings && jobPostings.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {jobPostings.map((job, index) => (
                  <div
                    key={job.id}
                    className="group hover:bg-muted/30 transition-colors p-4"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Main Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base leading-tight mb-1 truncate" title={job.title}>
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-medium">{job.company}</span>
                              </div>
                              {job.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>{job.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span>{formatShortDate(job.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {job.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {job.description}
                          </p>
                        )}

                        {/* Requirements Tags */}
                        {job.requirements && job.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {job.requirements.slice(0, 5).map((req, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] font-normal bg-muted text-muted-foreground">
                                {req.length > 25 ? req.substring(0, 25) + '...' : req}
                              </Badge>
                            ))}
                            {job.requirements.length > 5 && (
                              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                {t('list.moreRequirements', { count: job.requirements.length - 5 })}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {job.sourceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(job.sourceUrl, '_blank')}
                            title={t('list.actions.openOriginal')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/job-postings/${job.id}`)}
                          title={t('list.actions.showDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/applications/new?jobId=${job.id}`)}
                        >
                          <Briefcase className="mr-2 h-3.5 w-3.5" />
                          {t('list.actions.apply')}
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(job.id, job.title)}
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          title={t('list.actions.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-[4px] border border-dashed border-border bg-muted/10 animate-in fade-in duration-500">
            <EmptyState
              icon={Briefcase}
              title={t('list.empty.title')}
              description={t('list.empty.description')}
              action={{
                label: t('list.empty.action'),
                onClick: () => setShowInput(true),
              }}
            />
          </div>
        )}
      </div>

      {/* Info Card */}
      {!showInput && (!jobPostings || jobPostings.length === 0) && (
        <Card className="border-primary-soft bg-primary-soft/40 dark:border-slate-700 dark:bg-slate-800/40">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center border border-primary-soft bg-background text-brand dark:border-slate-600">
                  <Loader2 className="h-4 w-4" />
                </div>
                <h3 className="font-heading font-semibold text-foreground">
                  {t('list.workflow.title')}
                </h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                <div className="bg-background p-4 rounded-[3px] border">
                  <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[.12em] text-brand">{t('list.workflow.step1.title')}</div>
                  <p className="text-sm text-muted-foreground">{t('list.workflow.step1.description')}</p>
                </div>
                <div className="bg-background p-4 rounded-[3px] border">
                  <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[.12em] text-brand">{t('list.workflow.step2.title')}</div>
                  <p className="text-sm text-muted-foreground">{t('list.workflow.step2.description')}</p>
                </div>
                <div className="bg-background p-4 rounded-[3px] border">
                  <div className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[.12em] text-brand">{t('list.workflow.step3.title')}</div>
                  <p className="text-sm text-muted-foreground">{t('list.workflow.step3.description')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('list.deleteDialog.description', {
                title: jobToDelete?.title ?? '',
                strong: (chunks) => <span className="font-medium text-foreground">&quot;{chunks}&quot;</span>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteJobPosting.isPending}
            >
              {t('list.deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteJobPosting.isPending}
            >
              {deleteJobPosting.isPending ? t('list.deleteDialog.deleting') : t('list.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
