'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Sparkles,
  User,
  Menu,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { useFeatureGate } from '@/hooks/use-tier-gate';
import type { TierFeatures } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Items shown on the always-visible mobile bottom navigation. We pick the
 * five highest-value destinations and surface everything else behind the
 * existing hamburger Sheet (rendered via the `onMoreClick` prop).
 *
 * Why not include every nav item:
 *  - More than 5 tap targets on a 360px screen forces icons below ~52px
 *    wide which iOS HIG / Material guidelines call out as too small.
 *  - The Sheet drawer remains the source of truth for the full menu, so
 *    nothing is hidden — just deprioritised on a narrow screen.
 */
interface BottomNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /**
   * If set, the item is gated by this feature flag. Free users see a
   * subtle lock badge instead of the active indicator and tapping still
   * navigates to the page (which renders its own paywall card).
   */
  requiresFeature?: keyof TierFeatures;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { name: 'Start', href: '/dashboard', icon: Home },
  { name: 'Bewerbungen', href: '/applications', icon: FileText },
  {
    name: 'Job-Suche',
    href: '/job-search',
    icon: Sparkles,
    requiresFeature: 'linkedinImport',
  },
  { name: 'Profil', href: '/profile', icon: User },
];

interface MobileBottomNavProps {
  /**
   * Called when the user taps the "Mehr" item. The dashboard layout wires
   * this to the existing Sheet trigger so the full menu (Settings,
   * Analytics, Interview-Coach, Auto-Apply, logout) is one tap away.
   */
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden',
        // Respect the iOS home indicator so the tap row never sits under it.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <li key={item.href} className="contents">
            <BottomNavLink item={item} pathname={pathname} />
          </li>
        ))}
        <li className="contents">
          <button
            type="button"
            onClick={onMoreClick}
            aria-label="Weitere Menüpunkte öffnen"
            className={cn(
              'flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5',
              'text-[11px] font-medium text-muted-foreground',
              'transition-colors active:bg-muted/40',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Menu className="h-5 w-5" aria-hidden />
            <span>Mehr</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Single bottom-nav entry. Split out so feature-gated items can call the
 * subscription hook without forcing every tab to re-render on tier
 * changes.
 */
function BottomNavLink({
  item,
  pathname,
}: {
  item: BottomNavItem;
  pathname: string | null;
}) {
  // Gated items still navigate — the destination page handles the
  // upsell. We only use the gate result to render a small lock badge so
  // free users get a heads-up before tapping.
  const featureKey = item.requiresFeature;
  const gate = useFeatureGate(featureKey ?? 'linkedinImport');
  const isLocked = featureKey != null && !gate.isLoading && !gate.hasAccess;
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5',
        'text-[11px] font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground active:bg-muted/40',
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" aria-hidden />
        {isLocked && (
          <Lock
            className="absolute -right-1.5 -top-1 h-2.5 w-2.5 text-muted-foreground/70"
            aria-hidden
          />
        )}
      </span>
      <span className="leading-tight">{item.name}</span>
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary"
        />
      )}
    </Link>
  );
}
