'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppLogo } from '@/components/ui/app-logo';
import { api } from '@/lib/api-client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useAuthStore } from '@/stores/auth-store';

type VerificationStatus = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const updateUser = useAuthStore((state) => state.updateUser);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await api.auth.verifyEmail(token);
        setEmail(response.email);
        setStatus('success');

        // Mark the locally persisted user as verified so the dashboard
        // banner disappears immediately. Without this, the persisted
        // Zustand user object keeps emailVerified=undefined and the
        // banner shows forever — even after the backend flag flips —
        // until the user logs out and back in.
        updateUser({ emailVerified: true });
      } catch (error) {
        const { ApiError } = await import('@/lib/errors');
        if (ApiError.isApiError(error)) {
          if (error.data?.code === 'INVALID_OR_EXPIRED_TOKEN') {
            setErrorMessage(t('verifyEmail.invalidTokenError'));
          } else {
            setErrorMessage(t('verifyEmail.genericError'));
          }
        } else {
          setErrorMessage(t('verifyEmail.genericError'));
        }
        setStatus('error');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token, updateUser, t]);

  if (status === 'loading') {
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[4px] border border-primary-soft bg-primary-soft/60 dark:border-slate-600 dark:bg-slate-800">
              <Loader2 className="h-8 w-8 text-brand animate-spin" />
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold tracking-[-.02em] text-foreground">
              {t('verifyEmail.loadingTitle')}
            </h1>
            <p className="text-muted-foreground">{t('verifyEmail.loadingDescription')}</p>
          </div>
        </div>
      </div>
    );
  }

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
              {t('verifyEmail.successTitle')}
            </h1>
            <p className="mb-2 text-muted-foreground">
              {t('verifyEmail.successDescription')}
            </p>
            {email && (
              <p className="mb-6 text-sm font-medium text-foreground">{email}</p>
            )}
            <div className="flex gap-3">
              <Link href="/login">
                <Button>{t('verifyEmail.toLogin')}</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">{t('verifyEmail.toDashboard')}</Button>
              </Link>
            </div>
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

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[4px] border border-[#F3C9C9] bg-[#FDEEEE] dark:border-red-400/30 dark:bg-red-400/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-bold tracking-[-.02em] text-foreground">
            {t('verifyEmail.errorTitle')}
          </h1>
          <p className="mb-6 text-muted-foreground">{errorMessage}</p>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline">{t('verifyEmail.toLogin')}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
