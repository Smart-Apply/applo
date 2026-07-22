'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDisable2FA } from '@/hooks/use-two-factor';

interface TwoFactorDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorDisableDialog({ open, onOpenChange }: TwoFactorDisableDialogProps) {
  const t = useTranslations('twoFactor');
  const [password, setPassword] = useState('');
  const disableMutation = useDisable2FA();

  const handleDisable = async () => {
    await disableMutation.mutateAsync({ password });
    handleClose(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setPassword('');
      disableMutation.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('disable.title')}
          </DialogTitle>
          <DialogDescription>
            {t('disable.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-[4px] border border-[#F3C9C9] bg-[#FDEEEE] p-4 text-sm text-destructive dark:border-red-400/30 dark:bg-red-400/10">
            <p className="font-medium">{t('disable.warningTitle')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('disable.removeTrustedDevices')}</li>
              <li>{t('disable.deleteBackupCodes')}</li>
              <li>{t('disable.passwordOnly')}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('disable.passwordLabel')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1"
            >
              {t('disable.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={!password || disableMutation.isPending}
              className="flex-1"
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('disable.disabling')}
                </>
              ) : (
                t('disable.submit')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
