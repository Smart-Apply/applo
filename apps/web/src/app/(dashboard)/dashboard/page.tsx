'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useProfile } from '@/hooks/use-profile';
import { api } from '@/lib/api-client';
import { Application } from '@/types';
import { calculateProfileStrength } from '@/lib/profile-utils';
import { UsageSummary } from '@/components/subscription';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusChip, TRACKING_STATUS_CHIP } from '@/components/ui/status-chip';
import { HairlineGrid } from '@/components/ui/hairline-grid';
import { SectionLabel } from '@/components/ui/section-label';
import { ApploFlyer } from '@/components/ui/applo-rig';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton, SkeletonScreen } from '@/components/shared/skeletons';
import { CalendarCard } from '@/components/dashboard/calendar-card';

// Landing poses for the dashboard mascot — one is picked at random on each
// touchdown. Each maps to a `.pose-*` CSS class on the `.dash-flyer` wrapper.
const APPLO_POSES = ['wave', 'celebrate', 'search', 'love', 'done'] as const;
type ApploPose = (typeof APPLO_POSES)[number];
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  Briefcase,
  ArrowRight,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatDateSmart } from '@/lib/format-date';
import { getIntlLocale } from '@/lib/i18n-runtime';

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const { user } = useAuthStore();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    interviews: 0,
    offers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Mascot fly-in state machine: flying → landed. On landing Applo strikes
  // one of five poses (never the same twice in a row); the pose maps to a
  // `.pose-*` class the CSS animates. Replay = remount the flyer via `flyKey`.
  const [flyPhase, setFlyPhase] = useState<'flying' | 'landed'>('flying');
  const [pose, setPose] = useState<ApploPose>(APPLO_POSES[0]);
  const [flyKey, setFlyKey] = useState(0);
  const prefersReducedMotion = useRef(false);
  const poseRef = useRef<ApploPose>(APPLO_POSES[0]);

  // Fit-to-viewport: keep the whole dashboard on ONE screen (no page scroll)
  // by gently scaling down on desktop when the content is taller than the
  // window. The content is already compact, so this is usually 0.9–1.0 (often
  // a no-op on tall screens); a floor keeps it readable on short windows.
  // CSS `zoom` reflows layout (parent reserves the scaled height, no overflow
  // hack); we measure via getBoundingClientRect and divide out the applied
  // zoom to recover the natural height, re-fitting each frame.
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);

  // Pick a fresh pose, never repeating the current one.
  const nextPose = () => {
    const rest = APPLO_POSES.filter((p) => p !== poseRef.current);
    const chosen = rest[Math.floor(Math.random() * rest.length)];
    poseRef.current = chosen;
    return chosen;
  };

  useEffect(() => {
    // Full reduced-motion fallback: no flight, mascot pinned at the end
    // position (CSS) in its first pose, calm face, no looping animation.
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion.current) {
      setFlyPhase('landed');
    }
  }, []);

  const handleFlyerAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== 'dashFly' || prefersReducedMotion.current) return;
    setPose(nextPose());
    setFlyPhase('landed');
  };

  const replayFlyIn = () => {
    if (prefersReducedMotion.current) {
      setPose(nextPose());
      return;
    }
    setFlyPhase('flying');
    setFlyKey((k) => k + 1);
  };

  // Calculate profile strength using centralized utility
  const profileStrength = calculateProfileStrength(profile, user);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const response = await api.applications.list({ includeJobPosting: true });
        const apps = response.items; // Extract items from paginated response
        setApplications(apps);

        // Calculate stats
        const newStats = {
          total: apps.length,
          active: apps.filter(
            (a: Application) =>
              !['REJECTED', 'ACCEPTED'].includes(a.applicationStatus)
          ).length,
          interviews: apps.filter((a: Application) => a.applicationStatus === 'INTERVIEW')
            .length,
          offers: apps.filter((a: Application) => a.applicationStatus === 'ACCEPTED').length,
        };
        setStats(newStats);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  useEffect(() => {
    // Only fit on desktop (md+); mobile stays a natural, scrollable column.
    const GAP = 8; // small safety margin below the content
    let raf = 0;
    let current = 1;
    const tick = () => {
      const el = contentRef.current;
      if (el && window.innerWidth >= 768) {
        const rect = el.getBoundingClientRect();
        const natural = rect.height / current; // divide out the applied zoom
        // Fit into the VISIBLE viewport. Subtleties:
        //  1) Measure the visual viewport, NOT <main>: with `md:h-screen` +
        //     `flex-1` (default `min-height:auto`) <main> grows to its own
        //     content height once the page overflows, so its clientHeight
        //     yields no constraint and the scale would stick at 1.
        //  2) topOffset is scroll-INDEPENDENT: rect.top + scrollY recovers the
        //     constant chrome ABOVE the content (header + verification banner +
        //     padding). Raw viewport-relative rect.top would let a scroll feed
        //     back into the scale and resize every tile while scrolling.
        //  3) Subtract the chrome BELOW the content too: the shared layout
        //     wrapper (md:p-8) and <main> add bottom padding that isn't part of
        //     `el`. Without it the content overflows by that padding and the
        //     page keeps a few scroll pixels (which the scroll lock would clip).
        const wrapperCS = el.parentElement ? getComputedStyle(el.parentElement) : null;
        const mainEl = el.closest('main');
        const mainCS = mainEl ? getComputedStyle(mainEl) : null;
        const bottomChrome =
          (wrapperCS ? parseFloat(wrapperCS.paddingBottom) || 0 : 0) +
          (mainCS ? parseFloat(mainCS.paddingBottom) || 0 : 0);
        const viewportH = window.visualViewport?.height ?? window.innerHeight;
        const topOffset = rect.top + window.scrollY;
        const available = viewportH - topOffset - bottomChrome - GAP;
        if (natural > 0 && available > 0) {
          // Floor keeps it readable on very short windows. Because the layout is
          // now lighter (Market-Trends card removed) the roomier typography and
          // elements still fit one screen — the fit usually lands near 1, so the
          // bigger sizing actually shows instead of being scaled away.
          const next = Math.max(0.5, Math.min(1, available / natural));
          if (Math.abs(next - current) > 0.004) {
            current = next;
            setFitScale(next);
          }
        }
      } else if (current !== 1) {
        current = 1;
        setFitScale(1);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Lock the dashboard to a single screen on desktop. The content is
  // zoom-fitted to the viewport (see above), so a scrollbar is never needed;
  // hiding overflow guarantees it and also stops a stray scroll from feeding
  // back into the fit. Mobile keeps its natural, scrollable column. Both the
  // page and <main> are unlocked again on unmount so every OTHER dashboard
  // route scrolls normally.
  useEffect(() => {
    const html = document.documentElement;
    const main = document.querySelector('main') as HTMLElement | null;
    const apply = () => {
      const lock = window.innerWidth >= 768;
      html.style.overflow = lock ? 'hidden' : '';
      if (main) main.style.overflow = lock ? 'hidden' : '';
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      html.style.overflow = '';
      if (main) main.style.overflow = '';
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('page.greeting.morning');
    if (hour < 18) return t('page.greeting.day');
    return t('page.greeting.evening');
  };

  const monthLabel = new Intl.DateTimeFormat(getIntlLocale(), { month: 'long', year: 'numeric' }).format(new Date());

  if (isLoading) {
    return (
      <SkeletonScreen>
        <DashboardSkeleton />
      </SkeletonScreen>
    );
  }

  return (
    <div ref={contentRef} style={{ zoom: fitScale }} className="space-y-3">
      {/* Welcome hero — soft blue band with the Applo fly-in. Click to replay.
          Compact density ported from the Dashboard.dc mock (min-height 172). */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-[4px]"
        style={{
          background: '#AFC4E4',
          color: '#1B2A49',
          minHeight: 184,
          padding: '16px clamp(28px,26%,200px) 16px 28px',
        }}
        onClick={replayFlyIn}
        title={t('page.heroReplayTitle')}
      >
        {/* Decorative overlays: dotted grid, faint scanlines, corner glow */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            opacity: 0.2,
            backgroundImage: 'radial-gradient(#1B2A49 1px, transparent 1.2px)',
            backgroundSize: '6px 6px',
            maskImage: 'radial-gradient(120% 90% at 30% 8%, #000 0%, #000 44%, transparent 82%)',
            WebkitMaskImage: 'radial-gradient(120% 90% at 30% 8%, #000 0%, #000 44%, transparent 82%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background: 'repeating-linear-gradient(180deg, rgba(27,42,73,.06) 0 2px, rgba(255,255,255,0) 2px 5px)',
            maskImage: 'linear-gradient(180deg, #000 0%, #000 52%, transparent 84%)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 52%, transparent 84%)',
          }}
        />
        <div
          className="pointer-events-none absolute z-[1] h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: '26%',
            top: '60%',
            background: 'radial-gradient(closest-side, rgba(255,255,255,.7) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div className="relative z-10">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[.14em] text-[#40639C]">
            {t('page.eyebrow', { month: monthLabel })}
          </p>
          <h1 className="font-heading mt-1.5 text-[clamp(25px,2.5vw,31px)] font-extrabold leading-[1.05] tracking-[-.03em] text-[#1B2A49]">
            {t('page.welcome', { greeting: getGreeting(), name: user?.firstName || t('page.fallbackUser') })}
          </h1>
          <p className="mt-2 max-w-[460px] text-[15px] leading-relaxed text-[#3A4F76]">
            {t.rich('page.summary', {
              count: stats.active,
              strong: (chunks) => <span className="font-bold text-[#1B2A49]">{chunks}</span>,
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              className="h-10 rounded-[3px] px-4 text-sm bg-[#1B2A49] text-white hover:bg-[#15233f]"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/applications/new');
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('page.actions.newApplication')}
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-[3px] px-4 text-sm border-[#1B2A49] bg-white/70 text-[#1B2A49] hover:bg-white hover:text-[#1B2A49]"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/jobs');
              }}
            >
              <Briefcase className="mr-1 h-4 w-4" />
              {t('page.actions.findJobs')}
            </Button>
          </div>
        </div>

        {/* Applo “Superman” fly-in layer (hidden ≤860px via CSS) */}
        <div className="dash-applo-layer pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[166px]" aria-hidden>
          <div
            key={flyKey}
            className={`dash-flyer${flyPhase === 'landed' ? ` landed pose-${pose}` : ''}`}
            onAnimationEnd={handleFlyerAnimationEnd}
          >
            <ApploFlyer />
          </div>
        </div>
      </div>

      {/* Stats — navy tiles on a hairline 1px grid, mono numbers */}
      <HairlineGrid className="grid-cols-2 border-[#33456b] bg-[#33456b] lg:grid-cols-4">
        <StatsCard title={t('page.stats.total')} value={stats.total} icon={FileText} />
        <StatsCard title={t('page.stats.active')} value={stats.active} icon={Clock} />
        <StatsCard title={t('page.stats.interviews')} value={stats.interviews} icon={Calendar} />
        <StatsCard title={t('page.stats.offers')} value={stats.offers} icon={CheckCircle} />
      </HairlineGrid>

      {/* grid-cols-1 (minmax(0,1fr)) is required: without it the implicit
          `auto` track sizes to the widest nowrap row content and the whole
          page overflows horizontally on mobile. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Recent Applications */}
          <Card className="gap-0 overflow-hidden border-[#33456b] py-0 lg:col-span-2 lg:row-start-1">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-[#33456b] bg-[#1B2A49] px-4 py-2.5 pb-2.5!">
              <div>
                <h2 className="font-heading text-lg font-bold leading-none tracking-[-.01em] text-white">{t('page.recent.title')}</h2>
                <CardDescription className="mt-0.5 text-[13.5px] text-white/60">{t('page.recent.description')}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-[3px] border-white bg-white text-sm font-semibold text-[#1B2A49] hover:bg-white/90 hover:text-[#1B2A49]"
                onClick={() => router.push('/applications')}
              >
                {t('page.recent.showAll')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {applications.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={t('page.recent.emptyTitle')}
                  description={t('page.recent.emptyDescription')}
                  action={{
                    label: t('page.recent.emptyAction'),
                    onClick: () => router.push('/applications/new'),
                  }}
                />
              ) : (
                <>
                  <div className="grid grid-cols-[28px_1fr] border-b border-[#33456b] bg-muted/50 px-4 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[.12em] text-muted-foreground">
                    <span>#</span>
                    <span>{t('page.recent.positionCompany')}</span>
                  </div>
                  {/* Caps at ~4 roomier rows and scrolls beyond, but hugs the
                      content when there are fewer (no dead space). Kept tight so
                      the bigger typography still fits one screen. Mobile stays
                      natural. */}
                  <div className="sm:max-h-[180px] sm:overflow-y-auto">
                    {applications.map((app, i) => {
                      const chip = TRACKING_STATUS_CHIP[app.applicationStatus] ?? TRACKING_STATUS_CHIP.CREATED;
                      const appTitle = app.title || t('page.recent.untitledApplication');
                      return (
                        <div
                          key={app.id}
                          className="group flex items-center justify-between gap-3 border-b border-[#33456b]/40 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50 sm:h-[52px] sm:gap-4"
                        >
                          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <span className="w-6 flex-none font-mono text-[13px] text-muted-foreground">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-[14.5px] font-semibold text-foreground">
                                {appTitle}
                              </h3>
                              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                                {app.jobPosting?.company || app.jobPosting?.location || t('page.recent.noDetails')}
                              </p>
                              <StatusChip tone={chip.tone} className="mt-1.5 sm:hidden">
                                {chip.label}
                              </StatusChip>
                            </div>
                          </div>

                          <div className="flex flex-none items-center gap-3 sm:gap-5">
                            <StatusChip tone={chip.tone} className="hidden sm:inline-flex">
                              {chip.label}
                            </StatusChip>
                            <div className="hidden min-w-[80px] text-right sm:block">
                              <SectionLabel className="text-[10.5px] tracking-[.1em] text-muted-foreground">{t('page.recent.updated')}</SectionLabel>
                              <p className="mt-0.5 text-[13.5px] font-medium text-foreground">
                                {formatDateSmart(app.updatedAt)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label={t('page.a11y.openApplication', { name: appTitle })}
                              className="h-9 w-9 rounded-[3px] text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                              onClick={() => router.push(`/applications/${app.id}`)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Interview calendar — row 2, aligned under the applications card. */}
          <CalendarCard className="lg:col-span-2 lg:row-start-2" />

          {/* Profile Completion — top-right, aligned with the applications card. */}
          <Card className="gap-0 overflow-hidden border-[#33456b] py-0 lg:col-start-3 lg:row-start-1">
            <CardHeader className="border-b border-[#33456b] bg-[#1B2A49] px-4 py-2.5 pb-2.5!">
              <h2 className="font-heading text-base font-bold leading-none text-white">{t('page.profile.title')}</h2>
              <CardDescription className="text-[13px] text-white/60">{t('page.profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="px-3.5 py-3">
              {isProfileLoading ? (
                <div className="flex h-24 flex-col justify-center gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-3xl font-semibold leading-none text-foreground">
                      {profileStrength.score}
                      <span className="text-lg text-muted-foreground">%</span>
                    </span>
                    <span className="font-mono text-[12px] uppercase tracking-[.08em] text-brand-strong">
                      {profileStrength.score === 100 ? t('page.profile.perfect') : t('page.profile.almostDone')}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden bg-primary-soft dark:bg-slate-700"
                    role="progressbar"
                    aria-valuenow={profileStrength.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('page.a11y.profileStrength')}
                  >
                    <div
                      className="h-full bg-brand transition-all duration-500 ease-out"
                      style={{ width: `${profileStrength.score}%` }}
                    />
                  </div>
                  <div className="space-y-1">
                    {profileStrength.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-[12.5px] ${
                          suggestion.completed ? 'text-muted-foreground' : 'font-medium text-foreground'
                        }`}
                      >
                        {suggestion.completed ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" className="flex-none" aria-hidden>
                            <rect x="1" y="1" width="22" height="22" className="fill-success" />
                            <path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.6" />
                          </svg>
                        ) : (
                          <span className="box-border h-[16px] w-[16px] flex-none border-2 border-muted-foreground/50" />
                        )}
                        <span>{suggestion.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-1 h-8 w-full rounded-[3px] border-primary text-[13px] font-semibold hover:bg-primary-soft"
                    onClick={() => router.push('/profile')}
                  >
                    {t('page.profile.edit')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Summary — row 2, stretches to the calendar's height so both
              cards are the same size and bottom-aligned. */}
          <Card className="gap-0 overflow-hidden border-[#33456b] py-0 lg:col-start-3 lg:row-start-2">
            <CardHeader className="border-b border-[#33456b] bg-[#1B2A49] px-4 py-2.5 pb-2.5!">
              <h2 className="font-heading text-base font-bold leading-none text-white">
                {t('page.usage.title')}
              </h2>
              <CardDescription className="text-[13px] text-white/60">{t('page.usage.description')}</CardDescription>
            </CardHeader>
            <CardContent className="px-3.5 py-3">
              <UsageSummary showPeriod className="space-y-1.5" />
            </CardContent>
          </Card>
      </div>
    </div >
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-2.5 bg-[#1B2A49] p-3.5 transition-colors hover:bg-[#22355c]">
      <div>
        <SectionLabel className="text-[12px] text-white/55">{title}</SectionLabel>
        <span className="mt-1 block font-mono text-[26px] font-semibold leading-none tracking-[-.02em] text-white">
          {value}
        </span>
      </div>
      <div className="grid h-9 w-9 flex-none place-items-center text-white">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}
