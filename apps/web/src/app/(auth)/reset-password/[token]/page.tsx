'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AppLogo } from '@/components/ui/app-logo';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { KeyRound, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordStrength } from '@/components/ui/password-strength';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validation/schemas';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await api.auth.resetPassword({ token, password: data.password });
      setStatus('success');
      toast.success(t('resetPassword.successToast'));
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      const { ApiError, getErrorMessage } = await import('@/lib/errors');
      if (ApiError.isApiError(error)) {
        if (error.data?.code === 'INVALID_OR_EXPIRED_TOKEN') {
          setStatus('error');
          setErrorMessage(t('resetPassword.invalidTokenError'));
        } else {
          toast.error(getErrorMessage(error));
        }
      } else {
        toast.error(t('resetPassword.genericErrorToast'));
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-muted px-4 py-8">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher variant="labeled" />
        </div>
        <div className="w-full max-w-md rounded-[4px] bg-card p-8 border border-border">
          <div className="mb-6 flex justify-center">
            <AppLogo className="h-12 w-auto" />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[4px] border border-[#BFE9CC] bg-[#ECFAF0] dark:border-green-400/30 dark:bg-green-400/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold tracking-[-.02em] text-foreground">
              {t('resetPassword.successTitle')}
            </h1>
            <p className="mb-6 text-muted-foreground">
              {t('resetPassword.successDescription')}
            </p>
            <Link href="/login">
              <Button className="gap-2">{t('resetPassword.loginNow')}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-muted px-4 py-8">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher variant="labeled" />
        </div>
        <div className="w-full max-w-md rounded-[4px] bg-card p-8 border border-border">
          <div className="mb-6 flex justify-center">
            <AppLogo className="h-12 w-auto" />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[4px] border border-[#F3C9C9] bg-[#FDEEEE] dark:border-red-400/30 dark:bg-red-400/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold tracking-[-.02em] text-foreground">
              {t('resetPassword.invalidTitle')}
            </h1>
            <p className="mb-6 text-muted-foreground">{errorMessage}</p>
            <Link href="/forgot-password">
              <Button variant="outline" className="gap-2">
                {t('resetPassword.requestNewLink')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher variant="labeled" />
      </div>
      <div className="w-full max-w-md rounded-[4px] bg-card p-8 border border-border">
        <div className="mb-6 flex justify-center">
          <AppLogo className="h-12 w-auto" />
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[4px] border border-primary-soft bg-primary-soft/60 dark:border-slate-600 dark:bg-slate-800">
            <KeyRound className="h-8 w-8 text-brand" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-bold tracking-[-.02em] text-foreground">
            {t('resetPassword.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('resetPassword.subtitle')}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    {t('resetPassword.passwordLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('resetPassword.passwordPlaceholder')}
                      className={`h-10 rounded-[4px] border bg-transparent px-3.5 text-[15px] placeholder:text-muted-foreground focus:border-primary ${
                        fieldState.error
                          ? 'border-destructive focus:border-destructive'
                          : fieldState.isDirty && !fieldState.invalid
                          ? 'border-success'
                          : 'border-input'
                      }`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <PasswordStrength password={field.value} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground">
                    {t('resetPassword.confirmPasswordLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                      className={`h-10 rounded-[4px] border bg-transparent px-3.5 text-[15px] placeholder:text-muted-foreground focus:border-primary ${
                        fieldState.error
                          ? 'border-destructive focus:border-destructive'
                          : fieldState.isDirty && !fieldState.invalid
                          ? 'border-success'
                          : 'border-input'
                      }`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmitButton
              type="submit"
              className="w-full h-10 rounded-[4px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
              isLoading={form.formState.isSubmitting}
              loadingText={t('resetPassword.saving')}
            >
              {t('resetPassword.submit')}
            </SubmitButton>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
