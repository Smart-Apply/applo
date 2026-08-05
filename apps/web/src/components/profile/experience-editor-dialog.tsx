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
import { toast } from 'sonner';
import type { Experience } from '@/types';
import { useTranslations } from 'next-intl';

interface ExperienceEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item being edited; `null`/`undefined` opens the dialog in add mode. */
  initial?: Experience | null;
  onSubmit: (experience: Experience) => void;
}

/**
 * Add / edit form for a single work experience, rendered as a dialog directly
 * on the profile page (no separate edit route). The form fields live in
 * {@link ExperienceForm}, which remounts each time the dialog opens so its
 * state seeds cleanly from `initial` without a syncing effect.
 */
export function ExperienceEditorDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ExperienceEditorDialogProps) {
  const t = useTranslations('profile');
  const isEditing = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {isEditing ? t('experience.editTitle') : t('experience.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <ExperienceForm
          initial={initial}
          isEditing={isEditing}
          onSubmit={(exp) => {
            onSubmit(exp);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ExperienceForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
}: {
  initial?: Experience | null;
  isEditing: boolean;
  onSubmit: (experience: Experience) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('profile');

  const [title, setTitle] = useState(initial?.title ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [startDate, setStartDate] = useState(
    initial?.startDate ? initial.startDate.split('T')[0] : '',
  );
  const [endDate, setEndDate] = useState(initial?.endDate ? initial.endDate.split('T')[0] : '');
  const [current, setCurrent] = useState(initial ? !initial.endDate : false);
  const [description, setDescription] = useState(initial?.description ?? '');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = setTimeout(() => titleRef.current?.focus(), 120);
    return () => clearTimeout(focus);
  }, []);

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

    onSubmit({
      ...(initial?.id && { id: initial.id }),
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: current || !endDate ? null : new Date(endDate).toISOString(),
      description: description.trim() || null,
      current,
    });
  };

  return (
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
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
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
        <p className="text-xs text-muted-foreground">{t('experience.descriptionHelp')}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {isEditing ? t('actions.save') : t('actions.add')}
        </Button>
      </div>
    </div>
  );
}
