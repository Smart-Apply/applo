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
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusChip, TRACKING_STATUS_CHIP } from '@/components/ui/status-chip';
import { HairlineGrid } from '@/components/ui/hairline-grid';
import { SectionLabel } from '@/components/ui/section-label';
import { ApploFlyer } from '@/components/ui/applo-rig';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Calendar,
  ChevronRight,
  Zap,
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

  // Mascot fly-in state machine: flying → landed (wave ~3s) → rested.
  // `.rested` is additive on top of `.landed` — the CSS relies on both
  // classes being present. Replay = remount the flyer via `flyKey`.
  const [flyPhase, setFlyPhase] = useState<'flying' | 'landed' | 'rested'>('flying');
  const [flyKey, setFlyKey] = useState(0);
  const restTimer = useRef<number>(0);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    // Full reduced-motion fallback: no flight, mascot resting at the end
    // position (CSS pins the flyer), calm face, no wave.
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion.current) {
      setFlyPhase('rested');
    }
    return () => window.clearTimeout(restTimer.current);
  }, []);

  const handleFlyerAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== 'dashFly' || prefersReducedMotion.current) return;
    setFlyPhase('landed');
    window.clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => setFlyPhase('rested'), 3200);
  };

  const replayFlyIn = () => {
    if (prefersReducedMotion.current) return;
    window.clearTimeout(restTimer.current);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('page.greeting.morning');
    if (hour < 18) return t('page.greeting.day');
    return t('page.greeting.evening');
  };

  const monthLabel = new Intl.DateTimeFormat(getIntlLocale(), { month: 'long', year: 'numeric' }).format(new Date());

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome hero — navy glow band with the Applo fly-in. Click to replay. */}
      <div
        className="bg-brand-glow relative cursor-pointer overflow-hidden rounded-[4px] p-7 sm:p-9"
        onClick={replayFlyIn}
        title={t('page.heroReplayTitle')}
      >
        <div className="relative z-10">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[.14em] text-brand">
            {t('page.eyebrow', { month: monthLabel })}
          </p>
          <h1 className="font-heading mt-3 text-[clamp(28px,3.4vw,38px)] font-extrabold tracking-[-.03em] text-white">
            {t('page.welcome', { greeting: getGreeting(), name: user?.firstName || t('page.fallbackUser') })}
          </h1>
          <p className="mt-2.5 max-w-[600px] text-base leading-relaxed text-[rgba(229,233,242,.75)]">
            {t.rich('page.summary', {
              count: stats.active,
              strong: (chunks) => <span className="font-bold text-white">{chunks}</span>,
            })}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="rounded-[3px] bg-white text-[#1B2A49] hover:bg-[#E5E9F2]"
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
              className="rounded-[3px] border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
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

        {/* Applo “Superman” fly-in layer (hidden ≤820px via CSS) */}
        <div className="dash-applo-layer pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[196px]" aria-hidden>
          <div
            key={flyKey}
            className={`dash-flyer${flyPhase !== 'flying' ? ' landed' : ''}${flyPhase === 'rested' ? ' rested' : ''}`}
            onAnimationEnd={handleFlyerAnimationEnd}
          >
            <ApploFlyer />
          </div>
        </div>
      </div>

      {/* Stats — hairline 1px grid, mono numbers */}
      <HairlineGrid className="grid-cols-2 lg:grid-cols-4">
        <StatsCard title={t('page.stats.total')} value={stats.total} icon={FileText} />
        <StatsCard title={t('page.stats.active')} value={stats.active} icon={Clock} />
        <StatsCard title={t('page.stats.interviews')} value={stats.interviews} icon={Calendar} />
        <StatsCard title={t('page.stats.offers')} value={stats.offers} icon={CheckCircle} />
      </HairlineGrid>

      {/* grid-cols-1 (minmax(0,1fr)) is required: without it the implicit
          `auto` track sizes to the widest nowrap row content and the whole
          page overflows horizontally on mobile. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Applications */}
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b px-5 py-5">
              <div>
                <CardTitle className="font-heading text-lg font-bold tracking-[-.01em]">{t('page.recent.title')}</CardTitle>
                <CardDescription className="mt-0.5 text-[13px]">{t('page.recent.description')}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-[3px] text-[13px] font-semibold"
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
                  <div className="grid grid-cols-[24px_1fr] border-b bg-muted/50 px-5 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground/70">
                    <span>#</span>
                    <span>{t('page.recent.positionCompany')}</span>
                  </div>
                  <div>
                    {applications.slice(0, 5).map((app, i) => {
                      const chip = TRACKING_STATUS_CHIP[app.applicationStatus] ?? TRACKING_STATUS_CHIP.CREATED;
                      return (
                        <div
                          key={app.id}
                          className="group flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/50 sm:gap-4 sm:px-5"
                        >
                          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <span className="w-5 flex-none font-mono text-xs text-muted-foreground/70">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <h4 className="truncate text-[15px] font-semibold text-foreground">
                                {app.title || t('page.recent.untitledApplication')}
                              </h4>
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
                            <div className="hidden min-w-[72px] text-right sm:block">
                              <SectionLabel className="text-[9.5px] tracking-[.1em] text-muted-foreground/70">{t('page.recent.updated')}</SectionLabel>
                              <p className="mt-0.5 text-[12.5px] font-medium text-foreground">
                                {formatDateSmart(app.updatedAt)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-[3px] text-muted-foreground hover:bg-primary hover:text-primary-foreground"
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
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="font-heading text-base font-bold">{t('page.profile.title')}</CardTitle>
              <CardDescription className="text-[13px]">{t('page.profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {isProfileLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-3xl font-semibold leading-none text-foreground">
                      {profileStrength.score}
                      <span className="text-base text-muted-foreground/70">%</span>
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[.08em] text-brand">
                      {profileStrength.score === 100 ? t('page.profile.perfect') : t('page.profile.almostDone')}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden bg-primary-soft dark:bg-slate-700">
                    <div
                      className="h-full bg-brand transition-all duration-500 ease-out"
                      style={{ width: `${profileStrength.score}%` }}
                    />
                  </div>
                  <div className="space-y-2 pt-1.5">
                    {profileStrength.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2.5 text-[13.5px] ${
                          suggestion.completed ? 'text-muted-foreground' : 'font-medium text-foreground'
                        }`}
                      >
                        {suggestion.completed ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" className="flex-none" aria-hidden>
                            <rect x="1" y="1" width="22" height="22" className="fill-success" />
                            <path d="M7 12.5 L10.5 16 L17 8.5" fill="none" stroke="#fff" strokeWidth="2.6" />
                          </svg>
                        ) : (
                          <span className="box-border h-[15px] w-[15px] flex-none border-2 border-muted-foreground/50" />
                        )}
                        <span>{suggestion.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-1.5 w-full rounded-[3px] border-primary font-semibold hover:bg-primary-soft"
                    onClick={() => router.push('/profile')}
                  >
                    {t('page.profile.edit')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Summary */}
          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="font-heading flex items-center gap-2 text-base font-bold">
                <Zap className="h-4 w-4 text-brand" />
                {t('page.usage.title')}
              </CardTitle>
              <CardDescription className="text-[13px]">{t('page.usage.description')}</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <UsageSummary showPeriod />
            </CardContent>
          </Card>

          {/* Activity Notice */}
          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="font-heading flex items-center gap-2 text-base font-bold">
                <TrendingUp className="h-4 w-4 text-brand" />
                {t('page.trends.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="border-l-[3px] border-brand bg-muted px-4 py-3.5">
                <p className="text-[13.5px] leading-relaxed text-foreground">
                  <span className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-brand">
                    {t('page.trends.tipLabel')}
                  </span>
                  {t('page.trends.tip')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
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
    <div className="flex items-start justify-between gap-3 bg-card p-5 transition-colors hover:bg-muted/60">
      <div>
        <SectionLabel>{title}</SectionLabel>
        <span className="mt-2.5 block font-mono text-[32px] font-semibold leading-none tracking-[-.02em] text-foreground">
          {value}
        </span>
      </div>
      <div className="grid h-10 w-10 flex-none place-items-center border border-border bg-muted text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
