// OpenNext configuration for Cloudflare Workers deployment.
//
// Docs: https://opennext.js.org/cloudflare
//
// Caching is intentionally LEFT OFF for the initial launch:
//   - No R2 incremental cache (keeps the deploy simple, one bucket only)
//   - No KV / D1 caches
//   - No tag cache
//
// To enable later, follow https://opennext.js.org/cloudflare/caching and add
// a `NEXT_INC_CACHE_R2_BUCKET` binding in wrangler.jsonc + the matching
// override import here.
import { defineCloudflareConfig, getCloudflareContext } from '@opennextjs/cloudflare';

// Minimal structural type for the OpenNext asset resolver hook. The
// real `AssetResolver` type lives in `@opennextjs/aws/types/overrides`
// which isn't re-exported by `@opennextjs/cloudflare`, so we describe
// just the shape we need here. If OpenNext's contract changes, this
// will fail at the assignment below — caught by `tsc`.
type AssetResolver = {
  name: string;
  maybeGetAssetResult: (event: {
    rawPath: string;
    method: string;
    headers: Record<string, string>;
  }) => Promise<
    | undefined
    | {
        type: 'core';
        statusCode: number;
        headers: Record<string, string | string[]>;
        body: ReadableStream;
        isBase64Encoded: boolean;
      }
  >;
};

/**
 * Asset resolver that returns a *real* 404 for missing `/_next/static/*`
 * assets instead of letting OpenNext fall through to the SPA shell HTML.
 *
 * Why this exists: after every deploy, the previous build's hashed
 * chunks stop existing on the Worker. Browser tabs still open on the
 * old page reference those old hashes. With the default OpenNext
 * behaviour, requests for the missing chunk fall through to the page
 * handler which returns the full app HTML — Chrome refuses to execute
 * it as JS/CSS because the MIME type is `text/html`, the page silently
 * breaks, and the user is stuck on a half-loaded version forever
 * (Next's built-in chunk-error-handler tries one reload then gives up
 * with `Suppressing further reloads`).
 *
 * Returning a real 404 here means:
 *   1. The browser surfaces a proper `404` to the chunk loader
 *   2. Next's chunk-error-handler reloads cleanly, getting fresh HTML
 *      with the *current* build's chunk hashes
 *   3. The user transparently lands on the new build instead of being
 *      stuck on a broken page until they Cmd-Shift-R manually
 *
 * Scoped to `/_next/static/*` so we don't change behaviour for any
 * other path. Requires `assets.run_worker_first: ["/_next/static/*"]`
 * in wrangler.jsonc so the worker actually runs for these paths
 * (otherwise the asset binding handles them directly and never asks
 * the resolver).
 */
const staticChunk404Resolver: AssetResolver = {
  name: 'smart-apply-static-chunk-404-resolver',
  async maybeGetAssetResult(event) {
    // Only intercept the static-chunk paths; everything else goes
    // through OpenNext's default routing untouched.
    if (!event.rawPath.startsWith('/_next/static/')) {
      return undefined;
    }

    const { ASSETS } = getCloudflareContext().env as {
      ASSETS?: { fetch: (url: URL, init?: RequestInit) => Promise<Response> };
    };
    if (!ASSETS) {
      return undefined;
    }

    const { method, headers } = event;
    if (method !== 'GET' && method !== 'HEAD') {
      return undefined;
    }

    const url = new URL(event.rawPath, 'https://assets.local');
    const response = await ASSETS.fetch(url, { method, headers });

    // The actual fix: 404 instead of `undefined` so OpenNext returns
    // a real 404 to the browser rather than rendering the SPA shell.
    //
    // Critically: Chrome's strict-MIME mode rejects ANY response to a
    // <script>/<link rel=stylesheet> request whose `Content-Type` isn't
    // executable/stylesheet — including an empty MIME like `''`. Without
    // the explicit `text/plain` header, the browser would still log the
    // same `MIME type ('') is not executable` error and Next's
    // chunk-error-handler would treat it as a failure-to-load rather than
    // an honest 404, so reload-and-recover wouldn't work. With the
    // header, the browser surfaces a proper 404 to the chunk loader and
    // the recovery reload fires exactly once.
    if (response.status === 404) {
      await response.body?.cancel();
      return {
        type: 'core',
        statusCode: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
        body: new ReadableStream({
          start: (c) => {
            c.enqueue(new TextEncoder().encode('Not Found'));
            c.close();
          },
        }),
        isBase64Encoded: false,
      };
    }

    return {
      type: 'core',
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: response.body ?? new ReadableStream({ start: (c) => c.close() }),
      isBase64Encoded: false,
    };
  },
};

const config = defineCloudflareConfig({
  // No incrementalCache override -> uses Worker memory only (fine for launch)
});

// `defineCloudflareConfig` doesn't expose `assetResolver` as a parameter
// (it hardcodes the default OpenNext one), so we override on the returned
// object. Safe to mutate — the object is freshly built and not shared.
// Cast required because OpenNext's `AssetResolver` lives at a deep path
// (`@opennextjs/aws/dist/types/overrides`) that isn't re-exported by
// `@opennextjs/cloudflare`, and the DOM `ReadableStream` we return
// differs structurally from Node's (missing async-iterator). Functionally
// identical at runtime — Workers runtime uses one stream type for both.
if (config.middleware) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config.middleware.assetResolver = (() => staticChunk404Resolver) as any;
}

export default config;
