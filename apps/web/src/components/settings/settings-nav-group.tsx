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
    <div className="space-y-0.5">
      {/* Parent row — links to settings root, highlighted while on /settings */}
      <Link
        href="/settings"
        className={`group flex items-center justify-between border-l-[3px] px-3 py-2.5 text-sm transition-colors duration-150 ${
          onSettings
            ? 'border-white bg-[#5581C7] font-semibold text-white'
            : 'border-transparent font-medium text-[rgba(229,233,242,.72)] hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={`h-5 w-5 transition-colors ${
              onSettings ? 'text-white' : 'text-[rgba(229,233,242,.72)] group-hover:text-white'
            }`}
          />
          {item.name}
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            onSettings ? 'rotate-180 text-white' : 'text-[rgba(229,233,242,.5)]'
          }`}
        />
      </Link>

      {/* Sub-sections — only while the user is in settings */}
      {onSettings && (
        <div className="relative ml-[1.4rem] space-y-0.5 border-l border-white/15 pl-3">
          {SETTINGS_SECTIONS.map((section: SettingsSection) => {
            const SubIcon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <Link
                key={section.id}
                href={`/settings?section=${section.id}`}
                className={`group flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 font-semibold text-white'
                    : 'font-medium text-[rgba(229,233,242,.6)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <SubIcon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-white' : 'text-[rgba(229,233,242,.6)] group-hover:text-white'
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
