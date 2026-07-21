'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Mail, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export function EmailVerificationBanner() {
  const { user, setAuth } = useAuthStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const refreshedRef = useRef(false);

  // Re-sync verification status from the backend when this banner mounts
  // and the locally persisted user looks unverified. This handles the case
  // where the user verified their email in another tab/device, or upgraded
  // to a backend version that started returning `emailVerified` after they
  // had already logged in. Without this, the persisted Zustand user keeps
  // emailVerified=undefined forever and the banner never disappears.
  useEffect(() => {
    if (refreshedRef.current) return;
    if (!user) return;
    if (user.emailVerified) return;

    refreshedRef.current = true;
    api.auth
      .me()
      .then((fresh) => {
        // Merge fresh fields onto the persisted user (don't overwrite any
        // optional fields the /me endpoint omits).
        setAuth({ ...user, ...fresh });
      })
      .catch(() => {
        // Silent — banner stays as-is, user can dismiss or resend.
      });
  }, [user, setAuth]);

  // Don't show if user is verified, not logged in, or banner is dismissed
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsSending(true);
    try {
      await api.auth.sendVerificationEmail();
      toast.success('Verifizierungs-E-Mail wurde gesendet! Bitte überprüfe dein Postfach.');
    } catch (error) {
      const { ApiError, getErrorMessage } = await import('@/lib/errors');
      if (ApiError.isApiError(error)) {
        if (error.status === 429) {
          toast.error('Bitte warte einen Moment, bevor du eine weitere E-Mail anforderst.');
        } else if (error.data?.code === 'EMAIL_ALREADY_VERIFIED') {
          toast.info('Deine E-Mail-Adresse wurde bereits verifiziert.');
          setIsDismissed(true);
        } else {
          toast.error(getErrorMessage(error));
        }
      } else {
        toast.error('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative border-b border-[#F3E3B3] bg-[#FDF6E7] px-4 py-3 dark:border-amber-400/30 dark:bg-amber-400/10">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-[#A16207] dark:text-amber-400" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-[#854D0E] dark:text-amber-200">
              Bitte verifiziere deine E-Mail-Adresse.
            </span>
            <span className="text-[#854D0E]/80 dark:text-amber-300/80 ml-1">
              Wir haben dir eine E-Mail an <strong>{user.email}</strong> gesendet.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isSending}
            className="border-[#F3E3B3] text-[#854D0E] hover:bg-[#F9EDCE] hover:text-[#854D0E] dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/15 dark:hover:text-amber-200"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Sende...
              </>
            ) : (
              'Erneut senden'
            )}
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-[#A16207] hover:text-[#854D0E] dark:text-amber-400 dark:hover:text-amber-200 p-1"
            aria-label="Banner schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
