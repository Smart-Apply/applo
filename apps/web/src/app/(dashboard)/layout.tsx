'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { AppLogo } from '@/components/ui/app-logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CurrentTierBadge } from '@/components/subscription';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { useFeatureGate } from '@/hooks/use-tier-gate';
import type { TierFeatures } from '@/types';
import {
  FileText,
  User,
  LogOut,
  Lock,
  Menu,
  Home,
  Settings,
  MessagesSquare,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { SettingsNavGroup } from '@/components/settings/settings-nav-group';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * If set, the item is gated by this feature flag. Users without
   * access see a non-clickable, greyed-out tile with an upgrade tooltip
   * (no broken navigation into a paywalled page).
   */
  requiresFeature?: keyof TierFeatures;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Profil', href: '/profile', icon: User },
  { name: 'Bewerbungen', href: '/applications', icon: FileText },
  { name: 'Bewerbungs-Check', href: '/validate', icon: ShieldCheck },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, requiresFeature: 'advancedAnalytics' },
  { name: 'Interview-Coach', href: '/interviews', icon: MessagesSquare, requiresFeature: 'interviewCoach' },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Laden...</p>
          </div>
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, clearAuth, hasHydrated, setAuth } = useAuthStore();
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  // Mobile menu Sheet is controlled so the bottom-nav "Mehr" button and the
  // hamburger in the top header share the same drawer instance, and so we
  // can auto-close it on navigation (Sheet doesn't close on Link click by
  // default when it's controlled).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-collapse sidebar in edit mode
  const isEditMode = pathname?.includes('/edit');

  // Close the mobile drawer whenever the route changes — without this the
  // Sheet stays open after a user picks an item from the bottom-nav "Mehr"
  // menu and the new page is hidden behind the overlay. The setState IS the
  // synchronisation here (URL → dialog open state), so the rule's
  // auto-fix (move to render) would re-close the dialog on every render
  // and break it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Wait for auth store to hydrate from localStorage before checking auth
    if (!hasHydrated) return;

    // Handle OAuth success - fetch user data from cookies
    const oauthParam = searchParams.get('oauth');
    if (oauthParam === 'success' && !isAuthenticated && !isLoadingOAuth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingOAuth(true);
      
      // Fetch user data using the HttpOnly cookie set by OAuth callback
      api.auth.me()
        .then((userData) => {
          setAuth(userData);
          // Remove oauth query param from URL
          router.replace(pathname);
        })
        .catch((error) => {
          console.error('OAuth authentication failed:', error);
          router.push('/login?oauth=error');
        })
        .finally(() => {
          setIsLoadingOAuth(false);
        });
      return;
    }

    if (!isAuthenticated && !isLoadingOAuth) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router, searchParams, pathname, setAuth, isLoadingOAuth]);

  const handleLogout = async () => {
    try {
      // Call backend to clear cookie (GET request, no CSRF required)
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if backend call fails
    }

    // Clear local auth state
    clearAuth();
    router.push('/login');
  };

  // Show loading while hydrating, loading OAuth, or if not authenticated (redirect pending)
  if (!hasHydrated || isLoadingOAuth || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoadingOAuth ? 'Anmeldung wird abgeschlossen...' : 'Laden...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar - Hidden in edit mode */}
      {!isEditMode && (
        <aside className="sticky top-0 hidden h-screen w-[290px] flex-none bg-[#1B2A49] md:block z-20">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center px-4 border-b border-white/10">
              <Link href="/dashboard" className="flex items-center">
                <AppLogo className="w-[180px] h-auto brightness-0 invert" />
              </Link>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 py-6">
              <div className="mb-4 px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[.16em] text-[rgba(229,233,242,.45)]">
                Menu
              </div>
              {navigation.map((item) =>
                item.href === '/settings' ? (
                  <SettingsNavGroup key={item.name} item={item} />
                ) : (
                  <NavLink
                    key={item.name}
                    item={item}
                    isActive={pathname === item.href}
                  />
                ),
              )}
            </nav>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 border border-white/15 bg-white/5 p-3 transition-colors hover:bg-white/10 cursor-pointer group">
                <div className="font-heading flex h-9 w-9 flex-none items-center justify-center bg-[#5581C7] text-sm font-bold text-white">
                  {(user?.firstName || user?.email)?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.firstName || user?.email}
                    </p>
                    <CurrentTierBadge
                      size="sm"
                      className="rounded-none bg-white/10 font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-white/85"
                    />
                  </div>
                  <p className="truncate text-xs text-[rgba(229,233,242,.55)]">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-[3px] text-[rgba(229,233,242,.6)] hover:bg-[rgba(220,38,38,.4)] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Content column — single {children} prevents double-mount.
          min-w-0 is load-bearing: without it the flex item's implicit
          min-width:auto lets any wide intrinsic content (nowrap rows,
          horizontal scrollers) push the column past the viewport and the
          whole page scrolls sideways on mobile. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Email verification banner — in-flow (NOT fixed) so it pushes the
            header/content down instead of overlapping the mobile header
            and hamburger. */}
        <EmailVerificationBanner />
        {/* bg-background/95 (was /80) so scrolled content doesn't bleed
            through and visually "hover above" the logo — the issue
            surfaced in wave-2 E2E on iOS Chrome. backdrop-blur stays for
            the frosted-glass feel when something does peek through. */}
        <header className="md:hidden sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-md px-4">
          <Link href="/dashboard" className="flex items-center">
            <AppLogo className="h-10 w-auto" />
          </Link>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menü öffnen"
                // 44x44 minimum hit target — Apple HIG / Material guideline.
                className="h-11 w-11"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 bg-[#1B2A49] border-r-0">
              {/* Required by Radix Dialog for screen-reader users.
                  Hidden visually with `sr-only` so the existing logo/header
                  stays as the visible title. Without these, Radix's a11y
                  guard cascades into a React.Children.only crash that
                  bricks every page that mounts the dashboard layout. */}
              <SheetTitle className="sr-only">Hauptmenü</SheetTitle>
              <SheetDescription className="sr-only">
                Navigation des Applo Dashboards.
              </SheetDescription>
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center px-4 border-b border-white/10">
                  <Link href="/dashboard" className="flex items-center">
                    <AppLogo className="w-[220px] h-auto brightness-0 invert" />
                  </Link>
                </div>

                <nav className="flex-1 space-y-0.5 px-4 py-6">
                  <div className="mb-4 px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[.16em] text-[rgba(229,233,242,.45)]">
                    Menu
                  </div>
                  {navigation.map((item) =>
                    item.href === '/settings' ? (
                      <SettingsNavGroup key={item.name} item={item} />
                    ) : (
                      <NavLink
                        key={item.name}
                        item={item}
                        isActive={pathname === item.href}
                      />
                    ),
                  )}
                </nav>

                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center gap-3 border border-white/15 bg-white/5 p-3">
                    <div className="font-heading flex h-9 w-9 flex-none items-center justify-center bg-[#5581C7] text-sm font-bold text-white">
                      {(user?.firstName || user?.email)?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.firstName || user?.email}
                        </p>
                        <CurrentTierBadge
                          size="sm"
                          className="rounded-none bg-white/10 font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-white/85"
                        />
                      </div>
                      <p className="truncate text-xs text-[rgba(229,233,242,.55)]">{user?.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-[3px] text-[rgba(229,233,242,.6)] hover:bg-[rgba(220,38,38,.4)] hover:text-white"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        {/*
          pb compensates for the fixed bottom nav (~56px) plus the iOS home
          indicator (`env(safe-area-inset-bottom)`). Without this, the last
          row of every list/form gets covered by the nav.
        */}
        {/* Main Content — single {children} render, responsive padding */}
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:h-screen">
          {isEditMode ? (
            <div className="h-full md:p-4">{children}</div>
          ) : (
            <div className="md:mx-auto md:max-w-7xl md:p-8">{children}</div>
          )}
        </main>
        <div className="md:hidden">
          <MobileBottomNav onMoreClick={() => setMobileMenuOpen(true)} />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

/**
 * Single navigation item. Renders as a clickable Link when the user has
 * access (or no feature gate is set), otherwise as a non-clickable,
 * greyed-out tile with a tooltip prompting the user to upgrade.
 *
 * Why two render paths:
 *  - Free users clicking on a Premium-only link previously landed on a
 *    backend 403 / error page. By disabling the link entirely, there is
 *    no broken state to handle.
 *  - The lock icon + tooltip make it obvious *why* the item is disabled.
 */
function NavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const Icon = item.icon;

  if (item.requiresFeature) {
    return (
      <NavLinkGated item={item} isActive={isActive} Icon={Icon} />
    );
  }

  return (
    <Link
      href={item.href}
      className={`group flex items-center justify-between border-l-[3px] px-3 py-2.5 text-sm transition-colors duration-150 ${
        isActive
          ? 'border-white bg-[#5581C7] font-semibold text-white'
          : 'border-transparent font-medium text-[rgba(229,233,242,.72)] hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`h-5 w-5 transition-colors ${
            isActive ? 'text-white' : 'text-[rgba(229,233,242,.72)] group-hover:text-white'
          }`}
        />
        {item.name}
      </div>
    </Link>
  );
}

/**
 * Feature-gated nav item. We split this into its own component so the
 * `useFeatureGate` hook is only called for items that actually need it
 * (one subscription fetch instead of one per item).
 */
function NavLinkGated({
  item,
  isActive,
  Icon,
}: {
  item: NavItem;
  isActive: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const { hasAccess, isLoading } = useFeatureGate(item.requiresFeature!);

  // While the subscription tier is loading, render the item as a normal
  // link — avoids a flash of “locked” state for paying users.
  if (isLoading || hasAccess) {
    return (
      <Link
        href={item.href}
        className={`group flex items-center justify-between border-l-[3px] px-3 py-2.5 text-sm transition-colors duration-150 ${
          isActive
            ? 'border-white bg-[#5581C7] font-semibold text-white'
            : 'border-transparent font-medium text-[rgba(229,233,242,.72)] hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={`h-5 w-5 transition-colors ${
              isActive ? 'text-white' : 'text-[rgba(229,233,242,.72)] group-hover:text-white'
            }`}
          />
          {item.name}
        </div>
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* The wrapping span is required — Radix Tooltip needs a focusable
            target, but disabled <a> tags can't receive focus. */}
        <span
          aria-disabled="true"
          tabIndex={0}
          className="group flex cursor-not-allowed items-center justify-between border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-[rgba(229,233,242,.4)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-[rgba(229,233,242,.4)]" />
            {item.name}
          </div>
          <Lock className="h-3.5 w-3.5 text-[rgba(229,233,242,.4)]" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <p className="font-medium">Upgrade jetzt zu Premium</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.name} ist nur für Premium-Mitglieder verfügbar.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
