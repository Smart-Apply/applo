'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { X, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { projectSchema, type ProjectFormValues } from '@/lib/validation/schemas';
import type { Project } from '@/types';
import {
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
} from '@/components/ui/unsaved-changes-dialog';
import { useTranslations } from 'next-intl';

/* ── Technology tag input ── */
function TechTagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const t = useTranslations('profile');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(t('projects.errors.duplicate'));
        return;
      }
      onChange([...tags, trimmed]);
      setInput('');
    },
    [tags, onChange, t],
  );

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-[3px] border border-input bg-background px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="rounded-[2px] p-0.5 transition-colors hover:bg-primary/20"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? t('projects.tagPlaceholder') : ''}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

interface ProjectEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item being edited; `null`/`undefined` opens add mode. */
  initial?: Project | null;
  onSubmit: (project: Project) => void;
}

/** Add / edit form for a single project, rendered as a dialog on the profile page. */
export function ProjectEditorDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ProjectEditorDialogProps) {
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
              {isEditing ? t('projects.editTitle') : t('projects.newTitle')}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            onDirtyChange={guard.setDirty}
            initial={initial}
            isEditing={isEditing}
            onSubmit={(proj) => {
              onSubmit(proj);
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

function ProjectForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial?: Project | null;
  isEditing: boolean;
  onSubmit: (project: Project) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations('profile');

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    mode: 'onTouched',
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      technologies: initial?.technologies ?? [],
      url: initial?.url ?? '',
      startDate: initial?.startDate ? initial.startDate.split('T')[0] : '',
      endDate: initial?.endDate ? initial.endDate.split('T')[0] : '',
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
    const focus = setTimeout(() => setFocus('name'), 120);
    return () => clearTimeout(focus);
  }, [setFocus]);

  const handleSubmit = (values: ProjectFormValues) => {
    const link = values.url?.trim();
    onSubmit({
      ...(initial?.id && { id: initial.id }),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      technologies: values.technologies?.length ? values.technologies : undefined,
      url: link ? (link.startsWith('http') ? link : `https://${link}`) : undefined,
      startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
      endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-6 pb-6 pt-2">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('projects.name')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('projects.namePlaceholder')} {...field} />
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
                  placeholder={t('projects.descriptionPlaceholder')}
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="technologies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('projects.methods')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </FormLabel>
              <FormControl>
                <TechTagInput tags={field.value ?? []} onChange={field.onChange} />
              </FormControl>
              <FormDescription>{t('projects.confirmWithEnter')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.link')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="github.com/user/project" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('labels.from')}{' '}
                  <span className="font-normal text-muted-foreground">
                    – {t('labels.optional')}
                  </span>
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
                <FormLabel>
                  {t('labels.to')}{' '}
                  <span className="font-normal text-muted-foreground">
                    – {t('labels.optional')}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>{t('education.ongoingHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
