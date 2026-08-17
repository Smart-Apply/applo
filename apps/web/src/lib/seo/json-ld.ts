import { SITE_URL } from '@/lib/site-url';
import { absoluteUrl } from './urls';

/**
 * Structured data for the SEO pages.
 *
 * Deliberately conservative about which types are emitted: `HowTo` rich
 * results were retired by Google, and `QAPage` describes user-generated
 * question threads rather than editorial content, so neither belongs here.
 * What is emitted — `BreadcrumbList`, `ItemList`, `FAQPage`, `Article` — is
 * each an accurate description of what is actually on the page.
 */

/** The Organization node the landing page defines; referenced, not redefined. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * JSON-LD is injected as raw HTML, so any `<` inside a string could otherwise
 * close the script element early. Escaping it is the whole defence.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function itemList(items: Array<{ name: string; path: string }>) {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function faqPage(faq: Array<{ question: string; answer: string }>) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

export function article(params: {
  path: string;
  headline: string;
  description: string;
  locale: string;
  about: string;
}) {
  return {
    '@type': 'Article',
    '@id': `${absoluteUrl(params.path)}#article`,
    mainEntityOfPage: absoluteUrl(params.path),
    headline: params.headline,
    description: params.description,
    inLanguage: params.locale,
    about: { '@type': 'Thing', name: params.about },
    publisher: { '@id': ORGANIZATION_ID },
    isAccessibleForFree: true,
  };
}

/** Wrap the page's nodes in a single `@graph`, the way the landing page does. */
export function graph(nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
