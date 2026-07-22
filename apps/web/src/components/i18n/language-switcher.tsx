'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { locales, type Locale } from '@/i18n/config';
import { setLocaleCookie } from '@/lib/i18n-runtime';

/**
 * Applies a locale choice: persists the NEXT_LOCALE cookie and refreshes
 * the current route so server components re-render in the new language.
 * Exposed for surfaces with their own UI (e.g. the settings page select).
 */
export function useLocaleSwitch() {
  const router = useRouter();
  const activeLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (locale: Locale) => {
    if (locale === activeLocale) return;
    setLocaleCookie(locale);
    startTransition(() => {
      router.refresh();
    });
  };

  return { switchLocale, activeLocale, isPending };
}

interface LanguageSwitcherProps {
  /** 'icon' = globe-only trigger (headers); 'labeled' = globe + language name. */
  variant?: 'icon' | 'labeled';
  className?: string;
}

/** Compact language dropdown (DE/EN) for headers and auth pages. */
export function LanguageSwitcher({ variant = 'icon', className }: LanguageSwitcherProps) {
  const t = useTranslations('common.language');
  const { switchLocale, activeLocale } = useLocaleSwitch();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={cn('text-muted-foreground hover:text-foreground', className)}
          aria-label={t('switchLabel')}
        >
          <Globe className="h-4 w-4" />
          {variant === 'labeled' && <span>{t(activeLocale as Locale)}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => switchLocale(locale)}
            className="flex items-center justify-between gap-4"
          >
            {t(locale)}
            {locale === activeLocale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
