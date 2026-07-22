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
  labelKey: string;
  subKey: string;
  icon: LucideIcon;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'account', labelKey: 'sections.account.label', subKey: 'sections.account.sub', icon: User },
  { id: 'security', labelKey: 'sections.security.label', subKey: 'sections.security.sub', icon: Shield },
  { id: 'notifications', labelKey: 'sections.notifications.label', subKey: 'sections.notifications.sub', icon: Bell },
  { id: 'preferences', labelKey: 'sections.preferences.label', subKey: 'sections.preferences.sub', icon: Palette },
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
  titleKey: string;
  keywordsKey: string;
  icon: LucideIcon;
}

import {
  Mail, Camera, Trash2, Key, Monitor, Globe, Lock, RefreshCw, Search,
} from 'lucide-react';

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  { section: 'account', titleKey: 'search.items.name', keywordsKey: 'search.keywords.name', icon: User },
  { section: 'account', titleKey: 'search.items.email', keywordsKey: 'search.keywords.email', icon: Mail },
  { section: 'account', titleKey: 'search.items.photo', keywordsKey: 'search.keywords.photo', icon: Camera },
  { section: 'account', titleKey: 'search.items.deleteAccount', keywordsKey: 'search.keywords.deleteAccount', icon: Trash2 },
  { section: 'security', titleKey: 'search.items.password', keywordsKey: 'search.keywords.password', icon: Key },
  { section: 'security', titleKey: 'search.items.twoFactor', keywordsKey: 'search.keywords.twoFactor', icon: Shield },
  { section: 'security', titleKey: 'search.items.sessions', keywordsKey: 'search.keywords.sessions', icon: Monitor },
  { section: 'notifications', titleKey: 'search.items.emailNotifications', keywordsKey: 'search.keywords.emailNotifications', icon: Mail },
  { section: 'notifications', titleKey: 'search.items.emailTracking', keywordsKey: 'search.keywords.emailTracking', icon: RefreshCw },
  { section: 'preferences', titleKey: 'search.items.language', keywordsKey: 'search.keywords.language', icon: Globe },
  { section: 'preferences', titleKey: 'search.items.theme', keywordsKey: 'search.keywords.theme', icon: Palette },
  { section: 'preferences', titleKey: 'search.items.privacy', keywordsKey: 'search.keywords.privacy', icon: Lock },
];

export const SETTINGS_SEARCH_ICON = Search;
