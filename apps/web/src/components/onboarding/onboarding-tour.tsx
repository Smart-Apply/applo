'use client';

/**
 * OnboardingTour — the in-app product guide.
 *
 * A step-by-step modal tour built from the existing shadcn/ui Dialog instead of
 * a tooltip-highlight library: the app has no stable anchor elements on every
 * route (the mobile layout swaps the sidebar for a bottom nav entirely), and a
 * modal behaves identically on desktop and mobile without a new dependency.
 *
 * Auto-opens once per user on the dashboard home and is re-openable at any time
 * from the sidebar help entry or the settings page. Completion is persisted in
 * `UserPreferences.onboardingCompleted`.
 *
 * NOTE: not to be confused with the `/onboarding` route, which is the
 * profile/résumé import flow (message keys `profile.onboarding.*`).
 */

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check, Crown, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpdateUserPreferences, useUserPreferences } from '@/hooks/use-user-preferences';
import { useOnboardingTourStore } from '@/stores/onboarding-store';
import { ONBOARDING_STEPS } from './onboarding-steps';

/** Route the tour is allowed to open itself on — where users land after login. */
const AUTO_OPEN_PATH = '/dashboard';

export function OnboardingTour() {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common.actions');
  const router = useRouter();
  const pathname = usePathname();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const isOpen = useOnboardingTourStore((state) => state.isOpen);
  const closeTour = useOnboardingTourStore((state) => state.closeTour);

  const [stepIndex, setStepIndex] = useState(0);
  // Guards the window between "user closed the tour" and the server having
  // stored `onboardingCompleted` — without it the derived auto-open below
  // would immediately re-open the dialog.
  const [autoOpenDismissed, setAutoOpenDismissed] = useState(false);

  // Derived (no effect): first-run auto-open, only on the post-login landing
  // page and only until the user has finished or skipped the tour once.
  const shouldAutoOpen =
    !autoOpenDismissed &&
    pathname === AUTO_OPEN_PATH &&
    preferences !== undefined &&
    !preferences.onboardingCompleted;

  const open = isOpen || shouldAutoOpen;

  const step = ONBOARDING_STEPS[stepIndex];
  const totalSteps = ONBOARDING_STEPS.length;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const Icon = step.icon;
  const href = step.href;

  const rawBullets: unknown = t.raw(`tour.steps.${step.id}.bullets`);
  const bullets = Array.isArray(rawBullets)
    ? rawBullets.filter((bullet): bullet is string => typeof bullet === 'string')
    : [];

  /** Close the tour and remember that it must not auto-open again. */
  const dismiss = () => {
    setAutoOpenDismissed(true);
    setStepIndex(0);
    closeTour();

    if (preferences && !preferences.onboardingCompleted) {
      updatePreferences.mutate({ onboardingCompleted: true });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) dismiss();
  };

  const goToStep = (href: string) => {
    dismiss();
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {/* Header band — step counter, title, progress */}
        <div className="relative bg-[#1B2A49] px-5 py-4 text-white sm:px-6">
          <DialogClose
            className="absolute top-4 right-4 text-white/60 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
            aria-label={tCommon('close')}
          >
            <X className="h-4 w-4" />
          </DialogClose>

          <p className="font-mono text-[10.5px] font-semibold tracking-[.16em] text-white/60 uppercase">
            {t('tour.stepIndicator', { current: stepIndex + 1, total: totalSteps })}
          </p>
          <DialogTitle className="font-heading mt-1.5 pr-8 text-xl font-extrabold tracking-[-.02em] text-white">
            {t(`tour.steps.${step.id}.title`)}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-white/70">
            {t(`tour.steps.${step.id}.description`)}
          </DialogDescription>

          <div
            className="mt-4 flex gap-1"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={stepIndex + 1}
            aria-label={t('tour.progressLabel')}
          >
            {ONBOARDING_STEPS.map((progressStep, index) => (
              <span
                key={progressStep.id}
                className={`h-1 flex-1 ${index <= stepIndex ? 'bg-white' : 'bg-white/25'}`}
              />
            ))}
          </div>
        </div>

        {/* Step body */}
        <div className="max-h-[46vh] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <span className="border-primary-soft bg-primary-soft/60 text-brand grid h-10 w-10 flex-none place-items-center border dark:border-slate-600 dark:bg-slate-800">
              <Icon className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1 space-y-3">
              {step.access && (
                <Badge
                  variant={step.access === 'premium' ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {step.access === 'premium' ? (
                    <Crown className="h-3 w-3" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {t(`tour.badges.${step.access}`)}
                </Badge>
              )}

              {bullets.length > 0 && (
                <ul className="space-y-2">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm leading-relaxed">
                      <Check className="text-brand mt-0.5 h-4 w-4 flex-none" />
                      <span className="text-muted-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {href && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => goToStep(href)}
                >
                  {t(`tour.steps.${step.id}.cta`)}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-border bg-muted/40 flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {isLastStep ? (
            <span className="hidden sm:block" />
          ) : (
            <Button variant="ghost" size="sm" onClick={dismiss}>
              {t('tour.actions.skip')}
            </Button>
          )}

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setStepIndex((index) => index - 1)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                {t('tour.actions.back')}
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => (isLastStep ? dismiss() : setStepIndex((index) => index + 1))}
            >
              {isLastStep ? t('tour.actions.finish') : t('tour.actions.next')}
              {isLastStep ? (
                <Check className="ml-1.5 h-4 w-4" />
              ) : (
                <ArrowRight className="ml-1.5 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
