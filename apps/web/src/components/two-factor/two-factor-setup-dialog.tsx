'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Copy, Check, Download } from 'lucide-react';
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
import { useSetup2FA, useVerify2FASetup } from '@/hooks/use-two-factor';
import { toast } from 'sonner';
import { getIntlLocale } from '@/lib/i18n-runtime';

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'intro' | 'scan' | 'backup';

export function TwoFactorSetupDialog({ open, onOpenChange }: TwoFactorSetupDialogProps) {
  const t = useTranslations('twoFactor');
  const [step, setStep] = useState<Step>('intro');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const setupMutation = useSetup2FA();
  const verifyMutation = useVerify2FASetup();

  const handleStartSetup = async () => {
    try {
      const result = await setupMutation.mutateAsync();
      if (result) {
        setStep('scan');
      }
    } catch {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleVerify = async () => {
    if (!setupMutation.data?.tempSecret) return;

    try {
      const result = await verifyMutation.mutateAsync({
        code,
        tempSecret: setupMutation.data.tempSecret,
      });

      if (result?.backupCodes) {
        setBackupCodes(result.backupCodes);
        setStep('backup');
      }
    } catch {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleCopySecret = () => {
    if (setupMutation.data?.tempSecret) {
      navigator.clipboard.writeText(setupMutation.data.tempSecret);
      setCopiedSecret(true);
      toast.success(t('setup.secretCopiedToast'));
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedBackup(true);
    toast.success(t('setup.backupCopiedToast'));
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const generatedAt = new Date().toLocaleString(getIntlLocale());
    const codesText = `${t('setup.downloadTitle')}\n${'='.repeat(40)}\n\n${t('setup.downloadDescription')}\n${t('setup.downloadStorageHint')}\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n${t('setup.downloadGeneratedAt', { date: generatedAt })}`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartapply-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('setup.backupDownloadedToast'));
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setStep('intro');
      setCode('');
      setBackupCodes([]);
      setupMutation.reset();
      verifyMutation.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'intro' && t('setup.introTitle')}
            {step === 'scan' && t('setup.scanTitle')}
            {step === 'backup' && t('setup.backupTitle')}
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && t('setup.introDescription')}
            {step === 'scan' && t('setup.scanDescription')}
            {step === 'backup' && t('setup.backupDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'intro' && (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>{t('setup.appIntro')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Google Authenticator</li>
                  <li>Authy</li>
                  <li>Microsoft Authenticator</li>
                  <li>1Password</li>
                </ul>
              </div>
              <Button
                onClick={handleStartSetup}
                disabled={setupMutation.isPending}
                className="w-full"
              >
                {setupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('setup.preparing')}
                  </>
                ) : (
                  t('setup.next')
                )}
              </Button>
            </>
          )}

          {step === 'scan' && setupMutation.data && (
            <>
              <div className="flex justify-center">
                <div className="border rounded-[3px] p-2 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setupMutation.data.qrCodeDataUrl}
                    alt={t('setup.qrAlt')}
                    width={180}
                    height={180}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('setup.manualLabel')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={setupMutation.data.tempSecret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                  >
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="code">{t('setup.codeLabel')}</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-2xl tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || verifyMutation.isPending}
                className="w-full"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('setup.activating')}
                  </>
                ) : (
                  t('setup.activate')
                )}
              </Button>
            </>
          )}

          {step === 'backup' && (
            <>
              <div className="rounded-[4px] border p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((backupCode, index) => (
                    <div key={index} className="px-2 py-1 bg-background rounded">
                      {backupCode}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyBackupCodes}
                  className="flex-1"
                >
                  {copiedBackup ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {t('setup.copy')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('setup.download')}
                </Button>
              </div>

              <p className="text-xs text-destructive font-medium">
                {t('setup.shownOnce')}
              </p>

              <Button onClick={() => handleClose(false)} className="w-full">
                {t('setup.done')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
