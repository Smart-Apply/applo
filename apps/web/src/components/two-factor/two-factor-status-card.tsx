'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, ShieldCheck, ShieldOff, Key, Smartphone, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTwoFactorStatus } from '@/hooks/use-two-factor';
import { TwoFactorSetupDialog } from './two-factor-setup-dialog';
import { TwoFactorDisableDialog } from './two-factor-disable-dialog';
import { BackupCodesDialog } from './backup-codes-dialog';
import { TrustedDevicesDialog } from './trusted-devices-dialog';

export function TwoFactorStatusCard() {
  const t = useTranslations('twoFactor');
  const { data: status, isLoading } = useTwoFactorStatus();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('statusCard.title')}
          </CardTitle>
          <CardDescription>
            {t('statusCard.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status?.isEnabled ? (
                <ShieldCheck className="h-5 w-5 text-success" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle>{t('statusCard.title')}</CardTitle>
            </div>
            <Badge variant={status?.isEnabled ? 'default' : 'secondary'}>
              {status?.isEnabled ? t('statusCard.enabled') : t('statusCard.disabled')}
            </Badge>
          </div>
          <CardDescription>
            {t('statusCard.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.isEnabled ? (
            <>
              <div className="rounded-[4px] border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span>{t('statusCard.backupCodes')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.backupCodesRemaining < 3 ? 'destructive' : 'secondary'}>
                      {t('statusCard.remaining', { count: status.backupCodesRemaining })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBackupDialog(true)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {status.backupCodesRemaining < 3 && (
                  <p className="text-xs text-destructive">
                    {t('statusCard.lowBackupWarning')}
                  </p>
                )}
              </div>

              <div className="rounded-[4px] border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span>{t('statusCard.trustedDevices')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {t('statusCard.deviceCount', { count: status.trustedDevicesCount })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDevicesDialog(true)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
                className="w-full"
              >
                {t('statusCard.disable')}
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  {t('statusCard.intro')}
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('statusCard.appSupport')}</li>
                  <li>{t('statusCard.backupCodesBenefit')}</li>
                  <li>{t('statusCard.trustedDevicesBenefit')}</li>
                </ul>
              </div>
              <Button onClick={() => setShowSetupDialog(true)} className="w-full">
                {t('statusCard.enable')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TwoFactorSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
      />
      <TwoFactorDisableDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
      />
      <BackupCodesDialog
        open={showBackupDialog}
        onOpenChange={setShowBackupDialog}
      />
      <TrustedDevicesDialog
        open={showDevicesDialog}
        onOpenChange={setShowDevicesDialog}
      />
    </>
  );
}
