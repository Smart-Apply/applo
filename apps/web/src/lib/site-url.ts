/**
 * Absolute origin of the public site. Used to resolve relative metadata
 * (OG/Twitter images, canonicals) and to build the `@id`/`url` fields of the
 * landing page's JSON-LD graph, which must be absolute.
 *
 * Falls back to the production origin so social previews and structured data
 * stay correct even when NEXT_PUBLIC_APP_URL isn't set (e.g. Cloudflare prod).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://applo.ai').replace(/\/+$/, '');

/** `SITE_URL` as a URL instance, for Next.js `metadata.metadataBase`. */
export const SITE_METADATA_BASE = new URL(SITE_URL);
