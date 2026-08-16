'use client';

import { useEffect } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { educationSchema, type EducationFormValues } from '@/lib/validation/schemas';
import type { Education } from '@/types';
import {
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
} from '@/components/ui/unsaved-changes-dialog';
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

  const guard = useUnsavedChangesGuard(open, () => onOpenChange(false));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : guard.requestClose())}
      >
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {isEditing ? t('education.editTitle') : t('education.newTitle')}
            </DialogTitle>
          </DialogHeader>
          <EducationForm
            onDirtyChange={guard.setDirty}
            initial={initial}
            isEditing={isEditing}
            onSubmit={(edu) => {
              onSubmit(edu);
              onOpenChange(false);
            }}
            onCancel={guard.requestClose}
          />
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={guard.confirmOpen}
        onKeepEditing={guard.keepEditing}
        onDiscard={guard.discard}
      />
    </>
  );
}

function EducationForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial?: Education | null;
  isEditing: boolean;
  onSubmit: (education: Education) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations('profile');
  const maxYear = new Date().getFullYear() + 10;

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    mode: 'onTouched',
    defaultValues: {
      institution: initial?.institution ?? '',
      degree: initial?.degree ?? '',
      fieldOfStudy: initial?.fieldOfStudy ?? '',
      startYear: initial?.startYear ? String(initial.startYear) : '',
      endYear: initial?.endYear ? String(initial.endYear) : '',
      gpa: initial?.gpa ?? '',
      description: initial?.description ?? '',
    },
  });

  const { control, setFocus } = form;

  // Lets the dialog warn before an accidental close throws the entry away.
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    // Radix moves focus into the dialog on open; wait for it to settle.
    const focus = setTimeout(() => setFocus('institution'), 120);
    return () => clearTimeout(focus);
  }, [setFocus]);

  const handleSubmit = (values: EducationFormValues) => {
    onSubmit({
      ...(initial?.id && { id: initial.id }),
      institution: values.institution.trim(),
      degree: values.degree.trim(),
      fieldOfStudy: values.fieldOfStudy?.trim() || undefined,
      startYear: values.startYear ? parseInt(values.startYear, 10) : undefined,
      endYear: values.endYear ? parseInt(values.endYear, 10) : null,
      gpa: values.gpa?.trim() || undefined,
      description: values.description?.trim() || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-6 pb-6 pt-2">
        <FormField
          control={control}
          name="institution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.institution')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('education.institutionPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="degree"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.degree')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('education.degreePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="fieldOfStudy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.fieldOfStudy')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('education.fieldPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="startYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('labels.from')}{' '}
                  <span className="font-normal text-muted-foreground">
                    – {t('labels.optional')}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t('education.startYearPlaceholder')}
                    min={1900}
                    max={maxYear}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="endYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('labels.to')}{' '}
                  <span className="font-normal text-muted-foreground">
                    – {t('labels.optional')}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t('education.endYearPlaceholder')}
                    min={1900}
                    max={maxYear}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t('education.ongoingHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="gpa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.grade')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="z.B. 1.5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.description')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('education.descriptionPlaceholder')}
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit">{isEditing ? t('actions.save') : t('actions.add')}</Button>
        </div>
      </form>
    </Form>
  );
}
