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

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        toast.error('Fehler beim Laden der Einstellungen');
      } finally {
        setIsLoadingPreferences(false);
      }
    };
    loadPreferences();
  }, []);

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await api.auth.updateProfile({ firstName, lastName });
      updateUser({ firstName: updatedUser.firstName, lastName: updatedUser.lastName });
      toast.success('Profil erfolgreich aktualisiert');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Fehler beim Aktualisieren des Profils');
      } else {
        toast.error('Fehler beim Aktualisieren des Profils');
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
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setIsLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      toast.success('Passwort erfolgreich geändert. Bitte melden Sie sich erneut an.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearAuth();
      router.push('/login');
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.data?.message || error.message || 'Fehler beim Ändern des Passworts';
        toast.error(Array.isArray(message) ? message[0] : message);
      } else {
        toast.error('Fehler beim Ändern des Passworts');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isOAuthOnlyAccount) {
      if (deleteEmailConfirm.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()) {
        toast.error('Bitte gib deine E-Mail-Adresse zur Bestätigung ein');
        return;
      }
    } else if (!deletePassword) {
      toast.error('Bitte geben Sie Ihr Passwort ein');
      return;
    }

    setIsDeleting(true);
    try {
      await api.auth.deleteAccount(isOAuthOnlyAccount ? {} : { password: deletePassword });
      toast.success('Account wurde gelöscht');
      clearAuth();
      router.push('/');
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.data?.message || error.message || 'Fehler beim Löschen des Accounts';
        toast.error(Array.isArray(message) ? message[0] : message);
      } else {
        toast.error('Fehler beim Löschen des Accounts');
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
      toast.success('Einstellung gespeichert');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'Fehler beim Speichern der Einstellung');
      } else {
        toast.error('Fehler beim Speichern der Einstellung');
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
        <h1 className="mb-2 font-heading text-[26px] font-extrabold tracking-[-.025em] text-foreground md:text-[30px]">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalte deinen Account, deine Sicherheit und deine Präferenzen.
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
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= ACCOUNT ================= */}
      {section === 'account' && (
        <div className="space-y-6">
          <SectionHeader icon={User} title="Account" sub="Verwalte deine persönlichen Informationen und Account-Daten." />

          <Card>
            <CardHeader>
              <CardTitle>Profil-Informationen</CardTitle>
              <CardDescription>Diese Angaben erscheinen auf deinen generierten Unterlagen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary-soft bg-primary-soft/60 font-heading text-2xl font-bold text-brand dark:border-slate-600 dark:bg-slate-800">
                  {initial}
                </div>
                <div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" type="button">
                      <Camera className="h-4 w-4" /> Bild hochladen
                    </Button>
                    <Button variant="ghost" size="sm" type="button">Entfernen</Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">JPG oder PNG, max. 2 MB.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Max" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mustermann" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <div className="relative">
                    <Input id="email" type="email" value={email} disabled className="bg-muted pr-9" />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> Mit deinem Anbieter verknüpft — die E-Mail-Adresse kann nicht geändert werden.
                  </p>
                </div>
                {/* submit handled by the sticky ProfileSaveBar; this enables Enter-to-save */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Account löschen</CardTitle>
              <CardDescription>Lösche deinen Account und alle zugehörigen Daten permanent.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Account löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bist du dir sicher?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten,
                      einschließlich Profil, Bewerbungen und Stellenanzeigen werden permanent gelöscht.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    {isOAuthOnlyAccount ? (
                      <>
                        <Label htmlFor="deleteEmailConfirm">Gib deine E-Mail-Adresse zur Bestätigung ein</Label>
                        <Input
                          id="deleteEmailConfirm" type="email" autoComplete="off"
                          value={deleteEmailConfirm} onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                          placeholder={user?.email ?? ''} className="mt-2"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Du hast dich mit einem externen Anbieter angemeldet und kein Passwort gesetzt.
                          Bitte tippe stattdessen deine E-Mail-Adresse ein, um die Löschung zu bestätigen.
                        </p>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="deletePassword">Passwort zur Bestätigung</Label>
                        <Input
                          id="deletePassword" type="password" value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)} placeholder="••••••••" className="mt-2"
                        />
                      </>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setDeletePassword(''); setDeleteEmailConfirm(''); }}>
                      Abbrechen
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting || !canConfirmDelete}
                    >
                      {isDeleting ? 'Wird gelöscht...' : 'Account löschen'}
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
          <SectionHeader icon={Shield} title="Sicherheit" sub="Schütze deinen Account mit zusätzlichen Sicherheitsmaßnahmen." />

          <Card>
            <CardHeader>
              <CardTitle>Passwort ändern</CardTitle>
              <CardDescription>
                {isOAuthOnlyAccount
                  ? 'Dein Account ist mit einem externen Anbieter verknüpft. Es ist kein Passwort gesetzt, das du ändern könntest.'
                  : 'Aktualisiere dein Passwort regelmäßig für mehr Sicherheit'}
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
                      Anmeldung über <span className="capitalize">{user?.provider ?? 'OAuth'}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verwalte dein Passwort direkt bei deinem Anbieter.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" type="button">
                    <ExternalLink className="h-4 w-4" /> Verwalten
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Neues Passwort</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Wird geändert...' : 'Passwort ändern'}
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>

          <TwoFactorStatusCard />

          <Card>
            <CardHeader>
              <CardTitle>Aktive Sitzungen</CardTitle>
              <CardDescription>Verwalte deine aktiven Sitzungen auf verschiedenen Geräten</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/sessions">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> Sitzungen verwalten
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
          <SectionHeader icon={Bell} title="Benachrichtigungen" sub="Entscheide, worüber und wann Applo dich auf dem Laufenden hält." />

          <Card>
            <CardHeader>
              <CardTitle>E-Mail-Benachrichtigungen</CardTitle>
              <CardDescription>Wähle aus, welche E-Mails du erhalten möchtest</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <PrefLoader />
              ) : (
                <div className="divide-y divide-border">
                  <div className="pb-3">
                    <SettingToggleRow
                      icon={FileText}
                      title="Bewerbungs-Updates"
                      description="Status-Änderungen und Erinnerungen zu deinen Bewerbungen."
                      checked={!!preferences?.applicationUpdates}
                      onCheckedChange={(v) => handleUpdatePreference('applicationUpdates', v)}
                    />
                  </div>
                  <div className="py-3">
                    <SettingToggleRow
                      icon={Search}
                      title="Neue Stellenanzeigen"
                      description="Passende Stellen, sobald sie verfügbar sind."
                      checked={!!preferences?.newJobPostings}
                      onCheckedChange={(v) => handleUpdatePreference('newJobPostings', v)}
                    />
                  </div>
                  <div className="pt-3">
                    <SettingToggleRow
                      icon={Mail}
                      title="Produkt & Newsletter"
                      description="Neue Features, Tipps und gelegentliche Angebote."
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
          <SectionHeader icon={Palette} title="Präferenzen" sub="Passe Applo an deine Sprache, dein Design und deine Datenschutz-Wünsche an." />

          <Card>
            <CardHeader>
              <CardTitle>Sprache & Region</CardTitle>
              <CardDescription>Bestimmt die Sprache der Oberfläche und der generierten Unterlagen.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <PrefLoader />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="language">Sprache</Label>
                  <Select value={preferences?.language || 'de'} onValueChange={(value) => handleUpdatePreference('language', value)}>
                    <SelectTrigger id="language" className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="es">🇪🇸 Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Design</CardTitle>
              <CardDescription>Wähle, wie Applo aussehen soll. &bdquo;System&ldquo; folgt den Einstellungen deines Geräts.</CardDescription>
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
              <CardTitle>Datenschutz</CardTitle>
              <CardDescription>Du behältst die Kontrolle über deine Daten.</CardDescription>
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
                        title="Öffentliches Profil"
                        description="Dein Profil kann von anderen gesehen werden."
                        checked={!!preferences?.profilePublic}
                        onCheckedChange={(v) => handleUpdatePreference('profilePublic', v)}
                      />
                    </div>
                    <div className="pt-3">
                      <SettingToggleRow
                        icon={BarChart3}
                        title="Anonyme Nutzungsdaten"
                        description="Hilf uns, Applo zu verbessern. Keine personenbezogenen Inhalte."
                        checked={!!preferences?.analyticsEnabled}
                        onCheckedChange={(v) => handleUpdatePreference('analyticsEnabled', v)}
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label>Meine Daten exportieren</Label>
                      <p className="text-sm text-muted-foreground">
                        Lade alle deine bei uns gespeicherten Daten als JSON-Datei herunter (DSGVO Art. 15 / 20).
                      </p>
                    </div>
                    <Button
                      variant="outline" size="sm" disabled={isExporting}
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          await api.auth.exportData();
                          toast.success('Datenexport heruntergeladen');
                        } catch {
                          toast.error('Datenexport fehlgeschlagen. Bitte versuche es erneut.');
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                    >
                      {isExporting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird vorbereitet...</>
                      ) : (
                        <><Download className="mr-2 h-4 w-4" /> Herunterladen</>
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
