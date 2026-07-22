'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApploRig } from '@/components/ui/applo-rig';
import type { ApploState } from '@/components/ui/applo-rig';
import { cn } from '@/lib/utils';

export type ApploGuideStep = 'add' | 'config' | 'loading' | 'finishing' | 'done';

const STEPS: Record<
  ApploGuideStep,
  { eyebrowKey: string; msgKey: string; pose: ApploState }
> = {
  add: {
    eyebrowKey: 'guide.steps.add.eyebrow',
    msgKey: 'guide.steps.add.message',
    pose: 'wave',
  },
  config: {
    eyebrowKey: 'guide.steps.config.eyebrow',
    msgKey: 'guide.steps.config.message',
    pose: 'think',
  },
  loading: {
    eyebrowKey: 'guide.steps.loading.eyebrow',
    msgKey: 'guide.steps.loading.message',
    pose: 'process',
  },
  finishing: {
    eyebrowKey: 'guide.steps.finishing.eyebrow',
    msgKey: 'guide.steps.finishing.message',
    pose: 'success',
  },
  done: {
    eyebrowKey: 'guide.steps.done.eyebrow',
    msgKey: 'guide.steps.done.message',
    pose: 'success',
  },
};

export function ApploGuide({
  step = 'add',
  finishing = false,
  className,
}: {
  step?: ApploGuideStep;
  finishing?: boolean;
  className?: string;
}) {
  const t = useTranslations('dashboard');
  const baseStep: ApploGuideStep = step === 'loading' && finishing ? 'finishing' : step;
  const cfg = STEPS[baseStep];

  // wave hello once, then settle into a calm idle
  const [waveDone, setWaveDone] = useState(false);
  const [prevStep, setPrevStep] = useState(baseStep);
  if (prevStep !== baseStep) {
    setPrevStep(baseStep);
    setWaveDone(false);
  }
  const pose: ApploState = cfg.pose === 'wave' && waveDone ? 'idle' : cfg.pose;

  useEffect(() => {
    if (cfg.pose !== 'wave') return;
    const id = setTimeout(() => setWaveDone(true), 1350);
    return () => clearTimeout(id);
  }, [cfg.pose]);

  // Navy guide strip: 104px mascot cell + per-step message (sharp redesign).
  return (
    <div
      className={cn('flex items-stretch border border-[#1B2A49] bg-[#1B2A49]', className)}
      role="status"
      aria-live="polite"
    >
      <div className="grid w-[104px] flex-none place-items-center border-r border-white/15 bg-[#22345A] py-2">
        <ApploRig key={baseStep + pose} state={pose} size={80} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4">
        <p className="mb-1 font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-[#5581C7]">
          {t(cfg.eyebrowKey)}
        </p>
        <p className="text-[15px] leading-normal text-[rgba(229,233,242,.9)] [&_b]:font-bold [&_b]:text-white">
          {t.rich(cfg.msgKey, {
            b: (chunks) => <b>{chunks}</b>,
          })}
        </p>
      </div>
    </div>
  );
}
