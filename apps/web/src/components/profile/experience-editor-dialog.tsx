'use client';

import { useEffect } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { experienceSchema, type ExperienceFormValues } from '@/lib/validation/schemas';
import type { Experience } from '@/types';
import {
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
} from '@/components/ui/unsaved-changes-dialog';
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

  const guard = useUnsavedChangesGuard(open, () => onOpenChange(false));

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : guard.requestClose())}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {isEditing ? t('experience.editTitle') : t('experience.newTitle')}
            </DialogTitle>
          </DialogHeader>
          <ExperienceForm
            initial={initial}
            isEditing={isEditing}
            onDirtyChange={guard.setDirty}
            onSubmit={(exp) => {
              onSubmit(exp);
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

function ExperienceForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial?: Experience | null;
  isEditing: boolean;
  onSubmit: (experience: Experience) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations('profile');

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    // Surface a problem when the user leaves a field, not while they type.
    mode: 'onTouched',
    defaultValues: {
      title: initial?.title ?? '',
      company: initial?.company ?? '',
      location: initial?.location ?? '',
      startDate: initial?.startDate ? initial.startDate.split('T')[0] : '',
      endDate: initial?.endDate ? initial.endDate.split('T')[0] : '',
      current: initial ? !initial.endDate : false,
      description: initial?.description ?? '',
    },
  });

  const { control, setFocus, setValue } = form;
  const isCurrent = useWatch({ control, name: 'current' });

  // Lets the dialog warn before an accidental close throws the entry away.
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    // Radix moves focus into the dialog on open; wait for it to settle.
    const focus = setTimeout(() => setFocus('title'), 120);
    return () => clearTimeout(focus);
  }, [setFocus]);

  const handleSubmit = (values: ExperienceFormValues) => {
    onSubmit({
      ...(initial?.id && { id: initial.id }),
      title: values.title.trim(),
      company: values.company.trim(),
      location: values.location?.trim() || undefined,
      startDate: new Date(values.startDate).toISOString(),
      endDate: values.current || !values.endDate ? null : new Date(values.endDate).toISOString(),
      description: values.description?.trim() || null,
      current: !!values.current,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-6 pb-6 pt-2">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.jobTitle')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('experience.titlePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('labels.company')} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('experience.companyPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('labels.location')}{' '}
                  <span className="font-normal text-muted-foreground">
                    – {t('labels.optional')}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('experience.locationPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('labels.from')} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.to')}</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isCurrent} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="current"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex cursor-pointer items-center gap-3 rounded-[3px] border border-border px-4 py-3 font-normal">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(!!checked);
                      if (checked) setValue('endDate', '', { shouldValidate: true });
                    }}
                  />
                </FormControl>
                <span className="text-sm text-foreground">{t('experience.currentHere')}</span>
              </FormLabel>
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
                  placeholder={t('experience.descriptionPlaceholder')}
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('experience.descriptionHelp')}</FormDescription>
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
