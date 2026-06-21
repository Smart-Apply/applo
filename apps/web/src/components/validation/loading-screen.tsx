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
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center gap-8 rounded-[18px] px-8 py-12 text-center"
      style={{
        background: '#fff',
        boxShadow: '0 1px 2px rgba(27,42,73,.04), 0 6px 16px -8px rgba(27,42,73,.10)',
        border: '1px solid #E6E8EE',
      }}
    >
      {/* Spinner ring with shield core */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '1.4s' }}
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="40" cy="40" r="35" stroke="#E5E9F2" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="#1B2A49"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="220 220"
            strokeDashoffset="165"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <ShieldCheck className="h-8 w-8" style={{ color: '#1B2A49' }} />
      </div>

      <div>
        <p className="text-[17px] font-semibold text-[#1B2A49]">
          Deine Bewerbung wird geprüft …
        </p>
        <p className="mt-1 text-sm" style={{ color: '#6B6969' }}>
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
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
                style={
                  done
                    ? { backgroundColor: '#E7F6EC' }
                    : active
                      ? { backgroundColor: '#E5E9F2' }
                      : { backgroundColor: '#F5F6F8' }
                }
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B2A49]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C7D0E4]" />
                )}
              </span>
              <span
                style={{
                  color: done ? '#16A34A' : active ? '#1B2A49' : '#6B6969',
                  fontWeight: active ? 500 : 400,
                }}
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
