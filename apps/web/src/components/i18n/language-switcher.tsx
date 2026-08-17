'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Check, ChevronDown } from 'lucide-react';
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
 *
 * `localeUrls` is for the SEO route group, whose URLs carry a `/{locale}`
 * prefix and localized slugs. There, refreshing in place would leave the
 * visitor on a URL that promises one language while the page renders
 * another — so the switch navigates to the translated URL instead. Pages
 * without prefixed URLs (the whole app) omit it and keep the refresh.
 */
export function useLocaleSwitch(localeUrls?: Partial<Record<Locale, string>>) {
  const router = useRouter();
  const activeLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (locale: Locale) => {
    if (locale === activeLocale) return;
    setLocaleCookie(locale);
    const target = localeUrls?.[locale];
    startTransition(() => {
      // `router.refresh()` is required in BOTH branches, and the push alone is
      // not enough. A client-side navigation only re-renders the segments that
      // differ, and the root layout is shared by every locale — so without the
      // refresh it keeps the previous language: `NextIntlClientProvider` still
      // serves the old messages (making `useLocale()` stale, so the guard above
      // then blocks switching *back*), `<html lang>` stays wrong, and the
      // cookie banner renders in the language you just left.
      if (target) router.push(target);
      router.refresh();
    });
  };

  return { switchLocale, activeLocale, isPending };
}

interface LanguageSwitcherProps {
  /**
   * 'icon' = globe-only trigger (headers); 'labeled' = globe + language
   * name; 'code' = compact locale-code chip with a chevron, no globe
   * (sidebar footer).
   */
  variant?: 'icon' | 'labeled' | 'code';
  className?: string;
  /** Locale → URL map; see `useLocaleSwitch`. */
  localeUrls?: Partial<Record<Locale, string>>;
}

/** Compact language dropdown for headers, sidebar and auth pages. */
export function LanguageSwitcher({ variant = 'icon', className, localeUrls }: LanguageSwitcherProps) {
  const t = useTranslations('common.language');
  const { switchLocale, activeLocale } = useLocaleSwitch(localeUrls);

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
          {variant === 'code' ? (
            <>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[.1em]">
                {activeLocale}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              {variant === 'labeled' && <span>{t(activeLocale as Locale)}</span>}
            </>
          )}
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
