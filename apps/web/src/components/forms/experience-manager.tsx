'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import type { Experience } from '@/types';
import { getIntlLocale } from '@/lib/i18n-runtime';
import { useTranslations } from 'next-intl';

interface ExperienceManagerProps {
  experiences: Experience[];
  onExperiencesChange: (experiences: Experience[]) => void;
  disabled?: boolean;
}

export function ExperienceManager({
  experiences,
  onExperiencesChange,
  disabled = false,
}: ExperienceManagerProps) {
  const t = useTranslations('profile');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  /* form state */
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [current, setCurrent] = useState(false);
  const [description, setDescription] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setCompany('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setCurrent(false);
    setDescription('');
  };

  const sortedExperiences = [...experiences].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  const openAddDialog = () => {
    setEditingIndex(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (index: number) => {
    const exp = experiences[index];
    setEditingIndex(index);
    setTitle(exp.title);
    setCompany(exp.company);
    setLocation(exp.location || '');
    setStartDate(exp.startDate.split('T')[0]);
    setEndDate(exp.endDate ? exp.endDate.split('T')[0] : '');
    setCurrent(!exp.endDate);
    setDescription(exp.description || '');
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (isDialogOpen) {
      const t = setTimeout(() => titleRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isDialogOpen]);

  const canSubmit = title.trim() && company.trim() && startDate;

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t('experience.errors.title'));
      titleRef.current?.focus();
      return;
    }
    if (!company.trim()) {
      toast.error(t('experience.errors.company'));
      return;
    }
    if (!startDate) {
      toast.error(t('experience.errors.startDate'));
      return;
    }
    if (!current && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error(t('experience.errors.dateOrder'));
      return;
    }

    const newExp: Experience = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: current || !endDate ? null : new Date(endDate).toISOString(),
      description: description.trim() || null,
      current,
    };

    let updated: Experience[];
    if (editingIndex !== null) {
      const existing = experiences[editingIndex];
      updated = [...experiences];
      updated[editingIndex] = { ...newExp, ...(existing.id && { id: existing.id }) };
      toast.success(t('experience.toasts.updated'));
    } else {
      updated = [...experiences, newExp];
      toast.success(t('experience.toasts.added'));
    }

    onExperiencesChange(updated);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (index: number) => {
    onExperiencesChange(experiences.filter((_, i) => i !== index));
    setDeleteConfirmIndex(null);
    toast.success(t('experience.toasts.removed'));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(getIntlLocale(), { month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('experience.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('experience.description')}</p>
        </div>
        <Button type="button" onClick={openAddDialog} disabled={disabled} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('actions.add')}
        </Button>
      </div>

      {sortedExperiences.length > 0 ? (
        <div className="space-y-4">
          {sortedExperiences.map((exp, displayIndex) => {
            const originalIndex = experiences.findIndex(
              (e) =>
                e.title === exp.title &&
                e.company === exp.company &&
                e.startDate === exp.startDate,
            );

            return (
              <Card
                key={displayIndex}
                className="transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[3px] bg-primary/10">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-semibold text-foreground">
                            {exp.title}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {exp.company}
                            </span>
                            {exp.location && (
                              <>
                                <span>•</span>
                                <span>{exp.location}</span>
                              </>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {fmtDate(exp.startDate)} –{' '}
                              {exp.endDate ? (
                                fmtDate(exp.endDate)
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="h-5 px-1.5 py-0 text-[10px]"
                                >
                                  {t('labels.current')}
                                </Badge>
                              )}
                            </span>
                          </div>

                          {exp.description && (
                            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                              {exp.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(originalIndex)}
                        disabled={disabled}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmIndex(originalIndex)}
                        disabled={disabled}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
        <div className="flex flex-col items-center justify-center rounded-[4px] border border-dashed border-border bg-muted/20 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center border border-border bg-muted">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">{t('experience.emptyTitle')}</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {t('experience.emptyDescription')}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={openAddDialog}
            disabled={disabled}
            className="mt-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('experience.addFirst')}
          </Button>
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {editingIndex !== null ? t('experience.editTitle') : t('experience.newTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 pb-6 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('labels.jobTitle')} <span className="text-destructive">*</span>
              </label>
              <Input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('experience.titlePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              />
            </div>

            {/* Company + Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t('labels.company')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t('experience.companyPlaceholder')}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t('labels.location')}{' '}
                  <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('experience.locationPlaceholder')}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t('labels.from')} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{t('labels.to')}</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={current}
                />
              </div>
            </div>

            {/* Current checkbox */}
            <label className="flex cursor-pointer items-center gap-3 rounded-[3px] border border-border px-4 py-3">
              <Checkbox
                checked={current}
                onCheckedChange={(checked) => {
                  setCurrent(!!checked);
                  if (checked) setEndDate('');
                }}
              />
              <span className="text-sm text-foreground">{t('experience.currentHere')}</span>
            </label>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t('labels.description')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('experience.descriptionPlaceholder')}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t('experience.descriptionHelp')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                {editingIndex !== null ? t('actions.save') : t('actions.add')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog
        open={deleteConfirmIndex !== null}
        onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('experience.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('experience.deleteConfirm')}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmIndex(null)}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmIndex !== null && handleDelete(deleteConfirmIndex)
              }
            >
              {t('actions.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
