import { SITE_URL } from '@/lib/site-url';
import { absoluteUrl } from './urls';

/**
 * Structured data for the SEO pages.
 *
 * Deliberately conservative about which types are emitted: `HowTo` rich
 * results were retired by Google, and `QAPage` describes user-generated
 * question threads rather than editorial content, so neither belongs here.
 * `FAQPage` no longer produces a rich result for a site like this one (Google
 * restricted it to government and health sources in 2023) — it is emitted
 * because it describes the block accurately, not for a SERP feature.
 */

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * The publisher/author node, emitted on every page that references it.
 *
 * `@id` references resolve **per document**, so pointing at the Organization
 * the landing page declares would be a dangling reference on all 144 entity
 * pages — worse than omitting the property. Each page therefore carries its
 * own copy; the shared `@id` is what lets a consumer merge them.
 */
export function organization() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Applo',
    url: `${SITE_URL}/`,
  };
}

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
    // Both resolve against the Organization node the page also emits.
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    isAccessibleForFree: true,
  };
}

/** Wrap the page's nodes in a single `@graph`, the way the landing page does. */
export function graph(nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
