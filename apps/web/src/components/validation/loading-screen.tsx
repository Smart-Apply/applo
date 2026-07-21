'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';

const CHECKLIST = [
  'Dokumente werden gelesen',
  'Qualität wird bewertet',
  'ATS-Tauglichkeit wird geprüft',
  'Empfehlungen werden erstellt',
] as const;

const STEP_DELAY_MS = 700;

export function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= CHECKLIST.length - 1) return;
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, STEP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [currentStep]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 rounded-[4px] border bg-card px-8 py-12 text-center">
      {/* Spinner ring with shield core */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '1.4s' }}
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="40" cy="40" r="35" stroke="var(--primary-soft)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="220 220"
            strokeDashoffset="165"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <ShieldCheck className="h-8 w-8 text-primary" />
      </div>

      <div>
        <p className="text-[17px] font-semibold text-foreground">
          Deine Bewerbung wird geprüft …
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Das dauert meist 15–30 Sekunden.
        </p>
      </div>

      {/* Checklist */}
      <ul className="w-full space-y-3">
        {CHECKLIST.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <li
              key={label}
              className="flex items-center gap-3 text-sm transition-opacity duration-300"
              style={{ opacity: i > currentStep ? 0.35 : 1 }}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center transition-all duration-300 ${
                  done
                    ? 'bg-[#ECFAF0] dark:bg-green-400/10'
                    : active
                      ? 'bg-primary-soft dark:bg-slate-800'
                      : 'bg-muted'
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <span className="h-1.5 w-1.5 bg-muted-foreground/40" />
                )}
              </span>
              <span
                className={
                  done
                    ? 'font-normal text-success'
                    : active
                      ? 'font-medium text-foreground'
                      : 'font-normal text-muted-foreground'
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
