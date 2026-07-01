/**
 * Hard reload that proactively clears every client-side cache layer
 * before navigating, guaranteeing the browser fetches the CURRENT
 * deploy's HTML — and therefore the current content-hashed chunk URLs —
 * instead of a stale copy held by:
 *
 *   - the Service Worker's Cache Storage (a previous SW build),
 *   - the Service Worker registration itself (a previous-build SW whose
 *     fetch handler keeps re-serving stale HTML), or
 *   - the browser HTTP cache / a shared edge cache keyed without the
 *     query string (busted by the `?_v=<timestamp>` param).
 *
 * This is the escape hatch used both by the automatic stale-chunk
 * recovery (`chunk-error-handler`) and the user-triggered "new version
 * available" toast (`service-worker-registration`). A plain
 * `location.reload()` is NOT enough on its own: it goes through the
 * active Service Worker, so a previous-build SW can hand the reload the
 * same stale HTML that caused the chunk 404 in the first place — the
 * "chunk load failed again after reload" dead-end.
 *
 * Errors during cleanup are swallowed — the reload still proceeds so the
 * user is never stuck if `caches` is unavailable (older iOS Safari) or a
 * registration call throws. No-op on the server.
 */
export async function hardReloadWithCacheBust(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => undefined)));
    }
  } catch {
    // Cache cleanup is best-effort — don't block the reload on it.
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
    }
  } catch {
    // Same: best effort.
  }

  // `location.replace` (not `assign`) keeps the user out of back-button
  // history pointing at the stale URL. The `?_v=<ts>` query bypasses any
  // aggressive HTML cache; the Worker ignores unknown query params for
  // HTML routes so this is safe.
  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  window.location.replace(url.toString());
}
