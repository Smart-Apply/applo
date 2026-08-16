'use client';

import { useEffect } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Mail } from 'lucide-react';
import { profileFormSchema, type ProfileFormValues } from '@/lib/validation/profile-schema';
import {
  UnsavedChangesDialog,
  useUnsavedChangesGuard,
} from '@/components/ui/unsaved-changes-dialog';
import { useTranslations } from 'next-intl';

/** Contact / identity fields the dialog owns (summary is edited inline elsewhere). */
export type ContactValues = Pick<
  ProfileFormValues,
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'street'
  | 'postalCode'
  | 'city'
  | 'country'
  | 'linkedinUrl'
  | 'githubUrl'
  | 'portfolioUrl'
>;

interface ContactEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read-only email shown for reference. */
  email?: string;
  defaultValues: ContactValues;
  onSubmit: (values: ContactValues) => void;
  pending?: boolean;
}

/**
 * Add / edit form for the contact block (name, phone, address, links),
 * rendered as a dialog directly on the profile page. The form lives in
 * {@link ContactForm}, which remounts on each open so it seeds cleanly from
 * `defaultValues` (the profile may load lazily).
 */
export function ContactEditorDialog({
  open,
  onOpenChange,
  email,
  defaultValues,
  onSubmit,
  pending = false,
}: ContactEditorDialogProps) {
  const t = useTranslations('profile');

  const guard = useUnsavedChangesGuard(open, () => onOpenChange(false));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : guard.requestClose())}
      >
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{t('edit.basic.title')}</DialogTitle>
            <DialogDescription>{t('edit.basic.description')}</DialogDescription>
          </DialogHeader>
          <ContactForm
            email={email}
            defaultValues={defaultValues}
            onDirtyChange={guard.setDirty}
            onSubmit={onSubmit}
            onCancel={guard.requestClose}
            pending={pending}
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

function ContactForm({
  email,
  defaultValues,
  onSubmit,
  onCancel,
  pending,
  onDirtyChange,
}: {
  email?: string;
  defaultValues: ContactValues;
  onSubmit: (values: ContactValues) => void;
  onCancel: () => void;
  pending: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations('profile');

  const form = useForm<ContactValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  // Lets the dialog warn before an accidental close throws the entry away.
  const { isDirty } = useFormState({ control: form.control });
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="space-y-5 px-6 pb-6 pt-2"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.firstName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('edit.basic.firstNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.lastName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('edit.basic.lastNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {email && (
          <div className="flex items-center gap-2 rounded-[3px] border border-border bg-muted/40 px-3 py-2 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-foreground">{email}</span>
            <span className="text-xs text-muted-foreground">{t('edit.basic.emailImmutable')}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('labels.phone')}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+49 123 456789"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '');
                    if (value.length > 0 && !value.startsWith('+')) {
                      field.onChange('+' + value);
                    } else {
                      field.onChange(value);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('labels.street')}</FormLabel>
              <FormControl>
                <Input placeholder={t('edit.basic.streetPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.postalCode')}</FormLabel>
                <FormControl>
                  <Input placeholder="47057" maxLength={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.city')}</FormLabel>
                <FormControl>
                  <Input placeholder="Duisburg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('labels.country')}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t('labels.optional')})
                </span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('edit.basic.countryPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkedinUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn URL</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/in/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="githubUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitHub URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://github.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="portfolioUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.website')}</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
          <SubmitButton type="submit" isLoading={pending} loadingText={t('edit.saving')}>
            {t('actions.save')}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
