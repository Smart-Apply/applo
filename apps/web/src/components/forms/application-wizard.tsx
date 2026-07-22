'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { CenteredLoader } from '@/components/shared/loading';
import { ApploGuide } from '@/components/ui/applo-guide';
import type { ApploGuideStep } from '@/components/ui/applo-guide';
import { JobStep } from '@/components/forms/wizard/job-step';
import { ConfigureStep } from '@/components/forms/wizard/configure-step';
import { Check, Briefcase, Settings, Sparkles, ArrowRight } from 'lucide-react';
import type { JobPosting } from '@/types';
import { cn } from '@/lib/utils';

type WizardStep = 'job' | 'configure' | 'generate';

interface StepConfig {
  id: WizardStep;
  titleKey: 'steps.job.shortTitle' | 'steps.configure.shortTitle' | 'steps.generate.shortTitle';
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepConfig[] = [
  { id: 'job', titleKey: 'steps.job.shortTitle', icon: Briefcase },
  { id: 'configure', titleKey: 'steps.configure.shortTitle', icon: Settings },
  { id: 'generate', titleKey: 'steps.generate.shortTitle', icon: Sparkles },
];

// Only de/en — the generation prompts never fully supported fr/es/it
// (see docs/bug_fixes/LANGUAGE_SWITCH_EXPORT.md).
export type ApplicationLanguage = 'de' | 'en';

interface ApplicationWizardProps {
  initialJobPosting?: JobPosting | null;
}

export function ApplicationWizard({ initialJobPosting }: ApplicationWizardProps = {}) {
  const router = useRouter();
  const t = useTranslations('wizard');
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    initialJobPosting ? 'configure' : 'job',
  );
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(
    initialJobPosting ?? null,
  );
  const [generation, setGeneration] = useState({ generating: false, finishing: false });

  const { data: profile, isLoading: profileLoading } = useProfile();

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleGenerationStateChange = useCallback((generating: boolean, finishing: boolean) => {
    setGeneration(prev =>
      prev.generating === generating && prev.finishing === finishing
        ? prev
        : { generating, finishing },
    );
  }, []);

  const guideStep: ApploGuideStep =
    currentStep === 'job' ? 'add' : generation.generating ? 'loading' : 'config';

  useEffect(() => {
    if (!profileLoading && profile) {
      const hasMinimalProfile = profile.summary || (profile.skills && profile.skills.length > 0);
      if (!hasMinimalProfile) {
        router.replace('/onboarding');
      }
    }
  }, [profile, profileLoading, router]);

  const handleJobCreated = (jobPosting: JobPosting) => {
    setSelectedJob(jobPosting);
  };

  const handleNext = () => {
    if (currentStep === 'job' && selectedJob) {
      setCurrentStep('configure');
    }
  };

  const handleCancel = () => {
    router.push('/applications');
  };

  if (profileLoading) {
    return <CenteredLoader message={t('page.loading')} />;
  }

  return (
    <div className="space-y-4">
      {/* Navy Applo guide strip + step indicator */}
      <div>
        <ApploGuide step={guideStep} finishing={generation.finishing} className="mb-7" />

        {/* Step Indicator — square tiles, mono labels, green fill connectors */}
        <div className="mx-auto mb-8 grid w-full max-w-lg grid-cols-[1fr_auto_1fr_auto_1fr] items-start">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = index < currentStepIndex;
            const isTodo = index > currentStepIndex;

            return (
              <Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center border transition-all duration-300',
                        isCompleted && 'border-[#16A34A] bg-[#16A34A] text-white',
                        isActive && 'border-[#1B2A49] bg-[#1B2A49] text-white',
                        isTodo && 'border-[#E0E0E0] bg-[#F5F6F8] text-[#A0A0A0]',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    {isActive && (
                      <span className="absolute -inset-[4px] border-2 border-[rgba(85,129,199,.4)] animate-[ringPulse_1.8s_ease-out_infinite]" />
                    )}
                  </div>
                  <p
                    className={cn(
                      'whitespace-nowrap font-mono text-[10.5px] font-semibold uppercase tracking-[.08em]',
                      isCompleted && 'text-[#16A34A]',
                      isActive && 'text-[#1B2A49]',
                      isTodo && 'text-[#A0A0A0]',
                    )}
                  >
                    {t(step.titleKey)}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="mt-[18.5px] h-[3px] w-12 overflow-hidden bg-[#E0E0E0] sm:w-16">
                    <div
                      className="h-full bg-[#16A34A] transition-all duration-500"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className={cn('animate-in fade-in slide-in-from-bottom-4 duration-500', currentStep === 'job' && 'mx-auto max-w-[680px]')}>
        {currentStep === 'job' && (
          <JobStep onJobCreated={handleJobCreated} />
        )}

        {currentStep === 'configure' && selectedJob && (
          <ConfigureStep
            jobPosting={selectedJob}
            onStepChange={setCurrentStep}
            onGenerationStateChange={handleGenerationStateChange}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep === 'job' && (
        <div className="mx-auto flex max-w-[680px] items-center justify-between border-t border-[#E0E0E0] pt-5">
          <Button variant="ghost" onClick={handleCancel} className="rounded-[3px] font-semibold text-muted-foreground hover:text-foreground">
            {t('page.cancel')}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!selectedJob}
            className="rounded-[3px] px-5 font-semibold disabled:bg-[#E5E9F2] disabled:text-[#A0A0A0] disabled:opacity-100"
          >
            {t('page.next')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  );
}
