'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepConfig[] = [
  { id: 'job', title: 'Stelle hinzufügen', icon: Briefcase },
  { id: 'configure', title: 'Konfigurieren', icon: Settings },
  { id: 'generate', title: 'Fertig', icon: Sparkles },
];

export type ApplicationLanguage = 'de' | 'en' | 'fr' | 'es' | 'it';

interface ApplicationWizardProps {
  initialJobPosting?: JobPosting | null;
}

export function ApplicationWizard({ initialJobPosting }: ApplicationWizardProps = {}) {
  const router = useRouter();
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
    return <CenteredLoader message="Lädt..." />;
  }

  return (
    <div className={cn('space-y-4', currentStep === 'job' && 'mx-auto max-w-2xl')}>
      {/* Compact centered header: Applo on top, step path right below
          (gap comes from .applo-guide--compact margin-bottom). */}
      <div>
        <ApploGuide step={guideStep} finishing={generation.finishing} compact />

        {/* Step Indicator — equal 1fr columns so the middle step is perfectly centered */}
        <div className="mx-auto grid w-full max-w-lg grid-cols-[1fr_auto_1fr_auto_1fr] items-start">
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
                        'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                        isCompleted && 'bg-green-500 text-white',
                        isActive && 'bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(27,42,73,0.28)]',
                        isTodo && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" strokeWidth={2.6} />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    {isActive && (
                      <span className="absolute -inset-[4px] rounded-[15px] border-2 border-primary/35 animate-[ringPulse_1.8s_ease-out_infinite]" />
                    )}
                  </div>
                  <p className={cn(
                    'text-xs font-bold whitespace-nowrap',
                    isCompleted && 'text-green-600',
                    isActive && 'text-foreground',
                    isTodo && 'text-muted-foreground/50',
                  )}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="mt-[18.5px] h-[3px] w-12 sm:w-16 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded transition-all duration-500"
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
            Abbrechen
          </Button>
          <Button
            onClick={handleNext}
            disabled={!selectedJob}
            className="shadow-md hover:shadow-lg transition-all"
          >
            Weiter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  );
}

