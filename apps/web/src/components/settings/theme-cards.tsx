/* =============================================================================
 *  theme-cards.tsx
 *  TARGET PATH: apps/web/src/components/settings/theme-cards.tsx
 *
 *  Visual theme picker (System / Hell / Dunkel) with miniature previews —
 *  replaces the plain <Select> for theme. Emits the same lowercase values
 *  ('system' | 'light' | 'dark') the API already expects, so it's a drop-in
 *  for handleUpdatePreference('theme', value).
 * ========================================================================== */

'use client';

import { Monitor, Sun, Moon, Check, type LucideIcon } from 'lucide-react';

type ThemeValue = 'system' | 'light' | 'dark';

interface ThemeOption {
  value: ThemeValue;
  name: string;
  icon: LucideIcon;
  /** Tailwind classes for the mini-preview surface + sidebar + bars. */
  surface: string;
  side: string;
  bar: string;
  barActive: string;
}

const THEMES: ThemeOption[] = [
  {
    value: 'system', name: 'System', icon: Monitor,
    surface: 'bg-gradient-to-br from-slate-100 from-50% to-slate-800 to-50%',
    side: 'bg-gradient-to-br from-white from-50% to-slate-700 to-50%',
    bar: 'bg-slate-400', barActive: 'bg-slate-500',
  },
  {
    value: 'light', name: 'Hell', icon: Sun,
    surface: 'bg-slate-100', side: 'bg-white', bar: 'bg-slate-300', barActive: 'bg-primary',
  },
  {
    value: 'dark', name: 'Dunkel', icon: Moon,
    surface: 'bg-slate-900', side: 'bg-slate-800', bar: 'bg-slate-600', barActive: 'bg-blue-400',
  },
];

interface ThemeCardsProps {
  value: ThemeValue;
  onChange: (value: ThemeValue) => void;
  disabled?: boolean;
}

export function ThemeCards({ value, onChange, disabled }: ThemeCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {THEMES.map((theme) => {
        const Icon = theme.icon;
        const isActive = theme.value === value;
        return (
          <button
            key={theme.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(theme.value)}
            aria-pressed={isActive}
            className={`rounded-xl border-2 p-3 text-left transition-all ${
              isActive
                ? 'border-primary ring-2 ring-primary/15'
                : 'border-border hover:border-primary/40'
            } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          >
            <div className={`flex h-[74px] overflow-hidden rounded-lg border border-border/60 ${theme.surface}`}>
              <span className={`h-full w-[30%] ${theme.side}`} />
              <span className="flex flex-1 flex-col gap-1.5 p-2">
                <span className={`h-[7px] w-[60%] rounded-full ${theme.barActive}`} />
                <span className={`h-[7px] w-full rounded-full ${theme.bar}`} />
                <span className={`h-[7px] w-[80%] rounded-full ${theme.bar}`} />
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <Icon className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">{theme.name}</span>
              {isActive && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
