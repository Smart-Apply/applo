'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { CenteredLoader } from '@/components/shared/loading';
import { JobStep } from '@/components/forms/wizard/job-step';
import { ConfigureStep } from '@/components/forms/wizard/configure-step';
import { Check, Briefcase, Settings, Sparkles, ChevronLeft, ArrowRight } from 'lucide-react';
import type { JobPosting, Template } from '@/types';
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

  const { data: profile, isLoading: profileLoading } = useProfile();

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

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

  const handleBack = () => {
    if (currentStep === 'configure') {
      setCurrentStep('job');
    }
  };

  const handleCancel = () => {
    router.push('/applications');
  };

  if (profileLoading) {
    return <CenteredLoader message="Lädt..." />;
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator — 3-phase with done/active/todo states */}
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = index < currentStepIndex;
            const isTodo = index > currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div
                      className={cn(
                        'flex items-center justify-center w-[52px] h-[52px] rounded-2xl transition-all duration-300',
                        isCompleted && 'bg-green-500 text-white',
                        isActive && 'bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(27,42,73,0.28)]',
                        isTodo && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" strokeWidth={2.6} />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    {isActive && (
                      <span className="absolute -inset-[5px] rounded-[19px] border-2 border-primary/35 animate-[ringPulse_1.8s_ease-out_infinite]" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      'text-sm font-bold whitespace-nowrap',
                      isTodo ? 'text-muted-foreground/50' : 'text-foreground',
                    )}>
                      {step.title}
                    </p>
                    <p className={cn(
                      'text-xs font-semibold mt-0.5',
                      isCompleted && 'text-green-600',
                      isActive && 'text-foreground',
                      isTodo && 'text-muted-foreground/50',
                    )}>
                      {isCompleted ? 'Erledigt' : isActive ? 'Aktiv' : 'Ausstehend'}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-[3px] bg-muted rounded mx-4 mt-[-26px] overflow-hidden min-w-[48px]">
                    <div
                      className="h-full bg-green-500 rounded transition-all duration-500"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {currentStep === 'job' && (
          <JobStep onJobCreated={handleJobCreated} />
        )}

        {currentStep === 'configure' && selectedJob && (
          <ConfigureStep
            jobPosting={selectedJob}
            onStepChange={setCurrentStep}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep === 'job' && (
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
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

      {currentStep === 'configure' && (
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </div>
      )}
    </div>
  );
}

