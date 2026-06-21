'use client';

import { Check } from 'lucide-react';

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
                className="mt-4 h-px w-10 flex-shrink-0 transition-colors duration-500 sm:w-16"
                style={{ backgroundColor: connectorFilled ? '#16A34A' : '#E6E8EE' }}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300"
                style={
                  done
                    ? { backgroundColor: '#16A34A', color: '#fff' }
                    : isActive
                      ? {
                          backgroundColor: '#1B2A49',
                          color: '#fff',
                          boxShadow: '0 0 0 4px #E5E9F2',
                        }
                      : {
                          backgroundColor: '#fff',
                          color: '#6B6969',
                          border: '1.5px solid #E6E8EE',
                        }
                }
              >
                {done ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  color: done ? '#16A34A' : isActive ? '#1B2A49' : '#6B6969',
                }}
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
