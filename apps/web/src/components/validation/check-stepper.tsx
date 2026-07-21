'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WizardStep = 'step1' | 'step2' | 'loading' | 'result' | 'history';

const STEPS = [
  { num: 1, label: 'Unterlagen' },
  { num: 2, label: 'Zielstelle' },
  { num: 3, label: 'Ergebnis' },
] as const;

function activeIndex(step: WizardStep): number {
  if (step === 'step1') return 0;
  if (step === 'step2') return 1;
  return 2; // loading, result
}

export function CheckStepper({ step }: { step: WizardStep }) {
  const idx = activeIndex(step);

  return (
    <nav aria-label="Fortschritt" className="flex items-start justify-center">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const isActive = i === idx;
        // connector sits between step i-1 and step i; fill it once step i-1 is done
        const connectorFilled = i <= idx;

        return (
          <div key={s.num} className="flex items-start">
            {i > 0 && (
              <div
                className={cn(
                  'mt-4 h-px w-10 flex-shrink-0 transition-colors duration-500 sm:w-16',
                  connectorFilled ? 'bg-success' : 'bg-border',
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center font-mono text-sm font-semibold transition-all duration-300',
                  done && 'bg-success text-white',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary-soft dark:ring-brand/20',
                  !done && !isActive && 'border-[1.5px] border-border bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  done ? 'text-success' : isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
