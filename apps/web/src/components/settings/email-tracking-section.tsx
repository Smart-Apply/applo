'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Plug,
  Trash2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useFeatureGate } from '@/hooks/use-tier-gate';
import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt';
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
import type { MailboxConnection, UserPreferences } from '@/types';

interface EmailTrackingSectionProps {
  preferences: UserPreferences | null;
  onTogglePreference: (key: 'emailTrackingNotify', value: boolean) => Promise<void> | void;
  /** True while preferences are still loading. */
  isLoadingPreferences: boolean;
}

/**
 * Settings section that lets a Premium user connect their Outlook / Microsoft 365
 * mailbox so applo can detect company replies (interview invites,
 * confirmations, rejections) and update the matching application status
 * automatically.
 *
 * Renders inside the "Benachrichtigungen" tab — keeps everything email-
 * related in one place rather than introducing a new top-level navigation
 * item, matching the requirement that this should NOT be a separate tab.
 */
export function EmailTrackingSection({
  preferences,
  onTogglePreference,
  isLoadingPreferences,
}: EmailTrackingSectionProps) {
  const t = useTranslations('settings');
  const { hasAccess, isLoading: gateLoading } = useFeatureGate('emailParsing');
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ['mailbox-sync', 'connections'],
    queryFn: () => api.mailboxSync.listConnections(),
    enabled: hasAccess,
    refetchOnWindowFocus: false,
  });

  // Surface the OAuth round-trip outcome as a toast on first mount.
  // `?email_tracking=connected` / `?email_tracking=error&reason=...`.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('email_tracking');
    if (!status) return;

    if (status === 'connected') {
      toast.success(t('emailTracking.toasts.connected'));
    } else if (status === 'error') {
      const reason = params.get('reason') || 'unknown';
      toast.error(t('emailTracking.toasts.connectionFailed', { reason }));
    }

    // Strip the query params from the URL without reloading.
    const url = new URL(window.location.href);
    url.searchParams.delete('email_tracking');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.toString());
  }, [t]);

  const connectMutation = useMutation({
    mutationFn: () => api.mailboxSync.initiateMicrosoft(),
    onSuccess: ({ authorizationUrl }) => {
      window.location.href = authorizationUrl; // full-page redirect to Microsoft
    },
    onError: (error: Error) => {
      const msg =
        error instanceof ApiError ? error.message : t('emailTracking.toasts.connectStartFailed');
      toast.error(msg);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.mailboxSync.disconnect(id),
    onSuccess: () => {
      toast.success(t('emailTracking.toasts.disconnected'));
      queryClient.invalidateQueries({ queryKey: ['mailbox-sync', 'connections'] });
    },
    onError: (error: Error) => {
      const msg = error instanceof ApiError ? error.message : t('emailTracking.toasts.disconnectFailed');
      toast.error(msg);
    },
  });

  const microsoftConnection = useMemo(
    () => connectionsQuery.data?.find((c) => c.provider === 'MICROSOFT'),
    [connectionsQuery.data],
  );

  // Premium gate first — non-Premium users see the upgrade prompt.
  if (gateLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('emailTracking.loadingTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAccess) {
    return (
      <UpgradePrompt
        feature={t('emailTracking.feature')}
        requiredTier="PREMIUM"
        description={t('emailTracking.upgradeDescription')}
        variant="default"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t('emailTracking.title')}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            Premium
          </Badge>
        </div>
        <CardDescription>
          {t('emailTracking.description')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {connectionsQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('emailTracking.loadingConnections')}
          </div>
        )}

        {/* Microsoft connection slot */}
        <ConnectionRow
          providerLabel="Microsoft 365 / Outlook"
          connection={microsoftConnection}
          onConnect={() => connectMutation.mutate()}
          onDisconnect={(id) => disconnectMutation.mutate(id)}
          isConnecting={connectMutation.isPending}
          isDisconnecting={disconnectMutation.isPending}
        />

        {/* Gmail placeholder — shipped once Google App Verification clears. */}
        <ConnectionRow
          providerLabel="Gmail / Google Workspace"
          connection={undefined}
          onConnect={() => {}}
          onDisconnect={() => {}}
          isConnecting={false}
          isDisconnecting={false}
          comingSoon
        />

        <Separator />

        {/* Notification preference — independent of the "applicationUpdates"
            switch above, so the user can keep generic app updates ON but
            silence the per-tracking-event mails (or vice-versa). */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium leading-none">
              {t('emailTracking.notify.title')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('emailTracking.notify.description')}
            </p>
          </div>
          <Button
            variant={preferences?.emailTrackingNotify ? 'default' : 'outline'}
            size="sm"
            disabled={isLoadingPreferences}
            onClick={() =>
              onTogglePreference('emailTrackingNotify', !preferences?.emailTrackingNotify)
            }
          >
            {preferences?.emailTrackingNotify ? t('emailTracking.enabled') : t('emailTracking.disabled')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          {t.rich('emailTracking.privacyNote', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </CardContent>
    </Card>
  );
}

interface ConnectionRowProps {
  providerLabel: string;
  connection: MailboxConnection | undefined;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
  comingSoon?: boolean;
}

function ConnectionRow({
  providerLabel,
  connection,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
  comingSoon,
}: ConnectionRowProps) {
  const t = useTranslations('settings');
  return (
    <div className="flex items-start justify-between gap-4 rounded-[4px] border p-4">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium leading-none">{providerLabel}</p>
          {comingSoon && (
            <Badge variant="outline" className="text-xs">
              {t('emailTracking.connection.comingSoon')}
            </Badge>
          )}
          {connection?.status === 'ACTIVE' && (
            <Badge className="border-[#BFE9CC] bg-[#ECFAF0] text-success hover:bg-[#ECFAF0] dark:border-green-400/30 dark:bg-green-400/10 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('emailTracking.connection.active')}
            </Badge>
          )}
          {connection?.status === 'ERROR' && (
            <Badge className="border-[#F3C9C9] bg-[#FDEEEE] text-destructive hover:bg-[#FDEEEE] dark:border-red-400/30 dark:bg-red-400/10 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t('emailTracking.connection.error')}
            </Badge>
          )}
        </div>

        {connection ? (
          <>
            <p className="text-sm text-muted-foreground truncate">
              {connection.emailAddress}
            </p>
            {connection.status === 'ERROR' && connection.lastErrorMessage && (
              <p className="text-xs text-destructive truncate">
                {connection.lastErrorMessage}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {comingSoon
              ? t('emailTracking.connection.googleVerification')
              : t('emailTracking.connection.notConnected')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {connection ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDisconnecting}>
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('emailTracking.connection.disconnect')}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('emailTracking.connection.disconnectTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.rich('emailTracking.connection.disconnectDescription', {
                    email: connection.emailAddress,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('emailTracking.connection.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDisconnect(connection.id)}>
                  {t('emailTracking.connection.disconnect')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            size="sm"
            onClick={onConnect}
            disabled={comingSoon || isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plug className="h-4 w-4 mr-1" />
                {t('emailTracking.connection.connect')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
