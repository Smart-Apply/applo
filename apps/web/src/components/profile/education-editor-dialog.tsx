'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Education } from '@/types';
import { useTranslations } from 'next-intl';

interface EducationEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item being edited (numeric years); `null`/`undefined` opens add mode. */
  initial?: Education | null;
  onSubmit: (education: Education) => void;
}

/**
 * Add / edit form for a single education entry, rendered as a dialog on the
 * profile page. Works with the read-model {@link Education} (numeric years);
 * the caller maps it to the write DTO before persisting.
 */
export function EducationEditorDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: EducationEditorDialogProps) {
  const t = useTranslations('profile');
  const isEditing = !!initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {isEditing ? t('education.editTitle') : t('education.newTitle')}
          </DialogTitle>
        </DialogHeader>
        <EducationForm
          initial={initial}
          isEditing={isEditing}
          onSubmit={(edu) => {
            onSubmit(edu);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EducationForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
}: {
  initial?: Education | null;
  isEditing: boolean;
  onSubmit: (education: Education) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('profile');

  const [institution, setInstitution] = useState(initial?.institution ?? '');
  const [degree, setDegree] = useState(initial?.degree ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(initial?.fieldOfStudy ?? '');
  const [startYear, setStartYear] = useState(initial?.startYear ? String(initial.startYear) : '');
  const [endYear, setEndYear] = useState(initial?.endYear ? String(initial.endYear) : '');
  const [gpa, setGpa] = useState(initial?.gpa ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const institutionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = setTimeout(() => institutionRef.current?.focus(), 120);
    return () => clearTimeout(focus);
  }, []);

  const canSubmit = institution.trim() && degree.trim();

  const handleSubmit = () => {
    if (!institution.trim()) {
      toast.error(t('education.errors.institution'));
      institutionRef.current?.focus();
      return;
    }
    if (!degree.trim()) {
      toast.error(t('education.errors.degree'));
      return;
    }
    const sy = startYear ? parseInt(startYear, 10) : undefined;
    const ey = endYear ? parseInt(endYear, 10) : null;
    if (sy && ey && ey < sy) {
      toast.error(t('education.errors.yearOrder'));
      return;
    }

    onSubmit({
      ...(initial?.id && { id: initial.id }),
      institution: institution.trim(),
      degree: degree.trim(),
      fieldOfStudy: fieldOfStudy.trim() || undefined,
      startYear: sy,
      endYear: ey,
      gpa: gpa.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5 px-6 pb-6 pt-2">
      {/* Institution */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.institution')} <span className="text-destructive">*</span>
        </label>
        <Input
          ref={institutionRef}
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder={t('education.institutionPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* Degree */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.degree')} <span className="text-destructive">*</span>
        </label>
        <Input
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          placeholder={t('education.degreePlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* Field of study */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.fieldOfStudy')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <Input
          value={fieldOfStudy}
          onChange={(e) => setFieldOfStudy(e.target.value)}
          placeholder={t('education.fieldPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* Years */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('labels.from')}{' '}
            <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
          </label>
          <Input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            placeholder={t('education.startYearPlaceholder')}
            min="1900"
            max={new Date().getFullYear() + 10}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('labels.to')}{' '}
            <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
          </label>
          <Input
            type="number"
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
            placeholder={t('education.endYearPlaceholder')}
            min="1900"
            max={new Date().getFullYear() + 10}
          />
          <p className="text-xs text-muted-foreground">{t('education.ongoingHelp')}</p>
        </div>
      </div>

      {/* GPA */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.grade')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <Input
          value={gpa}
          onChange={(e) => setGpa(e.target.value)}
          placeholder="z.B. 1.5"
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('labels.description')}{' '}
          <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('education.descriptionPlaceholder')}
          rows={3}
          className="resize-none"
        />
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
