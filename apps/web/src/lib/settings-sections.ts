/* =============================================================================
 *  settings-sections.ts
 *  TARGET PATH: apps/web/src/lib/settings-sections.ts
 *
 *  Single source of truth for the settings sections — consumed by both the
 *  sidebar dropdown (SettingsNavGroup) and the settings page, plus the search
 *  index that powers SettingsSearch. Keep section ids in sync with the
 *  ?section= query param read by app/(dashboard)/settings/page.tsx.
 * ========================================================================== */

import { User, Shield, Bell, Palette, type LucideIcon } from 'lucide-react';

export type SettingsSectionId = 'account' | 'security' | 'notifications' | 'preferences';

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  sub: string;
  icon: LucideIcon;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'account', label: 'Account', sub: 'Profil & Stammdaten', icon: User },
  { id: 'security', label: 'Sicherheit', sub: 'Passwort & 2FA', icon: Shield },
  { id: 'notifications', label: 'Benachrichtigungen', sub: 'E-Mails & Tracking', icon: Bell },
  { id: 'preferences', label: 'Präferenzen', sub: 'Sprache, Design, Daten', icon: Palette },
];

export const DEFAULT_SECTION: SettingsSectionId = 'account';

/** Resolve the active section from the current pathname + ?section= param. */
export function resolveSection(pathname: string | null, sectionParam: string | null): SettingsSectionId {
  if (pathname?.startsWith('/settings/sessions')) return 'security';
  const valid = SETTINGS_SECTIONS.some((s) => s.id === sectionParam);
  return valid ? (sectionParam as SettingsSectionId) : DEFAULT_SECTION;
}

/** Flat, searchable index of individual settings — drives SettingsSearch. */
export interface SettingsSearchEntry {
  section: SettingsSectionId;
  title: string;
  keywords: string;
  icon: LucideIcon;
}

import {
  Mail, Camera, Trash2, Key, Monitor, Globe, Lock, RefreshCw, Search,
} from 'lucide-react';

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  { section: 'account', title: 'Vor- & Nachname', keywords: 'name profil vorname nachname', icon: User },
  { section: 'account', title: 'E-Mail-Adresse', keywords: 'email mail adresse login', icon: Mail },
  { section: 'account', title: 'Profilbild', keywords: 'avatar bild foto profilbild', icon: Camera },
  { section: 'account', title: 'Account löschen', keywords: 'löschen delete account entfernen dsgvo', icon: Trash2 },
  { section: 'security', title: 'Passwort ändern', keywords: 'passwort password ändern google login', icon: Key },
  { section: 'security', title: 'Zwei-Faktor-Authentifizierung (2FA)', keywords: '2fa zwei faktor authenticator sicherheit otp', icon: Shield },
  { section: 'security', title: 'Aktive Sitzungen', keywords: 'sitzungen sessions geräte abmelden devices', icon: Monitor },
  { section: 'notifications', title: 'E-Mail-Benachrichtigungen', keywords: 'email benachrichtigung newsletter updates', icon: Mail },
  { section: 'notifications', title: 'Automatisches Bewerbungs-Tracking', keywords: 'tracking postfach outlook gmail automatisch premium', icon: RefreshCw },
  { section: 'preferences', title: 'Sprache & Region', keywords: 'sprache language region deutsch english', icon: Globe },
  { section: 'preferences', title: 'Design / Theme', keywords: 'theme design dark mode hell dunkel erscheinungsbild', icon: Palette },
  { section: 'preferences', title: 'Datenschutz & Export', keywords: 'datenschutz privacy daten export download dsgvo öffentlich', icon: Lock },
];

export const SETTINGS_SEARCH_ICON = Search;
