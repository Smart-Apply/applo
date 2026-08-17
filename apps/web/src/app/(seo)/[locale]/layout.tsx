import { notFound } from 'next/navigation';
import '../../home.css';
import '../seo.css';
import { LandingFooter } from '@/components/landing/landing-footer';
import { isLocale } from '@/i18n/config';

/**
 * Layout for the programmatic SEO route group.
 *
 * `[locale]` sits at the top level, so it also matches paths that are not
 * locales at all (`/anything`). Static routes win over dynamic ones in the
 * App Router, so the app's own pages are unaffected — but an unknown first
 * segment lands here and has to 404 rather than render a German page under a
 * nonsense URL, which is what `isLocale` is doing.
 *
 * The locale itself does not need to be threaded into `next-intl`: the
 * middleware already forwarded the URL prefix as a request header and
 * `i18n/request.ts` prefers it, so `getTranslations()` and the root layout's
 * `<html lang>` are both correct by the time this renders.
 */
export default async function SeoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="applo-home">
      {children}
      <LandingFooter />
    </div>
  );
}
