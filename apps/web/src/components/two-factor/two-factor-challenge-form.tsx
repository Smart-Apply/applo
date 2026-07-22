'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Shield, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVerify2FALogin } from '@/hooks/use-two-factor';

interface TwoFactorChallengeFormProps {
  challengeToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorChallengeForm({
  challengeToken,
  onSuccess,
  onCancel,
}: TwoFactorChallengeFormProps) {
  const t = useTranslations('twoFactor');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [tab, setTab] = useState<'totp' | 'backup'>('totp');

  const verifyMutation = useVerify2FALogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await verifyMutation.mutateAsync({
      challengeToken,
      code,
      trustDevice,
    });

    if (result) {
      onSuccess();
    }
  };

  const handleCodeChange = (value: string) => {
    // For TOTP: only digits, max 6
    // For backup: alphanumeric, max 8
    if (tab === 'totp') {
      setCode(value.replace(/\D/g, '').slice(0, 6));
    } else {
      setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
    }
  };

  const isValidCode = tab === 'totp' ? code.length === 6 : code.length === 8;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-[3px] border border-primary-soft bg-primary-soft/60 flex items-center justify-center mb-4 dark:border-slate-600 dark:bg-slate-800">
          <Shield className="h-6 w-6 text-brand" />
        </div>
        <CardTitle>{t('challenge.title')}</CardTitle>
        <CardDescription>
          {t('challenge.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as 'totp' | 'backup'); setCode(''); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="totp" className="gap-2">
                <Shield className="h-4 w-4" />
                {t('challenge.authenticatorTab')}
              </TabsTrigger>
              <TabsTrigger value="backup" className="gap-2">
                <Key className="h-4 w-4" />
                {t('challenge.backupTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">{t('challenge.totpLabel')}</Label>
                <Input
                  id="totp-code"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="000000"
                  className="font-mono text-center text-2xl tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="backup-code">{t('challenge.backupLabel')}</Label>
                <Input
                  id="backup-code"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="font-mono text-center text-xl tracking-widest"
                  maxLength={8}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {t('challenge.backupHint')}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trust"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked === true)}
            />
            <Label htmlFor="trust" className="text-sm cursor-pointer">
              {t('challenge.trustDevice')}
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {t('challenge.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!isValidCode || verifyMutation.isPending}
              className="flex-1"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('challenge.checking')}
                </>
              ) : (
                t('challenge.confirm')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
