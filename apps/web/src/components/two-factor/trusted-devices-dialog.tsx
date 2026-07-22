'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getIntlLocale } from '@/lib/i18n-runtime';
import {
  useTrustedDevices,
  useRevokeTrustedDevice,
  useRevokeAllTrustedDevices,
} from '@/hooks/use-two-factor';
import type { TrustedDevice } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TrustedDevicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeviceIcon({ os, className }: { os: string | null; className?: string }) {
  const osLower = os?.toLowerCase() || '';
  if (osLower.includes('ios') || osLower.includes('android')) {
    return <Smartphone className={className} />;
  }
  if (osLower.includes('ipad')) {
    return <Tablet className={className} />;
  }
  return <Monitor className={className} />;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(getIntlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

function DeviceItem({
  device,
  onRevoke,
  isRevoking,
}: {
  device: TrustedDevice;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  const t = useTranslations('twoFactor');
  const expired = isExpired(device.expiresAt);

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-[3px] bg-muted p-2">
          <DeviceIcon os={device.os} className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {device.deviceName || t('trustedDevices.unknownDevice')}
            </span>
            {expired && (
              <Badge variant="secondary" className="text-xs">
                {t('trustedDevices.expired')}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {device.browser && device.os && (
              <p>{t('trustedDevices.browserOnOs', { browser: device.browser, os: device.os })}</p>
            )}
            {device.ipAddress && (
              <p>IP: {device.ipAddress}</p>
            )}
            <p>{t('trustedDevices.lastActive', { date: formatDate(device.lastUsedAt) })}</p>
            <p>{t('trustedDevices.expires', { date: formatDate(device.expiresAt) })}</p>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRevoke(device.id)}
        disabled={isRevoking}
        className="text-destructive hover:text-destructive"
      >
        {isRevoking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function TrustedDevicesDialog({ open, onOpenChange }: TrustedDevicesDialogProps) {
  const t = useTranslations('twoFactor');
  const { data: devices, isLoading } = useTrustedDevices();
  const revokeMutation = useRevokeTrustedDevice();
  const revokeAllMutation = useRevokeAllTrustedDevices();

  const handleRevoke = (deviceId: string) => {
    revokeMutation.mutate(deviceId);
  };

  const handleRevokeAll = () => {
    revokeAllMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('trustedDevices.title')}</DialogTitle>
          <DialogDescription>
            {t('trustedDevices.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !devices || devices.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t('trustedDevices.empty')}
            </div>
          ) : (
            <>
              <div className="max-h-[300px] overflow-y-auto divide-y">
                {devices.map((device) => (
                  <DeviceItem
                    key={device.id}
                    device={device}
                    onRevoke={handleRevoke}
                    isRevoking={revokeMutation.isPending && revokeMutation.variables === device.id}
                  />
                ))}
              </div>

              {devices.length > 1 && (
                <>
                  <Separator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={revokeAllMutation.isPending}
                      >
                        {revokeAllMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('trustedDevices.removing')}
                          </>
                        ) : (
                          t('trustedDevices.removeAll')
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('trustedDevices.confirmRemoveAllTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('trustedDevices.confirmRemoveAllDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('trustedDevices.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevokeAll}>
                          {t('trustedDevices.confirmRemoveAll')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
