/* =============================================================================
 *  page.tsx — Settings (REDESIGN)
 *  TARGET PATH: apps/web/src/app/(dashboard)/settings/page.tsx
 *
 *  What changed (UI only — all data logic preserved verbatim):
 *   • Tabs → section-driven view keyed off the ?section= query param, so the
 *     sidebar dropdown (SettingsNavGroup) and search can deep-link into it.
 *   • Aktiviert/Deaktiviert buttons → real <Switch> rows (SettingToggleRow).
 *   • Theme <Select> → visual ThemeCards.
 *   • Profile "Speichern" button → sticky ProfileSaveBar (only on dirty edits).
 *   • Added SettingsSearch (find any setting), icon section headers, a
 *     mobile-only section pill strip (the desktop nav lives in the sidebar).
 *
 *  Preserved unchanged: api.userPreferences (get/update), api.auth
 *  (updateProfile / changePassword / deleteAccount / exportData), useAuthStore,
 *  TwoFactorStatusCard, EmailTrackingSection, PremiumSupportCard, the
 *  OAuth-only delete-confirm logic, and every toast.
 *
 *  PREREQ: shadcn Switch primitive →  npx shadcn@latest add switch
 * ========================================================================== */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  User, Shield, Bell, Palette, Trash2, ChevronRight, Loader2, Download,
  Mail, Camera, Key, Lock, FileText, Search, Monitor, BarChart3, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { UserPreferences } from '@/types';
import { ApiError } from '@/lib/errors';
import { TwoFactorStatusCard } from '@/components/two-factor';
import { PremiumSupportCard } from '@/components/subscription/premium-support-card';
import { EmailTrackingSection } from '@/components/settings/email-tracking-section';
import {
  SETTINGS_SECTIONS, resolveSection, type SettingsSectionId,
} from '@/lib/settings-sections';
import { SettingToggleRow } from '@/components/settings/setting-toggle-row';
import { ThemeCards } from '@/components/settings/theme-cards';
import { ProfileSaveBar } from '@/components/settings/profile-save-bar';
import { SettingsSearch } from '@/components/settings/settings-search';
import { useLocaleSwitch } from '@/components/i18n/language-switcher';

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('settings');
  const tLanguage = useTranslations('common.language');
  const { switchLocale } = useLocaleSwitch();
  const section = resolveSection(pathname, searchParams.get('section'));
  const setSection = (id: SettingsSectionId) =>
    router.push(`/settings?section=${id}`, { scroll: false });

  const { user, clearAuth, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email] = useState(user?.email || '');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');

  const isOAuthOnlyAccount = user?.hasPassword === false;
  const canConfirmDelete = isOAuthOnlyAccount
    ? deleteEmailConfirm.trim().toLowerCase() === (user?.email ?? '').toLowerCase()
    : deletePassword.length > 0;

  const profileDirty =
    firstName !== (user?.firstName || '') || lastName !== (user?.lastName || '');

  // User preferences
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const data = await api.userPreferences.get();
        setPreferences(data);
      } catch (error) {
        console.error('Failed to load preferences:', error);
        toast.error(t('page.toasts.loadError'));
      } finally {
        setIsLoadingPreferences(false);
      }
    };
    loadPreferences();
  }, [t]);

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await api.auth.updateProfile({ firstName, lastName });
      updateUser({ firstName: updatedUser.firstName, lastName: updatedUser.lastName });
      toast.success(t('account.toasts.profileUpdated'));
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || t('account.toasts.profileUpdateError'));
      } else {
        toast.error(t('account.toasts.profileUpdateError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    void saveProfile();
  };

  const discardProfile = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('security.toasts.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('security.toasts.passwordTooShort'));
      return;
    }

    setIsLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      toast.success(t('security.toasts.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearAuth();
      router.push('/login');
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.data?.message || error.message || t('security.toasts.passwordChangeError');
        toast.error(Array.isArray(message) ? message[0] : message);
      } else {
        toast.error(t('security.toasts.passwordChangeError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isOAuthOnlyAccount) {
      if (deleteEmailConfirm.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()) {
        toast.error(t('account.toasts.emailConfirmRequired'));
        return;
      }
    } else if (!deletePassword) {
      toast.error(t('account.toasts.passwordRequired'));
      return;
    }

    setIsDeleting(true);
    try {
      await api.auth.deleteAccount(isOAuthOnlyAccount ? {} : { password: deletePassword });
      toast.success(t('account.toasts.deleted'));
      clearAuth();
      router.push('/');
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.data?.message || error.message || t('account.toasts.deleteError');
        toast.error(Array.isArray(message) ? message[0] : message);
      } else {
        toast.error(t('account.toasts.deleteError'));
      }
    } finally {
      setIsDeleting(false);
      setDeletePassword('');
      setDeleteEmailConfirm('');
    }
  };

  const handleUpdatePreference = async (key: keyof UserPreferences, value: boolean | string) => {
    if (!preferences) return;
    try {
      const updatedPreferences = await api.userPreferences.update({ [key]: value });
      setPreferences(updatedPreferences);
      toast.success(t('page.toasts.preferenceSaved'));
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || t('page.toasts.preferenceSaveError'));
      } else {
        toast.error(t('page.toasts.preferenceSaveError'));
      }
    }
  };

  const PrefLoader = () => (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );

  const initial = (user?.firstName || user?.email)?.charAt(0).toUpperCase() ?? 'A';

  return (
    <div className="mx-auto max-w-3xl pb-28">
      {/* Page head + search */}
      <div className="mb-6">
        <h1 className="mb-2 font-heading text-[26px] font-extrabold tracking-[-.025em] text-foreground md:text-[30px]">{t('page.title')}</h1>
        <p className="text-muted-foreground">
          {t('page.description')}
        </p>
        <div className="mt-4">
          <SettingsSearch />
        </div>
      </div>

      {/* Mobile section switcher (desktop nav lives in the sidebar dropdown) */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4 md:hidden">
        <div className="inline-flex gap-px overflow-hidden rounded-[4px] border border-border bg-border">
          {SETTINGS_SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = s.id === section;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(s.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= ACCOUNT ================= */}
      {section === 'account' && (
        <div className="space-y-6">
          <SectionHeader icon={User} title={t('sections.account.label')} sub={t('sections.account.headerSub')} />

          <Card>
            <CardHeader>
              <CardTitle>{t('account.profile.title')}</CardTitle>
              <CardDescription>{t('account.profile.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary-soft bg-primary-soft/60 font-heading text-2xl font-bold text-brand dark:border-slate-600 dark:bg-slate-800">
                  {initial}
                </div>
                <div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" type="button">
                      <Camera className="h-4 w-4" /> {t('account.profile.uploadPhoto')}
                    </Button>
                    <Button variant="ghost" size="sm" type="button">{t('account.profile.removePhoto')}</Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{t('account.profile.photoHint')}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('account.profile.firstName')}</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Max" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('account.profile.lastName')}</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mustermann" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('account.profile.email')}</Label>
                  <div className="relative">
                    <Input id="email" type="email" value={email} disabled className="bg-muted pr-9" />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> {t('account.profile.emailLinked')}
                  </p>
                </div>
                {/* submit handled by the sticky ProfileSaveBar; this enables Enter-to-save */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t('account.delete.title')}</CardTitle>
              <CardDescription>{t('account.delete.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> {t('account.delete.action')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('account.delete.dialogTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('account.delete.dialogDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    {isOAuthOnlyAccount ? (
                      <>
                        <Label htmlFor="deleteEmailConfirm">{t('account.delete.emailConfirmLabel')}</Label>
                        <Input
                          id="deleteEmailConfirm" type="email" autoComplete="off"
                          value={deleteEmailConfirm} onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                          placeholder={user?.email ?? ''} className="mt-2"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('account.delete.oauthHint')}
                        </p>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="deletePassword">{t('account.delete.passwordLabel')}</Label>
                        <Input
                          id="deletePassword" type="password" value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)} placeholder="••••••••" className="mt-2"
                        />
                      </>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setDeletePassword(''); setDeleteEmailConfirm(''); }}>
                      {t('account.delete.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting || !canConfirmDelete}
                    >
                      {isDeleting ? t('account.delete.deleting') : t('account.delete.action')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <PremiumSupportCard />
        </div>
      )}

      {/* ================= SECURITY ================= */}
      {section === 'security' && (
        <div className="space-y-6">
          <SectionHeader icon={Shield} title={t('sections.security.label')} sub={t('sections.security.headerSub')} />

          <Card>
            <CardHeader>
              <CardTitle>{t('security.password.title')}</CardTitle>
              <CardDescription>
                {isOAuthOnlyAccount
                  ? t('security.password.oauthDescription')
                  : t('security.password.description')}
              </CardDescription>
            </CardHeader>
            {isOAuthOnlyAccount ? (
              <CardContent>
                <div className="flex items-center gap-4 rounded-[4px] border border-border p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
                    <Key className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {t.rich('security.password.providerLogin', {
                        provider: user?.provider ?? 'OAuth',
                        providerSpan: (chunks) => <span className="capitalize">{chunks}</span>,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('security.password.providerHint')}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" type="button">
                    <ExternalLink className="h-4 w-4" /> {t('security.password.manage')}
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('security.password.current')}</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('security.password.new')}</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('security.password.confirm')}</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? t('security.password.changing') : t('security.password.action')}
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>

          <TwoFactorStatusCard />

          <Card>
            <CardHeader>
              <CardTitle>{t('sessions.title')}</CardTitle>
              <CardDescription>{t('sessions.cardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/sessions">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> {t('sessions.manage')}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= NOTIFICATIONS ================= */}
      {section === 'notifications' && (
        <div className="space-y-6">
          <SectionHeader icon={Bell} title={t('sections.notifications.label')} sub={t('sections.notifications.headerSub')} />

          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.email.title')}</CardTitle>
              <CardDescription>{t('notifications.email.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <PrefLoader />
              ) : (
                <div className="divide-y divide-border">
                  <div className="pb-3">
                    <SettingToggleRow
                      icon={FileText}
                      title={t('notifications.email.applicationUpdates.title')}
                      description={t('notifications.email.applicationUpdates.description')}
                      checked={!!preferences?.applicationUpdates}
                      onCheckedChange={(v) => handleUpdatePreference('applicationUpdates', v)}
                    />
                  </div>
                  <div className="py-3">
                    <SettingToggleRow
                      icon={Search}
                      title={t('notifications.email.newJobPostings.title')}
                      description={t('notifications.email.newJobPostings.description')}
                      checked={!!preferences?.newJobPostings}
                      onCheckedChange={(v) => handleUpdatePreference('newJobPostings', v)}
                    />
                  </div>
                  <div className="pt-3">
                    <SettingToggleRow
                      icon={Mail}
                      title={t('notifications.email.marketing.title')}
                      description={t('notifications.email.marketing.description')}
                      checked={!!preferences?.marketingEmails}
                      onCheckedChange={(v) => handleUpdatePreference('marketingEmails', v)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Tracking (Premium) — unchanged component */}
          <EmailTrackingSection
            preferences={preferences}
            onTogglePreference={(key, value) => handleUpdatePreference(key, value)}
            isLoadingPreferences={isLoadingPreferences}
          />
        </div>
      )}

      {/* ================= PREFERENCES ================= */}
      {section === 'preferences' && (
        <div className="space-y-6">
          <SectionHeader icon={Palette} title={t('sections.preferences.label')} sub={t('sections.preferences.headerSub')} />

          <Card>
            <CardHeader>
              <CardTitle>{t('preferences.language.title')}</CardTitle>
              <CardDescription>{t('preferences.language.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <PrefLoader />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="language">{t('preferences.language.label')}</Label>
                  <Select
                    value={locale}
                    onValueChange={(value) => {
                      void handleUpdatePreference('language', value);
                      switchLocale(value as 'de' | 'en');
                    }}
                  >
                    <SelectTrigger id="language" className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">{tLanguage('de')}</SelectItem>
                      <SelectItem value="en">{tLanguage('en')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('preferences.design.title')}</CardTitle>
              <CardDescription>{t('preferences.design.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <PrefLoader />
              ) : (
                <ThemeCards
                  value={
                    (((preferences?.theme as string) || 'system').toLowerCase() as
                      | 'system'
                      | 'light'
                      | 'dark')
                  }
                  onChange={(value) => handleUpdatePreference('theme', value)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('preferences.privacy.title')}</CardTitle>
              <CardDescription>{t('preferences.privacy.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <PrefLoader />
              ) : (
                <div className="space-y-1">
                  <div className="divide-y divide-border">
                    <div className="pb-3">
                      <SettingToggleRow
                        icon={User}
                        title={t('preferences.privacy.publicProfile.title')}
                        description={t('preferences.privacy.publicProfile.description')}
                        checked={!!preferences?.profilePublic}
                        onCheckedChange={(v) => handleUpdatePreference('profilePublic', v)}
                      />
                    </div>
                    <div className="pt-3">
                      <SettingToggleRow
                        icon={BarChart3}
                        title={t('preferences.privacy.analytics.title')}
                        description={t('preferences.privacy.analytics.description')}
                        checked={!!preferences?.analyticsEnabled}
                        onCheckedChange={(v) => handleUpdatePreference('analyticsEnabled', v)}
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label>{t('preferences.export.title')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('preferences.export.description')}
                      </p>
                    </div>
                    <Button
                      variant="outline" size="sm" disabled={isExporting}
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          await api.auth.exportData();
                          toast.success(t('preferences.export.success'));
                        } catch {
                          toast.error(t('preferences.export.error'));
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                    >
                      {isExporting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('preferences.export.preparing')}</>
                      ) : (
                        <><Download className="mr-2 h-4 w-4" /> {t('preferences.export.download')}</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sticky save bar — profile edits only */}
      <ProfileSaveBar
        visible={section === 'account' && profileDirty}
        saving={isLoading}
        onSave={saveProfile}
        onDiscard={discardProfile}
      />
    </div>
  );
}

/* Section header with an icon chip. */
function SectionHeader({
  icon: Icon, title, sub,
}: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-3 font-heading text-[22px] font-extrabold tracking-[-.02em]">
        <span className="flex h-9 w-9 items-center justify-center rounded-[3px] border border-primary-soft bg-primary-soft/60 text-brand dark:border-slate-600 dark:bg-slate-800">
          <Icon className="h-[19px] w-[19px]" />
        </span>
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
