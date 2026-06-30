/* =============================================================================
 *  settings-nav-group.tsx
 *  TARGET PATH: apps/web/src/components/settings/settings-nav-group.tsx
 *
 *  Sidebar "Einstellungen" item that expands into its sub-sections while the
 *  user is on /settings. Replaces the single <NavLink> for the settings entry
 *  in app/(dashboard)/layout.tsx. Active section is driven by the ?section=
 *  query param (deep-linkable, shareable). Mirrors the styling of the existing
 *  NavLink so it sits seamlessly in the rail.
 * ========================================================================== */

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  SETTINGS_SECTIONS,
  resolveSection,
  type SettingsSection,
} from '@/lib/settings-sections';

interface NavItemLike {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SettingsNavGroup({ item }: { item: NavItemLike }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const Icon = item.icon;

  const onSettings = pathname?.startsWith('/settings') ?? false;
  const activeSection = resolveSection(pathname, searchParams.get('section'));

  return (
    <div className="space-y-1">
      {/* Parent row — links to settings root, highlighted while on /settings */}
      <Link
        href="/settings"
        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          onSettings
            ? 'bg-primary/5 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={`h-5 w-5 transition-colors ${
              onSettings ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            }`}
          />
          {item.name}
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            onSettings ? 'rotate-180 text-primary' : 'text-muted-foreground/70'
          }`}
        />
      </Link>

      {/* Sub-sections — only while the user is in settings */}
      {onSettings && (
        <div className="relative ml-[1.4rem] space-y-0.5 border-l border-border pl-3">
          {SETTINGS_SECTIONS.map((section: SettingsSection) => {
            const SubIcon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <Link
                key={section.id}
                href={`/settings?section=${section.id}`}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/5 font-semibold text-primary'
                    : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <SubIcon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                {section.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
