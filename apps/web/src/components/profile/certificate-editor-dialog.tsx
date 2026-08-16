'use client';

import { useEffect } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Link as LinkIcon } from 'lucide-react';
import { certificateSchema, type CertificateFormValues } from '@/lib/validation/schemas';
import type { Certificate } from '@/types';
import {
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
} from '@/components/ui/unsaved-changes-dialog';
import { useTranslations } from 'next-intl';

interface CertificateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item being edited; `null`/`undefined` opens add mode. */
  initial?: Certificate | null;
  onSubmit: (certificate: Certificate) => void;
}

/** Add / edit form for a single certificate, rendered as a dialog on the profile page. */
export function CertificateEditorDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: CertificateEditorDialogProps) {
  const t = useTranslations('profile');
  const isEditing = !!initial;

  const guard = useUnsavedChangesGuard(open, () => onOpenChange(false));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : guard.requestClose())}
      >
        <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {isEditing ? t('certificates.editTitle') : t('certificates.newTitle')}
            </DialogTitle>
          </DialogHeader>
          <CertificateForm
            onDirtyChange={guard.setDirty}
            initial={initial}
            isEditing={isEditing}
            onSubmit={(cert) => {
              onSubmit(cert);
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

function CertificateForm({
  initial,
  isEditing,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial?: Certificate | null;
  isEditing: boolean;
  onSubmit: (certificate: Certificate) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations('profile');

  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateSchema),
    mode: 'onTouched',
    defaultValues: {
      name: initial?.name ?? '',
      issuer: initial?.issuer ?? '',
      dateObtained: initial?.dateObtained ? initial.dateObtained.split('T')[0] : '',
      expiryDate: initial?.expiryDate ? initial.expiryDate.split('T')[0] : '',
      credentialId: initial?.credentialId ?? '',
      url: initial?.url ?? '',
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

  const handleSubmit = (values: CertificateFormValues) => {
    const link = values.url?.trim();
    onSubmit({
      ...(initial?.id && { id: initial.id }),
      name: values.name.trim(),
      issuer: values.issuer.trim(),
      dateObtained: values.dateObtained
        ? new Date(values.dateObtained).toISOString()
        : undefined,
      expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : null,
      credentialId: values.credentialId?.trim() || undefined,
      url: link ? (link.startsWith('http') ? link : `https://${link}`) : undefined,
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
                {t('certificates.name')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('certificates.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="issuer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('certificates.issuer')} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('certificates.issuerPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="dateObtained"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('certificates.issuedAt')}{' '}
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
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('certificates.expiresAt')}{' '}
                  <span className="font-normal text-muted-foreground">
                    – {t('labels.optional')}
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>{t('certificates.noExpiry')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="credentialId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('certificates.credentialId')}{' '}
                <span className="font-normal text-muted-foreground">– {t('labels.optional')}</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('certificates.credentialPlaceholder')} {...field} />
              </FormControl>
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
                  <Input
                    placeholder="example.com/verify/certificate"
                    className="pl-9"
                    {...field}
                  />
                </div>
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
