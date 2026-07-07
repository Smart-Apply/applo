'use client';

import { useEffect } from 'react';
import { toast } from '@/lib/toast';
import { hardReloadWithCacheBust } from '@/lib/hard-reload';

/**
 * Stable sonner toast id used for both chunk-error and SW-update
 * triggers. Sharing the id deduplicates: a chunk error followed by an
 * SW update (or vice-versa) updates the existing toast instead of
 * stacking a second copy.
 */
const UPDATE_TOAST_ID = 'applo-update-available';

/**
 * Module-level guard so a single page load only ever performs ONE
 * SW-driven hard reload. Without this, a misbehaving SW that
 * re-broadcasts SW_FORCE_RELOAD on each navigation could trap the user
 * in a reload loop. We also persist a sessionStorage breadcrumb so the
 * post-reload page doesn't immediately reload again if the new SW
 * re-broadcasts on its very first activate (it shouldn't, but
 * belt-and-braces).
 */
const SW_FORCE_RELOAD_FLAG_KEY = 'sa-sw-force-reload-handled';
let swForceReloadHandled = false;

/**
 * Show the user-controlled "new version available" toast.
 *
 * Triggered by:
 *   - `ChunkLoadError` (the user's tab is from a previous build whose
 *     hashed chunks no longer exist on the Cloudflare Worker)
 *   - `sw-update-available` event (a new service worker has installed
 *     in the background)
 *
 * Both situations have the same fix from the user's perspective: a
 * full-document reload that bypasses caches. We intentionally do NOT
 * trigger this reload silently — the user might be mid-form, mid-paste,
 * or mid-PDF-preview. Letting them opt in eliminates surprise reloads
 * and the reload loops PR #491-#493 chased.
 */
export function showUpdateAvailableToast(): void {
  toast(
    'Neue Version verfügbar',
    {
      id: UPDATE_TOAST_ID,
      description:
        'Lade die Seite neu, um die aktuelle Version von Applo zu sehen. Deine Eingaben in offenen Formularen gehen dabei verloren.',
      // Stay until the user acts — surprise auto-reloads cost more than
      // a visible banner.
      duration: Infinity,
      action: {
        label: 'Jetzt aktualisieren',
        onClick: () => {
          void hardReloadWithCacheBust();
        },
      },
    },
  );
}

/**
 * Service Worker Registration Component
 * Registers the service worker for PWA functionality
 * Only runs in production or when explicitly enabled
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker();
      installChunkErrorRecovery();
      installUpdateAvailableListener();
      installSwForceReloadListener();
    } else {
      // Dev: aggressively kill any stale SW + caches left behind by a
      // previous `next build` / Cloudflare deploy on the same origin.
      // Without this, the prod bundle (with prod API URL baked in) keeps
      // getting served from the SW cache and dev edits never reach the
      // browser.
      unregisterAllServiceWorkers();
    }
  }, []);

  return null;
}

/**
 * Hook the `sw-update-available` event (dispatched by
 * `registerServiceWorker` below when a new SW installs in the
 * background) to the same toast as chunk errors.
 */
function installUpdateAvailableListener(): void {
  window.addEventListener('sw-update-available', () => {
    showUpdateAvailableToast();
  });
}

/**
 * Listen for the `SW_FORCE_RELOAD` message broadcast by sw.js on
 * activate. Triggers a single cache-busting hard reload so the open
 * tab picks up the new JS bundle immediately, instead of continuing
 * to run the previously-cached one.
 *
 * Guard rails:
 *   - Module-level `swForceReloadHandled` flag → only fires once per
 *     page load.
 *   - sessionStorage breadcrumb → if the post-reload page receives
 *     another broadcast in the same tab session, skip it (defensive;
 *     should not happen because the new SW only activates once).
 *   - Only enabled in production (caller gates on NODE_ENV).
 *
 * Background: introduced for the prod register-403 incident
 * (docs/incidents/2026-05-27-register-403.md). The Pre-#510 bundle on
 * cached tabs was the root cause; this listener guarantees those tabs
 * pick up the fix on next visit without waiting for the user to hit a
 * ChunkLoadError or manually clear caches.
 */
function installSwForceReloadListener(): void {
  if (!('serviceWorker' in navigator)) return;

  let alreadyHandledInSession = false;
  try {
    alreadyHandledInSession = sessionStorage.getItem(SW_FORCE_RELOAD_FLAG_KEY) === '1';
  } catch {
    // sessionStorage unavailable — fall back to the in-memory guard only.
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; version?: string } | null;
    if (!data || data.type !== 'SW_FORCE_RELOAD') return;
    if (swForceReloadHandled || alreadyHandledInSession) return;

    swForceReloadHandled = true;
    try {
      sessionStorage.setItem(SW_FORCE_RELOAD_FLAG_KEY, '1');
    } catch {
      // Ignore — we still have the module-level guard.
    }

    console.log('[PWA] Received SW_FORCE_RELOAD, hard-reloading once.', data.version);
    void hardReloadWithCacheBust();
  });
}

async function unregisterAllServiceWorkers() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length === 0) return;
    await Promise.all(regs.map((r) => r.unregister()));
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
     
    console.log(
      `[PWA dev] Unregistered ${regs.length} stale service worker(s) and cleared caches. Reloading...`,
    );
    window.location.reload();
  } catch (err) {
     
    console.warn('[PWA dev] Failed to clear stale service worker:', err);
  }
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('[PWA] Service Worker registered successfully:', registration.scope);

    // Check for updates periodically (every hour)
    setInterval(async () => {
      try {
        await registration.update();
        console.log('[PWA] Service Worker update check completed');
      } catch (error) {
        console.warn('[PWA] Service Worker update check failed:', error);
      }
    }, 60 * 60 * 1000);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show notification to user
            console.log('[PWA] New version available. Please refresh the page.');
            
            // Optionally dispatch a custom event for the app to handle
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    // Handle controller changes (new service worker took over).
    //
    // We DELIBERATELY DON'T force `window.location.reload()` here.
    // Forcing a reload the moment a new SW activates compounded badly
    // with the chunk-error-recovery flow during the beta:
    //   1. A user mid-session lazy-loads a stale chunk → 404 →
    //      `installChunkErrorRecovery` reloads once (sessionStorage flag)
    //   2. The fresh page registers the new SW → `controllerchange`
    //      fires → another forced reload, bypassing the sessionStorage
    //      flag, sometimes mid-render
    //   3. User sees the page flash-reload 2-3 times back-to-back
    //
    // The custom `sw-update-available` event is still dispatched above,
    // so a future "Update available — click to refresh" toast can hook
    // into it. For now, the new SW silently takes effect on the next
    // natural navigation, which is the standard PWA pattern.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
       
      console.log('[PWA] New service worker activated. Update applies on next navigation.');
    });

  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

/**
 * Detect "stale chunk" errors (the user's tab is on build N, we shipped
 * build N+1, the hashed chunks the old code wants no longer exist on
 * the Cloudflare Worker) and surface a user-controlled update prompt.
 *
 * We DO NOT auto-reload here — see the long comment above
 * `showUpdateAvailableToast`. The toast lets the user opt in at a moment
 * they choose, preserving any in-progress form input.
 */
function installChunkErrorRecovery(): void {
  const isChunkLoadError = (reason: unknown): boolean => {
    if (!reason) return false;
    // Webpack emits ChunkLoadError; Next.js wraps with name "ChunkLoadError".
    // The message contains the chunk URL, which lets us also catch the
    // "Loading CSS chunk … failed" / "Loading chunk … failed" variants.
    const name = (reason as { name?: string }).name ?? '';
    const message = String((reason as { message?: string }).message ?? reason);
    return (
      name === 'ChunkLoadError' ||
      /Loading (CSS )?chunk \S+ failed/i.test(message) ||
      /Failed to fetch dynamically imported module/i.test(message)
    );
  };

  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.error ?? event)) {
      event.preventDefault();
      showUpdateAvailableToast();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      showUpdateAvailableToast();
    }
  });
}
