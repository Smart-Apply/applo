import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/urls';

/**
 * robots.txt.
 *
 * Everything behind authentication is disallowed. Those routes redirect to
 * /login for an unauthenticated crawler anyway, so this is about crawl budget
 * rather than secrecy: without it, every crawler spends its allowance
 * discovering a dozen redirects instead of the pages that should rank.
 *
 * `/login` and `/register` stay crawlable — they are legitimate public entry
 * points and are frequently searched for by name.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/applications',
          '/interviews',
          '/job-postings',
          '/jobs',
          '/analytics',
          '/profile',
          '/settings',
          '/onboarding',
          '/validate',
          '/demo-loading',
          '/verify-email',
          '/reset-password',
          '/forgot-password',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/').replace(/\/$/, ''),
  };
}
